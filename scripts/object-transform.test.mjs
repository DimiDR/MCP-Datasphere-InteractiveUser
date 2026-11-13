import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareObjectCopy } from "../dist/object-transform.js";
import { parsePolicy } from "../dist/policy.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";

const table = {
  definitions: {
    T_GCT: {
      "@EndUserText.label": "GCT table",
      elements: { GCT_COLUMN: { type: "cds.String" } },
      _meta: { keep: true, dependencies: { other: "keep", folderAssignment: "Folder_old" } },
    },
    HELPER: {},
  },
};
const options = (overrides = {}) => ({
  payload: JSON.stringify(table), objectType: "local-tables", sourceName: "T_GCT",
  replacements: [{ search: "GCT", replacement: "EPR" }], ...overrides,
});

test("scoped replacements use explicit primary name, preserve columns and input, report exact changes", () => {
  const input = options();
  const result = prepareObjectCopy(input);
  const payload = JSON.parse(result.payload);
  assert.equal(result.target_name, "T_EPR");
  assert.equal(payload.definitions.T_EPR["@EndUserText.label"], "EPR table");
  assert.ok(payload.definitions.T_EPR.elements.GCT_COLUMN);
  assert.deepEqual(payload.definitions.T_EPR._meta, table.definitions.T_GCT._meta);
  assert.equal(input.payload, JSON.stringify(table));
  assert.equal(result.tenant_modified, false);
  assert.equal(result.changes.length, 2);
  assert.ok(result.warnings.some((warning) => warning.includes("no matches")));
  assert.deepEqual(result.folder_results, []);
  assert.throws(() => prepareObjectCopy(options({ strictPaths: true })), /no matches/);
});

test("folder assign/remove preserve all unrelated metadata and never claim tenant verification", () => {
  const result = prepareObjectCopy(options({ folder: { action: "assign", id: "Folder_new" } }));
  assert.deepEqual(JSON.parse(result.payload).definitions.T_EPR._meta, {
    keep: true, dependencies: { other: "keep", folderAssignment: "Folder_new" },
  });
  assert.equal(result.folder_results[0].tenant_status, "not_verified");
  const removed = prepareObjectCopy(options({ folder: { action: "remove" } }));
  assert.deepEqual(JSON.parse(removed.payload).definitions.T_EPR._meta, { keep: true, dependencies: { other: "keep" } });
  for (const folder of [{ action: "assign" }, { action: "assign", id: "Display/Path" }, { action: "remove", id: "Folder_old" }]) {
    assert.throws(() => prepareObjectCopy(options({ folder })));
  }
});

test("flow profile transforms connections and references; folder targets are explicit", () => {
  const flow = {
    replicationflows: { RF_GCT: { contents: {
      sourceSystem: [{ connectionId: "CONN_GCT" }],
      replicationTasks: [{ targetObject: { name: "T_GCT", businessName: "GCT target" } }],
    } } },
    definitions: { T_GCT: { "@DataWarehouse.delta": { deltaFromEntities: ["D_GCT"] }, query: { SELECT: { from: { ref: ["D_GCT"] } } } } },
  };
  const input = options({ payload: JSON.stringify(flow), objectType: "replication-flows", sourceName: "RF_GCT", folder: { action: "assign", id: "Folder_new" } });
  const result = prepareObjectCopy(input);
  const payload = JSON.parse(result.payload);
  assert.equal(payload.replicationflows.RF_EPR.contents.sourceSystem[0].connectionId, "CONN_EPR");
  assert.equal(payload.replicationflows.RF_EPR.contents.replicationTasks[0].targetObject.name, "T_EPR");
  assert.deepEqual(payload.definitions.T_EPR.query.SELECT.from.ref, ["D_EPR"]);
  assert.deepEqual(payload.definitions.T_EPR["@DataWarehouse.delta"].deltaFromEntities, ["D_EPR"]);
  assert.equal(payload.definitions.T_EPR._meta, undefined);
  const explicit = prepareObjectCopy({ ...input, folder: { ...input.folder, targetTables: ["T_EPR", "T_EPR"] } });
  assert.equal(explicit.folder_results.length, 2);
  assert.equal(JSON.parse(explicit.payload).definitions.T_EPR._meta.dependencies.folderAssignment, "Folder_new");
  assert.throws(() => prepareObjectCopy({ ...input, folder: { ...input.folder, targetTables: ["T_GCT"] } }), /missing/);
});

