import { XMLParser } from "fast-xml-parser";
import { cacheKey, clearCache, getCacheStats, metadataCache } from "./cache.js";
import { config } from "./config.js";
import { dspFetch } from "./http.js";
import { authStatus, getValidAccessToken, loadToken } from "./oauth.js";

export { clearCache, getCacheStats };

const ANALYTICS_VOCAB = "com.sap.vocabularies.Analytics.v1";
const COMMON_VOCAB = "com.sap.vocabularies.Common.v1";

export type DspJson = Record<string, unknown>;

async function authHeaders(accept: string): Promise<Record<string, string>> {
  const accessToken = await getValidAccessToken();
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: accept,
    "Accept-Language": "en",
  };
}

function buildUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): string {
  const base = config.datasphere.tenantUrl.replace(/\/$/, "");
  const url = new URL(path.startsWith("http") ? path : `${base}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === false) continue;
      if (v === true) url.searchParams.set(k, "true");
      else url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function dspGetJson(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<DspJson> {
  const url = buildUrl(path, params);
  const res = await dspFetch(url, { headers: await authHeaders("application/json") });
  const text = await res.text();
  let json: DspJson;
  try {
    json = JSON.parse(text) as DspJson;
  } catch {
    throw new Error(`Non-JSON response (${res.status}) for ${url}: ${text.slice(0, 500)}`);
  }
  if (!res.ok) {
    throw new Error(`GET ${url} failed (${res.status}): ${text.slice(0, 800)}`);
  }
  return json;
}

export async function dspGetText(
  path: string,
  accept = "application/xml",
): Promise<{ status: number; text: string; url: string }> {
  const url = buildUrl(path);
  const res = await dspFetch(url, { headers: await authHeaders(accept) });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GET ${url} failed (${res.status}): ${text.slice(0, 800)}`);
  }
  return { status: res.status, text, url };
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function localName(tag: string): string {
  const i = tag.lastIndexOf(":");
  return i >= 0 ? tag.slice(i + 1) : tag;
}

function termMatches(
  raw: string,
  prefixes: Record<string, string>,
  vocabulary: string,
  name: string,
): boolean {
  const idx = raw.lastIndexOf(".");
  const prefix = idx >= 0 ? raw.slice(0, idx) : "";
  const local = idx >= 0 ? raw.slice(idx + 1) : raw;
  return local === name && prefixes[prefix] === vocabulary;
}

function findKey(obj: DspJson | undefined, name: string): unknown {
  if (!obj) return undefined;
  if (name in obj) return obj[name];
  for (const [k, v] of Object.entries(obj)) {
    if (localName(k) === name) return v;
  }
  return undefined;
}

