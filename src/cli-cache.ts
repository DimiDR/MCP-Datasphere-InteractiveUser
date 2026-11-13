import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export function isCliCacheFailure(stdout: string, stderr: string): boolean {
  const message = `${stdout}\n${stderr}`.toLowerCase();
  return message.includes("local cli cache is outdated") ||
    message.includes("cli cache is outdated") ||
    message.includes("config cache init") ||
    message.includes("failed to initialize the local cli cache");
}

/** Read settings only. A saved default host differing from explicit --host is not proof of misrouting. */
export function inspectCliCache(tenantUrl: string, home = homedir(), legacy = process.env.CLI_LEGACY_CACHE_LOCATION === "true") {
  const settingsPath = join(home, ".@sap", "datasphere-cli", ".cache", "settings.json");
  const base = { settings_path: legacy ? null : settingsPath, configured_host: tenantUrl };
  if (legacy) return { ...base, status: "legacy_location_unchecked" as const, saved_host: null, host_matches: null };
  try {
    const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
    const rawHost = settings?.host;
    if (typeof rawHost !== "string") {
      return { ...base, status: "host_unavailable" as const, saved_host: null, host_matches: null };
    }
    // Return only a valid HTTPS origin, never the rest of the settings or URL credentials.
    const saved = new URL(rawHost);
    if (saved.protocol !== "https:" || saved.username || saved.password ||
        saved.search || saved.hash || !["", "/"].includes(saved.pathname)) throw new Error("Invalid host");
    const matches = saved.origin === new URL(tenantUrl).origin;
    return { ...base, status: matches ? "host_matches" as const : "host_differs" as const,
      saved_host: saved.origin, host_matches: matches };
  } catch (error) {
    return { ...base, status: (error as NodeJS.ErrnoException).code === "ENOENT" ? "missing" as const : "unreadable_or_invalid" as const,
      saved_host: null, host_matches: null };
  }
}