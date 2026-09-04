# SAP Datasphere Interactive User MCP

Interactive Usage OAuth plus **consumption** catalog / analytical / relational OData — and a thin bridge to the official `datasphere` CLI.

## CLI surface: exactly two tools

| Tool | Role |
|------|------|
| `datasphere_cli_status` | Is the CLI installed? Is this MCP logged in? |
| `datasphere_cli_run` | Run any design-time/admin CLI command as an argv array |

There is **no** MCP tool per CLI command. All ~220 `datasphere` commands go through `datasphere_cli_run`. Consumption tools (`login_interactive`, `search_catalog`, `query_*`, …) never call the CLI.

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