/** Parse OData V4 analytical $metadata into dimensions, measures, keys, parameters. */
export function parseAnalyticalMetadata(xml: string): {
  entity_types: Array<{
    name: string;
    keys: string[];
    dimensions: Array<{ name: string; type?: string; label?: string }>;
    measures: Array<{ name: string; type?: string; label?: string }>;
    properties: Array<{ name: string; type?: string; nullable?: boolean; max_length?: number }>;
  }>;
  parameters: Array<{
    entity_type: string;
    names: string[];
    properties: Array<{ name: string; type?: string; nullable?: boolean; max_length?: number }>;
  }>;
  entity_sets: Array<{ name: string; entity_type?: string }>;
} {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: false,
  });
  const doc = parser.parse(xml) as DspJson;
  const edmx = (findKey(doc, "Edmx") ?? doc) as DspJson;
  const dataServices = findKey(edmx, "DataServices") as DspJson | undefined;
  const schemas = asArray(findKey(dataServices, "Schema") as DspJson) as DspJson[];
  const references = asArray(findKey(edmx, "Reference") as DspJson) as DspJson[];

  const prefixes: Record<string, string> = {
    Analytics: ANALYTICS_VOCAB,
    Common: COMMON_VOCAB,
  };
  for (const ref of references) {
    for (const inc of asArray(findKey(ref, "Include") as DspJson) as DspJson[]) {
      const ns = String(inc["@_Namespace"] ?? "");
      const alias = String(inc["@_Alias"] ?? ns);
      if (ns) {
        prefixes[alias] = ns;
        prefixes[ns] = ns;
      }
    }
  }

  const roles: Record<string, { role?: "dimension" | "measure"; label?: string }> = {};
  for (const schema of schemas) {
    for (const block of asArray(findKey(schema, "Annotations") as DspJson) as DspJson[]) {
      const target = String(block["@_Target"] ?? "");
      if (!target.includes("/")) continue;
      const prop = target.split("/").pop()!;
      const entry = roles[prop] ?? (roles[prop] = {});
      for (const ann of asArray(findKey(block, "Annotation") as DspJson) as DspJson[]) {
        const term = String(ann["@_Term"] ?? "");
        if (
          termMatches(term, prefixes, ANALYTICS_VOCAB, "Dimension") &&
          (ann["@_Bool"] ?? "true") === "true"
        ) {
          entry.role = "dimension";
        } else if (
          termMatches(term, prefixes, ANALYTICS_VOCAB, "Measure") &&
          (ann["@_Bool"] ?? "true") === "true"
        ) {
          entry.role = "measure";
        } else if (termMatches(term, prefixes, COMMON_VOCAB, "Label")) {
          entry.label = String(ann["@_String"] ?? "");
        }
      }
    }
  }

  const entity_types: Array<{
    name: string;
    keys: string[];
    dimensions: Array<{ name: string; type?: string; label?: string }>;
    measures: Array<{ name: string; type?: string; label?: string }>;
    properties: Array<{ name: string; type?: string; nullable?: boolean; max_length?: number }>;
  }> = [];
  const parameters: Array<{
    entity_type: string;
    names: string[];
    properties: Array<{ name: string; type?: string; nullable?: boolean; max_length?: number }>;
  }> = [];
  const entity_sets: Array<{ name: string; entity_type?: string }> = [];

  for (const schema of schemas) {
    const container = findKey(schema, "EntityContainer") as DspJson | undefined;
    for (const es of asArray(findKey(container, "EntitySet") as DspJson) as DspJson[]) {
      entity_sets.push({
        name: String(es["@_Name"] ?? ""),
        entity_type: String(es["@_EntityType"] ?? "").split(".").pop(),
      });
    }

    for (const et of asArray(findKey(schema, "EntityType") as DspJson) as DspJson[]) {
      const name = String(et["@_Name"] ?? "");
      const keyNode = findKey(et, "Key") as DspJson | undefined;
      const keys = (asArray(findKey(keyNode, "PropertyRef") as DspJson) as DspJson[]).map((k) =>
        String(k["@_Name"] ?? ""),
      );
      const properties = (asArray(findKey(et, "Property") as DspJson) as DspJson[]).map((p) => ({
        name: String(p["@_Name"] ?? ""),
        type: p["@_Type"] ? String(p["@_Type"]) : undefined,
        nullable: p["@_Nullable"] === undefined ? undefined : p["@_Nullable"] !== "false",
        max_length: p["@_MaxLength"] ? Number(p["@_MaxLength"]) : undefined,
      }));

      if (/Parameters$/i.test(name) && keys.length > 0) {
        parameters.push({ entity_type: name, names: keys, properties });
      }

      const dimensions: Array<{ name: string; type?: string; label?: string }> = [];
      const measures: Array<{ name: string; type?: string; label?: string }> = [];
      for (const prop of properties) {
        const role = roles[prop.name];
        if (role?.role === "dimension") {
          dimensions.push({ name: prop.name, type: prop.type, label: role.label });
        } else if (role?.role === "measure") {
          measures.push({ name: prop.name, type: prop.type, label: role.label });
        }
      }

      entity_types.push({ name, keys, dimensions, measures, properties });
    }
  }

  return { entity_types, parameters, entity_sets };
}

