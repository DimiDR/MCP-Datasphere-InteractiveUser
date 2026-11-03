import { assertObjectName, assertOperation } from "./policy.js";
import { checkedTaskLog, filterNamedList, redactSecrets } from "./read-safeguard.js";
import { config } from "./config.js";
import { dspFetch } from "./http.js";
import { getValidAccessToken } from "./oauth.js";

/**
 * Tasks, Replication Flow, Connections, Certificates and SCIM user REST APIs. Never cached: status is live.
 * Reads need DSP_ALLOW_READ; task/replication flow control needs DSP_ALLOW_WRITE plus an allowed write Space.
 */

export const taskLogDetailLevels = {
  status: "application/vnd.sap.datasphere.task.log.status.object+json",
  details: "application/vnd.sap.datasphere.task.log.details+json",
  extended: "application/vnd.sap.datasphere.task.log.details.extended+json",
} as const;
export type TaskLogDetailLevel = keyof typeof taskLogDetailLevels;

type SegmentKind = "space" | "object" | "log" | "user";

function segment(kind: SegmentKind, value: string): string {
  const pattern = {
    space: /^[A-Za-z0-9_]+$/,
    object: /^[A-Za-z0-9_][A-Za-z0-9_.]*$/,
    log: /^[0-9]+$/,
    user: /^[A-Za-z0-9_][A-Za-z0-9_.@-]*$/,
  }[kind];
  if (!pattern.test(value)) throw new Error(`Safeguard: invalid ${kind} identifier '${value}'.`);
  return encodeURIComponent(value);
}

const tenantBase = () => config.datasphere.tenantUrl.replace(/\/$/, "");

type CallOptions = {
  accept?: string;
  base?: string;
  method?: "GET" | "POST";
  body?: unknown;
  /** Same-API GET path used to fetch an x-csrf-token (plus session cookies) before a POST. */
  csrfFrom?: string;
};

async function call(path: string, options: CallOptions = {}): Promise<{ url: string; data: unknown }> {
  const base = options.base ?? config.datasphere.apiUrl;
  const url = `${base}${path}`;
  const accessToken = await getValidAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: options.accept ?? "application/json",
    "Accept-Language": "en",
  };
  if (options.csrfFrom) {
    const res = await dspFetch(`${base}${options.csrfFrom}`, {
      headers: { Authorization: headers.Authorization, Accept: "application/json", "x-csrf-token": "fetch" },
    });
    await res.text();
    const token = res.headers.get("x-csrf-token");
    if (token && token.toLowerCase() !== "required") headers["x-csrf-token"] = token;
    const cookies = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
    if (cookies) headers.Cookie = cookies;
  }
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await dspFetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await res.text();
  if (!res.ok) {
    const hint = res.status === 403
      ? options.method === "POST"
        ? " Hint: running/controlling tasks needs a scoped role with Data Warehouse Data Integration (--U-----) on this Space and, for Interactive Usage, authorized consent (profile settings or `datasphere tasks consent give`)."
        : " Hint: requires a scoped role on this Space (Data Integration -R------ for tasks/replication flows, Data Warehouse Connection for connections) or, for certificates/users, a global administrator role."
      : res.status === 404 ? " Hint: check Space/object/log ID; if the path itself is unknown, set DSP_API_URL to the tenant API host." : "";
    throw new Error(`Request failed (${res.status}) for ${options.method ?? "GET"} ${url}: ${text.slice(0, 800)}${hint}`);
  }
  try {
    return { url, data: text ? JSON.parse(text) : null };
  } catch {
    throw new Error(`Non-JSON response (${res.status}) for ${url}: ${text.slice(0, 500)}`);
  }
}

export async function getTaskLogHistory(spaceId: string, objectId: string) {
  assertOperation(config.policy, "read");
  assertObjectName(config.policy, objectId, "read");
  const { url, data } = await call(
    `/api/v1/datasphere/tasks/logs/${segment("space", spaceId)}/objects/${segment("object", objectId)}`,
  );
  return { url, space_id: spaceId, object_id: objectId, logs: checkedTaskLog(config.policy, data) };
}

