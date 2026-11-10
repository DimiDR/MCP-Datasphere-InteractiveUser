# SAP Datasphere Interactive User MCP

Interactive Usage OAuth plus **consumption** catalog / analytical / relational OData — and a thin bridge to the official `datasphere` CLI.

## Server-side relational counts

`count_relational_entity` counts rows of an exposed relational consumption entity
with `$count=true&$top=0`, optionally filtered, without returning data rows or using
the query cache. Missing counts are unavailable, never zero. It respects current
user authorizations and the existing read safeguards. Unpublished local tables
and replication UI Metrics are not supported. See [Counts and limitations](docs/COUNTS.md).

## Complete technical table inventory

Use **`list_table_names`** first for requests such as “list all technical table
names”. Unlike the consumption catalog, this inventories design-time tables,
including tables not exposed for consumption. With no `space_id`, it enumerates
all accessible Spaces via the official CLI; `table_type` defaults to `all`
(`local-tables` and `remote-tables`). Existing read safeguards remain enforced.

Backend pages are traversed automatically until an empty raw page, including
when name restrictions reduce the visible page. Errors, truncated output and
non-advancing pagination are rejected instead of reported as a complete list.
The result includes `total_count`, per-Space counts and compact rows containing
`space_id`, `technical_name` and `type`. Output defaults to 100 names (maximum
200): **while `has_more` is true, call again with `skip=next_skip`** to get every
name. `enumeration_complete` means the backend scan completed, not that the
output page contains every name. Each call scans live; concurrent object changes
can affect subsequent pages. Views/models are excluded. SAP permissions and
configured read prefixes limit the scope; this is not a tenant-admin inventory.

The tool needs the installed official CLI and this MCP's OAuth session. It uses
the existing automatic token refresh; a genuinely missing/invalid session still
requires `login_interactive`. No credentials or tenant configuration are changed.

After building, restart/reconnect the MCP in your client to load the new tool.
Read-only live protocol check (uses the configured tenant and current token):
`npx tsx scripts/smoke-cli.ts --tables` from the project directory.

For generic CLI calls, **`tables` is not an object type**: use `local-tables`
and `remote-tables`. `objects <type> list` returns **one page**, default 25,
not all objects. Use explicit `--top` and `--skip`; `list_page.raw_count` records
the backend page size before read-prefix filtering. An empty visible list alone
does not prove completion. Prefer `list_table_names` for table inventories.

## CLI surface: exactly two generic runner tools

`datasphere_cli_status` includes a read-only `cache` diagnostic for the default
`~/.@sap/datasphere-cli/.cache/settings.json`: configured host, saved HTTPS host,
and matching/missing/invalid status. A different saved default is **not proof**
that an explicitly scoped command used the wrong tenant. Legacy cache locations
are reported as unchecked. Secrets are never read from the cache for diagnostics.
The runner explicitly sets `--host` and its private secrets file. Recognized cache
errors (including “Failed to initialize the local CLI cache”) trigger one existing
`config cache init` retry with the same host/session. Initialization can still fail
due to authentication, permissions, networking or damaged cache; the MCP does
not automatically delete or move the global cache, which may be shared by other
sessions. Matching settings alone do not establish discovery-cache health.

| Tool | Role |
|------|------|
| `datasphere_cli_status` | Is the CLI installed? Is this MCP logged in? |
| `datasphere_cli_run` | Run approved object CRUD and Space read/list commands as an argv array |

There is **no** MCP tool per CLI command. Consumption tools (`login_interactive`, `search_catalog`, `query_*`, …) never call the CLI. `list_table_names` and `get_space_runs_in_window` use it internally for read-only enumeration.

## Monitoring, connection and admin REST tools

