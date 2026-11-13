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
  countRelationalEntity,
  getAnalyticalFields,
  getAnalyticalServiceDocument,
  listRelationalEntities,
  queryAnalyticalModel,
  queryRelationalEntity,
  warmCache,
} from "./datasphere.js";
import { authStatus, clearToken, loginInteractive } from "./oauth.js";
import { datasphereCliRun, datasphereCliStatus } from "./cli.js";
import { listTableNames, tableTypes } from "./tables.js";
import {
  cancelTaskChain,
  controlReplicationFlow,
  controlReplicationFlowObject,
  getConnection,
  getReplicationFlowStatus,
  getReplicationFlowRunDetails,
  getSpaceRunsInWindow,
  getTaskLog,
  getTaskLogV2,
  getTaskLogHistory,
  getUser,
  listCertificates,
  listConnections,
  listReplicationFlows,
  listUsers,
  replicationFlowActions,
  replicationObjectActions,
  retryTaskChain,
  runDetailModes,
  runObjectTypes,
  runTaskChain,
  searchApiDiscovery,
  validateConnection,
} from "./monitoring.js";

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
  version: "1.3.0",
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
      safeguard: config.policy,
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

server.tool(
  "count_relational_entity",
  "Fresh server-side row count of an exposed relational consumption entity using $count=true and $top=0 (no rows downloaded). Optional filter. Respects current user authorizations; not a physical table count unless the entity represents that table. Does not support unpublished local tables or replication Metrics. Missing count is unavailable, never zero. Large exact counts may be returned as decimal strings.",
  {
    space_id: z.string().optional(),
    asset_id: z.string().optional(),
    entity_name: z.string().describe("Entity set name from list_relational_entities."),
    filter: z.string().optional(),
    timeout_seconds: z.number().int().min(1).max(600).optional(),
  },
  async ({ space_id, asset_id, entity_name, filter, timeout_seconds }) => {
    try {
      return text(await countRelationalEntity({ spaceId: space_id, assetId: asset_id, entityName: entity_name, filter, timeoutSeconds: timeout_seconds }));
    } catch (e) {
      return err(e);
    }
  },
);

// ── Monitoring (read-only REST: Tasks API, Replication Flow API) ──────────

server.tool(
  "get_task_log_history",
  "Run history (task logs) of one object, e.g. a task chain, view persistence or flow, via the Tasks REST API. Use the returned logId with get_task_log for step details. Requires a scoped role with Data Warehouse Data Integration (-R------) on the Space.",
  {
    space_id: z.string(),
    object_id: z.string().describe("Technical name of the task chain / view / flow."),
  },
  async ({ space_id, object_id }) => {
    try {
      return text(await getTaskLogHistory(space_id, object_id));
    } catch (e) {
      return err(e);
    }
  },
);

server.tool(
  "get_task_log",
  "Details of one task run by log ID via the Tasks REST API. detail: 'status' (status only), 'details' (default; messages and task chain child nodes), 'extended' (all message details). Does NOT include replication object Metrics / Delta Records Count. Use get_replication_flow_run_details to combine task logs with current dataset status and explicit metrics availability.",
  {
    space_id: z.string(),
    log_id: z.union([z.string(), z.number().int()]).transform(String),
    detail: z.enum(["status", "details", "extended"]).optional(),
  },
  async ({ space_id, log_id, detail }) => {
    try {
      return text(await getTaskLog(space_id, log_id, detail ?? "details"));
    } catch (e) {
      return err(e);
    }
  },
);

server.tool(
  "get_task_log_v2",
  "Read a task run using the separate GET /dwaas-core/api/v2/tasks/logs/{space}/{logId} endpoint advertised as get-extended in tenant discovery. Not the v1 extended Accept format. Returns actual backend log fields; does not infer loaded records or UI partition Metrics. Missing counts are not zero. Read object restrictions apply to the owning object and child logs.",
  {
    space_id: z.string(),
    log_id: z.union([z.string(), z.number().int().nonnegative().safe()]).transform(String),
  },
  async ({ space_id, log_id }) => {
    try {
      return text(await getTaskLogV2(space_id, log_id));
    } catch (e) {
      return err(e);
    }
  },
);

server.tool(
  "list_replication_flows",
  "List replication flows in a Space via the Replication Flow REST API (read-only).",
  { space_id: z.string() },
  async ({ space_id }) => {
    try {
      return text(await listReplicationFlows(space_id));
    } catch (e) {
      return err(e);
    }
  },
);