export async function getTaskLog(spaceId: string, logId: string, detail: TaskLogDetailLevel = "details") {
  assertOperation(config.policy, "read");
  // The status-only format carries no objectId, so the owning object cannot be checked.
  if (config.policy.readObjectPrefixes.length && detail === "status") {
    throw new Error("Safeguard: with DSP_ALLOW_READ_OBJECT_PREFIXES use detail 'details' or 'extended' so the object can be checked.");
  }
  const { url, data } = await call(
    `/api/v1/datasphere/tasks/logs/${segment("space", spaceId)}/${segment("log", logId)}`,
    { accept: taskLogDetailLevels[detail] },
  );
  if (config.policy.readObjectPrefixes.length && !(data && typeof data === "object" && "objectId" in data)) {
    throw new Error("Safeguard: task log has no objectId and cannot be checked against DSP_ALLOW_READ_OBJECT_PREFIXES.");
  }
  return { url, space_id: spaceId, log_id: logId, detail, log: checkedTaskLog(config.policy, data) };
}

export async function listReplicationFlows(spaceId: string) {
  assertOperation(config.policy, "read");
  // Path as documented (no hyphen, unlike the status endpoint).
  const { url, data } = await call(`/api/v1/datasphere/spaces/${segment("space", spaceId)}/replicationflows`);
  return { url, space_id: spaceId, replication_flows: filterNamedList(config.policy, data, "replication flow") };
}

export async function getReplicationFlowStatus(spaceId: string, technicalName: string) {
  assertOperation(config.policy, "read");
  assertObjectName(config.policy, technicalName, "read");
  const { url, data } = await call(
    `/dwaas-core/api/v1/spaces/${segment("space", spaceId)}/replication-flows/${segment("object", technicalName)}/status`,
    { base: tenantBase() },
  );
  return { url, space_id: spaceId, technical_name: technicalName, status: data };
}

/** Task history and current dataset status are separate sources, not historical object metrics. */
export async function getReplicationFlowRunDetails(spaceId: string, logId: string) {
  const task = await getTaskLog(spaceId, logId, "extended");
  const log = task.log as { objectId?: unknown; applicationId?: unknown } | null;
  if (!log || log.applicationId !== "REPLICATION_FLOWS" || typeof log.objectId !== "string") {
    throw new Error("This log ID does not identify a replication flow run.");
  }
  assertObjectName(config.policy, log.objectId, "read");
  const metrics = {
    availability: "unavailable" as const,
    reason: "The verified Tasks and Replication Flow status APIs do not expose Delta Records Count. The UI Metrics endpoint has not been verified. Missing is not zero; deltaloadCount is not a records count.",
  };
  try {
    const current = await getReplicationFlowStatus(spaceId, log.objectId);
    return {
      space_id: spaceId, log_id: logId, task_log: task,
      current_flow_status: { ...current, observed_at: new Date().toISOString(), scope: "current_flow_not_historical_run" },
      delta_records_count: metrics,
    };
  } catch (error) {
    return {
      space_id: spaceId, log_id: logId, task_log: task,
      current_flow_status: { availability: "unavailable", reason: error instanceof Error ? error.message : String(error) },
      delta_records_count: metrics,
    };
  }
}

// Connections, certificates and SCIM are documented on the regular tenant URL (not the separate API host).
export async function listConnections(spaceId: string) {
  assertOperation(config.policy, "read");
  const { url, data } = await call(`/api/v1/datasphere/spaces/${segment("space", spaceId)}/connections`, { base: tenantBase() });
  return { url, space_id: spaceId, connections: redactSecrets(filterNamedList(config.policy, data, "connection")) };
}

export async function getConnection(spaceId: string, connectionName: string) {
  assertOperation(config.policy, "read");
  assertObjectName(config.policy, connectionName, "read");
  const { url, data } = await call(
    `/api/v1/datasphere/spaces/${segment("space", spaceId)}/connections/${segment("object", connectionName)}`,
    { base: tenantBase() },
  );
  return { url, space_id: spaceId, connection: connectionName, definition: redactSecrets(data) };
}

