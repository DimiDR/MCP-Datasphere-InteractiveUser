#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { analyticalDataUrl, config } from "./config.js";
import {
  clearCache,
  fetchAnalyticalService,
  getAnalyticalModel,
  getAssetDetails,
  getCacheStats,
  getCurrentUserFromToken,
  getSpaceAssets,
  getSpaceInfo,
  listCatalogAssets,
  listSpaces,
  searchCatalog,
  testConnection,
} from "./catalog.js";
import {
  getAnalyticalFields,
  getAnalyticalServiceDocument,
  listRelationalEntities,
  queryAnalyticalModel,
  queryRelationalEntity,
  warmCache,
} from "./datasphere.js";
import { authStatus, clearToken, loginInteractive } from "./oauth.js";

function text(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

function err(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true as const,
  };
}

const server = new McpServer({
  name: "sap-datasphere-interactive-mcp",
  version: "1.2.2",
});

const parametersSchema = z
  .record(z.string())
  .optional()
  .describe(
    "Input parameters for parameterized analytical models. Keys must match $metadata (use get_analytical_model).",
  );

// ── Auth ──────────────────────────────────────────────────────────────────

server.tool("auth_status", "Show Interactive User OAuth token status and configured defaults from .env.", {}, async () => {
  try {
    return text({
      ...authStatus(),
      tenant_url: config.datasphere.tenantUrl,
      default_space_id: config.datasphere.spaceId || null,
      default_asset_id: config.datasphere.assetId || null,
      default_analytical_url:
        config.datasphere.spaceId && config.datasphere.assetId
          ? analyticalDataUrl()
          : null,
      client_id: config.oauth.clientId,
      redirect_uri: config.oauth.redirectUri,
      secret_configured: Boolean(process.env.DSP_OAUTH_CLIENT_SECRET?.trim()),
      cache: getCacheStats(),
    });
  } catch (e) {
    return err(e);
  }
});

server.tool(
  "login_interactive",
  "OAuth Authorization Code login (Interactive Usage). Opens browser, listens on DSP_OAUTH_REDIRECT_URI, stores token in .token.json.",
  {
    open_browser: z.boolean().optional().describe("Open browser (default true)."),
    timeout_seconds: z.number().int().min(30).max(900).optional(),
  },
  async ({ open_browser, timeout_seconds }) => {
    try {
      const result = await loginInteractive({
        openBrowser: open_browser,
        timeoutMs: (timeout_seconds ?? 300) * 1000,
      });
      return text({ ok: true, message: "Login successful.", ...result, ...authStatus() });
    } catch (e) {
      return err(e);
    }
  },
);

server.tool("logout", "Delete stored OAuth token (.token.json) and clear in-memory API cache.", {}, async () => {
  clearToken();
  clearCache();
  return text({ ok: true, message: "Token and cache cleared." });
});

server.tool("clear_cache", "Clear in-memory TTL cache for metadata, service documents, and catalog lists.", {}, async () => {
  clearCache();
  return text({ ok: true, cache: getCacheStats() });
});

server.tool(
  "warm_cache",
  "Preload analytical metadata/service docs into cache for faster first queries. Uses DSP_SPACE_ID / DSP_ASSET_ID when omitted.",
  {
    space_id: z.string().optional(),
    asset_ids: z.array(z.string()).optional().describe("Assets to warm; defaults to DSP_ASSET_ID."),
  },
  async ({ space_id, asset_ids }) => {
    try {
      return text(await warmCache({ spaceId: space_id, assetIds: asset_ids }));
    } catch (e) {
      return err(e);
    }
  },
);

server.tool("test_connection", "Verify token and consumption catalog API reachability.", {}, async () => {
  try {
    return text(await testConnection());
  } catch (e) {
    return err(e);
  }
});

server.tool("get_current_user", "Decode JWT claims from the Interactive Usage access token.", {}, async () => {
  try {
    return text(getCurrentUserFromToken());
  } catch (e) {
    return err(e);
  }
});

// ── Catalog ─────────────────────────────────────────────────────────────