export async function listSpaces(includeDetails = false): Promise<unknown> {
  const key = cacheKey(["catalog", "spaces", includeDetails ? "full" : "summary"]);
  const { value: data } = await metadataCache.getOrFetch(key, () =>
    dspGetJson("/api/v1/datasphere/consumption/catalog/spaces"),
  );
  const spaces = Array.isArray(data.value) ? data.value : [];
  if (includeDetails) return { count: spaces.length, value: spaces };
  return {
    count: spaces.length,
    value: spaces.map((s) => {
      const space = s as DspJson;
      return {
        id: space.spaceId ?? space.id,
        name: space.spaceName ?? space.name,
        status: space.status ?? "ACTIVE",
        description: space.description ?? "",
      };
    }),
  };
}

export async function getSpaceInfo(spaceId: string): Promise<DspJson> {
  return dspGetJson(
    `/api/v1/datasphere/consumption/catalog/spaces('${encodeURIComponent(spaceId)}')`,
  );
}

export async function getSpaceAssets(
  spaceId: string,
  options?: {
    top?: number;
    skip?: number;
    filter?: string;
    orderby?: string;
    select?: string;
    count?: boolean;
  },
): Promise<DspJson> {
  const data = await dspGetJson(
    `/api/v1/datasphere/consumption/catalog/spaces('${encodeURIComponent(spaceId)}')/assets`,
    {
      $top: options?.top ?? 50,
      $skip: options?.skip ?? 0,
      $filter: options?.filter,
      $orderby: options?.orderby,
      $select: options?.select,
      $count: options?.count || undefined,
    },
  );
  const assets = Array.isArray(data.value) ? data.value : [];
  return {
    space_id: spaceId,
    value: assets,
    count: data["@odata.count"] ?? assets.length,
    returned: assets.length,
  };
}

export async function listCatalogAssets(options?: {
  top?: number;
  skip?: number;
  filter?: string;
  orderby?: string;
  select?: string;
  count?: boolean;
}): Promise<DspJson> {
  const data = await dspGetJson("/api/v1/datasphere/consumption/catalog/assets", {
    $top: options?.top ?? 50,
    $skip: options?.skip ?? 0,
    $filter: options?.filter,
    $orderby: options?.orderby,
    $select: options?.select,
    $count: options?.count || undefined,
  });
  const assets = Array.isArray(data.value) ? data.value : [];
  return {
    value: assets,
    count: data["@odata.count"] ?? assets.length,
    returned: assets.length,
  };
}

export async function getAssetDetails(spaceId: string, assetId: string): Promise<DspJson> {
  return dspGetJson(
    `/api/v1/datasphere/consumption/catalog/spaces('${encodeURIComponent(spaceId)}')/assets('${encodeURIComponent(assetId)}')`,
  );
}

/** Client-side catalog search (consumption search endpoint is often 404). */
export async function searchCatalog(query: string, top = 50): Promise<DspJson> {
  const key = cacheKey(["catalog", "assets", "all"]);
  const { value: data, cache_hit } = await metadataCache.getOrFetch(key, () =>
    dspGetJson("/api/v1/datasphere/consumption/catalog/assets", { $top: 500, $skip: 0 }),
  );
  const assets = Array.isArray(data.value) ? (data.value as DspJson[]) : [];
  const terms = query
    .replace(/^SCOPE:\S+\s*/i, "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const matched = assets.filter((a) => {
    const hay = [a.name, a.assetId, a.id, a.spaceId, a.assetType, a.description, a.label]
      .map((x) => String(x ?? "").toLowerCase())
      .join(" ");
    return terms.every((t) => hay.includes(t));
  });
  return {
    query,
    search_mode: "client_side_filter",
    catalog_cache_hit: cache_hit,
    count: matched.length,
    value: matched.slice(0, top),
    note: "Filtered locally from catalog/assets (search endpoint often unavailable).",
  };
}

