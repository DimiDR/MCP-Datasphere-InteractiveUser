# 12 Troubleshooting and Best Practices

## 12.1 Common Errors

| Symptom | Cause | Remedy |
|---|---|---|
| `401 invalid_client` / Unauthorized grant type | Interactive client with `client_credentials` | `authorization_code` + browser login |
| `400` on login, no browser | `authorization-flow` missing in options | Explicit `"authorization-flow": "authorization_code"` |
| Login timeout ~30s | Browser too slow / tab overlooked | Retry with `--force`; set browser via `--browser` |
| Secrets/options swapped | `--secrets-file` without tokens | Use `--options-file` for login first |
| CLI outdated warning | Package behind tenant | `npm i -g @sap/datasphere-cli@latest` |
| Cache outdated | Service document old | `datasphere config cache init` |
| Unknown command | Host/login/cache | Set host, log in, `--help` |
| `HTTP 429` | Rate limit (~300/min) | Respect `Retry-After` |
| TLS / CERT errors | Proxy/corporate CA | CA in Node trust store; `--tls-version`; `CLI_LEGACY_TLS_DETECTION` |
| CSN create fails | Dependencies / bulk export | Split per object, observe order |
| Windows browser "win32 not supported" | old CLI | ≥ 2026.3.1 |
| View is `Deployed`, `$metadata` fine, but **0 rows** / flows write "0 records" | View has only `@DataWarehouse.sqlEditor.query`, no `query` block → no body | Check `read` for a `query` key; delete + recreate with one ([E.2.4](../appendices/E-object-definition-formats.md#e24-silently-empty-views-the-query-block-is-mandatory)) |
| `HTTP 500` on the relational endpoint but `200` on the analytical one | Same bodiless view | As above |
| `400 Failed to deploy` when adding a `query` to an existing view | A query-less view cannot be upgraded in place; save succeeds, deploy does not | `delete --force --delete-anyway` then `create` |
| `delete` exits `0` but the object still exists | Interactive `(y/N)` prompt defaulted to no | Add `--force` |
| OData returns string though `$metadata` says Int32 | Top-level `cast` only declares type | Use `TO_INTEGER` / nest cast ([E.2.5](../appendices/E-object-definition-formats.md#e25-cast-declares-a-type--it-does-not-convert)) |
| `FailedToObtainObjectName` on flow/task-chain create | Wrong root key (`definitions` instead of `transformationflows` / `dataflows` / `taskchains`) | [E.0](../appendices/E-object-definition-formats.md#e0-rules-all-types) / [validated-findings](../validated-findings.md) |
| `objects … read` fails for a listed object | Technical name **case** mismatch | `list` first; pass exact `technicalName` |
| TF run `COMPLETED` but values wrong / truncated | Narrower target type or silent mapping rules | Mapping table in [E.6](../appendices/E-object-definition-formats.md#e6-flows-data-flows--replication-flows--transformation-flows) |
| Row count unchanged after TF with `truncate: false` | Upsert on key, not append | Same E.6 note |
| AM `COUNT_DISTINCT` equals `COUNT` | Known wrong aggregation on numeric measures | [E.3](../appendices/E-object-definition-formats.md#e3-analytic-models) |
| AM Deploy blocked: `Variable … is not used` | Unused Standard Variable | Delete it or use **Filter Variable** (`StoryFilter`) |
| Data Builder: no mapping attribute for dimension | Missing `usedForDimensionSourceKey` on FK attribute | [E.3.2](../appendices/E-object-definition-formats.md#e32-no-mapping-attribute-found-for-dimension) |
| Create → Data Access Control greyed out | Missing Space Admin *or* UI issue | `scripts/user_dac_check.py`; Modeler alone is not enough |
| `tasks chains run` → HTTP 403 empty body | No scoped Integrator on the space | `scripts/user_task_check.py`; [ch. 8](08-tasks-job-status.md) |
| Parametrized view HTTP 400 without `/Set` | Relational call missing entity set suffix | `/…/VIEW(P='x')/Set` ([E.2.7](../appendices/E-object-definition-formats.md#e27-input-parameters--validated)) |
| `INITIAL_AND_DELTA` save → HTTP 400 | Source (or target) not delta-enabled | Use Local Tables with **Delta Capture**; otherwise `INITIAL_ONLY` ([E.6](../appendices/E-object-definition-formats.md#e6-flows-data-flows--replication-flows--transformation-flows)) |
| Folder assignment via CLI/`folderAssignment` | Field silently discarded | Folders are UI-only; drag in Data Builder |
| 422 `NOT_MODIFY_IN_USE` when changing a view | AM (or other object) still references the column | Update/redeploy **consumers first**, then the view |

## 12.2 Diagnostics

```powershell
$Env:LOG_LEVEL = 6
datasphere login --options-file ds-options.json --force
```

Incident: SAP Support **DS-API-CLI** + trace log.

## 12.3 Best Practices

1. Options file instead of secrets in shell history.  
2. Always set `authorization-flow`.  
3. Use `--force` only in automation.  
4. Confirm destructive commands (`delete`, `overwrite`, password reset).  
5. Poll `job-status` after async deploys.  
6. Before writing payloads: `read` an existing object as template.  
7. Combine PDF schemas (Appendices B–D) + live flags (Appendix A).  
8. Pin CLI version in automation or update regularly and regenerate Appendix A:

```powershell
# Generator in the repo:
# tools\cli-help\Generate-AnhangA-Befehlsreferenz.ps1
```

9. Prefer `objects <type> read` as a template before inventing CSN.  
10. After create/deploy of views/AMs: **query rows** (MCP), never trust Deployed alone.  
11. For silent wrong answers / root-key questions: [validated-findings.md](validated-findings.md).

## 12.4 Source Priority (AI & Humans)

1. `datasphere … --help` of the installed version  
2. This handbook + [validated-findings.md](../validated-findings.md)  
3. Appendix A (flags) / B–E (JSON)  
4. PDF raw markdown under `../`  
5. npm README/CHANGELOG  

## 12.5 Security

- Do not put `client_secret`, tokens, or full `secrets show` dumps in Git/tickets.  
- Protect cache directory `%USERPROFILE%\.@sap\datasphere-cli\`.  
- Use technical-user clients only for the permitted command subset.