server.tool(
  "get_replication_flow_status",
  "Run status of one replication flow via the Replication Flow REST API (read-only; start/stop/pause are not exposed).",
  {
    space_id: z.string(),
    technical_name: z.string(),
  },
  async ({ space_id, technical_name }) => {
    try {
      return text(await getReplicationFlowStatus(space_id, technical_name));
    } catch (e) {
      return err(e);
    }
  },
);

// ── Connections (read-only REST) ──────────────────────────────────────────

server.tool(
  "get_replication_flow_run_details",
  "Read a replication flow run by log ID: extended task messages plus CURRENT flow/dataset status. Current status is not historical metrics for the requested log. Delta Records Count is explicitly unavailable until the UI Metrics endpoint is verified; never interpret deltaloadCount as records or missing as zero.",
  {
    space_id: z.string(),
    log_id: z.union([z.string(), z.number().int()]).transform(String),
  },
  async ({ space_id, log_id }) => {
    try {
      return text(await getReplicationFlowRunDetails(space_id, log_id));
    } catch (e) {
      return err(e);
    }
  },
);

server.tool(
  "get_space_runs_in_window",
  "Overview of all task runs in a Space within a time window (e.g. 'what failed today in SP_X?'). Lists the Space's replication flows / task chains (or uses object_ids), reads each object's task log history in parallel, keeps runs overlapping the window, and returns status counts, parent task chains and the non-INFO messages of problem runs. Use this instead of calling get_task_log_history per object. Window: 'date' (one local day in time_zone) or 'from'/'to' (ISO 8601); default = today so far. Max 31 days, 2000 objects. Run user is omitted. include_csv adds a semicolon-separated CSV string.",
  {
    space_id: z.string(),
    date: z.string().optional().describe("Local calendar day YYYY-MM-DD in time_zone. Do not combine with from/to."),
    from: z.string().optional().describe("ISO 8601 start, e.g. 2026-10-30T13:00:00+01:00. Default: local midnight today."),
    to: z.string().optional().describe("ISO 8601 end. Default: now."),
    time_zone: z.string().optional().describe("IANA time zone for 'date' and local times in the output. Default Europe/Berlin."),
    object_types: z.array(z.enum(runObjectTypes)).optional()
      .describe("Object types to enumerate when object_ids is not given. Default: replication-flows, task-chains. Types other than replication-flows are listed via the datasphere CLI."),
    object_ids: z.array(z.string()).optional().describe("Check only these technical names (skips enumeration)."),
    statuses: z.array(z.string()).optional().describe("Return only runs with these statuses, e.g. ['FAILED']. status_counts always covers all runs."),
    details: z.enum(runDetailModes).optional()
      .describe("Load extended logs for messages: 'problems' (default; runs not COMPLETED/RUNNING), 'all', or 'none'."),
    max_runs: z.number().int().min(1).max(1000).optional().describe("Max runs returned (newest first). Default 200."),
    include_csv: z.boolean().optional(),
  },
  async ({ space_id, date, from, to, time_zone, object_types, object_ids, statuses, details, max_runs, include_csv }) => {
    try {
      return text(await getSpaceRunsInWindow({
        spaceId: space_id, date, from, to, timeZone: time_zone, objectTypes: object_types, objectIds: object_ids,
        statuses, details, maxRuns: max_runs, includeCsv: include_csv,
      }));
    } catch (e) {
      return err(e);
    }
  },
);

server.tool(
  "search_api_discovery",
  "Search the tenant's API discovery document (GET /dwaas-core/api/v1/discovery on DSP_TENANT_URL) for endpoint paths, operation summaries and schema names matching a regex (case-insensitive), e.g. 'replication|metric'. Pass schema to get one schema definition (e.g. 'ReplicationFlowStatus'). Returns API metadata only, no object data. Useful to locate monitoring endpoints not covered by the other tools.",
  {
    pattern: z.string().min(1).max(200),
    schema: z.string().optional().describe("Exact schema name from components.schemas to return in full."),
    max_results: z.number().int().min(1).max(500).optional(),
  },
  async ({ pattern, schema, max_results }) => {
    try {
      return text(await searchApiDiscovery({ pattern, schema, maxResults: max_results }));
    } catch (e) {
      return err(e);
    }
  },
);

server.tool(
  "list_connections",
  "List connections of a Space via the Connections REST API (read-only; credential-like fields are masked).",
  { space_id: z.string() },
  async ({ space_id }) => {
    try {
      return text(await listConnections(space_id));
    } catch (e) {
      return err(e);
    }
  },
);

server.tool(
  "get_connection",
  "Read the JSON definition of one connection (SAP returns it without credentials; credential-like fields are additionally masked).",
  { space_id: z.string(), connection_name: z.string().describe("Technical name from list_connections.") },
  async ({ space_id, connection_name }) => {
    try {
      return text(await getConnection(space_id, connection_name));
    } catch (e) {
      return err(e);
    }
  },
);

