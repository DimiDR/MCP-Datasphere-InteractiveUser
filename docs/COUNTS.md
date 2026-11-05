# Relational counts and replication metrics

`count_relational_entity` issues a fresh relational consumption request with
`$count=true&$top=0`. It returns only the server's `@odata.count`, not rows or
the size of a downloaded page. Query results are not cached.

First use `list_relational_entities` to obtain the entity set name, then call:

```json
{
  "space_id": "MY_SPACE",
  "asset_id": "MY_EXPOSED_ASSET",
  "entity_name": "MY_ENTITY",
  "filter": "Change_Type eq 'I'",
  "timeout_seconds": 120
}
```

Omit the filter to count all rows visible to the current user. The count refers
to the exposed entity after authorization and filtering, **not necessarily a
physical local table**. The entity must be exposed for relational consumption.
The tool does not publish objects, use SQL credentials, or change tenant state.
Existing `DSP_ALLOW_READ` and read object prefix restrictions apply before OAuth.

The response includes `availability`, `observed_at`, `scope`, and `cache_hit: false`.
Missing or invalid counts return `availability: unavailable` without a count.
Zero is returned only if the backend explicitly supplies zero. Integer strings
larger than JavaScript's safe integer range are preserved as decimal strings;
unsafe numeric values are rejected. HTTP failures and timeouts are errors, not zero.
Large counts can still require expensive backend scans; the timeout limits client
waiting and does not guarantee cancellation of backend work.

## Not implemented without verified endpoints

- Counts of unpublished local tables (including IBINVALUES in SP_1B_01).
- Source-system counts, distinct-key counts, duplicate checks or grouping.
- Replication UI Metrics: Initial Operation, Cumulative Operation, Delta Records Count.

The verified replication status and task log APIs do not expose those Metrics.
The separate `get_task_log_v2` tool was live-tested against
`/dwaas-core/api/v2/tasks/logs/SP_1B_01/30801` and `/29474` on 2026-11-05.
With `Accept: application/json` those requests returned only the JSON string
`"COMPLETED"`. With `application/vnd.sap.datasphere.task.log.details.extended+json`
they returned full task logs (headers and messages), but no partition IDs or
Source/Target Record Counts. The tool uses that extended format, validates the
owning object, filters child logs under read restrictions and masks secret fields.
It is not a replacement for the UI Metrics/Partitions endpoint.

Example after restarting the MCP server:

```json
{"space_id": "SP_1B_01", "log_id": "30801"}
```

`deltaloadCount` and `completedInitialLoadCount` must not be interpreted as record
counts. A missing metric is not zero. Current status is not a historical metric.

For further implementation, provide sanitized UI network requests (method, URL
path, payload and JSON response) for Metrics and table preview counts. Do not
share cookies, Authorization headers, tokens or unsanitized HAR files. Endpoint
identity, read-only semantics and object authorization must be verified before
adding a connector; no arbitrary-URL OAuth proxy is provided.

After building, restart the MCP server/client connection to discover the new tool.