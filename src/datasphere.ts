import { analyticalDataUrl, config } from "./config.js";
import {
  fetchAnalyticalService,
  getAnalyticalMetadata,
} from "./catalog.js";
import { buildParameterizedEntityPath, requireSpaceAsset } from "./odata.js";
import { cacheKey, getCacheStats, metadataCache, queryCache } from "./cache.js";
import { dspFetch } from "./http.js";
import { getValidAccessToken } from "./oauth.js";

type DspJson = Record<string, unknown>;

export type QueryResult = {
  url: string;
  status: number;
  row_count: number;
  rows: unknown[];
  count?: number;
  entity_set?: string;
  cache_hit?: boolean;
  auto_select_used?: boolean;
  raw?: unknown;
};

type QueryOptions = {
  spaceId?: string;
  assetId?: string;
  entitySet?: string;
  parameters?: Record<string, string>;
  select?: string;
  filter?: string;
  apply?: string;
  orderby?: string;
  top?: number;
  skip?: number;
  count?: boolean;
};

export async function resolveAnalyticalEntitySet(
  spaceId: string,
  assetId: string,
  options?: { entitySet?: string; parameters?: Record<string, string> },
): Promise<string> {
  if (options?.entitySet?.trim()) {
    return options.entitySet.trim();
  }
  const params = options?.parameters;
  if (!params || Object.keys(params).length === 0) {
    return assetId;
  }

  const meta = await getAnalyticalMetadata(spaceId, assetId);
  const setName = meta.entity_sets[0]?.name;
  if (!setName) {
    throw new Error(
      `Asset '${assetId}' requires parameters but no entity set was found in $metadata. Pass entity_set explicitly.`,
    );
  }

  const paramDef = meta.parameters[0];
  if (paramDef) {
    const allowed = new Set(paramDef.names);
    const missing = paramDef.names.filter((name) => !(name in params));
    if (missing.length > 0) {
      throw new Error(
        `Missing required parameters: ${missing.join(", ")}. Expected: ${paramDef.names.join(", ")}.`,
      );
    }
    for (const key of Object.keys(params)) {
      if (!allowed.has(key)) {
        throw new Error(
          `Unknown parameter '${key}'. Expected one of: ${paramDef.names.join(", ")}.`,
        );
      }
    }
  }

  return buildParameterizedEntityPath(setName, params);
}

/**
 * Turn a raw INA/OData error body into an actionable message. The raw SAP text alone
 * ("Unable to process parameter CALYEAR: Invalid value.") looks like a client-side
 * formatting bug, but it usually is not — it commonly means the *asset itself* has an
 * authorization-restricted or fixed-value input parameter (e.g. a BW/HANA variable tied to
 * an analytic privilege) that rejects any ad-hoc value regardless of syntax. Repeating the
 * same request with a different value will not help; a different asset or a check with the
 * space owner is required.
 */
function enrichODataError(status: number, url: string, rawText: string): string {
  const base = `OData query failed (${status}) for ${url}: ${rawText.slice(0, 800)}`;
  const paramMatch = rawText.match(/Unable to process parameter (\w+)/i);
  if (status === 400 && paramMatch) {
    return (
      `${base}\n\n` +
      `Diagnosis: the backend rejected the value for parameter '${paramMatch[1]}' before running the query. ` +
      `This is almost always a restriction on the asset itself (an authorization-scoped or fixed-value ` +
      `BW/HANA input parameter), not a malformed request - trying a different value for the same parameter ` +
      `on the same asset will usually fail the same way. Next steps: 1) re-run get_analytical_fields on a ` +
      `different asset_id in this space and check whether it accepts the same parameter, 2) confirm with the ` +
      `Datasphere/BW space owner which values '${paramMatch[1]}' actually allows for this asset.`
    );
  }
  if (status === 400 && /MaxResultRecords/i.test(rawText)) {
    return (
      `${base}\n\n` +
      `Diagnosis: the query returned more rows than the INA engine allows without aggregation. ` +
      `Add a $filter to narrow the result set, or use $apply with groupby/aggregate (see query_analytical_model docs).`
    );
  }
  return base;
}