server.tool(
  "validate_connection",
  "Run SAP's live connectivity check for one connection (changes nothing). Useful when replication flows or task chains fail on a source. Requires a scoped role with Data Warehouse Connection privileges on the Space.",
  { space_id: z.string(), connection_name: z.string() },
  async ({ space_id, connection_name }) => {
    try {
      return text(await validateConnection(space_id, connection_name));
    } catch (e) {
      return err(e);
    }
  },
);

// ── Certificates and users (read-only REST) ───────────────────────────────

server.tool(
  "list_certificates",
  "List TLS server certificates uploaded to the tenant (read-only). Requires a global role such as DW Administrator.",
  {},
  async () => {
    try {
      return text(await listCertificates());
    } catch (e) {
      return err(e);
    }
  },
);

server.tool(
  "list_users",
  "List tenant users and their roles via the SCIM 2.0 API (read-only; returns personal data). Requires a global user-administration role. filter uses SCIM syntax, e.g. 'userName eq \"JDOE\"' or 'emails.value co \"@example.com\"'.",
  {
    filter: z.string().optional(),
    start_index: z.number().int().min(1).optional(),
    count: z.number().int().min(1).max(500).optional(),
    sort_by: z.string().optional(),
    sort_order: z.enum(["ascending", "descending"]).optional(),
  },
  async ({ filter, start_index, count, sort_by, sort_order }) => {
    try {
      return text(await listUsers({ filter, startIndex: start_index, count: count ?? 50, sortBy: sort_by, sortOrder: sort_order }));
    } catch (e) {
      return err(e);
    }
  },
);

server.tool(
  "get_user",
  "Read one tenant user by SCIM user ID via the SCIM 2.0 API (read-only; returns personal data).",
  { user_id: z.string().describe("SCIM user ID from list_users.") },
  async ({ user_id }) => {
    try {
      return text(await getUser(user_id));
    } catch (e) {
      return err(e);
    }
  },
);

// ── Task chain / replication flow control (write-gated REST) ──────────────

const controlNote =
  "WRITE: requires DSP_ALLOW_WRITE=true, the Space in DSP_ALLOWED_WRITE_SPACES and a name matching DSP_ALLOW_WRITE_OBJECT_PREFIXES (if set); SAP additionally requires Data Warehouse Data Integration (--U-----) and authorized consent. Only call when the user explicitly asks.";

server.tool(
  "run_task_chain",
  `Start a task chain run via the Tasks REST API. Returns the new logId; follow up with get_task_log. ${controlNote}`,
  {
    space_id: z.string(),
    task_chain: z.string(),
    input_parameters: z.record(z.string()).optional().describe("Only for chains defined with input parameters."),
  },
  async ({ space_id, task_chain, input_parameters }) => {
    try {
      return text(await runTaskChain(space_id, task_chain, input_parameters));
    } catch (e) {
      return err(e);
    }
  },
);

server.tool(
  "retry_task_chain",
  `Retry the last run of a task chain (only if it FAILED or was CANCELED). ${controlNote}`,
  { space_id: z.string(), task_chain: z.string() },
  async ({ space_id, task_chain }) => {
    try {
      return text(await retryTaskChain(space_id, task_chain));
    } catch (e) {
      return err(e);
    }
  },
);

server.tool(
  "cancel_task_chain",
  `Cancel a running task chain by its log ID. ${controlNote}`,
  { space_id: z.string(), log_id: z.union([z.string(), z.number().int()]).transform(String) },
  async ({ space_id, log_id }) => {
    try {
      return text(await cancelTaskChain(space_id, log_id));
    } catch (e) {
      return err(e);
    }
  },
);

server.tool(
  "control_replication_flow",
  `Start, pause, resume or stop a replication flow via the Replication Flow REST API. ${controlNote}`,
  { space_id: z.string(), technical_name: z.string(), action: z.enum(replicationFlowActions) },
  async ({ space_id, technical_name, action }) => {
    try {
      return text(await controlReplicationFlow(space_id, technical_name, action));
    } catch (e) {
      return err(e);
    }
  },
);

server.tool(
  "control_replication_flow_object",
  `Pause, resume or restart one replication object inside a replication flow. ${controlNote}`,
  {
    space_id: z.string(),
    technical_name: z.string().describe("Replication flow technical name."),
    object_name: z.string().describe("Technical name of the replication object."),
    action: z.enum(replicationObjectActions),
  },
  async ({ space_id, technical_name, object_name, action }) => {
    try {
      return text(await controlReplicationFlowObject(space_id, technical_name, object_name, action));
    } catch (e) {
      return err(e);
    }
  },
);

