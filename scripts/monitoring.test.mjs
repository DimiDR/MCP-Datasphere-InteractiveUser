import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parsePolicy } from "../dist/policy.js";
import { checkedTaskLog, filterNamedList, redactSecrets } from "../dist/read-safeguard.js";

const open = parsePolicy({});
const restricted = parsePolicy({ DSP_ALLOW_READ_OBJECT_PREFIXES: "SOURCE_,HRA" });

test("task logs keep permitted runs and drop children of other objects", () => {
  const log = {
    logId: 1, objectId: "SOURCE_CHAIN", status: "FAILED",
    children: [
      { nodeId: 1, objectId: "SOURCE_VIEW", status: "COMPLETED" },
      { nodeId: 2, objectId: "PRIVATE_VIEW", status: "FAILED", children: [] },
      { nodeId: 3, objectId: "HRA_FLOW", children: [{ objectId: "PRIVATE_NESTED" }, { objectId: "HRA_NESTED" }] },
    ],
    messages: [{ text: "anything" }],
  };
  assert.deepEqual(checkedTaskLog(open, log), log);
  assert.deepEqual(checkedTaskLog(restricted, log), {
    ...log,
    children: [log.children[0], { ...log.children[2], children: [{ objectId: "HRA_NESTED" }] }],
  });
  assert.throws(() => checkedTaskLog(restricted, { objectId: "PRIVATE_CHAIN" }), /Safeguard:/);
  assert.deepEqual(checkedTaskLog(restricted, [{ objectId: "SOURCE_A" }, { objectId: "OTHER" }]), [{ objectId: "SOURCE_A" }]);
});

test("replication flow lists are filtered by technical name; unknown shapes are withheld", () => {
  const rows = [{ technicalName: "SOURCE_RF" }, { name: "HRA_RF" }, { technicalName: "PRIVATE_RF", name: "SOURCE_fake" }, "SOURCE_STR", { label: "SOURCE_x" }];
  assert.deepEqual(filterNamedList(open, rows, "x"), rows);
  assert.deepEqual(filterNamedList(restricted, rows, "x"), [{ technicalName: "SOURCE_RF" }, { name: "HRA_RF" }, "SOURCE_STR"]);
  assert.deepEqual(filterNamedList(restricted, { value: rows, extra: 1 }, "x"), { value: [{ technicalName: "SOURCE_RF" }, { name: "HRA_RF" }, "SOURCE_STR"], extra: 1 });
  assert.throws(() => filterNamedList(restricted, { flows: rows }, "x"), /Safeguard:/);
});

test("connection output masks credential-like values at any depth", () => {
  assert.deepEqual(redactSecrets({
    name: "SOURCE_S4", host: "s4.example", password: "p", configuration: { ClientSecret: "s", apiKey: 1, nested: [{ privateKey: "k", user: "u" }] },
    credentials: { user: "u" },
  }), {
    name: "SOURCE_S4", host: "s4.example", password: "***", configuration: { ClientSecret: "***", apiKey: "***", nested: [{ privateKey: "***", user: "u" }] },
    credentials: { user: "u" },
  });
});

test("monitoring tools reject disallowed names and unsafe IDs before authentication", async () => {
  Object.assign(process.env, {
    DSP_ALLOW_READ: "true", DSP_ALLOW_READ_OBJECT_PREFIXES: "SOURCE_",
    DSP_OAUTH_CLIENT_ID: "test", DSP_OAUTH_AUTHORIZE_URL: "https://example.invalid/authorize",
    DSP_OAUTH_TOKEN_URL: "https://example.invalid/token", DSP_TENANT_URL: "https://example.invalid",
  });
  const m = await import("../dist/monitoring.js");
  for (const call of [
    () => m.getTaskLogHistory("DEV", "PRIVATE_CHAIN"),
    () => m.getTaskLogHistory("DEV/../X", "SOURCE_CHAIN"),
    () => m.getTaskLogHistory("DEV", "SOURCE_A/../../X"),
    () => m.getTaskLog("DEV", "12a"),
    () => m.getTaskLog("DEV", "12", "status"),
    () => m.listReplicationFlows("DEV?x=1"),
    () => m.getReplicationFlowStatus("DEV", "PRIVATE_RF"),
    () => m.getReplicationFlowRunDetails("DEV", "12a"),
    () => m.getConnection("DEV", "PRIVATE_CONN"),
    () => m.validateConnection("DEV", "SOURCE_C/../X"),
    () => m.listConnections("DEV/x"),
  ]) await assert.rejects(call, /Safeguard:/);
});

