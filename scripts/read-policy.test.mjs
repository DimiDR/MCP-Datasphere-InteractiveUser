import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePolicy, authorizeCli, assertObjectName, validateObjectPayload } from "../dist/policy.js";
import { filterAssets, checkedCliReadOutput } from "../dist/read-safeguard.js";

const policy = parsePolicy({ DSP_ALLOW_WRITE: "true", DSP_ALLOW_DELETE: "true", DSP_ALLOWED_WRITE_SPACES: "DEV", DSP_ALLOW_READ_OBJECT_PREFIXES: "SOURCE_,HRA*", DSP_ALLOW_WRITE_OBJECT_PREFIXES: "ABZ*" });
const args = (action, name) => ["objects", "views", action, "--space", "DEV", "--technical-name", name];

test("read and write prefixes are independent, deletion uses write prefixes", () => {
  authorizeCli(policy, args("read", "SOURCE_A"));
  authorizeCli(policy, args("delete", "ABZ_A"));
  assert.throws(() => authorizeCli(policy, args("read", "ABZ_A")));
  assert.throws(() => authorizeCli(policy, args("delete", "SOURCE_A")));
  validateObjectPayload(policy, '{"definitions":{"ABZ_A":{}}}', "views");
  assert.throws(() => validateObjectPayload(policy, '{"definitions":{"SOURCE_A":{}}}', "views"));
  assert.throws(() => parsePolicy({ DSP_ALLOWED_OBJECT_PREFIXES: "OLD" }), /replaced/);
  for (const value of ["*", "A,,B", "A?", "A*B"]) assert.throws(() => parsePolicy({ DSP_ALLOW_READ_OBJECT_PREFIXES: value }));
  assertObjectName(parsePolicy({ DSP_ALLOW_WRITE_OBJECT_PREFIXES: "ABZ" }), "OTHER", "read");
  assertObjectName(parsePolicy({ DSP_ALLOW_READ_OBJECT_PREFIXES: "SOURCE_" }), "OTHER", "write");
});

test("CLI read/list safeguard checks names, output and bulk export routes", () => {
  assert.throws(() => authorizeCli(policy, ["objects", "views", "read", "--space", "DEV"]));
  assert.throws(() => authorizeCli(policy, ["spaces", "read", "--space", "DEV"]));
  const list = authorizeCli(policy, ["objects", "views", "list", "--space", "DEV", "--filter", "status eq 'Deployed'"]);
  assert.match(list[list.indexOf("--filter") + 1], /startswith\(technicalName,'SOURCE_'\)/);
  assert.throws(() => authorizeCli(policy, ["objects", "views", "list", "--space", "DEV", "--select", "definition"]));
  assert.deepEqual(JSON.parse(checkedCliReadOutput(policy, list, JSON.stringify([
    { technicalName: "SOURCE_A", extra: { hidden: true } }, { technicalName: "ABZ_A" }, { label: "SOURCE_fake" }, "HRA_B",
  ]))), [{ technicalName: "SOURCE_A" }, { technicalName: "HRA_B" }]);
  assert.throws(() => checkedCliReadOutput(policy, list, "CLI log followed by JSON"));
  checkedCliReadOutput(policy, args("read", "SOURCE_A"), '{"definitions":{"SOURCE_A":{}}}');
  assert.throws(() => checkedCliReadOutput(policy, args("read", "SOURCE_A"), '{"definitions":{"SOURCE_A":{},"ABZ_PRIVATE":{}}}'));
});

test("catalog filtering uses technical identifiers, not labels or write permission", () => {
  assert.deepEqual(filterAssets(policy, [
    { assetId: "SOURCE_A" }, { id: "HRA_B" }, { assetId: "ABZ_A", name: "SOURCE_fake" },
    { assetId: "PRIVATE", id: "SOURCE_fake" }, { name: "SOURCE_fake" }, null,
  ]), [{ assetId: "SOURCE_A" }, { id: "HRA_B" }]);
});

test("consumption names are checked before auth and cache; search filters cached assets", async () => {
  Object.assign(process.env, {
    DSP_ALLOW_READ: "true", DSP_ALLOW_WRITE: "true", DSP_ALLOW_DELETE: "false",
    DSP_ALLOWED_WRITE_SPACES: "DEV", DSP_ALLOW_READ_OBJECT_PREFIXES: "SOURCE_,HRA",
    DSP_ALLOW_WRITE_OBJECT_PREFIXES: "ABZ", DSP_ALLOWED_OBJECT_PREFIXES: "",
    DSP_OAUTH_CLIENT_ID: "test", DSP_OAUTH_AUTHORIZE_URL: "https://example.invalid/authorize",
    DSP_OAUTH_TOKEN_URL: "https://example.invalid/token", DSP_TENANT_URL: "https://example.invalid",
    DSP_SPACE_ID: "DEV", DSP_ASSET_ID: "ABZ_DENIED", DSP_CACHE_ENABLED: "true",
  });
  const catalog = await import("../dist/catalog.js");
  const data = await import("../dist/datasphere.js");
  const { metadataCache, cacheKey } = await import("../dist/cache.js");
  await metadataCache.getOrFetch(cacheKey(["analytical", "metadata", "DEV", "ABZ_DENIED"]), async () => ({ secret: true }));
  const forbidden = [
    () => catalog.getAssetDetails("DEV", "ABZ_DENIED"),
    () => catalog.getAnalyticalMetadata("DEV", "ABZ_DENIED"),
    () => catalog.fetchAnalyticalService("DEV", "ABZ_DENIED"),
    () => catalog.getAnalyticalModel("DEV", "ABZ_DENIED"),
    () => data.queryAnalyticalModel(), () => data.getAnalyticalFields(),
    () => data.getAnalyticalServiceDocument(), () => data.listRelationalEntities(),
    () => data.queryRelationalEntity({ entityName: "A" }), () => data.warmCache(),
    () => data.queryAnalyticalModel({ assetId: "SOURCE_A", select: "X", entitySet: "../../ABZ_DENIED/A" }),
    () => data.queryRelationalEntity({ assetId: "SOURCE_A", entityName: ".." }),
  ];
  for (const call of forbidden) await assert.rejects(call, /Safeguard:/);
  await metadataCache.getOrFetch(cacheKey(["analytical", "service", "DEV", "SOURCE_A"]), async () => ({ value: [] }));
  assert.deepEqual(await data.getAnalyticalServiceDocument({ assetId: "SOURCE_A" }), { value: [] });
  await metadataCache.getOrFetch(cacheKey(["catalog", "assets", "all"]), async () => ({ value: [{ assetId: "SOURCE_A" }, { assetId: "ABZ_DENIED" }] }));
  const result = await catalog.searchCatalog("");
  assert.equal(result.count, 1);
  assert.deepEqual(result.value, [{ assetId: "SOURCE_A" }]);
});
