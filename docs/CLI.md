# Datasphere CLI bridge

This MCP exposes the official `@sap/datasphere-cli` through **exactly two tools**. Consumption login, catalog, and query tools do **not** call the CLI.

| Tool | Purpose |
|------|---------|
| `datasphere_cli_status` | Diagnose CLI install + MCP Interactive token |
| `datasphere_cli_run` | Pass argv for one `datasphere …` command |

There is no MCP tool per CLI command (no `spaces_list`, no `objects_views_create`, …). Pass those as argv to `datasphere_cli_run`.

## Shared Interactive token

1. Call `login_interactive` (browser OAuth, stores `.token.json`).
2. CLI tools refresh that token and write a **temporary** secrets file (`tenantUrl` + `access_token` + client fields).
3. The runner spawns `node …/terminal.js` with your argv, then appends `--host`, `--secrets-file`, and `--force` (required by the CLI parser).
4. The temp file is deleted afterward.

Do **not** run `datasphere login` in parallel — it uses the same `localhost:8080` callback. Session ownership stays with this MCP.

## `datasphere_cli_status`

Returns CLI path/version, tenant host, whether the MCP token is valid, and short notes (e.g. install hint).

## `datasphere_cli_run`

Parameters:

| Param | Description |
|-------|-------------|
| `args` | String array of tokens **after** `datasphere` |
| `working_directory` | Optional cwd for `--file-path` (default: project root) |
| `timeout_seconds` | 30–600 (default from `DSP_CLI_TIMEOUT_SECONDS` or 120) |

Examples:

```json
["spaces", "list"]
```

```json
["objects", "views", "list", "--space", "DIMITRITEST"]
```

```json
["objects", "views", "create", "--space", "MYSPACE", "--file-path", "view.json"]
```

```json
["job-status", "get", "--job-id", "<id>"]
```

## Guardrails

Blocked via the runner (use MCP auth tools instead):

- `login` / `logout`
- `config secrets reset`

Stripped if the caller passes them (MCP injects its own):

- `--secrets-file` / `-s`
- `--access-token` / `-a`
- `--client-id` / `-c` / `--client-secret` / `-C`
- `--host` / `-H`
- `--force` / `-F`

Stdout/stderr are UTF-8 decoded, token-like values redacted, and large dumps truncated.

## Cache init

If the CLI reports an outdated local cache, the runner runs `config cache init` once with the same secrets/host and retries the original command.

## Windows

Prefer resolving to `node …\node_modules\@sap\datasphere-cli\terminal.js` (no `shell: true`). Set `DSP_CLI_PATH` to that `terminal.js` or to `datasphere.cmd` if needed.

## Rows vs definitions

- CLI `objects … read` → CSN **definition**, not data rows.
- Row queries → `query_relational_entity` / `query_analytical_model`.

CSN and command help: [KNOWLEDGE.md](KNOWLEDGE.md) and `cli-knowledge/`.