async function runODataQuery(url: URL): Promise<QueryResult> {
  const key = cacheKey(["query", url.toString()]);
  const { value, cache_hit } = await queryCache.getOrFetch(key, async () => {
    const accessToken = await getValidAccessToken();
    const res = await dspFetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Accept-Language": "en",
      },
    });

    const text = await res.text();
    let json: { value?: unknown[]; "@odata.count"?: number; [k: string]: unknown };
    try {
      json = JSON.parse(text) as { value?: unknown[]; "@odata.count"?: number };
    } catch {
      throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 500)}`);
    }

    if (!res.ok) {
      throw new Error(enrichODataError(res.status, url.toString(), text));
    }

    const rows = Array.isArray(json.value) ? json.value : [];
    return {
      url: url.toString(),
      status: res.status,
      row_count: rows.length,
      count: json["@odata.count"],
      rows,
      raw: json,
    };
  });

  return { ...value, cache_hit };
}

/**
 * Build a safe default $select string from metadata:
 * - All measures (numeric Edm.Decimal / Int fields tagged as measure)
 * - If no annotated measures found, fall back to all Edm.Decimal properties (INA models often
 *   don't tag measures with Analytics.Measure annotation but use Decimal type)
 * - Key dimension text attributes (_VENDOR, _MATERIAL etc. – prefixed with _)
 * - The plain dimension keys themselves (VENDOR, MATERIAL …)
 * This avoids the INA MaxResultRecords limit that fires when ALL dimensions are selected.
 */
async function buildAutoSelect(spaceId: string, assetId: string): Promise<string | undefined> {
  try {
    const meta = await getAnalyticalMetadata(spaceId, assetId);
    // Pick the main (non-parameter) entity type
    const mainType = meta.entity_types.find((et) => !/Parameters$/i.test(et.name));
    if (!mainType) return undefined;

    const fields: string[] = [];

    // Annotated measures first
    for (const m of mainType.measures) {
      fields.push(m.name);
    }

    // Fallback: if no annotated measures, use all Edm.Decimal properties as numeric KPIs
    if (mainType.measures.length === 0) {
      for (const p of mainType.properties) {
        if (p.type === "Edm.Decimal" || p.type === "Edm.Int32" || p.type === "Edm.Int64") {
          fields.push(p.name);
        }
      }
    }

    // Dimension names + their text companion (_DIMENSION)
    for (const d of mainType.dimensions) {
      fields.push(d.name);
      // Include the text attribute if present in properties
      const textField = `_${d.name}`;
      if (mainType.properties.some((p) => p.name === textField)) {
        fields.push(textField);
      }
    }

    // Remove duplicates, keep order
    const unique = [...new Set(fields)];
    return unique.length > 0 ? unique.join(",") : undefined;
  } catch {
    return undefined;
  }
}

export async function queryAnalyticalModel(options?: QueryOptions): Promise<QueryResult> {
  const { spaceId, assetId } = requireSpaceAsset(
    options?.spaceId,
    options?.assetId,
    config.datasphere,
  );
  const entitySet = await resolveAnalyticalEntitySet(spaceId, assetId, {
    entitySet: options?.entitySet,
    parameters: options?.parameters,
  });
  const top = options?.top ?? 5;

  // If no $select is given and no $apply is given, build an auto-select from metadata
  // to avoid the INA MaxResultRecords limit (selecting ALL dimensions explodes row counts).
  let selectToUse = options?.select;
  if (!selectToUse && !options?.apply) {
    selectToUse = await buildAutoSelect(spaceId, assetId);
  }

  const base = analyticalDataUrl(spaceId, assetId);
  const url = new URL(`${base}/${entitySet}`);
  url.searchParams.set("$top", String(top));
  if (options?.skip != null) url.searchParams.set("$skip", String(options.skip));
  // When $apply is present, omit $select (INA ignores aliases in $apply when $select is combined)
  if (selectToUse && !options?.apply) url.searchParams.set("$select", selectToUse);
  if (options?.filter) url.searchParams.set("$filter", options.filter);
  if (options?.apply) url.searchParams.set("$apply", options.apply);
  if (options?.orderby) url.searchParams.set("$orderby", options.orderby);
  if (options?.count) url.searchParams.set("$count", "true");

  const result = await runODataQuery(url);
  return { ...result, entity_set: entitySet, auto_select_used: !options?.select && !!selectToUse };
}

/** Return all measures and dimensions for an analytical asset – use this to find valid field names. */
export async function getAnalyticalFields(options?: {
  spaceId?: string;
  assetId?: string;
}): Promise<DspJson> {
  const { spaceId, assetId } = requireSpaceAsset(
    options?.spaceId,
    options?.assetId,
    config.datasphere,
  );
  const meta = await getAnalyticalMetadata(spaceId, assetId);
  const mainType = meta.entity_types.find((et) => !/Parameters$/i.test(et.name));
  const paramType = meta.entity_types.find((et) => /Parameters$/i.test(et.name));

  // If no annotated measures, fall back to Decimal/Int properties
  let measures = mainType?.measures ?? [];
  let measuresSource = "annotated";
  if (measures.length === 0 && mainType) {
    measures = mainType.properties
      .filter(
        (p) => p.type === "Edm.Decimal" || p.type === "Edm.Int32" || p.type === "Edm.Int64",
      )
      .map((p) => ({ name: p.name, type: p.type }));
    measuresSource = "inferred_from_decimal_type";
  }

  return {
    space_id: spaceId,
    asset_id: assetId,
    required_parameters: paramType?.keys ?? [],
    parameters: meta.parameters,
    measures,
    measures_source: measuresSource,
    dimensions: mainType?.dimensions ?? [],
    note: "Use measure/dimension 'name' values in $select and $orderby. Use 'required_parameters' keys as input parameters.",
  };
}

export async function getAnalyticalServiceDocument(options?: {
  spaceId?: string;
  assetId?: string;
}): Promise<unknown> {
  const { spaceId, assetId } = requireSpaceAsset(
    options?.spaceId,
    options?.assetId,
    config.datasphere,
  );
  return fetchAnalyticalService(spaceId, assetId);
}

export async function listRelationalEntities(options?: {
  spaceId?: string;
  assetId?: string;
  top?: number;
}): Promise<DspJson> {
  const { spaceId, assetId } = requireSpaceAsset(
    options?.spaceId,
    options?.assetId,
    config.datasphere,
  );
  const path = `/api/v1/datasphere/consumption/relational/${encodeURIComponent(spaceId)}/${encodeURIComponent(assetId)}/`;
  const key = cacheKey(["relational", "service", spaceId, assetId]);
  const doc = (
    await metadataCache.getOrFetch(key, async () => {
      const accessToken = await getValidAccessToken();
      const url = `${config.datasphere.tenantUrl.replace(/\/$/, "")}${path}`;
      const res = await dspFetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Accept-Language": "en",
        },
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`Relational service document failed (${res.status}): ${text.slice(0, 800)}`);
      }
      return JSON.parse(text) as DspJson;
    })
  ).value;
  const entities = Array.isArray(doc.value) ? doc.value : [];
  const limit = options?.top ?? 50;
  return {
    space_id: spaceId,
    asset_id: assetId,
    entities: entities.slice(0, limit),
    entity_count: Math.min(entities.length, limit),
    total_entities: entities.length,
    metadata_url: `${path}$metadata`,
  };
}

export async function queryRelationalEntity(options: {
  spaceId?: string;
  assetId?: string;
  entityName: string;
  select?: string;
  filter?: string;
  orderby?: string;
  top?: number;
  skip?: number;
  count?: boolean;
}): Promise<QueryResult> {
  const { spaceId, assetId } = requireSpaceAsset(
    options.spaceId,
    options.assetId,
    config.datasphere,
  );
  const base = `${config.datasphere.tenantUrl.replace(/\/$/, "")}/api/v1/datasphere/consumption/relational/${encodeURIComponent(spaceId)}/${encodeURIComponent(assetId)}/${encodeURIComponent(options.entityName)}`;
  const url = new URL(base);
  url.searchParams.set("$top", String(options.top ?? 100));
  if (options.skip != null) url.searchParams.set("$skip", String(options.skip));
  if (options.select) url.searchParams.set("$select", options.select);
  if (options.filter) url.searchParams.set("$filter", options.filter);
  if (options.orderby) url.searchParams.set("$orderby", options.orderby);
  if (options.count) url.searchParams.set("$count", "true");

  const result = await runODataQuery(url);
  return { ...result, entity_set: options.entityName };
}

/** Preload metadata/service docs for default or given assets (warms metadata cache). */
export async function warmCache(options?: {
  spaceId?: string;
  assetIds?: string[];
}): Promise<DspJson> {
  const spaceId = options?.spaceId?.trim() || config.datasphere.spaceId;
  if (!spaceId) {
    throw new Error("Provide space_id or set DSP_SPACE_ID in .env.");
  }
  const assetIds =
    options?.assetIds?.length
      ? options.assetIds
      : config.datasphere.assetId
        ? [config.datasphere.assetId]
        : [];

  const warmed: string[] = [];
  await Promise.all(
    assetIds.map(async (assetId) => {
      await Promise.all([
        fetchAnalyticalService(spaceId, assetId),
        getAnalyticalMetadata(spaceId, assetId),
      ]);
      warmed.push(`${spaceId}/${assetId}`);
    }),
  );

  return {
    ok: true,
    space_id: spaceId,
    warmed_assets: warmed,
    cache: getCacheStats(),
  };
}
