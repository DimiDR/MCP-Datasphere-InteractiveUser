# Datasphere CLI – documentation map

Files live under `cli-knowledge/` (not under `.cursor`).

```
cli-knowledge/
  README.md
  logic/
    chapters/01–12
    appendices/A-command-reference.md
    validated-findings.md
    workflows.md
    mcp-interop.md
    scripts/
  examples/
  csn-structure/   # former appendices B–E
```

MCP CLI surface: **only** `datasphere_cli_status` and `datasphere_cli_run`.

## Chapters (`logic/chapters/`)

| # | File | Topic |
|---|---|---|
| 01 | [chapters/01-introduction-and-overview.md](chapters/01-introduction-and-overview.md) | Introduction and command overview |
| 02 | [chapters/02-installation-and-authentication.md](chapters/02-installation-and-authentication.md) | Installation and authentication |
| 03 | [chapters/03-local-cli-and-tenant-config.md](chapters/03-local-cli-and-tenant-config.md) | Local CLI and tenant configuration |
| 04 | [chapters/04-users-and-roles.md](chapters/04-users-and-roles.md) | Users and roles (+ DAC privileges) |
| 05 | [chapters/05-spaces-dbusers-workload.md](chapters/05-spaces-dbusers-workload.md) | Spaces, DB users, workload |
| 06 | [chapters/06-connections-certificates-ucl.md](chapters/06-connections-certificates-ucl.md) | Connections, certificates, UCL |
| 07 | [chapters/07-modeling-objects.md](chapters/07-modeling-objects.md) | Modeling objects |
| 08 | [chapters/08-tasks-job-status.md](chapters/08-tasks-job-status.md) | Tasks, replication flows, job status |
| 09 | [chapters/09-data-marketplace.md](chapters/09-data-marketplace.md) | Data Marketplace |
| 10 | [chapters/10-catalog.md](chapters/10-catalog.md) | SAP Catalog |
| 11 | [chapters/11-programmatic-usage.md](chapters/11-programmatic-usage.md) | Programmatic usage (Node.js) |
| 12 | [chapters/12-troubleshooting-and-best-practices.md](chapters/12-troubleshooting-and-best-practices.md) | Troubleshooting |

## Command reference & CSN

| | File | Contents |
|---|---|---|
| A | [appendices/A-command-reference.md](appendices/A-command-reference.md) | Full `--help` command/option reference |
| B | [../csn-structure/B-space-definition-format.md](../csn-structure/B-space-definition-format.md) | Space JSON |
| C | [../csn-structure/C-connection-definition-formats.md](../csn-structure/C-connection-definition-formats.md) | Connection types |
| D | [../csn-structure/D-marketplace-definition-formats.md](../csn-structure/D-marketplace-definition-formats.md) | Marketplace |
| E | [../csn-structure/E-object-definition-formats.md](../csn-structure/E-object-definition-formats.md) | Object CSN |

Examples: [../examples/](../examples/). Interop: [mcp-interop.md](mcp-interop.md).