/** Triggers a live connectivity check against the remote system; changes nothing in Datasphere. */
export async function validateConnection(spaceId: string, connectionName: string) {
  assertOperation(config.policy, "read");
  assertObjectName(config.policy, connectionName, "read");
  const { url, data } = await call(
    `/api/v1/datasphere/spaces/${segment("space", spaceId)}/connections/${segment("object", connectionName)}/validation`,
    { base: tenantBase() },
  );
  return { url, space_id: spaceId, connection: connectionName, validation: redactSecrets(data) };
}

// ── Certificates and users (tenant-wide, read-only) ─────────────────────────

export async function listCertificates() {
  assertOperation(config.policy, "read");
  const { url, data } = await call("/api/v1/datasphere/configuration/security/certificates", { base: tenantBase() });
  return { url, certificates: data };
}

export async function listUsers(options: {
  filter?: string;
  startIndex?: number;
  count?: number;
  sortBy?: string;
  sortOrder?: "ascending" | "descending";
} = {}) {
  assertOperation(config.policy, "read");
  const query = new URLSearchParams();
  if (options.filter) query.set("filter", options.filter);
  if (options.startIndex != null) query.set("startIndex", String(options.startIndex));
  if (options.count != null) query.set("count", String(options.count));
  if (options.sortBy) query.set("sortBy", options.sortBy);
  if (options.sortOrder) query.set("sortOrder", options.sortOrder);
  const qs = query.toString();
  const { url, data } = await call(`/api/v1/scim2/Users${qs ? `?${qs}` : ""}`, { base: tenantBase() });
  return { url, users: redactSecrets(data) };
}

export async function getUser(userId: string) {
  assertOperation(config.policy, "read");
  const { url, data } = await call(`/api/v1/scim2/Users/${segment("user", userId)}`, { base: tenantBase() });
  return { url, user: redactSecrets(data) };
}

// ── Task chain / replication flow control (write) ───────────────────────────

/** Control actions change runtime state: same gate as object create/update (DSP_ALLOW_WRITE + write Space + write prefixes). */
function assertControl(spaceId: string, objectName: string): void {
  assertOperation(config.policy, "write", spaceId);
  assertObjectName(config.policy, objectName, "write");
}

const taskChainPath = (spaceId: string, action: "run" | "retry", chain: string) =>
  `/api/v1/datasphere/tasks/chains/${segment("space", spaceId)}/${action}/${segment("object", chain)}`;
const taskHistoryPath = (spaceId: string, objectId: string) =>
  `/api/v1/datasphere/tasks/logs/${segment("space", spaceId)}/objects/${segment("object", objectId)}`;

export async function runTaskChain(spaceId: string, chain: string, inputParameters?: Record<string, string>) {
  assertControl(spaceId, chain);
  const body = inputParameters && Object.keys(inputParameters).length ? { inputParameters } : undefined;
  const { url, data } = await call(taskChainPath(spaceId, "run", chain), {
    method: "POST", body, csrfFrom: taskHistoryPath(spaceId, chain),
  });
  return { url, space_id: spaceId, task_chain: chain, result: data };
}

/** Valid for FAILED or CANCELED runs that were the chain's last run. */
export async function retryTaskChain(spaceId: string, chain: string) {
  assertControl(spaceId, chain);
  const { url, data } = await call(taskChainPath(spaceId, "retry", chain), {
    method: "POST", csrfFrom: taskHistoryPath(spaceId, chain),
  });
  return { url, space_id: spaceId, task_chain: chain, result: data };
}

export async function cancelTaskChain(spaceId: string, logId: string) {
  assertOperation(config.policy, "write", spaceId);
  const logPath = `/api/v1/datasphere/tasks/logs/${segment("space", spaceId)}/${segment("log", logId)}`;
  // The cancel endpoint only takes a log ID; resolve the owning chain to apply write prefixes.
  let chain: unknown;
  if (config.policy.writeObjectPrefixes.length) {
    const { data } = await call(logPath, { accept: taskLogDetailLevels.details });
    chain = (data as { objectId?: unknown } | null)?.objectId;
    if (typeof chain !== "string") throw new Error("Safeguard: cannot determine the task chain of this log ID for DSP_ALLOW_WRITE_OBJECT_PREFIXES.");
    assertObjectName(config.policy, chain, "write");
  }
  const { url, data } = await call(`/api/v1/datasphere/tasks/chains/${segment("space", spaceId)}/cancel/${segment("log", logId)}`, {
    method: "POST", csrfFrom: logPath,
  });
  return { url, space_id: spaceId, log_id: logId, ...(chain ? { task_chain: chain } : {}), result: data };
}

