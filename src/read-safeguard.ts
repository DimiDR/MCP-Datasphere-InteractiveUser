import { objectNameAllowed, validateObjectPayload, type Policy } from "./policy.js";

export function filterAssets(policy: Policy, value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((asset) => asset && typeof asset === "object" &&
    objectNameAllowed(policy, asset.assetId ?? asset.id, "read"));
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