server.tool(
  "list_spaces",
  "List spaces from the consumption catalog API.",
  {
    include_details: z.boolean().optional().describe("Return full space objects."),
  },
  async ({ include_details }) => {
    try {
      return text(await listSpaces(include_details ?? false));
    } catch (e) {
      return err(e);
    }
  },
);

server.tool(
  "get_space_info",
  "Get one space from the consumption catalog.",
  { space_id: z.string() },
  async ({ space_id }) => {
    try {
      return text(await getSpaceInfo(space_id));
    } catch (e) {
      return err(e);
    }
  },
);

server.tool(
  "get_space_assets",
  "List consumption assets in a space.",
  {
    space_id: z.string(),
    top: z.number().int().min(1).max(500).optional(),
    skip: z.number().int().min(0).optional(),
    filter: z.string().optional(),
    orderby: z.string().optional(),
    select: z.string().optional(),
    count: z.boolean().optional(),
  },
  async ({ space_id, top, skip, filter, orderby, select, count }) => {
    try {
      return text(await getSpaceAssets(space_id, { top, skip, filter, orderby, select, count }));
    } catch (e) {
      return err(e);
    }
  },
);

server.tool(
  "list_catalog_assets",
  "List assets across the consumption catalog.",
  {
    top: z.number().int().min(1).max(500).optional(),
    skip: z.number().int().min(0).optional(),
    filter: z.string().optional(),
    orderby: z.string().optional(),
    select: z.string().optional(),
    count: z.boolean().optional(),
  },
  async ({ top, skip, filter, orderby, select, count }) => {
    try {
      return text(await listCatalogAssets({ top, skip, filter, orderby, select, count }));
    } catch (e) {
      return err(e);
    }
  },
);

server.tool(
  "get_asset_details",
  "Get catalog metadata for one asset.",
  { space_id: z.string(), asset_id: z.string() },
  async ({ space_id, asset_id }) => {
    try {
      return text(await getAssetDetails(space_id, asset_id));
    } catch (e) {
      return err(e);
    }
  },
);

server.tool(
  "search_catalog",
  "Search catalog assets by terms (client-side filter over catalog/assets).",
  {
    query: z.string().describe("Search terms matched against name, id, description, space."),
    top: z.number().int().min(1).max(200).optional(),
  },
  async ({ query, top }) => {
    try {
      return text(await searchCatalog(query, top ?? 50));
    } catch (e) {
      return err(e);
    }
  },
);

// ── Analytical ────────────────────────────────────────────────────────────

server.tool(
  "get_analytical_model",
  "Service document + parsed $metadata: dimensions, measures, input parameters, entity sets. TIP: Use get_analytical_fields for a focused view of just measures and dimensions with their names and labels - those are the field names to use in $select/$orderby.",
  {
    space_id: z.string().optional().describe("Defaults to DSP_SPACE_ID."),
    asset_id: z.string().optional().describe("Defaults to DSP_ASSET_ID."),
    include_metadata: z.boolean().optional(),
  },
  async ({ space_id, asset_id, include_metadata }) => {
    try {
      const space = space_id || config.datasphere.spaceId;
      const asset = asset_id || config.datasphere.assetId;
      if (!space || !asset) {
        throw new Error("Provide space_id and asset_id or set DSP_SPACE_ID / DSP_ASSET_ID.");
      }
      return text(await getAnalyticalModel(space, asset, include_metadata ?? true));
    } catch (e) {
      return err(e);
    }
  },
);

server.tool(
  "get_analytical_fields",
  "List all available measures and dimensions for an analytical asset. ALWAYS call this first before query_analytical_model to get valid field names for $select and $orderby. Returns: required_parameters (input params needed), measures (numeric KPIs like NETPRICE, ORDER_QUAN), dimensions (grouping fields like VENDOR, MATERIAL).",
  {
    space_id: z.string().optional(),
    asset_id: z.string().optional(),
  },
  async ({ space_id, asset_id }) => {
    try {
      return text(await getAnalyticalFields({ spaceId: space_id, assetId: asset_id }));
    } catch (e) {
      return err(e);
    }
  },
);

