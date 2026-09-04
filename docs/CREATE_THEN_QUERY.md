# Create with CLI, check data with MCP

One Interactive login covers both halves:

1. **Create / change** — `datasphere_cli_run` (design-time). CLI `create` / `update` **deploys by default** unless you pass `--no-deploy`.
2. **Check rows** — existing consumption tools (`search_catalog`, `query_relational_entity`, `query_analytical_model`).

Only **two** tools talk to the CLI: `datasphere_cli_status` and `datasphere_cli_run`. Everything else is OData consumption.

## Sequence

1. `login_interactive` (once).
2. Build CSN JSON using `cli-knowledge/csn-structure/` and `cli-knowledge/examples/`.
3. `datasphere_cli_run` with e.g.  
   `["objects","views","create","--space","MYSPACE","--file-path","view.json"]`  
   and `working_directory` pointing at the folder that contains the file.
4. Optional: `["job-status","get","--job-id","…"]` if the CLI returns a job id.
5. `search_catalog` or `get_space_assets` for the technical name.
6. `list_relational_entities` / `get_analytical_model` → `query_*`.

## Why a query might look empty

- Object not **deployed** yet.
- Not **exposed** for consumption (`@DataWarehouse.consumption.external: false`). CLI `objects … list` still sees it; catalog search does not.
- View missing a real CSN `query` block (only `@DataWarehouse.sqlEditor.query`) → deploy succeeds, MCP returns **0 rows** with no error. See `cli-knowledge/logic/validated-findings.md` and `cli-knowledge/csn-structure/`.
- Local table created but never loaded — neither CLI nor MCP inserts rows.

## What neither side does

Writing data rows. Load data via flows, a DB user + SQL client, or the UI.