| Tool | REST endpoint |
|------|---------------|
| `get_task_log_history` | `GET /api/v1/datasphere/tasks/logs/<space>/objects/<object>` |
| `get_task_log` | `GET /api/v1/datasphere/tasks/logs/<space>/<logId>` (`detail`: `status` / `details` / `extended`) |
| `get_task_log_v2` | `GET /dwaas-core/api/v2/tasks/logs/<space>/<logId>` on `DSP_TENANT_URL`, with SAP extended Accept format; live-tested, not a partition Metrics API |
| `list_replication_flows` | `GET /api/v1/datasphere/spaces/<space>/replicationflows` |
| `get_replication_flow_status` | `GET /dwaas-core/api/v1/spaces/<space>/replication-flows/<name>/status` on `DSP_TENANT_URL` (verified with tenant discovery) |
| `get_replication_flow_run_details` | Extended task log + current flow/dataset status; explicit Delta Records Count availability |
| `get_space_runs_in_window` | All runs of a Space in a time window (aggregates the task log endpoints above, see below) |
| `search_api_discovery` | `GET /dwaas-core/api/v1/discovery` on `DSP_TENANT_URL`, filtered by regex (paths, summaries, schemas) |
| `list_connections` | `GET /api/v1/datasphere/spaces/<space>/connections` |
| `get_connection` | `GET /api/v1/datasphere/spaces/<space>/connections/<name>` |
| `validate_connection` | `GET /api/v1/datasphere/spaces/<space>/connections/<name>/validation` |
| `list_certificates` | `GET /api/v1/datasphere/configuration/security/certificates` |
| `list_users` / `get_user` | `GET /api/v1/scim2/Users` / `GET /api/v1/scim2/Users/<id>` |

Write-gated control tools (same gate as object create/update: `DSP_ALLOW_WRITE=true`, Space in `DSP_ALLOWED_WRITE_SPACES`, name matching `DSP_ALLOW_WRITE_OBJECT_PREFIXES` if set):

| Tool | REST endpoint |
|------|---------------|
| `run_task_chain` | `POST /api/v1/datasphere/tasks/chains/<space>/run/<chain>` (optional `inputParameters`) |
| `retry_task_chain` | `POST /api/v1/datasphere/tasks/chains/<space>/retry/<chain>` |
| `cancel_task_chain` | `POST /api/v1/datasphere/tasks/chains/<space>/cancel/<logId>` (owning chain is resolved first when write prefixes are set) |
| `control_replication_flow` | `POST /api/v1/datasphere/spaces/<space>/replication-flows/<name>/<start\|pause\|resume\|stop>` |
| `control_replication_flow_object` | `POST …/replication-flows/<name>/objects/<object>/<pause-object\|resume-object\|restart-object>` |

Control calls fetch an `x-csrf-token` (with session cookies) from a GET on the same API first. SAP additionally requires Data Warehouse Data Integration (`--U-----`) and, for Interactive Usage, authorized consent. Connection create/edit/delete, certificate upload/delete and SCIM user changes are not exposed.

