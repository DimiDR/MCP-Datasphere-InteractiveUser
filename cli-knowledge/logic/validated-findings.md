# Validated findings (CLI 2026.14.0)

Measured behaviour against a live Datasphere tenant. Use this page as a
**pitfall index**; full CSN lives in
[Appendix E](appendices/E-object-definition-formats.md). Helpers:
[scripts/](scripts/).

Load this file when debugging silent wrong data, choosing root keys, or deciding
whether a shape needs a UI harvest.

## Still open (do not invent)

| Topic | Status |
|---|---|
| DAC object CSN (`data-access-controls`) | Permissions entity known; full DAC CSN still clone-from-`read` when UI Create works |
| AM `CalculatedMeasure` formula in the AM itself | Failed guessed shapes; compute in fact view instead ([E.3](appendices/E-object-definition-formats.md#e3-analytic-models)) |
| Parent-child hierarchy | Only `@Hierarchy.leveled` validated |
| `replication-flows` root key | Unvalidated |
| TF Aggregation (Σ) CSN | Not harvested — use **projection** or `read` of a UI template |

## Silent / wrong-but-deployed traps

| Finding | Symptom | Fix / detail |
|---|---|---|
| View without `query` | Deployed, `$metadata` OK, **0 rows forever** | [E.2.4](appendices/E-object-definition-formats.md#e24-silently-empty-views-the-query-block-is-mandatory); `scripts/sweep_analytics.py` |
| `@Aggregation.default` without `measureType` | Fact OK; AM: `Measure X does not exist in fact source` | `@AnalyticsDetails.measureType: { "#": "BASE" }` ([E.2.2](appendices/E-object-definition-formats.md#e22-fact-view-analytical--validated)) |
| Top-level `cast` | Type in metadata, **data unchanged** | [E.2.5](appendices/E-object-definition-formats.md#e25-cast-declares-a-type--it-does-not-convert) |
| Narrower TF target column | Run `COMPLETED`, value truncated | [E.6](appendices/E-object-definition-formats.md#e6-flows-data-flows--replication-flows--transformation-flows) |
| `truncate: false` | Upsert on key, **not** append | [E.6](appendices/E-object-definition-formats.md#e6-flows-data-flows--replication-flows--transformation-flows) |
| `INITIAL_AND_DELTA` without Delta Capture | Save HTTP 400 | Source/target need Delta Capture; else `INITIAL_ONLY` ([E.6](appendices/E-object-definition-formats.md#e6-flows-data-flows--replication-flows--transformation-flows)) |
| AM `COUNT_DISTINCT` (numeric) | Returns **row count** (= `COUNT`) | [E.3](appendices/E-object-definition-formats.md#e3-analytic-models) |
| AM without `usedForDimensionSourceKey` | Queries work; Data Builder "Invalid Analytic Model" | [E.3.2](appendices/E-object-definition-formats.md#e32-no-mapping-attribute-found-for-dimension) |
| Unused Standard Variable on AM | Blocks Deploy | Prefer Filter Variable ([E.3](appendices/E-object-definition-formats.md#e3-analytic-models)) |
| `{"val":":P"}` as parameter | Deploy OK, read **HTTP 500** | Use `param:true` or bare `":P"` ([E.2.7](appendices/E-object-definition-formats.md#e27-input-parameters--validated)) |
| `folderAssignment` via CLI | Written then **silently dropped** (`_meta: null`) | Folders are UI-only ([ch. 7](chapters/07-modeling-objects.md)) |
| Wrong AM `on` / fan-out join | Measures **inflate**; deploy still green | Query measures before/after; verify totals |

## Root keys (not `definitions`)

| CLI type | Root key | `kind` | Validated |
|---|---|---|---|
| `transformation-flows` | `transformationflows` | `sap.dis.transformationflow` | yes |
| `data-flows` | `dataflows` | `sap.dis.dataflow` | yes (incl. empty graph) |
| `task-chains` | `taskchains` | `sap.dwc.taskChain` | yes |
| `replication-flows` | ? | ? | no — `read` first |

`--technical-name` does **not** fix a wrong root key (name is read from the payload only).
Technical names are **case-sensitive**. Harvest: `scripts/objects_read.py`.

`editorSettings.uiModel` on flows is **optional** (hand-authored TFs without it deploy).

## Roles & runtime

| Situation | Cause | Remedy |
|---|---|---|
| `tasks chains run` → **HTTP 403** empty body | Global Admin/Modeler without **scoped Integrator** on that space | `scripts/user_task_check.py`; assign Integrator scope **before** users ([ch. 8](chapters/08-tasks-job-status.md)) |
| Space membership alone | Not enough for task execution | Scoped Integrator on the space |
| Consent | Independent of roles | `datasphere tasks consent give` once per user |
| DAC Create greyed out | Needs Space Admin (DAC privilege), not Modeler | `scripts/user_dac_check.py` ([E.8](appendices/E-object-definition-formats.md#e8-data-access-controls)) |

Scoped subcommands use **`read`**, not `list` (`scoped-roles users read`, `scopes read`, `spaces users read`).

## Analytic Model

- Dimensions via fact-view associations; AM name `<assoc>∞<sourceKey>` (U+221E); decode CLI as UTF-8.
- Removing a fact column still referenced by the AM → **422 `NOT_MODIFY_IN_USE`** — deploy **AM first**, then the view ([E.3.1](appendices/E-object-definition-formats.md#e31-dimension-sources--validated)).
- Restricted Measure: `formula` / `formulaRaw`, CDS `RESTRICTION`
- Filter Variable: `StoryFilter`
- Leveled hierarchy: `@Hierarchy.leveled` round-trips

## Task chains

- `applicationId` is the **plural** object type (`TRANSFORMATION_FLOWS`×`EXECUTE`, `VIEWS`×`PERSIST`, `LOCAL_TABLE`×`DELETE_DATA`)
- Fan-out OK; **fan-in fails deploy** — keep sequential
- `statusRequired: FAILED` runs the next task; chain stays `FAILED`
- `ignoreError: true` → chain `COMPLETED`, task `FAILED`; follow-up needs `ANY`/`FAILED`

## Data Access Control

- Permissions entity: `USER_ID` + criteria (e.g. `VKORG`); expose view for consumption
- Full DAC CSN: clone-from-`read` when UI works

## Helper scripts

| Script | Use |
|---|---|
| `scripts/objects_read.py` | Case-aware harvest |
| `scripts/objects_redeploy.py` | delete+create (not merge-update) |
| `scripts/sweep_analytics.py` | Gate silent view/AM defects |
| `scripts/user_dac_check.py` / `user_task_check.py` | Privilege diagnostics |

## MCP caveats (not CLI)

See [mcp-interop.md](mcp-interop.md): `get_task_log` and
`analyze_column_distribution` have known defects in some MCP builds — prefer
query tools for verification.