export const replicationFlowActions = ["start", "pause", "resume", "stop"] as const;
export const replicationObjectActions = ["pause-object", "resume-object", "restart-object"] as const;

const replicationFlowPath = (spaceId: string, flow: string) =>
  `/api/v1/datasphere/spaces/${segment("space", spaceId)}/replication-flows/${segment("object", flow)}`;

export async function controlReplicationFlow(spaceId: string, flow: string, action: typeof replicationFlowActions[number]) {
  if (!replicationFlowActions.includes(action)) throw new Error(`Safeguard: unsupported replication flow action '${action}'.`);
  assertControl(spaceId, flow);
  const base = replicationFlowPath(spaceId, flow);
  const { url, data } = await call(`${base}/${action}`, { method: "POST", csrfFrom: `${base}/status` });
  return { url, space_id: spaceId, technical_name: flow, action, result: data };
}

export async function controlReplicationFlowObject(
  spaceId: string,
  flow: string,
  objectName: string,
  action: typeof replicationObjectActions[number],
) {
  if (!replicationObjectActions.includes(action)) throw new Error(`Safeguard: unsupported replication object action '${action}'.`);
  assertControl(spaceId, flow);
  const base = replicationFlowPath(spaceId, flow);
  const { url, data } = await call(`${base}/objects/${segment("object", objectName)}/${action}`, {
    method: "POST", csrfFrom: `${base}/status`,
  });
  return { url, space_id: spaceId, technical_name: flow, object: objectName, action, result: data };
}

// ── Space-wide run overview (aggregates task log history over many objects) ─

export const runObjectTypes = ["replication-flows", "task-chains", "transformation-flows", "data-flows"] as const;
export type RunObjectType = typeof runObjectTypes[number];
export const runDetailModes = ["none", "problems", "all"] as const;
export type RunDetailMode = typeof runDetailModes[number];

const MAX_WINDOW_MS = 31 * 24 * 3600 * 1000;
const MAX_OBJECTS = 2000;
const PARALLEL_REQUESTS = 6;

/** Offset (ms) of `timeZone` from UTC at instant `ms`. */
function zoneOffset(ms: number, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(new Date(ms)).map((p) => [p.type, p.value]),
  );
  const local = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return local - Math.floor(ms / 1000) * 1000;
}

/** UTC instant of local midnight of `date` (YYYY-MM-DD) in `timeZone`; DST-safe. */
function zonedMidnight(date: string, timeZone: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`Invalid date '${date}', expected YYYY-MM-DD.`);
  const naive = Date.UTC(+match[1], +match[2] - 1, +match[3]);
  if (new Date(naive).toISOString().slice(0, 10) !== date) throw new Error(`Invalid date '${date}'.`);
  const first = naive - zoneOffset(naive, timeZone);
  return naive - zoneOffset(first, timeZone);
}

function checkTimeZone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
  } catch {
    throw new Error(`Unknown time zone '${timeZone}' (use an IANA name such as Europe/Berlin).`);
  }
}

/**
 * Resolves the query window. `date` = one local calendar day in `timeZone`; otherwise `from`
 * (default: local midnight today) to `to` (default: now).
 */