Sources: [Managing Users via the SCIM 2.0 API](https://help.sap.com/docs/SAP_DATASPHERE/9f804b8efa8043539289f42f372c4862/1ca8c4a9467f43df9ae6d4ed3734f05a.html), [Managing Tasks via the REST API](https://help.sap.com/docs/SAP_DATASPHERE/c8a54ee704e94e15926551293243fd1d/274f2736465c4c48a091c675880502a2.html), [Controlling Replication Flows via API](https://help.sap.com/docs/SAP_DATASPHERE/be5967d099974c69b77f4549425ca4c0/5e60730b5b4c45f49e261af6fdaad72b.html), [Managing Connectivity via the REST API](https://help.sap.com/docs/SAP_DATASPHERE/be5967d099974c69b77f4549425ca4c0/5aafe32418b14f7e99528b49f48bd3ac.html). Task/replication flow reads require a scoped role with Data Warehouse Data Integration (`-R------`) on the Space; no authorized consent is needed for reads. Certificates and users need a global administrator role; user tools return personal data and are not affected by object prefixes. Connection tools use `DSP_TENANT_URL`, mask credential-like fields (SAP already omits credentials) and need the Data Warehouse Connection privilege; `validate_connection` contacts the remote system but changes nothing. Task and replication flow requests go to `DSP_API_URL` (default `DSP_TENANT_URL`); SAP documents a separate `<tenant_id>.api.<regional_host>` host, so set it if calls return 404. Responses are never cached.

With `DSP_ALLOW_READ_OBJECT_PREFIXES`, object names are checked before the request; task logs of other objects are rejected and nested runs (task chain children) of other objects are removed; replication flow and connection lists keep only permitted names (connection names count as object names); `get_task_log` requires `detail` `details` or `extended` so the owning object can be checked. Free-text log messages are not inspected.

### Space-wide run overview

`get_space_runs_in_window` answers questions like "what failed today in `MY_SPACE`?" in one call instead of one `get_task_log_history` call per object:

1. Lists the objects to check: replication flows via REST (falls back to the CLI), task chains / transformation flows / data flows via `datasphere objects <type> list` (`object_types`, default `replication-flows` + `task-chains`). Pass `object_ids` to check specific objects only.
2. Reads each object's task log history (6 requests in parallel, max 2000 objects) and keeps runs overlapping the window.
3. Loads the extended log of problem runs (`details`: `problems` = not `COMPLETED`/`RUNNING`, default; `all`; `none`) and returns their non-INFO messages (max 20 per run).

Window: `date` (`YYYY-MM-DD`, one local day in `time_zone`, default `Europe/Berlin`, DST-safe) or `from`/`to` (ISO 8601); without either, today until now. Max 31 days. The result contains `status_counts` for all runs in the window, `runs` (newest first, filtered by `statuses`, max `max_runs`, default 200), `parent_task_chains`, per-object `errors` and, with `include_csv`, a semicolon-separated CSV string. The run user is omitted (personal data). Read prefixes apply as for the single-object tools; objects outside them appear in `errors`.

Runs reported by SAP as `RUNNING` with a valid `end_time` are marked with `status_flags: ["RUNNING_WITH_END_TIME"]` and a `status_note`, including with `details: "none"`. SAP status and raw timing values remain unchanged. The end time and runtime may refer to a previous attempt after a retry, not completion or duration of the current attempt; the flag alone does not confirm a retry. CSV exports append `status_flags` and `status_note` columns.

Examples (chat): "Which replication flows failed yesterday in SP_X?" → `date` + `statuses: ["FAILED"]`. "What ran between 14:00 and 15:00?" → `from`/`to`, `details: "none"`. "Export today's runs as CSV" → `include_csv: true`.

`search_api_discovery` searches the tenant's OpenAPI discovery document, e.g. `pattern: "replication|metric"` or `schema: "ReplicationFlowStatus"`, to locate endpoints not yet covered by a tool. It returns API metadata only.

## Safeguard configuration

### Replication object metrics limitation

`get_task_log` with `extended` returns all **task message details**, not all UI Metrics.
`get_replication_flow_run_details` resolves the flow from the authorized log ID and combines
that historical task log with **current** dataset status (source, target, state, last transfer).
The latter is not a historical snapshot of the requested run. It preserves the task log if
the status request fails. `delta_records_count.availability` is explicitly `unavailable`:
neither verified endpoint exposes the UI's **Delta Records Count**. `deltaloadCount` is not
that metric and missing must never be reported as zero.

To implement automatic Delta Records Count retrieval, capture the specific request and JSON
response when opening **Run Details → Object → Metrics** in the browser Network tab.
Provide only the request path/method and sanitized JSON; do not share Authorization headers,
cookies, tokens, client secrets, or an unredacted HAR. OAuth access and historical run association
must be verified before adding an endpoint. Screenshot values are not API-fetched metrics.

Existing installations now default to read-only. Configure these variables in `.env` or the MCP process environment, then restart the server. Process environment values take precedence over `.env`. `auth_status` reports the effective `safeguard` policy.

```dotenv
DSP_ALLOW_READ=true
DSP_ALLOW_WRITE=true
DSP_ALLOW_DELETE=false
DSP_ALLOWED_WRITE_SPACES=MY_DEV_SPACE,MY_TEST_SPACE
DSP_ALLOW_READ_OBJECT_PREFIXES=SOURCE_,HRA
DSP_ALLOW_WRITE_OBJECT_PREFIXES=ABZ*
```

This example allows reading objects starting with `SOURCE_` or `HRA` across SAP-authorized Spaces, and creating/updating objects starting with `ABZ` only in `MY_DEV_SPACE` or `MY_TEST_SPACE`. Deletion stays blocked. Read and write permissions are independent: add `ABZ` to the read list if you also want to read back or query those objects.

| Variable | Default | Meaning |
|---|---|---|
| `DSP_ALLOW_READ` | `true` | Allow catalog, metadata, OData and CLI reads, including cached data |
| `DSP_ALLOW_WRITE` | `false` | Allow object create/update, including their automatic deployment, and task chain / replication flow control |
| `DSP_ALLOW_DELETE` | `false` | Independently allow object deletion |
| `DSP_ALLOWED_WRITE_SPACES` | empty | Exact, case-sensitive Space IDs allowed for both write and delete; comma-separated; empty allows none |
| `DSP_ALLOW_WRITE_OBJECT_PREFIXES` | empty | Optional case-sensitive prefixes for create/update/delete; comma-separated; empty means no name restriction |
| `DSP_ALLOW_READ_OBJECT_PREFIXES` | empty | Independent case-sensitive prefixes for object reads, metadata, queries, catalog/search and CLI lists; empty means no read-name restriction |

Booleans accept only `true` or `false`; malformed values stop startup. Space IDs accept letters, digits and underscores, with no wildcard. `DSP_SPACE_ID` is still only a consumption default, never a write authorization. To enable deletion in the listed Spaces, explicitly set `DSP_ALLOW_DELETE=true`.

### Object naming restrictions

`DSP_ALLOWED_OBJECT_PREFIXES` has been replaced by `DSP_ALLOW_READ_OBJECT_PREFIXES` and `DSP_ALLOW_WRITE_OBJECT_PREFIXES`. Move the old value to the write variable and remove the old variable; configure the read variable separately. A non-empty old variable prevents startup to avoid accidentally dropping an existing restriction. Neither new prefix variable overrides `DSP_ALLOW_READ`, `DSP_ALLOW_WRITE`, `DSP_ALLOW_DELETE` or SAP permissions.

The read rule checks technical asset/object names, including default assets and cache hits. Catalog/search responses omit disallowed or unidentifiable assets. With read restrictions, catalog `count` reflects visible entries in the fetched page, so pages can be shorter; it is not a tenant-wide total. A requested catalog `select` additionally includes `assetId` for checking. Source references inside an allowed object's definition may mention other objects; this does not authorize separate reads of their definitions or data. The rule controls the queried asset, not row-level lineage or the data it derives from its sources.

CLI lists return only permitted technical names. Custom CLI list `--select` and `spaces read` (which can export multiple definitions) are blocked when read prefixes are set; use catalog tools or individual object reads. CLI read responses are validated before return; unknown JSON formats, mixed permitted/disallowed definitions and raw backend errors are withheld. `spaces list` and consumption Space information remain available.

`DSP_ALLOW_WRITE_OBJECT_PREFIXES=ABZ*,HRA,Z_TEAM_` permits names such as `ABZ_SALES`, `HRA_EMPLOYEES` and `Z_TEAM_VIEW`. `OTHER_VIEW`, `X_ABZ_SALES` and `abz_sales` are blocked for mutations. `ABZ*` and `ABZ` are equivalent prefix matches; `HRA` also permits `HRA1`. Use `HRA_` if the underscore must follow the prefix. Spaces around entries are trimmed and duplicates removed. A bare `*`, internal wildcards, empty entries and other invalid patterns stop startup. This setting applies equally to every allowed write Space and does not restrict reads.

Deletion checks the explicit `--technical-name`. Create/update check the names inside JSON from exactly one `--file-path` or `--input`; a matching filename alone is insufficient. Every submitted name must match, including helper definitions and keys in `businessLayerDefinitions`, `editorSettings` and `sharing`. Existing source-object references may use other names because those references do not submit a new definition of the source.

With naming restrictions enabled, supported object roots are `definitions`, `dataflows`, `transformationflows` and `taskchains`, with the appropriate root required for the command. Metadata fields `meta`, `version` and `$version` are accepted. Unknown sections (including `i18n` and `namespace`), unsupported export formats, malformed JSON and missing/ambiguous object names are rejected rather than passed through unchecked. The CLI executes a private snapshot of the validated JSON, also on a retry; later changes to the original input file cannot change that payload.

The CLI bridge accepts `objects <type> list/read/create/update/delete` and `spaces list/read`. An explicit `--space` (or `-y`) is mandatory except for `spaces list`. Use long options: short flags such as `-F` have different meanings per command and are rejected. Duplicate options, unknown commands/options, credential overrides and tenant overrides are rejected before authentication or execution. Administrative commands, task execution, bulk Space imports and standalone deployment commands are blocked, even when write/delete is enabled. The internal CLI cache initialization retry remains available. `--force` is injected only for authorized object deletions.

This is a safeguard for operations through this MCP, not a replacement for SAP permissions. The Space restriction checks the target of the command; it does not analyze dependencies or cross-Space sharing inside object definitions. Direct CLI use outside the MCP is unaffected. Authentication/status and local logout/cache maintenance remain available with reads disabled.

Run `npm test` for the build and offline safeguard checks. No tenant changes are made by these tests.

`scripts/` contains only these tests (`*.test.mjs`, run by `npm test`) and `smoke-cli.ts`, a manual check against a real tenant (`npx tsx scripts/smoke-cli.ts`). Ad-hoc evaluations belong in MCP tools such as `get_space_runs_in_window`, not in scripts.

## Requirements

- Node.js 20+
- OAuth client with **Purpose = Interactive Usage** (Authorization Code)
- Optional: global `@sap/datasphere-cli` for design-time work

## Setup

```powershell
copy .env.example .env
# Fill DSP_OAUTH_* and DSP_TENANT_URL
npm install
npm run build
```

Optional: `npm run login` writes `.token.json` without starting the MCP.

## Cursor

```json
{
  "mcpServers": {
    "sap-datasphere-interactive": {
      "command": "node",
      "args": ["C:\\path\\to\\MCP-Datasphere-InteractiveUser\\dist\\index.js"],
      "cwd": "C:\\path\\to\\MCP-Datasphere-InteractiveUser"
    }
  }
}
```

See [docs/CURSOR.md](docs/CURSOR.md).

## CLI examples

```json
{ "tool": "datasphere_cli_status" }
```

```json
{
  "tool": "datasphere_cli_run",
  "args": ["spaces", "list"]
}
```

Create then verify rows: [docs/CREATE_THEN_QUERY.md](docs/CREATE_THEN_QUERY.md).

## Docs

| Doc | Topic |
|-----|--------|
| [docs/CLI.md](docs/CLI.md) | The two CLI tools, auth bridge, guardrails |
| [docs/CREATE_THEN_QUERY.md](docs/CREATE_THEN_QUERY.md) | Create with CLI, query with MCP |
| [docs/KNOWLEDGE.md](docs/KNOWLEDGE.md) | `cli-knowledge/` map |
| [docs/INTERACTIVE_LOGIN.md](docs/INTERACTIVE_LOGIN.md) | OAuth troubleshooting |
| [docs/CURSOR.md](docs/CURSOR.md) | Register in Cursor |
| [cli-knowledge/README.md](cli-knowledge/README.md) | CSN, examples, CLI handbook |

## Typical consumption workflow

1. `login_interactive`
2. `test_connection` / `search_catalog`
3. `get_analytical_fields` → `query_analytical_model` (or relational query tools)
