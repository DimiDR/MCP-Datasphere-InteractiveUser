import { test } from "node:test";
import assert from "node:assert/strict";
import { assertOperation, authorizeCli, parsePolicy, validateObjectPayload } from "../dist/policy.js";
import { checkedObjectPayload, snapshotArgs } from "../dist/object-safeguard.js";
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const enabled = parsePolicy({ DSP_ALLOW_WRITE: "true", DSP_ALLOW_DELETE: "true", DSP_ALLOWED_WRITE_SPACES: "DEV, TEST" });
const command = (action, ...flags) => ["objects", "views", action, ...flags];
const restricted = parsePolicy({ DSP_ALLOW_WRITE: "true", DSP_ALLOW_DELETE: "true", DSP_ALLOWED_WRITE_SPACES: "DEV, TEST, DEV", DSP_ALLOWED_OBJECT_PREFIXES: "ABZ*, HRA, ABZ" });

test("multiple spaces and prefixes are trimmed, deduplicated and combined", () => {
  assert.deepEqual(restricted.writeSpaces, ["DEV", "TEST"]);
  assert.deepEqual(restricted.objectPrefixes, ["ABZ", "HRA"]);
  for (const space of ["DEV", "TEST"]) {
    for (const name of ["ABZ_SALES", "HRA_EMPLOYEE", "ABZ"]) {
      authorizeCli(restricted, command("delete", "--space", space, "--technical-name", name));
    }
  }
  for (const name of ["OTHER", "abz_sales", "X_ABZ", "ABZ*", "ABZ_A,OTHER", "ABZ_A/OTHER"]) {
    assert.throws(() => authorizeCli(restricted, command("delete", "--space", "DEV", "--technical-name", name)));
  }
  assert.throws(() => authorizeCli(restricted, command("delete", "--space", "PROD", "--technical-name", "ABZ_A")));
  assert.throws(() => authorizeCli(restricted, command("delete", "--space", "DEV")));
  authorizeCli(restricted, command("read", "--space", "PROD", "--technical-name", "OTHER"));
  assert.deepEqual(parsePolicy({}).objectPrefixes, []);
  assert.deepEqual(parsePolicy({ DSP_ALLOWED_OBJECT_PREFIXES: " " }).objectPrefixes, []);
  for (const value of ["*", "AB*Z", "ABZ,,HRA", "ABZ,", "ABZ?", "ABZ**,HRA"]) {
    assert.throws(() => parsePolicy({ DSP_ALLOWED_OBJECT_PREFIXES: value }));
  }
});

test("payload checks all submitted object and auxiliary names, not source references", () => {
  const allowed = { definitions: { ABZ_VIEW: { query: { SELECT: { from: { ref: ["PROTECTED_SOURCE"] } } } }, HRA_HELPER: {} }, editorSettings: { ABZ_VIEW: {} } };
  assert.deepEqual(JSON.parse(validateObjectPayload(restricted, JSON.stringify(allowed), "views")), allowed);
  for (const payload of [
    { definitions: { ABZ_VIEW: {}, PROTECTED: {} } },
    { definitions: { ABZ_VIEW: {} }, editorSettings: { PROTECTED: {} } },
    { definitions: { ABZ_VIEW: {} }, businessLayerDefinitions: { PROTECTED: {} } },
    { definitions: { ABZ_VIEW: {} }, sharing: { PROTECTED: {} } },
    { definitions: { ABZ_VIEW: {} }, namespace: "OTHER" },
    { definitions: { ABZ_VIEW: {} }, unknownObjects: { PROTECTED: {} } },
    { definitions: { ABZ_VIEW: null } }, { definitions: [] }, { definitions: {} }, [], null,
  ]) assert.throws(() => validateObjectPayload(restricted, JSON.stringify(payload), "views"));
  assert.throws(() => validateObjectPayload(restricted, "not JSON", "views"));
  for (const [type, root] of [["data-flows", "dataflows"], ["transformation-flows", "transformationflows"], ["task-chains", "taskchains"]]) {
    validateObjectPayload(restricted, JSON.stringify({ [root]: { ABZ_FLOW: {} } }), type);
    assert.throws(() => validateObjectPayload(restricted, JSON.stringify({ [root]: { PROTECTED: {} } }), type));
  }
});

test("file and inline payloads are checked and the validated snapshot is preserved", () => {
  const cwd = mkdtempSync(join(tmpdir(), "dsp-policy-test-"));
  const path = join(cwd, "object.json");
  try {
    const valid = JSON.stringify({ definitions: { ABZ_A: {} } });
    writeFileSync(path, valid);
    const fileArgs = authorizeCli(restricted, command("update", "--space=DEV", "--file-path=object.json"));
    const snapshot = checkedObjectPayload(restricted, fileArgs, cwd);
    writeFileSync(path, JSON.stringify({ definitions: { PROTECTED: {} } }));
    assert.deepEqual(JSON.parse(snapshot), JSON.parse(valid));
    assert.throws(() => checkedObjectPayload(restricted, fileArgs, cwd));
    assert.deepEqual(snapshotArgs(fileArgs, "checked.json"), command("update", "--space", "DEV", "--file-path", "checked.json"));
    const inline = authorizeCli(restricted, command("create", "--space", "TEST", "--input", valid));
    assert.equal(checkedObjectPayload(restricted, inline, cwd), valid);
    assert.deepEqual(snapshotArgs(inline, "checked.json"), command("create", "--space", "TEST", "--file-path", "checked.json"));
    assert.throws(() => checkedObjectPayload(restricted, [...fileArgs, "--input", valid], cwd));
    assert.throws(() => checkedObjectPayload(restricted, command("update", "--space", "DEV"), cwd));
    assert.equal(checkedObjectPayload(enabled, fileArgs, cwd), undefined);
  } finally {
    unlinkSync(path);
    rmdirSync(cwd);
  }
});

