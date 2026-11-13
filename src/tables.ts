import { datasphereCliRun, type CliRunResult } from "./cli.js";
import { config } from "./config.js";
import { assertOperation, objectNameAllowed } from "./policy.js";

export const tableTypes = ["local-tables", "remote-tables"] as const;
type TableType = typeof tableTypes[number];
type Runner = (options: { args: string[] }) => Promise<CliRunResult>;
type Table = { space_id: string; technical_name: string; type: TableType };

function parseList(result: CliRunResult): unknown[] {
  if (!result.ok || result.truncated || result.timed_out) {
    throw new Error("Table inventory unavailable: CLI listing failed or was truncated. No complete inventory can be reported. Check authentication, CLI installation and Space read permissions.");
  }
  let parsed: unknown;
  try { parsed = JSON.parse(result.stdout); }
  catch { throw new Error("Table inventory unavailable: CLI returned invalid JSON."); }
  const rows = Array.isArray(parsed) ? parsed : (parsed as { value?: unknown } | null)?.value;
  if (!Array.isArray(rows)) throw new Error("Table inventory unavailable: unsupported CLI list format.");
  return rows;
}

/** Design-time inventory, not the consumption catalog. Always uses the guarded CLI runner. */
export async function listTableNames(options: {
  spaceId?: string;
  tableType?: "all" | TableType;
  top?: number;
  skip?: number;
} = {}, run: Runner = datasphereCliRun) {
  assertOperation(config.policy, "read");
  const { spaceId, tableType = "all", top = 100, skip = 0 } = options;
  if (spaceId !== undefined && !/^[A-Za-z0-9_]+$/.test(spaceId)) {
    throw new Error("Safeguard: invalid technical Space ID.");
  }
  if (tableType !== "all" && !tableTypes.includes(tableType)) throw new Error("Invalid table_type.");
  if (!Number.isInteger(top) || top < 1 || top > 200 || !Number.isSafeInteger(skip) || skip < 0) {
    throw new Error("top must be 1..200 and skip must be a non-negative safe integer.");
  }
  const spaces = spaceId ? [spaceId] : parseList(await run({ args: ["spaces", "list"] })).map((row) => {
    const name = typeof row === "string" ? row : (row as { technicalName?: unknown; name?: unknown } | null)?.technicalName
      ?? (row as { name?: unknown } | null)?.name;
    if (typeof name !== "string" || !/^[A-Za-z0-9_]+$/.test(name)) {
      throw new Error("Table inventory unavailable: invalid Space list entry.");
    }
    return name;
  });
  const uniqueSpaces = [...new Set(spaces)].sort();
  if (uniqueSpaces.length > 2000) throw new Error("Table inventory exceeds the 2000-Space safety limit; specify space_id.");
  const types = tableType === "all" ? tableTypes : [tableType];
  const tables: Table[] = [];
  const counts: { space_id: string; local_tables: number | null; remote_tables: number | null }[] = [];
  for (const space of uniqueSpaces) {
    // A type not requested was not enumerated; its count is unknown, not zero.
    const summary: typeof counts[number] = { space_id: space, local_tables: null, remote_tables: null };
    const lists = await Promise.all(types.map(async (type) => {
      const names = new Set<string>();
      let offset = 0;
      let previousPage: string | undefined;
      while (true) {
        const result = await run({ args: ["objects", type, "list", "--space", space, "--top", "100", "--skip", String(offset)] });
        const rows = parseList(result);
        // Filtering may shorten a page; advance by the backend's count, not the visible count.
        const rawCount = result.list_page?.raw_count ?? rows.length;
        if (!Number.isSafeInteger(rawCount) || rawCount < rows.length || rawCount > 100) {
          throw new Error(`Table inventory unavailable: invalid page count in ${space}/${type}.`);
        }
        if (rawCount === 0) break;
        const fingerprint = JSON.stringify(rows);
        if (rows.length && fingerprint === previousPage) {
          throw new Error(`Table inventory unavailable: CLI pagination did not advance in ${space}/${type}.`);
        }
        previousPage = fingerprint;
        for (const row of rows) {
          const name = typeof row === "string" ? row : (row as { technicalName?: unknown } | null)?.technicalName;
          if (typeof name !== "string" || !name) throw new Error(`Table inventory unavailable: invalid table name in ${space}/${type}.`);
          if (objectNameAllowed(config.policy, name, "read")) names.add(name);
        }
        offset += rawCount;
        if (offset > 100_000) throw new Error(`Table inventory exceeds the safety limit in ${space}/${type}; no complete inventory can be reported.`);
      }
      return { type, names };
    }));
    for (const { type, names } of lists) {
      summary[type === "local-tables" ? "local_tables" : "remote_tables"] = names.size;
      for (const name of names) tables.push({ space_id: space, technical_name: name, type });
    }
    counts.push(summary);
  }
  tables.sort((a, b) => a.space_id.localeCompare(b.space_id) || a.technical_name.localeCompare(b.technical_name) || a.type.localeCompare(b.type));
  const value = tables.slice(skip, skip + top);
  const hasMore = skip + value.length < tables.length;
  return {
    tenant_url: config.datasphere.tenantUrl,
    scope: "Accessible design-time tables only; SAP authorizations and DSP_ALLOW_READ_OBJECT_PREFIXES apply. Views and analytical models are excluded.",
    enumeration_complete: true,
    total_count: tables.length,
    spaces: counts,
    skip,
    returned_count: value.length,
    has_more: hasMore,
    next_skip: hasMore ? skip + value.length : null,
    value,
  };
}