test("replication run details preserve logs, use verified status path and never invent delta records", async () => {
  const { config } = await import("../dist/config.js");
  const m = await import("../dist/monitoring.js");
  const directory = mkdtempSync(join(tmpdir(), "dsp-monitoring-"));
  const originalFile = config.tokenFile;
  const originalFetch = globalThis.fetch;
  const originalPolicy = config.policy;
  const originalEnvToken = process.env.DSP_ACCESS_TOKEN;
  config.tokenFile = join(directory, "token.json");
  process.env.DSP_ACCESS_TOKEN = "";
  config.policy = restricted;
  writeFileSync(config.tokenFile, JSON.stringify({ access_token: "test", expires_at: Date.now() + 3600000 }));
  let statusCalls = 0;
  let statusFailure = false;
  let owner = "SOURCE_RF";
  let application = "REPLICATION_FLOWS";
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(options.method, "GET");
      if (url.endsWith("/tasks/logs/DEV/123")) {
        assert.equal(options.headers.Accept, "application/vnd.sap.datasphere.task.log.details.extended+json");
        return new Response(JSON.stringify({ objectId: owner, applicationId: application, logId: 123, status: "COMPLETED", messages: [] }));
      }
      statusCalls++;
      assert.equal(url, `${config.datasphere.tenantUrl}/dwaas-core/api/v1/spaces/DEV/replication-flows/SOURCE_RF/status`);
      if (statusFailure) return new Response("{}", { status: 403 });
      return new Response(JSON.stringify({ deltaloadCount: 1, datasets: [{ source: "SOURCE_TABLE", lastTransferAt: "2026-10-30T13:48:55" }] }));
    };
    const result = await m.getReplicationFlowRunDetails("DEV", "123");
    assert.equal(result.task_log.log.logId, 123);
    assert.equal(result.current_flow_status.status.deltaloadCount, 1);
    assert.equal(result.current_flow_status.scope, "current_flow_not_historical_run");
    assert.equal(result.delta_records_count.availability, "unavailable");
    assert.equal("value" in result.delta_records_count, false);
    statusFailure = true;
    const partial = await m.getReplicationFlowRunDetails("DEV", "123");
    assert.equal(partial.task_log.log.status, "COMPLETED");
    assert.equal(partial.current_flow_status.availability, "unavailable");
    owner = "PRIVATE_RF";
    await assert.rejects(() => m.getReplicationFlowRunDetails("DEV", "123"), /Safeguard:/);
    owner = "SOURCE_CHAIN";
    application = "TASK_CHAINS";
    await assert.rejects(() => m.getReplicationFlowRunDetails("DEV", "123"), /does not identify a replication flow/);
    assert.equal(statusCalls, 2);
    config.policy = parsePolicy({ DSP_ALLOW_READ: "false" });
    await assert.rejects(() => m.getReplicationFlowRunDetails("DEV", "123"), /DSP_ALLOW_READ/);
  } finally {
    config.tokenFile = originalFile;
    config.policy = originalPolicy;
    globalThis.fetch = originalFetch;
    if (originalEnvToken === undefined) delete process.env.DSP_ACCESS_TOKEN;
    else process.env.DSP_ACCESS_TOKEN = originalEnvToken;
    rmSync(directory, { recursive: true, force: true });
  }
});