server.tool(
  "get_analytical_service",
  "OData service document for an analytical asset (entity sets).",
  {
    space_id: z.string().optional(),
    asset_id: z.string().optional(),
  },
  async ({ space_id, asset_id }) => {
    try {
      return text(await getAnalyticalServiceDocument({ spaceId: space_id, assetId: asset_id }));
    } catch (e) {
      return err(e);
    }
  },
);

server.tool(
  "query_analytical_model",
  "Query analytical consumption data. IMPORTANT WORKFLOW: (1) Call get_analytical_fields first to get valid measure/dimension names. (2) Always pass $select with only the fields you need (e.g. 'VENDOR,_VENDOR,NETPRICE,ORDER_QUAN') - omitting $select auto-selects all measures+dimensions from metadata. (3) Use $orderby on a measure to rank (e.g. 'NETPRICE desc'). (4) Use 'parameters' for required input params like CALYEAR and PURCH_ORG. NOTE on aggregation: when 'apply' is set, 'select' is ignored server-side - the response columns are exactly the groupby dimensions plus the aggregate alias names you define inside 'apply' (e.g. apply='groupby((VENDOR),aggregate(NETPRICE with sum as TOTAL_NETPRICE))' returns rows shaped {VENDOR, TOTAL_NETPRICE}); do not also pass 'select', and use the alias name (not the raw measure name) in 'orderby' when ranking on an aggregate. NOTE on errors: a 400 'Unable to process parameter X: Invalid value' means the asset itself rejects that parameter value (often an authorization-restricted or fixed BW/HANA variable) - retrying with a different value on the SAME asset will not help; try a different asset_id in the space instead.",
  {
    space_id: z.string().optional(),
    asset_id: z.string().optional(),
    entity_set: z
      .string()
      .optional()
      .describe("Full entity path after asset id. Omit when using parameters."),
    parameters: parametersSchema,
    select: z.string().optional(),
    filter: z.string().optional(),
    apply: z.string().optional(),
    orderby: z.string().optional(),
    top: z.number().int().min(1).max(10000).optional(),
    skip: z.number().int().min(0).optional(),
    count: z.boolean().optional(),
  },
  async ({ space_id, asset_id, entity_set, parameters, select, filter, apply, orderby, top, skip, count }) => {
    try {
      return text(
        await queryAnalyticalModel({
          spaceId: space_id,
          assetId: asset_id,
          entitySet: entity_set,
          parameters,
          select,
          filter,
          apply,
          orderby,
          top: top ?? 5,
          skip,
          count,
        }),
      );
    } catch (e) {
      return err(e);
    }
  },
);

// ── Relational ────────────────────────────────────────────────────────────

server.tool(
  "list_relational_entities",
  "List OData entity sets exposed by a relational consumption asset.",
  {
    space_id: z.string().optional(),
    asset_id: z.string().optional(),
    top: z.number().int().min(1).max(1000).optional(),
  },
  async ({ space_id, asset_id, top }) => {
    try {
      return text(await listRelationalEntities({ spaceId: space_id, assetId: asset_id, top }));
    } catch (e) {
      return err(e);
    }
  },
);

server.tool(
  "query_relational_entity",
  "Query row-level data from a relational consumption entity.",
  {
    space_id: z.string().optional(),
    asset_id: z.string().optional(),
    entity_name: z.string().describe("Entity set name from list_relational_entities."),
    select: z.string().optional(),
    filter: z.string().optional(),
    orderby: z.string().optional(),
    top: z.number().int().min(1).max(50000).optional(),
    skip: z.number().int().min(0).optional(),
    count: z.boolean().optional(),
  },
  async ({ space_id, asset_id, entity_name, select, filter, orderby, top, skip, count }) => {
    try {
      return text(
        await queryRelationalEntity({
          spaceId: space_id,
          assetId: asset_id,
          entityName: entity_name,
          select,
          filter,
          orderby,
          top,
          skip,
          count,
        }),
      );
    } catch (e) {
      return err(e);
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
