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
3. The runner validates permissions, command and target Space before authentication, then spawns `node …/terminal.js` with normalized argv and injected `--host` and `--secrets-file`. Only authorized object deletions receive `--force`.
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

## Guardrails

See [Safeguard configuration](../README.md#safeguard-configuration). The default is read-only. Object create/update require `DSP_ALLOW_WRITE=true`; delete requires `DSP_ALLOW_DELETE=true`. Both require the explicit target Space in `DSP_ALLOWED_WRITE_SPACES`. `DSP_ALLOW_READ=false` blocks CLI and consumption reads, including cache hits.

Multiple Spaces and naming conventions can be combined:

```dotenv
DSP_ALLOW_READ=true
DSP_ALLOW_WRITE=true
DSP_ALLOW_DELETE=false
DSP_ALLOWED_WRITE_SPACES=DEV_SPACE,TEST_SPACE
DSP_ALLOW_READ_OBJECT_PREFIXES=SOURCE_,HRA
DSP_ALLOW_WRITE_OBJECT_PREFIXES=ABZ*
```

Only objects starting with `SOURCE_` or `HRA` can be read; only objects starting with `ABZ` can be created/updated in those two Spaces. The lists are independent: write permission does not imply read permission. Set `DSP_ALLOW_DELETE=true` to permit deletion under the write restrictions. Matching is case-sensitive; `ABZ` and `ABZ*` are equivalent. Each empty prefix setting disables only its own name restriction, not the Space or operation checks.

With write prefixes configured, delete requires `--technical-name`. Create/update require exactly one JSON payload (`--file-path` or `--input`). All submitted object and auxiliary definition names are checked, and the CLI receives a private snapshot of the checked JSON. Unknown payload sections/formats are blocked.

With read prefixes configured, object reads require an allowed `--technical-name`; CLI responses are checked before return. CLI lists return only allowed technical names; custom list `--select` and bulk `spaces read` are blocked. Consumption catalog/search results are filtered too, and metadata/data queries check the asset name even on cache hits. Unknown CLI response shapes are withheld. See [Object naming restrictions](../README.md#object-naming-restrictions) for details. Remove the obsolete `DSP_ALLOWED_OBJECT_PREFIXES` variable after migrating its value to the write setting, or startup will fail with a migration message.

Only `objects <type> list/read/create/update/delete` and `spaces list/read` are approved. Other commands, including admin, task execution, job status, login/logout and config commands, are blocked. The internal cache initialization retry is an implementation exception.

Use explicit `--space` (or `-y`), except for `spaces list`. Only supported long options are accepted otherwise. Duplicates, unknown options, tenant/credential overrides and ambiguous short flags are rejected, not silently removed. For example, use `--file-path`, never `-F`. Policy is reported by `auth_status`; restart after changing environment values.

Stdout/stderr are UTF-8 decoded, token-like values redacted, and large dumps truncated.

## Graphical views / empty Data Builder canvas

`objects views create|update` with `GRAPHICALVIEWBUILDER` but **without** `editorSettings.uiModel` deploys and queries fine — the UI canvas stays empty. The runner inspects `--file-path` JSON and returns `warnings[]` when that happens. Fix: clone a complete `uiModel` from `objects views read` of a UI-built view (see `cli-knowledge/csn-structure` E.2.3a). Partial uiModels can cause join-mapping errors in the UI.

## Cache init

If the CLI reports an outdated local cache, the runner runs `config cache init` once with the same secrets/host and retries the original command.

## Windows

Prefer resolving to `node …\node_modules\@sap\datasphere-cli\terminal.js` (no `shell: true`). Set `DSP_CLI_PATH` to that `terminal.js` or to `datasphere.cmd` if needed.

## Rows vs definitions

- CLI `objects … read` → CSN **definition**, not data rows.
- Row queries → `query_relational_entity` / `query_analytical_model`.

CSN and command help: [KNOWLEDGE.md](KNOWLEDGE.md) and `cli-knowledge/`.
