import { objectNameAllowed, validateObjectPayload, type Policy } from "./policy.js";

export function filterAssets(policy: Policy, value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((asset) => asset && typeof asset === "object" &&
    objectNameAllowed(policy, asset.assetId ?? asset.id, "read"));
}

/**
 * Task logs: the root run must be readable; nested runs (e.g. task chain children) of
 * disallowed objects are dropped. Free-text messages are not inspected.
 */
export function checkedTaskLog(policy: Policy, value: unknown): unknown {
  if (!policy.readObjectPrefixes.length) return value;
  const hidden = (node: unknown) => node !== null && typeof node === "object" && !Array.isArray(node) &&
    "objectId" in node && !objectNameAllowed(policy, (node as { objectId: unknown }).objectId, "read");
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.filter((item) => !hidden(item)).map(walk);
    if (node === null || typeof node !== "object") return node;
    return Object.fromEntries(Object.entries(node).map(([key, child]) => [key, walk(child)]));
  };
  if (hidden(value)) throw new Error("Safeguard: task log belongs to an object outside DSP_ALLOW_READ_OBJECT_PREFIXES.");
  return walk(value);
}

/** Replication flow / connection lists: keep only permitted names; unknown shapes are withheld. */
export function filterNamedList(policy: Policy, value: unknown, label: string): unknown {
  if (!policy.readObjectPrefixes.length) return value;
  const rows = Array.isArray(value) ? value : (value as { value?: unknown } | null)?.value;
  if (!Array.isArray(rows)) {
    throw new Error(`Safeguard: ${label} list cannot be safely returned under DSP_ALLOW_READ_OBJECT_PREFIXES (unsupported format).`);
  }
  const visible = rows.filter((row) => {
    const flow = typeof row === "string" ? row : (row as { technicalName?: unknown; name?: unknown } | null);
    const name = typeof flow === "string" ? flow : flow?.technicalName ?? flow?.name;
    return objectNameAllowed(policy, name, "read");
  });
  return Array.isArray(value) ? visible : { ...(value as object), value: visible };
}

const secretKey = /pass(word)?|secret|token|private.?key|api.?key|credential|client.?key|certificate/i;

/** Defense in depth: SAP returns connection definitions without credentials; mask anything that looks like one anyway. */
export function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) =>
    [key, secretKey.test(key) && child !== null && typeof child !== "object" ? "***" : redactSecrets(child)]));
}

/** Suppress backend diagnostics/unknown shapes rather than exposing unchecked object content. */
export function checkedCliReadOutput(policy: Policy, args: string[], stdout: string): string {
  if (!policy.readObjectPrefixes.length || args[0] !== "objects" || !["read", "list"].includes(args[2])) return stdout;
  try {
    if (args[2] === "read") return validateObjectPayload(policy, stdout, args[1], "read");
    const parsed = JSON.parse(stdout);
    const rows = Array.isArray(parsed) ? parsed : parsed?.value;
    if (!Array.isArray(rows)) throw new Error("unknown list shape");
    return JSON.stringify(rows.flatMap((row: unknown) => {
      const name = typeof row === "string" ? row : (row as { technicalName?: unknown } | null)?.technicalName;
      return objectNameAllowed(policy, name, "read") ? [{ technicalName: name }] : [];
    }));
  } catch {
    throw new Error("Safeguard: CLI read response cannot be safely returned under DSP_ALLOW_READ_OBJECT_PREFIXES (unsupported format or disallowed definitions).");
  }
}
