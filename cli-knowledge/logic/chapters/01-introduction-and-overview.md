# 1 Introduction and Command Overview

The SAP Datasphere CLI (`datasphere`, npm package `@sap/datasphere-cli`) controls many tenant functions from the command line or from Node.js programs: spaces, users, modeling objects, connections, marketplace, catalog, tasks, and more.

> The module was formerly called `dwc`. The `dwc` command has been deprecated since the end of 2023 — use only `datasphere`.

## 1.1 Versioning

The CLI version follows Datasphere waves (`YYYY.WW.x`), e.g. `2026.14.0`.

```bash
datasphere --version
```

After structural changes to the tenant service document, the CLI may show an update warning — then run:

```bash
npm install -g @sap/datasphere-cli@latest
```

## 1.2 Primary Commands and Typical Roles

| Command | Purpose | Typical Role |
|---|---|---|
| `login` / `logout` | OAuth sign-in | — |
| `config` | Local CLI (host, secrets, cache) | — |
| `configuration` | Tenant: TLS certificates, UCL system connections | DW Administrator |
| `users` | Datasphere user CRUD | DW Administrator |
| `global-roles` | Read global roles, assign users *(no create/delete)* | DW Administrator |
| `scoped-roles` | Application scope role CRUD + scopes/users | DW Administrator |
| `spaces` | Spaces, space users, connections | DW Admin / Space Admin / Integrator |
| `dbusers` | Database users incl. password reset | Space Administrator |
| `workload` | Priorities / statement limits | DW Administrator |
| `objects` | Modeling object CRUD | DW Modeler |
| `tasks` | Chains, replication flows, logs, consent | DW Integrator / Modeler |
| `job-status` | Status of asynchronous jobs | depending on triggering command |
| `marketplace` | Data Marketplace | DW Modeler (+ provider rights) |
| `catalog` | Catalog data products install/uninstall | depending on catalog/space rights |

## 1.3 API Rate Limiting

Authenticated requests: approx. **300 per user and minute**. When exceeded: `HTTP 429 Too Many Requests`.

| Header | Meaning |
|---|---|
| `X-Ratelimit-Limit` | Limit per minute |
| `X-Ratelimit-Remaining` | Remaining quota |
| `X-Ratelimit-Reset` | Seconds until reset |
| `Retry-After` | Wait time in seconds |

## 1.4 Passing Options

For (almost) every command, these methods apply (combinable):

1. **Flags** on the command line: `--space MYSPACE`
2. **Environment variables:** long option → `CONSTANT_CASE` (`client-id` → `CLIENT_ID`)
3. **`--options-file`:** JSON map with long names as keys
4. **`.env`** in the working directory (dotenv)

Many commands list only command-specific options in `--help`. Generic options (host, secrets, verbose, passcode, OAuth fields, TLS …): [tinyurl.com/yck8vv4w](https://tinyurl.com/yck8vv4w) or Appendix A / npm README.

## 1.5 Command Tree (Short Form)

```
datasphere
├── catalog → data-products → install|uninstall
├── config → cache|host|passcode-url|secrets
├── configuration → certificates|system-connections
├── dbusers → list|create|update|delete|password|certificate
├── global-roles → list|users
├── job-status → get
├── login | logout
├── marketplace → providers|products|products-by-provider|
│                 licenses-by-provider|releases|contexts-by-provider
├── objects → <object-type> → create|list|read|update|delete
├── scoped-roles → list|create|read|update|delete|scopes|users
├── spaces → list|create|save|read|delete|users|connections
├── tasks → consent|chains|logs|replication-flows
├── users → list|create|update|delete
└── workload → list|update
```

Object types under `objects`:  
`remote-tables`, `local-tables`, `views`, `analytic-models`, `er-models`, `task-chains`, `data-flows`, `replication-flows`, `transformation-flows`, `data-access-controls`, `business-entities`, `fact-models`, `consumption-models`, `intelligent-lookups`, `ontologies`, `contexts`, `types`, `services`.

Full flags: [Appendix A](../appendices/A-command-reference.md).

## 1.6 Navigation Hints for AI

1. Workflow/intent → Chapters 2–12  
2. Exact flags → Appendix A or `datasphere … --help`  
3. JSON payload → Appendices B–D or export existing object via `read`  
4. Never commit secrets in outputs