export function resolveRunWindow(
  options: { from?: string; to?: string; date?: string; timeZone?: string },
  now: number = Date.now(),
): { start: number; end: number; timeZone: string } {
  const timeZone = options.timeZone ?? "Europe/Berlin";
  checkTimeZone(timeZone);
  const parse = (value: string, name: string) => {
    const ms = Date.parse(value);
    if (Number.isNaN(ms)) throw new Error(`Invalid ${name} '${value}', expected an ISO 8601 date-time.`);
    return ms;
  };
  let start: number;
  let end: number;
  if (options.date) {
    if (options.from || options.to) throw new Error("Use either date or from/to, not both.");
    start = zonedMidnight(options.date, timeZone);
    const next = new Date(Date.UTC(+options.date.slice(0, 4), +options.date.slice(5, 7) - 1, +options.date.slice(8, 10) + 1));
    end = zonedMidnight(next.toISOString().slice(0, 10), timeZone);
  } else {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));
    start = options.from ? parse(options.from, "from") : zonedMidnight(today, timeZone);
    end = options.to ? parse(options.to, "to") : now;
  }
  if (start >= end) throw new Error("Time window is empty: 'from' must be before 'to'.");
  if (end - start > MAX_WINDOW_MS) throw new Error("Time window is limited to 31 days.");
  return { start, end, timeZone };
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  }));
  return results;
}

function rowNames(value: unknown): string[] {
  const rows = Array.isArray(value) ? value : (value as { value?: unknown } | null)?.value;
  if (!Array.isArray(rows)) throw new Error("Unexpected list format.");
  return rows.flatMap((row) => {
    const item = row as { technicalName?: unknown; name?: unknown } | null;
    const name = typeof row === "string" ? row : item?.technicalName ?? item?.name;
    return typeof name === "string" ? [name] : [];
  });
}

async function cliObjectNames(spaceId: string, type: RunObjectType): Promise<string[]> {
  const { datasphereCliRun } = await import("./cli.js");
  const names: string[] = [];
  for (let skip = 0; skip < MAX_OBJECTS;) {
    const result = await datasphereCliRun({
      args: ["objects", type, "list", "--space", spaceId, "--top", "200", "--skip", String(skip)],
    });
    if (!result.ok) throw new Error(result.stderr.trim() || `CLI exited with ${result.exit_code}`);
    const page = rowNames(JSON.parse(result.stdout || "[]"));
    if (!page.length) break;
    names.push(...page);
    skip += page.length;
  }
  return names;
}

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Replication flows via REST (CLI fallback); other object types via the datasphere CLI. */
async function listObjectNames(spaceId: string, type: RunObjectType): Promise<string[]> {
  if (type !== "replication-flows") return cliObjectNames(spaceId, type);
  try {
    return rowNames((await listReplicationFlows(spaceId)).replication_flows);
  } catch (restError) {
    if (errorMessage(restError).startsWith("Safeguard:")) throw restError;
    try {
      return await cliObjectNames(spaceId, type);
    } catch (cliError) {
      throw new Error(`REST: ${errorMessage(restError)} | CLI: ${errorMessage(cliError)}`);
    }
  }
}

type TaskLogEntry = {
  logId?: unknown; objectId?: unknown; applicationId?: unknown; activity?: unknown; status?: unknown;
  startTime?: unknown; endTime?: unknown; runTime?: unknown; parent?: { objectId?: unknown } | null;
  messages?: unknown;
};

const NON_PROBLEM_STATUSES = new Set(["COMPLETED", "RUNNING"]);
const MAX_MESSAGES_PER_RUN = 20;

function problemMessages(log: TaskLogEntry | undefined) {
  const messages = Array.isArray(log?.messages) ? log.messages : [];
  return messages
    .filter((m) => m && typeof m === "object" && (m as { severity?: unknown }).severity !== "INFO")
    .slice(0, MAX_MESSAGES_PER_RUN)
    .map((m) => {
      const { severity, text, timestamp } = m as { severity?: unknown; text?: unknown; timestamp?: unknown };
      return { severity, text, timestamp };
    });
}

function localTime(value: unknown, timeZone: string): string | undefined {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return undefined;
  return new Date(value).toLocaleString("de-DE", { timeZone });
}