test("control tools require write permission, an allowed write Space and write prefixes before authentication", async () => {
  // config is already loaded by the previous test (module cache), so set the policy directly.
  const { config } = await import("../dist/config.js");
  const m = await import("../dist/monitoring.js");
  const original = config.policy;
  config.policy = parsePolicy({ DSP_ALLOW_WRITE: "true", DSP_ALLOWED_WRITE_SPACES: "DEV", DSP_ALLOW_WRITE_OBJECT_PREFIXES: "ABZ_" });
  try {
    for (const [call, reason] of [
      [() => m.runTaskChain("PROD", "ABZ_CHAIN"), /DSP_ALLOWED_WRITE_SPACES/],
      [() => m.runTaskChain("DEV", "OTHER_CHAIN"), /WRITE_OBJECT_PREFIXES/],
      [() => m.retryTaskChain("DEV", "ABZ_CHAIN/../X"), /WRITE_OBJECT_PREFIXES|invalid object/],
      [() => m.cancelTaskChain("PROD", "12"), /DSP_ALLOWED_WRITE_SPACES/],
      [() => m.cancelTaskChain("DEV", "12;x"), /invalid log/],
      [() => m.controlReplicationFlow("DEV", "OTHER_RF", "start"), /WRITE_OBJECT_PREFIXES/],
      [() => m.controlReplicationFlow("DEV", "ABZ_RF", "delete"), /unsupported replication flow action/],
      [() => m.controlReplicationFlowObject("DEV", "ABZ_RF", "../X", "restart-object"), /invalid object/],
      [() => m.controlReplicationFlowObject("PROD", "ABZ_RF", "T1", "pause-object"), /DSP_ALLOWED_WRITE_SPACES/],
      [() => m.getUser("../Groups"), /invalid user/],
    ]) await assert.rejects(call, reason);
    config.policy = parsePolicy({ DSP_ALLOWED_WRITE_SPACES: "DEV" });
    await assert.rejects(() => m.runTaskChain("DEV", "ABZ_CHAIN"), /DSP_ALLOW_WRITE/);
    await assert.rejects(() => m.cancelTaskChain("DEV", "12"), /DSP_ALLOW_WRITE/);
    await assert.rejects(() => m.controlReplicationFlow("DEV", "ABZ_RF", "stop"), /DSP_ALLOW_WRITE/);
  } finally {
    config.policy = original;
  }
});

test("run window resolves local days DST-safe and rejects bad input", async () => {
  const { resolveRunWindow } = await import("../dist/monitoring.js");
  const day = resolveRunWindow({ date: "2026-10-30" });
  assert.equal(new Date(day.start).toISOString(), "2026-10-29T23:00:00.000Z");
  const summer = resolveRunWindow({ date: "2026-07-01" });
  assert.equal(new Date(summer.start).toISOString(), "2026-06-30T22:00:00.000Z");
  assert.equal(new Date(day.end).toISOString(), "2026-10-30T23:00:00.000Z");
  const dst = resolveRunWindow({ date: "2026-10-25", timeZone: "Europe/Berlin" });
  assert.equal(dst.end - dst.start, 25 * 3600 * 1000);
  const utc = resolveRunWindow({ date: "2026-10-30", timeZone: "UTC" });
  assert.equal(new Date(utc.start).toISOString(), "2026-10-30T00:00:00.000Z");
  const now = Date.parse("2026-11-03T10:15:00Z");
  const today = resolveRunWindow({}, now);
  assert.equal(new Date(today.start).toISOString(), "2026-11-02T23:00:00.000Z");
  assert.equal(today.end, now);
  assert.throws(() => resolveRunWindow({ date: "2026-02-30" }), /Invalid date/);
  assert.throws(() => resolveRunWindow({ date: "2026-10-30", from: "2026-10-30T00:00:00Z" }), /either date or from/);
  assert.throws(() => resolveRunWindow({ from: "2026-10-30T10:00:00Z", to: "2026-10-30T09:00:00Z" }), /empty/);
  assert.throws(() => resolveRunWindow({ from: "2026-01-01T00:00:00Z", to: "2026-03-01T00:00:00Z" }), /31 days/);
  assert.throws(() => resolveRunWindow({ timeZone: "Mars/Base" }), /Unknown time zone/);
});

