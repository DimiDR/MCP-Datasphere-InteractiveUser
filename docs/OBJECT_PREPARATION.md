# Deterministic object preparation

`prepare_object_copy` is a local, pure transformation tool, not another CLI runner.
It handles `local-tables` and `replication-flows`. It does not read files, access
the tenant, create folders, save objects, deploy objects or change OAuth state.

All transformation profiles and tests are self-contained in this repository;
no external reference-script directory or its configuration files are required.

## Workflow

1. Read the source using `datasphere_cli_run` with `objects <type> read`, explicit
   `--space` and `--technical-name`. The existing read safeguards apply.
2. Pass the JSON object export (not the outer runner result or a save message) to
   `prepare_object_copy` as the `payload` string.
3. Review `changes`, `path_results`, `warnings` and the returned JSON `payload`.
4. Only on an explicit user request, submit that payload to the existing guarded
   CLI runner with `objects <type> create/update --space ... --input <payload>`.
   Use `--no-deploy` if saving without deployment is intended. The target name is
   in the payload, not a create/update `--technical-name` flag.
5. Read back the saved object. Check actual folder metadata against the requested
   ID and, where necessary, the Data Builder UI. Do not report folder success
   based only on the save response.

The same preparation supports creating a copy or updating a target from a
template. No implicit create-to-update fallback, batch writes or retries of
mutations are added. An unchanged source/target name is permitted for updates;
review the selected operation before submission.

## Example tool arguments

```json
{
  "object_type": "local-tables",
  "source_name": "T_GCT",
  "payload": "{\"definitions\":{\"T_GCT\":{\"@EndUserText.label\":\"GCT table\"}}}",
  "replacements": [{ "search": "GCT", "replacement": "EPR" }],
  "folder": { "action": "assign", "id": "Folder_KHHOQBAY" }
}
```

This returns `T_EPR`, a renamed label and folder metadata under
`definitions.T_EPR._meta.dependencies.folderAssignment`. Unrelated `_meta` and
`dependencies` fields are retained.

## Profiles and path matching

- Tables: rename keys under `/definitions`; replace labels and enclosing-object
  references only. Column names and types remain untouched.
- Replication flows: rename `/replicationflows` and `/definitions`; replace flow
  labels/descriptions, source connection IDs, task target names/business names,
  definition labels/enclosing objects, delta entity references and SELECT source
  references. Connector metadata is not invented or rewritten globally.
- `rename_key_paths` and `replace_value_paths` replace the respective default
  lists when supplied, including an empty list. Supply additional paths explicitly
  for export variants with other reference structures or editor metadata.
- Paths use `/` segments, `*` for one level of object/array traversal, and JSON
  Pointer escaping (`~1` for `/`, `~0` for `~`). Unsafe prototype-related path
  segments are rejected.
- Rename path `matches` counts object containers, even if names do not change;
  value path `matches` counts string leaves, even if no search token occurs.
  `changes` lists only actual modifications. It is not a count of search hits.
- Missing paths warn by default because exported objects can omit optional
  annotations. `strict_paths: true` rejects every configured path with zero
  matches. For strict validation, provide only the expected paths for that export.
- Replacements run in order, literally and case-sensitively. `A → B`, then
  `B → C`, transforms original `A` to `C`. Empty search strings are rejected;
  empty replacement strings are allowed, subject to valid target names.
- Renames are planned per container before applying; duplicate resulting keys
  fail rather than overwrite. The primary target name is derived from the explicit
  `source_name`, never from the first exported definition.

## Folder actions

- `preserve` (default): do not change folder metadata.
- `assign`: requires a technical ID matching `Folder_...`, not an LCD/local path,
  display name or hierarchy. This syntax check does not establish its existence
  or Space ownership.
- `remove`: deletes only `folderAssignment` in the prepared JSON; retains other
  metadata and does not add empty metadata to objects that had none.
- Replication flows use `replicationflows.<target>._meta.dependencies`.
  Their nested tables keep their existing assignments unless `folder.target_tables`
  lists **transformed technical names** present in `/definitions`. Missing targets
  fail. Names not represented as definitions cannot be assigned through this tool.

Every requested assignment/removal returns `tenant_status: "not_verified"`.
The existing knowledge base records a flow-target case where CLI updates silently
discarded `folderAssignment`; this is neither proof of universal failure nor proof
of support for tables/replication flows. Actual persistence and removal support
remain unverified. Folder creation, lookup and hierarchy management are not added.

### Folder verification status (2026-11-13)

Read-only inspection of the configured QAS tenant and installed official CLI
2026.22.0 found:

- The CLI configures `/dwaas-core/api/v1/discovery` as its discovery source.
- Searching that tenant discovery for `folder` returned no paths or schemas;
  `folderAssignment` was also absent from the subsequent discovery search.
- The installed CLI is a generic discovery-driven client. No supported folder
  assignment command was established by this inspection.
- Fetching the official SAP Help CLI page returned only the web-app shell, not
  usable documentation text. It therefore provides no additional evidence here.
- No tenant write test was performed. The existing knowledge-base observation
  about discarded assignment metadata is not a new test and must not be
  generalized into proof that every object type rejects assignments.

Absence from discovery does not prove that Data Builder has no internal UI API.
No undocumented endpoint is guessed or integrated. A working assignment mechanism
would require further documented evidence, a sanitized UI network capture, or an
explicitly authorized controlled write/read-back test.

### Available paths for the requested general copy workflow

| Action | Current support/evidence |
| --- | --- |
| Read an object definition | Guarded `datasphere_cli_run`, `objects <type> read` |
| Create a new object from a valid, renamed definition | Guarded `objects <type> create`; validity and dependencies are checked by SAP, not guaranteed by local preparation |
| Copy table rows | Not part of object-definition copying |
| Prepare assignment to a known folder ID in JSON | `prepare_object_copy`; metadata only, not verified persistence |
| Automatically place the created object in that folder | No verified CLI/API mechanism in this inspection |
| Assign using Data Builder | Use the UI folder organization action and confirm the result there; this MCP does not automate that action |
| Create/delete folders or resolve folder display paths | Not implemented |

The requested simple interface (source object, new technical name, existing target
folder) is not implemented yet. By user decision, the current preparation tool
remains unchanged until a real assignment mechanism is established. It must not
be presented as a completed general-purpose copy-into-folder feature.

## Safeguards and limitations

The tool only transforms caller-supplied JSON; it is usable without write consent
for preparation. Configured write prefixes are checked on every submitted object
and supported nested replication target. Space allowlists, write permission, SAP
authorization, dependency validity, target existence and conflict checks remain
the responsibility of the actual guarded runner/backend operation. Preparation
does not grant any additional read access or replace SAP validation.

The returned `status: "PREPARED"` and `tenant_modified: false` are not a claim of
successful creation, deployment or folder assignment. Changes across all matching
definitions are visible in the report; they are not limited to the main object.

Run `npm test` for build and offline tests. These tests perform no tenant mutations.