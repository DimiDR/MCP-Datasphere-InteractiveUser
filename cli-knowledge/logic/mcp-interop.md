# MCP interop — when *not* to use the CLI

This knowledge base pairs with **sap-datasphere-interactive-mcp** (Interactive Usage). Load this page when the request involves reading data, searching the catalog, or deciding CLI vs consumption tools.

## The rule

| | Owns | Because |
|---|---|---|
| **CLI** (`datasphere_cli_run`) | Creating and changing objects, tenant administration | Design-time and admin APIs |
| **MCP consumption tools** | Reading data and metadata, catalog search | Consumption and Catalog OData |

**Only two MCP tools stream the CLI:** `datasphere_cli_status` and `datasphere_cli_run`. There is no tool per CLI command.

**The CLI cannot read data rows.** `objects <type> read` returns the JSON *definition*, not the data. For rows use `query_relational_entity` or `query_analytical_model`.

**One shared Interactive token.** Call `login_interactive` once. CLI tools reuse that token via a temp secrets file. Do **not** run `datasphere login` in parallel (same `localhost:8080` callback). This is **not** a separate technical-user MCP identity.

## Intent → MCP tool

| Intent | MCP tool | CLI equivalent |
|---|---|---|
| Read rows / analytical query | `query_relational_entity`, `query_analytical_model` | none |
| Search assets | `search_catalog`, `list_catalog_assets`, `get_space_assets` | none |
| Asset metadata (consumption) | `get_asset_details`, `get_analytical_model` | `objects <type> read` (definition only) |
| Objects not exposed for consumption | `datasphere_cli_run` → `objects <type> list` | same |
| Is the CLI usable? | `datasphere_cli_status` | `config host show`, version |

## Stay on the CLI (via `datasphere_cli_run`) for

`spaces` · `users` · `global-roles` · `scoped-roles` · `workload` · `configuration` · `objects <type> create|update|delete` · `tasks` · `job-status` · `marketplace` · `catalog` · `dbusers`

## Two traps

**Invisible ≠ non-existent.** Consumption catalog tools only see objects that are deployed *and* exposed. Use `datasphere_cli_run` with `objects <type> list` before concluding something is missing.

**Empty views.** A view with only `@DataWarehouse.sqlEditor.query` and no CSN `query` block can deploy and still return 0 rows forever. See `validated-findings.md` and `../csn-structure/E-object-definition-formats.md`.

## Nobody can do this

Writing data rows. Neither the CLI nor this MCP inserts table contents — use a flow, a database user + SQL client, or UI upload.
