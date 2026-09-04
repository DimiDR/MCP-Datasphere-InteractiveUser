# Example CSN payloads

Ready-to-adapt JSON for `datasphere objects <type> create`. Full notes: [Appendix E](../appendices/E-object-definition-formats.md).

## Ready-to-copy (validated create)

| File | CLI type | Notes |
|---|---|---|
| [local-table.json](local-table.json) | `local-tables` | Minimal table (`T1`) |
| [local-table-orders.json](local-table-orders.json) | `local-tables` | Orders fact source (`ZTEST_CLI_ORDERS`) |
| [view-graphical-join.json](view-graphical-join.json) | `views` | Graphical inner join (header + item) with `editorSettings` |
| [view-graphical-complex.json](view-graphical-complex.json) | `views` | 4-way join + formulas (CASE, window, DQ score) |
| [view-relational.json](view-relational.json) | `views` | Relational / SQL view on `T1` |
| [view-fact.json](view-fact.json) | `views` | Fact view (`ANALYTICAL_FACT`) on orders |
| [view-dimension.json](view-dimension.json) | `views` | Dimension view (`ANALYTICAL_DIMENSION`) on `T1` |
| [view-cube.json](view-cube.json) | `views` | Cube **view** (`ANALYTICAL_CUBE`) — not an Analytic Model |
| [analytic-model.json](analytic-model.json) | `analytic-models` | Requires Fact source + `businessLayerDefinitions` |
| [transformation-flow.json](transformation-flow.json) | `transformation-flows` | Root key `transformationflows` — **not** `definitions` |
| [data-flow.json](data-flow.json) | `data-flows` | Root key `dataflows` / `kind: sap.dis.dataflow` (empty graph is enough for create/`read`) |
| [task-chain.json](task-chain.json) | `task-chains` | Root key `taskchains` — **not** `definitions` |

## Reference only (harvested `read` export)

| File | CLI type | Notes |
|---|---|---|
| [analytic-model-sales-read.json](analytic-model-sales-read.json) | `analytic-models` | Full `read` of a deployed AM (example) — dimension associations wired end to end, see [E.3.1](../appendices/E-object-definition-formats.md#e31-dimension-sources--validated) |

Suggested create order for the orders stack:

1. `local-table-orders.json` → `local-tables`
2. `view-fact.json` → `views`
3. `analytic-model.json` → `analytic-models`

## Clone-from-`read` only (no hand-authored template)

These types need connection/editor graphs that must not be invented. Harvest from a working object, then adapt technical names:

```bash
datasphere objects <type> list --space <ID>
datasphere objects <type> read --space <ID> --technical-name <NAME> > ./harvested.json
# Edit: one object per file, rename keys/refs, then:
datasphere objects <type> create --space <TARGET> --file-path ./harvested.json
```

| CLI type | Why not in examples/ |
|---|---|
| `remote-tables` | Connection-specific remote catalog metadata |
| `er-models` | Large `editorSettings` diagram payload |
| `data-flows` / `replication-flows` | `data-flows` root key validated (`dataflows`); full graphs and all of `replication-flows` still clone-from-`read`. Minimal empty DF: [data-flow.json](data-flow.json) |
| `data-access-controls` | Includes permissions/criteria entity |
| `business-entities` / `fact-models` / `consumption-models` | Business Builder markers; prefer Analytic Models for new SAC use |
| `intelligent-lookups` | Input + lookup entity wiring |
| `contexts` / `types` / `ontologies` / `services` | Usually imported, not hand-created |

## Rules

- Rename technical names **and** source refs before create.
- Write UTF-8 **without BOM**.
- Cube **view** ≠ Analytic Model — see [E.3](../appendices/E-object-definition-formats.md#e3-analytic-models).