// ── Design-time table inventory ──────────────────────────────────────────

server.tool(
  "list_table_names",
  "FIRST CHOICE for listing technical table names in Datasphere, including tables not exposed for consumption. Automatically enumerates local-tables and remote-tables using the guarded official CLI, across all accessible Spaces when space_id is omitted. No separate CLI login or CLI status call needed; token refresh uses this MCP's OAuth session. Returns total_count, per-Space counts and compact rows. Output is paginated: keep calling with next_skip while has_more=true to obtain ALL names; enumeration_complete refers to backend enumeration, not to the returned page. Read-only; SAP permissions and DSP_ALLOW_READ_OBJECT_PREFIXES apply. Failures are errors, never an empty/complete inventory. Views/models are excluded.",
  {
    space_id: z.string().optional().describe("Technical Space ID; omit for all accessible Spaces."),
    table_type: z.enum(["all", ...tableTypes]).optional().describe("Default all: local and remote tables."),
    top: z.number().int().min(1).max(200).optional().describe("Returned names per page (default 100, maximum 200)."),
    skip: z.number().int().nonnegative().optional().describe("Output offset; use next_skip from the previous result (default 0)."),
  },
  async ({ space_id, table_type, top, skip }) => {
    try {
      return text(await listTableNames({ spaceId: space_id, tableType: table_type, top, skip }));
    } catch (e) {
      return err(e);
    }
  },
);

// ── Datasphere CLI (exactly two generic runner tools) ─────────────────────

server.tool(
  "datasphere_cli_status",
  "Includes read-only cache settings diagnostics (saved vs configured host; mismatch is a warning, not proof of wrong routing). " +
  "Check whether the official datasphere CLI (@sap/datasphere-cli) is installed and whether this MCP's Interactive Usage token can drive it. ONE OF ONLY TWO CLI tools — there is no MCP tool per CLI command. Use before datasphere_cli_run. Login with login_interactive (not datasphere login).",
  {},
  async () => {
    try {
      return text(await datasphereCliStatus());
    } catch (e) {
      return err(e);
    }
  },
);

server.tool(
  "datasphere_cli_run",
  "For technical table inventories use list_table_names FIRST. Valid CLI table types are local-tables and remote-tables, NOT tables. Object list returns only one page (default --top 25); use explicit --top/--skip and list_page.raw_count to detect the end. " +
  "Replication flows: objects replication-flows create/update uses root replicationflows and kind sap.dis.replicationflow; harvest a matching working read export rather than inventing connector metadata. Write prefixes also apply to nested target table names. Structure/workflow: cli-knowledge/csn-structure/F-replication-flow-definition-format.md. " +
  "Run ONE approved official datasphere CLI command via argv. Safeguard: objects <type> list/read/create/update/delete and spaces list/read only; explicit --space required except spaces list. Use long options (or -y for space). DSP_ALLOW_READ/WRITE/DELETE, DSP_ALLOWED_WRITE_SPACES (comma-separated) and optional DSP_ALLOW_WRITE_OBJECT_PREFIXES (e.g. ABZ*,HRA) are enforced before execution. Name restrictions apply to create/update payload definitions and delete technical names; all submitted objects must match. Independent DSP_ALLOW_READ_OBJECT_PREFIXES restrict object reads, lists and consumption queries; write prefixes do not grant read access. With read prefixes, spaces read and custom CLI list select are blocked. ONE OF ONLY TWO CLI tools — pass args as a string array after `datasphere`, e.g. [\"spaces\",\"list\"] or [\"objects\",\"views\",\"create\",\"--space\",\"X\",\"--file-path\",\"view.json\"]. Uses this MCP's Interactive token (temp secrets file); do not pass secrets/login. For rows use query_analytical_model / query_relational_entity. CSN shapes: cli-knowledge/csn-structure/; examples: cli-knowledge/examples/; commands/pitfalls: cli-knowledge/logic/. Graphical views need editorSettings.uiModel or the Data Builder canvas stays empty (tool returns warnings[]). login/logout/config secrets reset are blocked.",
  {
    args: z
      .array(z.string())
      .min(1)
      .describe("CLI tokens after `datasphere`, e.g. [\"spaces\",\"list\"]."),
    working_directory: z
      .string()
      .optional()
      .describe("Cwd for --file-path payloads (default: MCP project root)."),
    timeout_seconds: z.number().int().min(30).max(600).optional(),
  },
  async ({ args, working_directory, timeout_seconds }) => {
    try {
      const result = await datasphereCliRun({
        args,
        workingDirectory: working_directory,
        timeoutSeconds: timeout_seconds,
      });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
        isError: !result.ok,
      };
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
