# Replication flow CLI definition

## Validation status

Verified with official CLI **2026.22.0** on **2026-11-13** by reading an existing
replication flow in the tenant. The observed connector combination is SAP S/4HANA
on-premise CDS extraction to local Datasphere tables, with a delta-table target.
This verifies the export shape, **not** a create, deployment or execution test.
Other connectors and load modes must be harvested from a matching working flow.

## Root and object structure

- CLI type: `replication-flows`
- JSON root: `replicationflows` (**not** `definitions` or `replication-flows`)
- Root map key: the flow's technical name
- Object `kind`: `sap.dis.replicationflow`
- Object label: `@EndUserText.label`

The flow object contains these sections:

| Section | Observed contents |
|---|---|
| `contents.description` | Flow description |
| `contents.sourceSystem` | Array of source connection configurations |
| `contents.targetSystem` | Array of target connection configurations |
| `contents.vTypes.scalar` | Dynamic scalar definitions referenced by columns |
| `contents.replicationTasks` | Array of object replication tasks |
| `contents.replicationTaskSetting` | Global task settings |
| `contents.replicationFlowSetting` | Connector-specific flow settings |
| `contents.deltaLoadTrigger` | Observed value: `ON_DELTA_INTERVAL` |
| `sources` | Object dependency map; empty in the observed CDS flow |
| `targets` | Target table dependency map, including `elements` maps |
| `connections` | Map keyed by source connection technical name |

Unlike transformation flows, this observed replication flow does **not** use a
`processes`/graph structure. Preserve all exported settings rather than replacing
them with a transformation-flow template.

### Systems

Entries contain `connectionId`, `connectionType`, `container`, `maxConnections`
and `metadata`. Observed source `connectionType`: `SAPS4HANAOP`; container:
`/CDS_EXTRACTION`. For a local Datasphere target, the exported `connectionId` is
`$DWC`, `connectionType` is `HANA`, and `container` is an empty string.
These values are observations, not universal defaults for every connector.

### Replication tasks and column types

The observed task contains `name`, `loadType`, `priority`, `truncate`,
`sourceObject`, `targetObject` and `deltaCheckInterval`. Its exported `loadType`
is `REPLICATE`, `truncate` is `false`, and `deltaCheckInterval` is `3600`.
Do not infer other load-mode enum values from their UI labels.

Source and target definitions contain `definition.columns` arrays. Column entries
include `name`, `vflow.type`, `vtype-ID`, optional `key`, `businessName` and
`metadata`. Dynamic references such as `$DYNAMIC.string_18` refer to
`contents.vTypes.scalar.string_18`, which defines `template: string` and
`value.length: 18`. Built-in types can instead use IDs such as
`com.sap.core.timestamp`.

The observed target has `metadata.isNew: true` and CDC properties:

- `com.sap.datasuite.tableCategory`: `DELTA`
- `com.sap.datasuite.cdc.mode.column`: `Change_Type`
- `com.sap.datasuite.cdc.timestamp.column`: `Change_Date`

These names must agree with the target columns. Delta targets must not be
silently converted to regular targets by dropping these properties.

## Safe creation workflow through the MCP

1. Check `datasphere_cli_status`. The MCP reuses its OAuth session; do not run a
   separate `datasphere login`.
2. List a page of `objects replication-flows list` in the source Space. Use
   `--top`/`--skip` if a suitable template is not on the first page.
3. Read a working template with the same source connector, target and load mode:
   `objects replication-flows read --space ... --technical-name ...`.
   Save the complete JSON from the result's **`stdout`**, not the MCP result
   envelope. Reject failed or truncated reads.
4. Rename the `replicationflows` map key and label/description. Rename each new
   `targetObject.name` and its corresponding key in `targets` consistently.
   Review business names, connection IDs, containers, source objects, columns,
   mappings and dynamic type references throughout the complete export.
5. Verify the source connection is present in the destination Space and supports
   the selected replication scenario. Check target-name collisions and ownership
   before creation. Do not blindly reuse an existing target or retain a template's
   target table names.
6. Only when creation is explicitly requested, invoke `datasphere_cli_run` with
   `objects replication-flows create --space ... --file-path ...` (or `--input`).
   Use `--no-deploy` for a design-time-only creation if requested; otherwise CLI
   creation may also deploy. Do not add `--save-anyway` or
   `--allow-missing-dependencies` to conceal validation errors.
7. Check `ok`, `exit_code`, `stderr` and `warnings`; then read the newly created
   object back and compare its source, targets and settings. This does not prove
   runtime connectivity or successful replication.
8. Starting a flow is a separate explicitly authorized action through
   `control_replication_flow`; it is not part of harvesting a definition.

Example MCP argv for creating a previously prepared file in an authorized Space:

```json
{
  "args": [
    "objects", "replication-flows", "create",
    "--space", "DEV",
    "--file-path", "C:\\work\\replication-flow.json",
    "--no-deploy"
  ]
}
```

The path and Space above are illustrative; the file must contain a complete,
adapted export. There is deliberately no invented minimal runnable payload here.

## MCP safeguards

`DSP_ALLOW_WRITE=true` and the destination Space in `DSP_ALLOWED_WRITE_SPACES`
are required. SAP authorizations apply independently.

When `DSP_ALLOW_WRITE_OBJECT_PREFIXES` is set, the safeguard checks:

- every flow name in `replicationflows`;
- every target name in each flow's `targets` map;
- every `contents.replicationTasks[].targetObject.name`;
- all other submitted top-level named sections, such as `definitions`.

It does not require existing source object or source connection references to
match write prefixes. Existing targets are still write destinations and must
match. Malformed target maps/tasks are rejected rather than ignored. The exact
validated payload is privately snapshotted by the existing CLI runner.

Read prefixes check the exported flow and other submitted top-level object names,
not nested dependency references. Reading a flow therefore includes its source,
connection and target metadata. The safeguard is not a connector-specific SAP
schema validator: the backend must still validate the complete definition.