test("reject collisions, missing main object, malformed metadata, unsafe paths and save messages", () => {
  assert.throws(() => prepareObjectCopy(options({ payload: JSON.stringify({ definitions: { T_GCT: {}, T_EPR: {} } }) })), /collision/);
  assert.throws(() => prepareObjectCopy(options({ sourceName: "MISSING" })), /missing/);
  assert.throws(() => prepareObjectCopy(options({ renameKeyPaths: [] })), /expected primary/);
  assert.throws(() => prepareObjectCopy(options({ payload: '{"message":"Saved"}' })), /missing/);
  assert.throws(() => prepareObjectCopy(options({ replacements: [{ search: "", replacement: "X" }] })), /non-empty/);
  for (const path of ["definitions", "/definitions/__proto__", "/definitions/~2", "/definitions//x"]) {
    assert.throws(() => prepareObjectCopy(options({ replaceValuePaths: [path] })));
  }
  for (const meta of [null, [], { dependencies: "bad" }]) {
    assert.throws(() => prepareObjectCopy(options({ payload: JSON.stringify({ definitions: { T_GCT: { _meta: meta } } }), folder: { action: "assign", id: "Folder_new" } })), /Invalid/);
  }
});

test("custom escaped paths and sequential rules are deterministic; optional paths can be strict", () => {
  const result = prepareObjectCopy(options({
    payload: JSON.stringify({ definitions: { T_GCT: { "a/b": "GCT" } } }),
    replacements: [{ search: "GCT", replacement: "MID" }, { search: "MID", replacement: "EPR" }],
    replaceValuePaths: ["/definitions/*/a~1b"], strictPaths: true,
  }));
  assert.equal(JSON.parse(result.payload).definitions.T_EPR["a/b"], "EPR");
  assert.ok(result.path_results.every((path) => path.matches > 0));
});

test("preparation enforces all configured write name prefixes without requiring write consent", () => {
  const policy = parsePolicy({ DSP_ALLOW_WRITE: "false", DSP_ALLOW_WRITE_OBJECT_PREFIXES: "T_EPR" });
  assert.throws(() => prepareObjectCopy(options(), policy), /HELPER/);
  const result = prepareObjectCopy(options({ payload: JSON.stringify({ definitions: { T_GCT: {} } }) }), policy);
  assert.equal(result.status, "PREPARED");
  assert.equal(result.tenant_modified, false);
});

test("compiled MCP exposes and executes preparation offline through stdio", async () => {
  const client = new Client({ name: "object-preparation-test", version: "1.0.0" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL("../dist/index.js", import.meta.url))],
    stderr: "pipe",
    env: {
      ...process.env,
      DSP_ALLOW_READ: "false", DSP_ALLOW_WRITE: "false", DSP_ALLOW_DELETE: "false",
      DSP_ALLOW_READ_OBJECT_PREFIXES: "", DSP_ALLOW_WRITE_OBJECT_PREFIXES: "", DSP_ALLOWED_OBJECT_PREFIXES: "",
      DSP_ALLOWED_WRITE_SPACES: "", DSP_OAUTH_CLIENT_ID: "offline-test",
      DSP_OAUTH_AUTHORIZE_URL: "https://example.invalid/authorize",
      DSP_OAUTH_TOKEN_URL: "https://example.invalid/token", DSP_TENANT_URL: "https://example.invalid",
    },
  });
  try {
    await client.connect(transport);
    assert.ok((await client.listTools()).tools.some((tool) => tool.name === "prepare_object_copy"));
    const response = await client.callTool({ name: "prepare_object_copy", arguments: {
      payload: JSON.stringify(table), object_type: "local-tables", source_name: "T_GCT",
      replacements: [{ search: "GCT", replacement: "EPR" }], folder: { action: "assign", id: "Folder_test" },
    } });
    assert.ok(!response.isError, JSON.stringify(response));
    const result = JSON.parse(response.content.find((item) => item.type === "text").text);
    assert.equal(result.target_name, "T_EPR");
    assert.equal(result.folder_results[0].tenant_status, "not_verified");
    const invalid = await client.callTool({ name: "prepare_object_copy", arguments: {
      payload: "{}", object_type: "local-tables", source_name: "MISSING", replacements: [],
    } });
    assert.equal(invalid.isError, true);
  } finally {
    await client.close();
  }
});