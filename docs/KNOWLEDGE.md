# CLI knowledge base map

Handbook lives under `cli-knowledge/` (not under `.cursor`). Load **one** chapter or CSN section per task.

```
cli-knowledge/
  README.md          # index
  logic/             # how the CLI works
  examples/          # copy-ready JSON
  csn-structure/     # definition schemas
```

| Need | Open |
|------|------|
| Commands, auth, spaces, tasks, pitfalls | `cli-knowledge/logic/` |
| Copy-paste create payloads | `cli-knowledge/examples/` |
| CSN / space / connection / marketplace shapes | `cli-knowledge/csn-structure/` |
| When to use MCP vs CLI | `cli-knowledge/logic/mcp-interop.md` |

Create/change objects via **`datasphere_cli_run`** only (plus `datasphere_cli_status`). Read rows via consumption tools. See [CLI.md](CLI.md) and [CREATE_THEN_QUERY.md](CREATE_THEN_QUERY.md).