export type ParsedAnalyticalMetadata = ReturnType<typeof parseAnalyticalMetadata>;

export async function getAnalyticalMetadata(
  spaceId: string,
  assetId: string,
): Promise<ParsedAnalyticalMetadata> {
  const key = cacheKey(["analytical", "metadata", spaceId, assetId]);
  const { value } = await metadataCache.getOrFetch(key, async () => {
    const servicePath = `/api/v1/datasphere/consumption/analytical/${encodeURIComponent(spaceId)}/${encodeURIComponent(assetId)}`;
    const meta = await dspGetText(`${servicePath}/$metadata`);
    return parseAnalyticalMetadata(meta.text);
  });
  return value;
}

async function fetchAnalyticalService(spaceId: string, assetId: string): Promise<DspJson> {
  const key = cacheKey(["analytical", "service", spaceId, assetId]);
  const servicePath = `/api/v1/datasphere/consumption/analytical/${encodeURIComponent(spaceId)}/${encodeURIComponent(assetId)}`;
  const { value } = await metadataCache.getOrFetch(key, () => dspGetJson(`${servicePath}/`));
  return value;
}

export { fetchAnalyticalService };

export async function getAnalyticalModel(
  spaceId: string,
  assetId: string,
  includeMetadata = true,
): Promise<DspJson> {
  const servicePath = `/api/v1/datasphere/consumption/analytical/${encodeURIComponent(spaceId)}/${encodeURIComponent(assetId)}`;

  if (!includeMetadata) {
    const service = await fetchAnalyticalService(spaceId, assetId);
    return { space_id: spaceId, asset_id: assetId, service };
  }

  const [service, metadata] = await Promise.all([
    fetchAnalyticalService(spaceId, assetId),
    getAnalyticalMetadata(spaceId, assetId),
  ]);

  return {
    space_id: spaceId,
    asset_id: assetId,
    service,
    metadata,
    metadata_url: buildUrl(`${servicePath}/$metadata`),
    metadata_cached: true,
  };
}

export async function testConnection(): Promise<DspJson> {
  const status = authStatus();
  if (!status.authenticated && !status.has_refresh_token) {
    return {
      connected: false,
      oauth: status,
      message: "Not authenticated. Call login_interactive first.",
    };
  }
  try {
    await getValidAccessToken();
    const spaces = await dspGetJson("/api/v1/datasphere/consumption/catalog/spaces", {
      $top: 1,
    });
    return {
      connected: true,
      oauth: authStatus(),
      tenant_url: config.datasphere.tenantUrl,
      catalog_spaces_reachable: true,
      sample_space_count: Array.isArray(spaces.value) ? spaces.value.length : 0,
    };
  } catch (e) {
    return {
      connected: false,
      oauth: authStatus(),
      tenant_url: config.datasphere.tenantUrl,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export function getCurrentUserFromToken(): DspJson {
  const token = loadToken();
  if (!token?.access_token) {
    return { authenticated: false, message: "No token. Call login_interactive." };
  }
  const parts = token.access_token.split(".");
  if (parts.length < 2) {
    return { authenticated: true, message: "Token present but JWT payload not parseable." };
  }
  let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const pad = payload.length % 4;
  if (pad) payload += "=".repeat(4 - pad);
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64").toString("utf8")) as DspJson;
    return {
      authenticated: true,
      user_id: claims.user_id ?? claims.sub,
      email: claims.email ?? claims.user_name,
      given_name: claims.given_name,
      family_name: claims.family_name,
      client_id: claims.client_id ?? claims.cid,
      scopes: claims.scope,
      grant_type: claims.grant_type,
      tenant_zid: claims.zid,
      token_issued_at: claims.iat
        ? new Date(Number(claims.iat) * 1000).toISOString()
        : undefined,
      token_expires_at: claims.exp
        ? new Date(Number(claims.exp) * 1000).toISOString()
        : undefined,
    };
  } catch (e) {
    return {
      authenticated: true,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