test("safe defaults and independent permissions", () => {
  const policy = parsePolicy({});
  assertOperation(policy, "read");
  assert.throws(() => assertOperation(policy, "write", "DEV"));
  assert.throws(() => assertOperation(policy, "delete", "DEV"));
  const deleteOnly = parsePolicy({ DSP_ALLOW_READ: "false", DSP_ALLOW_DELETE: "true", DSP_ALLOWED_WRITE_SPACES: "DEV" });
  assertOperation(deleteOnly, "delete", "DEV");
  assert.throws(() => assertOperation(deleteOnly, "read"));
  assert.throws(() => assertOperation(deleteOnly, "write", "DEV"));
});

test("malformed configuration fails closed", () => {
  for (const value of ["", "yes", "1", "TRUE", "flase"]) {
    assert.throws(() => parsePolicy({ DSP_ALLOW_WRITE: value }));
  }
  for (const value of ["*", "DEV,", "DEV,,TEST", "DEV/TEST"]) {
    assert.throws(() => parsePolicy({ DSP_ALLOWED_WRITE_SPACES: value }));
  }
  assert.throws(() => assertOperation(parsePolicy({ DSP_ALLOW_WRITE: "true" }), "write", "DEV"));
});

test("read works across spaces; write and delete require exact allowed space", () => {
  for (const action of ["list", "read"]) authorizeCli(enabled, command(action, "--space", "PROD"));
  for (const action of ["create", "update", "delete"]) {
    authorizeCli(enabled, command(action, "--space", "DEV"));
    authorizeCli(enabled, command(action, "--space=TEST"));
    authorizeCli(enabled, command(action, "-y", "DEV"));
    for (const space of ["PROD", "dev", "DEV,PROD", "*"]) {
      assert.throws(() => authorizeCli(enabled, command(action, "--space", space)));
    }
    assert.throws(() => authorizeCli(enabled, command(action)));
  }
});

test("reject ambiguous syntax, credentials, arbitrary commands and duplicate scope", () => {
  for (const args of [
    ["spaces", "delete", "--space", "DEV"], ["spaces", "save", "--input", "{}"],
    ["tasks", "chains", "run", "--space", "DEV"], ["config", "secrets", "show"],
    ["--help", "objects", "views", "delete"], ["objects", "new-type", "read"],
    command("update", "--space", "DEV", "--space=PROD"),
    command("update", "--space", "DEV", "-y", "DEV"),
    command("update", "--space", "DEV", "--host", "https://other.invalid"),
    command("update", "--space", "DEV", "--secrets-file", "secrets.json"),
    command("update", "--space", "DEV", "--", "delete"),
    command("update", "--space", "DEV", "-F", "file.json"),
    command("update", "-yDEV"), command("update", "--space="),
  ]) assert.throws(() => authorizeCli(enabled, args), args.join(" "));
  assert.deepEqual(authorizeCli(enabled, command("create", "--space=DEV", "--input", '{"x":"--space PROD"}')),
    command("create", "--space", "DEV", "--input", '{"x":"--space PROD"}'));
});

test("read disabled blocks every consumption entry including cached results and CLI before auth", async () => {
  Object.assign(process.env, {
    DSP_ALLOW_READ: "false", DSP_ALLOW_WRITE: "false", DSP_ALLOW_DELETE: "false",
    DSP_ALLOWED_WRITE_SPACES: "", DSP_ALLOWED_OBJECT_PREFIXES: "", DSP_OAUTH_CLIENT_ID: "test",
    DSP_OAUTH_AUTHORIZE_URL: "https://example.invalid/authorize",
    DSP_OAUTH_TOKEN_URL: "https://example.invalid/token", DSP_TENANT_URL: "https://example.invalid",
  });
  const catalog = await import("../dist/catalog.js");
  const data = await import("../dist/datasphere.js");
  const cli = await import("../dist/cli.js");
  const { metadataCache, cacheKey } = await import("../dist/cache.js");
  await metadataCache.getOrFetch(cacheKey(["analytical", "metadata", "DEV", "A"]), async () => ({ secret: "cached" }));
  const calls = [
    () => catalog.listSpaces(), () => catalog.getSpaceInfo("DEV"),
    () => catalog.getSpaceAssets("DEV"), () => catalog.listCatalogAssets(),
    () => catalog.getAssetDetails("DEV", "A"), () => catalog.searchCatalog("test"),
    () => catalog.getAnalyticalMetadata("DEV", "A"), () => catalog.fetchAnalyticalService("DEV", "A"),
    () => catalog.getAnalyticalModel("DEV", "A"),
    () => data.queryAnalyticalModel({ spaceId: "DEV", assetId: "A" }),
    () => data.getAnalyticalFields(), () => data.getAnalyticalServiceDocument(),
    () => data.listRelationalEntities(), () => data.queryRelationalEntity({ entityName: "A" }),
    () => data.warmCache(), () => cli.datasphereCliRun({ args: ["spaces", "list"] }),
    () => cli.datasphereCliRun({ args: command("delete", "--space", "DEV") }),
  ];
  for (const call of calls) await assert.rejects(call, /Safeguard:/);
});
