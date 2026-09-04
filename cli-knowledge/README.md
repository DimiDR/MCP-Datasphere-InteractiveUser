# CLI knowledge base

Handbook for the official `datasphere` CLI (`@sap/datasphere-cli`), used with **this** Interactive Usage MCP.

## How this MCP uses the CLI

Only **two** MCP tools talk to the CLI:

- `datasphere_cli_status` — install + session check  
- `datasphere_cli_run` — argv passthrough for any design-time/admin command  

Login with `login_interactive` (shared Interactive token). Do **not** run a second `datasphere login` on port 8080. Read rows with `query_analytical_model` / `query_relational_entity` — never with the CLI.

## Folders

| Folder | Contents |
|--------|----------|
| [`logic/`](logic/) | Chapters, command reference (Appendix A), workflows, validated pitfalls, helper scripts |
| [`examples/`](examples/) | Copy-ready JSON payloads |
| [`csn-structure/`](csn-structure/) | Space / connection / marketplace / object CSN schemas (Appendices B–E) |

## Context budget

1. Match intent → **one** `logic/chapters/…` file (or `logic/validated-findings.md` for silent-wrong-data).  
2. Payload shape → **one** file under `csn-structure/`.  
3. Copy-paste start → `examples/`.  
4. Flags → `datasphere … --help` or `logic/appendices/A-command-reference.md`.  
5. Do not load the whole tree in one turn.

## Intent → where

| Intent | Open |
|--------|------|
| Silent wrong data / root-key traps | [`logic/validated-findings.md`](logic/validated-findings.md) |
| MCP vs CLI routing | [`logic/mcp-interop.md`](logic/mcp-interop.md) |
| Install / OAuth (prefer MCP login) | [`logic/chapters/02-installation-and-authentication.md`](logic/chapters/02-installation-and-authentication.md) |
| Modeling objects overview | [`logic/chapters/07-modeling-objects.md`](logic/chapters/07-modeling-objects.md) |
| Object CSN | [`csn-structure/E-object-definition-formats.md`](csn-structure/E-object-definition-formats.md) |
| Tasks / job-status | [`logic/chapters/08-tasks-job-status.md`](logic/chapters/08-tasks-job-status.md) |
| Helper scripts | [`logic/scripts/README.md`](logic/scripts/README.md) |

Create/change via `datasphere_cli_run`. Prefer that over the Python scripts under `logic/scripts/` when working from chat.