function csvCell(value: unknown): string {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

/**
 * All runs of objects in a Space that overlap a time window, with status counts and (optionally) the
 * non-INFO messages of each run. The user who ran a task is omitted (personal data).
 */
export async function getSpaceRunsInWindow(options: {
  spaceId: string;
  from?: string;
  to?: string;
  date?: string;
  timeZone?: string;
  objectTypes?: RunObjectType[];
  objectIds?: string[];
  statuses?: string[];
  details?: RunDetailMode;
  maxRuns?: number;
  includeCsv?: boolean;
}) {
  assertOperation(config.policy, "read");
  segment("space", options.spaceId);
  const window = resolveRunWindow(options);
  const detailMode = options.details ?? "problems";
  const maxRuns = Math.min(1000, Math.max(1, options.maxRuns ?? 200));
  const statusFilter = options.statuses?.length ? new Set(options.statuses.map((s) => s.toUpperCase())) : undefined;
  const errors: { object_id?: string; object_type?: string; error: string }[] = [];

  // 1. Objects to check
  let objects: string[];
  if (options.objectIds?.length) {
    objects = [...new Set(options.objectIds)];
  } else {
    const types: RunObjectType[] = options.objectTypes?.length ? options.objectTypes : ["replication-flows", "task-chains"];
    const lists = await Promise.all(types.map(async (type) => {
      try {
        return await listObjectNames(options.spaceId, type);
      } catch (e) {
        errors.push({ object_type: type, error: errorMessage(e) });
        return [];
      }
    }));
    objects = [...new Set(lists.flat())];
  }
  const objectsTruncated = objects.length > MAX_OBJECTS;
  objects = objects.slice(0, MAX_OBJECTS);

  // 2. History per object, filtered to runs overlapping the window
  const histories = await mapLimit(objects, PARALLEL_REQUESTS, async (objectId) => {
    try {
      const { logs } = await getTaskLogHistory(options.spaceId, objectId);
      if (!Array.isArray(logs)) throw new Error("Unexpected task log history format.");
      return (logs as TaskLogEntry[]).filter((log) => {
        const start = Date.parse(String(log.startTime));
        const end = log.endTime ? Date.parse(String(log.endTime)) : NaN;
        return !Number.isNaN(start) && start < window.end && (Number.isNaN(end) || end >= window.start);
      });
    } catch (e) {
      errors.push({ object_id: objectId, error: errorMessage(e) });
      return [];
    }
  });
  let runs = histories.flat();
  const statusCounts: Record<string, number> = {};
  for (const run of runs) {
    const status = String(run.status ?? "UNKNOWN");
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
  }
  const runsInWindow = runs.length;
  if (statusFilter) runs = runs.filter((run) => statusFilter.has(String(run.status ?? "UNKNOWN").toUpperCase()));
  runs.sort((a, b) => String(b.startTime).localeCompare(String(a.startTime)));
  const matchingRuns = runs.length;
  runs = runs.slice(0, maxRuns);

  // 3. Extended details (messages) for problem runs or all runs
  const rows = await mapLimit(runs, PARALLEL_REQUESTS, async (run) => {
    const wantDetails = detailMode === "all" ||
      (detailMode === "problems" && !NON_PROBLEM_STATUSES.has(String(run.status ?? "").toUpperCase()));
    let detailLog: TaskLogEntry | undefined;
    let detailError: string | undefined;
    if (wantDetails && run.logId != null) {
      try {
        detailLog = (await getTaskLog(options.spaceId, String(run.logId), "extended")).log as TaskLogEntry;
      } catch (e) {
        detailError = errorMessage(e);
      }
    }
    const log = detailLog ?? run;
    return {
      log_id: run.logId,
      object_id: run.objectId,
      application_id: log.applicationId ?? run.applicationId,
      activity: log.activity ?? run.activity,
      status: log.status ?? run.status,
      start_time: run.startTime,
      end_time: run.endTime,
      start_local: localTime(run.startTime, window.timeZone),
      end_local: localTime(run.endTime, window.timeZone),
      runtime_seconds: typeof run.runTime === "number" ? Math.round(run.runTime / 100) / 10 : undefined,
      parent_object_id: log.parent?.objectId ?? run.parent?.objectId,
      ...(wantDetails ? { messages: problemMessages(log) } : {}),
      ...(detailError ? { detail_error: detailError } : {}),
    };
  });

  const result: Record<string, unknown> = {
    space_id: options.spaceId,
    window: {
      from: new Date(window.start).toISOString(),
      to: new Date(window.end).toISOString(),
      time_zone: window.timeZone,
    },
    queried_at: new Date().toISOString(),
    objects_checked: objects.length,
    ...(objectsTruncated ? { objects_truncated: true, objects_limit: MAX_OBJECTS } : {}),
    runs_in_window: runsInWindow,
    status_counts: statusCounts,
    matching_runs: matchingRuns,
    returned_runs: rows.length,
    ...(matchingRuns > rows.length ? { runs_truncated: true } : {}),
    parent_task_chains: [...new Set(rows.map((r) => r.parent_object_id).filter((p): p is string => typeof p === "string"))],
    runs: rows,
    errors,
  };
  if (options.includeCsv) {
    const header = ["log_id", "object_id", "application_id", "status", `start (${window.timeZone})`, `end (${window.timeZone})`,
      "runtime_seconds", "parent_task_chain", "messages"];
    result.csv = [header.map(csvCell).join(";"), ...rows.map((r) => [
      r.log_id, r.object_id, r.application_id, r.status, r.start_local, r.end_local, r.runtime_seconds, r.parent_object_id,
      (r.messages ?? []).map((m) => `${m.severity}: ${m.text}`).join(" | "),
    ].map(csvCell).join(";"))].join("\r\n");
  }
  return result;
}

// ── Tenant API discovery (OpenAPI document of the dwaas-core API) ───────────

function searchPattern(pattern: string): RegExp {
  if (!pattern || pattern.length > 200) throw new Error("pattern must be 1-200 characters.");
  try {
    return new RegExp(pattern, "i");
  } catch {
    return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }
}

/**
 * Searches the tenant's API discovery document (/dwaas-core/api/v1/discovery) for endpoint paths and
 * schema names, e.g. to find monitoring endpoints. Returns API metadata only, no object data.
 */
export async function searchApiDiscovery(options: { pattern: string; schema?: string; maxResults?: number }) {
  assertOperation(config.policy, "read");
  const regex = searchPattern(options.pattern);
  const maxResults = Math.min(500, Math.max(1, options.maxResults ?? 100));
  const { url, data } = await call("/dwaas-core/api/v1/discovery", { base: tenantBase() });
  const doc = (data ?? {}) as {
    info?: { title?: unknown; version?: unknown };
    paths?: Record<string, Record<string, { summary?: unknown; operationId?: unknown }>>;
    components?: { schemas?: Record<string, unknown> };
  };
  const methods = new Set(["get", "post", "put", "patch", "delete", "head", "options"]);
  const paths = Object.entries(doc.paths ?? {}).flatMap(([path, item]) => {
    const operations = Object.entries(item ?? {})
      .filter(([method]) => methods.has(method))
      .map(([method, op]) => ({ method: method.toUpperCase(), summary: op?.summary, operation_id: op?.operationId }));
    const hit = regex.test(path) ||
      operations.some((op) => regex.test(String(op.summary ?? "")) || regex.test(String(op.operation_id ?? "")));
    return hit ? [{ path, operations }] : [];
  });
  const schemaNames = Object.keys(doc.components?.schemas ?? {});
  const schemas = schemaNames.filter((name) => regex.test(name));
  const result: Record<string, unknown> = {
    url,
    ...(doc.info ? { api: { title: doc.info.title, version: doc.info.version } } : {}),
    pattern: options.pattern,
    path_count: paths.length,
    paths: paths.slice(0, maxResults),
    ...(paths.length > maxResults ? { paths_truncated: true } : {}),
    schemas: schemas.slice(0, maxResults),
  };
  if (options.schema) {
    const definition = doc.components?.schemas?.[options.schema];
    if (definition === undefined) {
      const needle = options.schema.toLowerCase();
      const similar = schemaNames.filter((name) => name.toLowerCase().includes(needle)).slice(0, 20);
      result.schema_error = `Schema '${options.schema}' not found.${similar.length ? ` Similar: ${similar.join(", ")}` : ""}`;
    } else {
      result.schema = { name: options.schema, definition };
    }
  }
  return result;
}
