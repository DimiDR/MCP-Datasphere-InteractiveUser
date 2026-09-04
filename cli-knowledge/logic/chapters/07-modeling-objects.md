# 7 Modeling Objects

Command: `datasphere objects <type> <action>`.  
Roles: typically **DW Modeler** (space files, Data/Business Builder, …).  
CSN/sharing/i18n rules: see sections below and [Appendix A](../appendices/A-command-reference.md) for flags.  
Flags: [Appendix A](../appendices/A-command-reference.md).

---

## 7.1 Object Types

| Type | Note | CSN |
|---|---|---|
| `remote-tables` | Depends on connection | [E.4](../appendices/E-object-definition-formats.md#e4-remote-tables) |
| `local-tables` | Structure; delta may use internal `_Delta` table | [E.1](../appendices/E-object-definition-formats.md#e1-local-tables) |
| `views` | graphical + SQL; Fact/Dimension/Cube via modelingPattern | [E.2](../appendices/E-object-definition-formats.md#e2-views) |
| `analytic-models` | Needs `businessLayerDefinitions` + `DWCQueryModelEditor` | [E.3](../appendices/E-object-definition-formats.md#e3-analytic-models) |
| `er-models` | visualized dependencies | [E.5](../appendices/E-object-definition-formats.md#e5-er-models) |
| `data-flows` / `replication-flows` / `transformation-flows` | sources + target | [E.6](../appendices/E-object-definition-formats.md#e6-flows-data-flows--replication-flows--transformation-flows) |
| `task-chains` | **definition**; execution → `tasks` | [E.7](../appendices/E-object-definition-formats.md#e7-task-chains) |
| `data-access-controls` | incl. authorization entity | [E.8](../appendices/E-object-definition-formats.md#e8-data-access-controls) |
| `business-entities` / `fact-models` / `consumption-models` | Business Builder | [E.9](../appendices/E-object-definition-formats.md#e9-business-builder-business-entities--fact-models--consumption-models) |
| `intelligent-lookups` | | [E.10](../appendices/E-object-definition-formats.md#e10-intelligent-lookups) |
| `contexts` / `types` | usually not manual; import with remotes/content | [E.11](../appendices/E-object-definition-formats.md#e11-contexts--types--ontologies--services) |
| `ontologies` / `services` | available in CLI 2026.14; often missing in PDF type table | [E.11](../appendices/E-object-definition-formats.md#e11-contexts--types--ontologies--services) |

> `create`/`update` do **not** manage connections, folders, or packages and do not assign objects to folders/packages.

---

## 7.2 CRUD Pattern

All types follow the same pattern:

```bash
datasphere objects <type> list   --space <ID> [Filter…]
datasphere objects <type> read   --space <ID> --technical-name <NAME>
datasphere objects <type> create --space <ID> --file-path ./obj.json
datasphere objects <type> update --space <ID> --file-path ./obj.json
datasphere objects <type> delete --space <ID> --technical-name <NAME> [--force]
```

### list (example local-tables)

| Option | Default / Meaning |
|---|---|
| `--space` | Space ID |
| `--technical-names` | Comma-separated |
| `--filter` | OData filter, e.g. `status eq Deployed` |
| `--select` | Default `technicalName` |
| `--top` / `--skip` | Default 25 / 0 |

### create / update

| Option | Meaning |
|---|---|
| `--file-path` / `--input` | JSON/CSN |
| `--save-anyway` | save despite validation messages |
| `--allow-missing-dependencies` | allow missing dependencies |
| `--no-deploy` | save only, do not deploy |
| `--custom-validation-options` | `option:value,…` |

---

## 7.3 CSN Rules (Brief)

- **One** definition file per object; do not use unchecked "everything including dependencies" exports as create input.  
- Create dependencies first (observe order).  
- Sections: `definitions`, optional `editorSettings`, `sharing`, `i18n`, `businessLayerDefinitions` (Analytic Models / Business Builder).  
- **Root key differs by type:** `definitions` for tables/views/AM, `transformationflows` for transformation flows, `taskchains` for task chains ([E.0 rule 2b](../appendices/E-object-definition-formats.md#e0-rules-all-types)).  
- Sharing: share local/remote tables and views with other spaces.  
- Generated objects (time dimensions, TCUR*): only limited editing.

- **Views need a `query` block.** `@DataWarehouse.sqlEditor.query` is a display annotation, not an
  executable definition. Ship both — a view with only the annotation deploys clean, reports
  `Deployed`, serves correct `$metadata`, and returns **0 rows forever without any error**
  ([E.0 rule 7](../appendices/E-object-definition-formats.md#e0-rules-all-types),
  [E.2.4](../appendices/E-object-definition-formats.md#e24-silently-empty-views-the-query-block-is-mandatory)).

**Create templates (all types):** [Appendix E](../appendices/E-object-definition-formats.md) and [examples/](../examples/).  
Wrong type markers → `FailedToObtainObjectName` (see E.0 / E.12).

> **Before declaring a view done, query it for rows.** `status: Deployed` and a valid
> `$metadata` prove nothing about whether the view has a body. The CLI cannot read data, so
> verify through the MCP server or the UI data preview — not through `list` / `read`.

Dependency table: PDF Ch. 5.1.

---

## 7.4 Workflow

1. Template via `objects <type> read`, else [Appendix E](../appendices/E-object-definition-formats.md) / [examples/](../examples/)  
2. Ensure dependencies (`connections`, sources)  
3. `create` → deploy if needed without `--no-deploy`  
4. Verify with `list`/`read`  
5. Runs via [Chapter 8](08-tasks-job-status.md)
