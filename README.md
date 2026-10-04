# SAP Datasphere Interactive User MCP

Interactive Usage OAuth plus **consumption** catalog / analytical / relational OData — and a thin bridge to the official `datasphere` CLI.

## CLI surface: exactly two tools

| Tool | Role |
|------|------|
| `datasphere_cli_status` | Is the CLI installed? Is this MCP logged in? |
| `datasphere_cli_run` | Run approved object CRUD and Space read/list commands as an argv array |

There is **no** MCP tool per CLI command. Consumption tools (`login_interactive`, `search_catalog`, `query_*`, …) never call the CLI.

## Safeguard configuration

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
| `DSP_ALLOW_WRITE` | `false` | Allow object create/update, including their automatic deployment |
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