test("space runs: enumerates flows, filters window and statuses, loads details only for problems", async () => {
  const { config } = await import("../dist/config.js");
  const m = await import("../dist/monitoring.js");
  const directory = mkdtempSync(join(tmpdir(), "dsp-runs-"));
  const originalFile = config.tokenFile;
  const originalFetch = globalThis.fetch;
  const originalPolicy = config.policy;
  const originalEnvToken = process.env.DSP_ACCESS_TOKEN;
  config.tokenFile = join(directory, "token.json");
  process.env.DSP_ACCESS_TOKEN = "";
  config.policy = restricted;
  writeFileSync(config.tokenFile, JSON.stringify({ access_token: "test", expires_at: Date.now() + 3600000 }));
  const histories = {
    SOURCE_RF1: [
      { logId: 1, objectId: "SOURCE_RF1", applicationId: "REPLICATION_FLOWS", status: "COMPLETED", startTime: "2026-10-30T08:00:00Z", endTime: "2026-10-30T08:05:00Z", runTime: 300000, user: "JDOE" },
      { logId: 2, objectId: "SOURCE_RF1", applicationId: "REPLICATION_FLOWS", status: "FAILED", startTime: "2026-10-30T09:00:00Z", endTime: "2026-10-30T09:01:00Z", runTime: 60000, parent: { objectId: "SOURCE_CHAIN" } },
      { logId: 3, objectId: "SOURCE_RF1", status: "COMPLETED", startTime: "2026-10-28T09:00:00Z", endTime: "2026-10-28T09:01:00Z" },
    ],
    HRA_RF2: [{ logId: 4, objectId: "HRA_RF2", status: "RUNNING", startTime: "2026-10-29T21:00:00Z" }],
  };
  const detailCalls = [];
  try {
    globalThis.fetch = async (url) => {
      if (url.endsWith("/spaces/DEV/replicationflows")) {
        return new Response(JSON.stringify([{ technicalName: "SOURCE_RF1" }, { technicalName: "HRA_RF2" }, { technicalName: "PRIVATE_RF" }]));
      }
      const history = /\/tasks\/logs\/DEV\/objects\/([A-Z0-9_]+)$/.exec(url);
      if (history) return new Response(JSON.stringify(histories[history[1]] ?? []));
      const detail = /\/tasks\/logs\/DEV\/(\d+)$/.exec(url);
      if (detail) {
        detailCalls.push(detail[1]);
        return new Response(JSON.stringify({
          ...histories.SOURCE_RF1[1],
          messages: [{ severity: "INFO", text: "started" }, { severity: "ERROR", text: "source unreachable", timestamp: "2026-10-30T09:01:00Z", details: "x" }],
        }));
      }
      throw new Error(`unexpected ${url}`);
    };
    const result = await m.getSpaceRunsInWindow({ spaceId: "DEV", date: "2026-10-30", objectTypes: ["replication-flows"], includeCsv: true });
    assert.equal(result.objects_checked, 2);
    assert.deepEqual(result.status_counts, { COMPLETED: 1, FAILED: 1, RUNNING: 1 });
    assert.deepEqual(result.runs.map((r) => r.log_id), [2, 1, 4]);
    assert.deepEqual(detailCalls, ["2"]);
    assert.deepEqual(result.runs[0].messages, [{ severity: "ERROR", text: "source unreachable", timestamp: "2026-10-30T09:01:00Z" }]);
    assert.equal(result.runs[0].runtime_seconds, 60);
    assert.deepEqual(result.parent_task_chains, ["SOURCE_CHAIN"]);
    assert.equal(JSON.stringify(result).includes("JDOE"), false);
    assert.match(result.csv, /"2";"SOURCE_RF1";"REPLICATION_FLOWS";"FAILED"/);

    const failed = await m.getSpaceRunsInWindow({ spaceId: "DEV", date: "2026-10-30", objectIds: ["SOURCE_RF1", "PRIVATE_X"], statuses: ["failed"], details: "none" });
    assert.equal(failed.matching_runs, 1);
    assert.equal(failed.runs[0].messages, undefined);
    assert.equal(failed.errors.length, 1);
    assert.match(failed.errors[0].error, /Safeguard:/);

    const limited = await m.getSpaceRunsInWindow({ spaceId: "DEV", date: "2026-10-30", objectIds: ["SOURCE_RF1"], maxRuns: 1, details: "none" });
    assert.equal(limited.returned_runs, 1);
    assert.equal(limited.runs_truncated, true);

    // SAP can retain a previous attempt's end time while the same log is RUNNING again.
    histories.HRA_RF2[0] = {
      logId: 4, objectId: "HRA_RF2", status: "RUNNING",
      startTime: "2026-10-30T08:00:00Z", endTime: "2026-10-30T09:00:00Z", runTime: 3600000,
    };
    const flagged = await m.getSpaceRunsInWindow({
      spaceId: "DEV", date: "2026-10-30", objectIds: ["SOURCE_RF1", "HRA_RF2"],
      statuses: ["RUNNING"], details: "none", includeCsv: true,
    });
    assert.deepEqual(flagged.status_counts, { COMPLETED: 1, FAILED: 1, RUNNING: 1 });
    assert.equal(flagged.returned_runs, 1);
    assert.equal(flagged.runs[0].status, "RUNNING");
    assert.equal(flagged.runs[0].end_time, histories.HRA_RF2[0].endTime);
    assert.equal(flagged.runs[0].runtime_seconds, 3600);
    assert.deepEqual(flagged.runs[0].status_flags, ["RUNNING_WITH_END_TIME"]);
    assert.match(flagged.runs[0].status_note, /do not interpret them as completion/);
    assert.match(flagged.runs[0].status_note, /retry is not confirmed/);
    assert.match(flagged.csv, /"status_flags";"status_note"/);
    assert.match(flagged.csv, /"RUNNING_WITH_END_TIME";"SAP reports RUNNING/);
    assert.deepEqual(detailCalls, ["2"]); // Flagging needs no additional detail request.

    for (const [status, endTime] of [
      ["RUNNING", undefined], ["RUNNING", ""], ["RUNNING", "invalid"],
      ["COMPLETED", "2026-10-30T09:00:00Z"], ["FAILED", "2026-10-30T09:00:00Z"],
    ]) {
      Object.assign(histories.HRA_RF2[0], { status, endTime });
      const unflagged = await m.getSpaceRunsInWindow({
        spaceId: "DEV", date: "2026-10-30", objectIds: ["HRA_RF2"], details: "none",
      });
      assert.equal(unflagged.runs[0].status_flags, undefined);
      assert.equal(unflagged.runs[0].status_note, undefined);
    }

    await assert.rejects(() => m.getSpaceRunsInWindow({ spaceId: "DEV/x" }), /Safeguard:/);
    config.policy = parsePolicy({ DSP_ALLOW_READ: "false" });
    await assert.rejects(() => m.getSpaceRunsInWindow({ spaceId: "DEV" }), /DSP_ALLOW_READ/);
  } finally {
    config.tokenFile = originalFile;
    config.policy = originalPolicy;
    globalThis.fetch = originalFetch;
    if (originalEnvToken === undefined) delete process.env.DSP_ACCESS_TOKEN;
    else process.env.DSP_ACCESS_TOKEN = originalEnvToken;
    rmSync(directory, { recursive: true, force: true });
  }
});

test("api discovery search matches paths, summaries and schemas", async () => {
  const { config } = await import("../dist/config.js");
  const m = await import("../dist/monitoring.js");
  const directory = mkdtempSync(join(tmpdir(), "dsp-discovery-"));
  const originalFile = config.tokenFile;
  const originalFetch = globalThis.fetch;
  const originalEnvToken = process.env.DSP_ACCESS_TOKEN;
  config.tokenFile = join(directory, "token.json");
  process.env.DSP_ACCESS_TOKEN = "";
  writeFileSync(config.tokenFile, JSON.stringify({ access_token: "test", expires_at: Date.now() + 3600000 }));
  try {
    globalThis.fetch = async (url) => {
      assert.equal(url, `${config.datasphere.tenantUrl.replace(/\/$/, "")}/dwaas-core/api/v1/discovery`);
      return new Response(JSON.stringify({
        info: { title: "dwaas-core", version: "1" },
        paths: {
          "/spaces/{space}/replication-flows/{name}/status": { get: { summary: "Flow status" }, parameters: [] },
          "/spaces/{space}/views": { get: { summary: "List views" } },
          "/spaces/{space}/tasks": { post: { summary: "Read Metrics of a task", operationId: "taskMetrics" } },
        },
        components: { schemas: { ReplicationFlowStatus: { type: "object" }, DatasetStatus: { type: "object" } } },
      }));
    };
    const result = await m.searchApiDiscovery({ pattern: "replication|metric", schema: "ReplicationFlowStatus" });
    assert.deepEqual(result.paths.map((p) => p.path), ["/spaces/{space}/replication-flows/{name}/status", "/spaces/{space}/tasks"]);
    assert.deepEqual(result.paths[0].operations, [{ method: "GET", summary: "Flow status", operation_id: undefined }]);
    assert.deepEqual(result.schemas, ["ReplicationFlowStatus"]);
    assert.deepEqual(result.schema.definition, { type: "object" });
    const literal = await m.searchApiDiscovery({ pattern: "{space", schema: "Status" });
    assert.equal(literal.path_count, 3);
    assert.match(literal.schema_error, /Similar: ReplicationFlowStatus, DatasetStatus/);
  } finally {
    config.tokenFile = originalFile;
    globalThis.fetch = originalFetch;
    if (originalEnvToken === undefined) delete process.env.DSP_ACCESS_TOKEN;
    else process.env.DSP_ACCESS_TOKEN = originalEnvToken;
    rmSync(directory, { recursive: true, force: true });
  }
});
