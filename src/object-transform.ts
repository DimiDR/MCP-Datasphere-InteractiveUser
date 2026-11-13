import { validateObjectPayload, type Policy } from "./policy.js";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Map = { [key: string]: Json };
export const transformObjectTypes = ["local-tables", "replication-flows"] as const;
type ObjectType = typeof transformObjectTypes[number];
export type TransformOptions = {
  payload: string;
  objectType: ObjectType;
  sourceName: string;
  replacements: { search: string; replacement: string }[];
  renameKeyPaths?: string[];
  replaceValuePaths?: string[];
  strictPaths?: boolean;
  folder?: { action: "preserve" | "assign" | "remove"; id?: string; targetTables?: string[] };
};

const profiles = {
  "local-tables": {
    rename: ["/definitions"],
    values: ["/definitions/*/@DataWarehouse.enclosingObject", "/definitions/*/@EndUserText.label"],
  },
  "replication-flows": {
    rename: ["/replicationflows", "/definitions"],
    values: [
      "/replicationflows/*/@EndUserText.label", "/replicationflows/*/contents/description",
      "/replicationflows/*/contents/sourceSystem/*/connectionId",
      "/replicationflows/*/contents/replicationTasks/*/targetObject/name",
      "/replicationflows/*/contents/replicationTasks/*/targetObject/businessName",
      "/definitions/*/@EndUserText.label", "/definitions/*/@DataWarehouse.enclosingObject",
      "/definitions/*/@DataWarehouse.delta/deltaFromEntities/*", "/definitions/*/query/SELECT/from/ref/*",
    ],
  },
};

function isMap(value: Json | undefined): value is Map {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
const own = (node: object, key: string) => Object.prototype.hasOwnProperty.call(node, key);
const escape = (key: string) => key.replace(/~/g, "~0").replace(/\//g, "~1");
const unsafe = new Set(["__proto__", "prototype", "constructor"]);

/** Pure preparation: no file writes, authentication, or tenant mutations. */
export function prepareObjectCopy(options: TransformOptions, policy?: Policy) {
  const profile = profiles[options.objectType];
  if (!profile) throw new Error("Unsupported transformation object type.");
  if (!/^[A-Za-z0-9_][A-Za-z0-9_.]*$/.test(options.sourceName) || unsafe.has(options.sourceName)) {
    throw new Error("Invalid source technical name.");
  }
  for (const pair of options.replacements) {
    if (typeof pair.search !== "string" || !pair.search.length || typeof pair.replacement !== "string") {
      throw new Error("Replacement search must be non-empty and replacement must be a string.");
    }
  }
  const payload: Json = JSON.parse(options.payload);
  if (!isMap(payload)) throw new Error("Payload must be a JSON object.");
  const root = options.objectType === "replication-flows" ? "replicationflows" : "definitions";
  const section = payload[root];
  if (!isMap(section) || !own(section, options.sourceName) || !isMap(section[options.sourceName])) {
    throw new Error(`Source '${options.sourceName}' missing from '${root}'.`);
  }
  const primaryDefinition = section[options.sourceName];
  const replace = (value: string) => options.replacements.reduce(
    (result, pair) => result.split(pair.search).join(pair.replacement), value,
  );
  const targetName = replace(options.sourceName);
  if (!/^[A-Za-z0-9_][A-Za-z0-9_.]*$/.test(targetName) || unsafe.has(targetName)) throw new Error("Invalid target technical name.");
  const changes: { path: string; kind: "rename" | "replace" | "folder"; before: Json; after: Json }[] = [];
  const pathResults: { path: string; kind: "rename" | "replace"; matches: number }[] = [];
  const warnings: string[] = ["Replacements are sequential; overlapping rules may cascade. This is preparation only, not SAP validation."];

  function segments(path: string) {
    if (!path.startsWith("/") || path === "/") throw new Error(`Invalid configured path '${path}'.`);
    return path.slice(1).split("/").map((part) => {
      if (!part || /~(?![01])/u.test(part)) throw new Error(`Invalid path segment in '${path}'.`);
      const decoded = part.replace(/~1/g, "/").replace(/~0/g, "~");
      if (unsafe.has(decoded)) throw new Error(`Unsafe path '${path}'.`);
      return decoded;
    });
  }
  function visit(node: Json, parts: string[], path: string, callback: (value: Json, path: string, parent?: Map | Json[], key?: string) => number, parent?: Map | Json[], key?: string): number {
    if (!parts.length) return callback(node, path, parent, key);
    if (node === null || typeof node !== "object") return 0;
    const [part, ...rest] = parts;
    const keys = part === "*" ? Object.keys(node) : own(node, part) ? [part] : [];
    return keys.reduce((sum, child) => sum + visit((node as Map)[child], rest, `${path}/${escape(child)}`, callback, node, child), 0);
  }
  for (const [kind, paths] of [
    ["rename", options.renameKeyPaths ?? profile.rename],
    ["replace", options.replaceValuePaths ?? profile.values],
  ] as const) {
    for (const path of paths) {
      const matches = visit(payload, segments(path), "", (value, actualPath, parent, key) => {
        if (kind === "rename") {
          if (!isMap(value)) return 0;
          const entries = Object.entries(value);
          const renamed = entries.map(([name, definition]) => [replace(name), definition] as const);
          if (new Set(renamed.map(([name]) => name)).size !== renamed.length) throw new Error(`Key collision at '${actualPath}'.`);
          if (renamed.some(([name]) => unsafe.has(name) || !name)) throw new Error(`Invalid renamed key at '${actualPath}'.`);
          entries.forEach(([name]) => { delete value[name]; });
          renamed.forEach(([name, definition], index) => {
            value[name] = definition;
            if (name !== entries[index][0]) changes.push({ path: `${actualPath}/${escape(entries[index][0])}`, kind, before: entries[index][0], after: name });
          });
          return 1;
        }
        if (typeof value !== "string" || !parent || key === undefined) return 0;
        const after = replace(value);
        if (after !== value) {
          (parent as Map)[key] = after;
          changes.push({ path: actualPath, kind, before: value, after });
        }
        return 1;
      });
      pathResults.push({ path, kind, matches });
      if (!matches) {
        if (options.strictPaths) throw new Error(`Configured ${kind} path '${path}' has no matches.`);
        warnings.push(`Configured ${kind} path '${path}' has no matches.`);
      }
    }
  }
  if (payload[root] !== section || !own(section, targetName) || section[targetName] !== primaryDefinition || (targetName !== options.sourceName && own(section, options.sourceName))) {
    throw new Error("Configured paths did not rename the expected primary object.");
  }

  const folder = options.folder ?? { action: "preserve" as const };
  if (!["preserve", "assign", "remove"].includes(folder.action)) throw new Error("Invalid folder action.");
  if (folder.action === "assign" && (!folder.id || !/^Folder_[A-Za-z0-9_]+$/.test(folder.id))) {
    throw new Error("Folder assignment requires a technical ID such as Folder_KHHOQBAY.");
  }
  if (folder.action !== "assign" && folder.id !== undefined) throw new Error("Folder ID is only allowed for assign.");
  if (folder.action === "preserve" && folder.targetTables?.length) throw new Error("Target tables require assign or remove.");
  if (folder.targetTables?.length && options.objectType !== "replication-flows") throw new Error("Target tables are only supported for replication flows.");
  const folderResults: { path: string; action: string; requested_id: string | null; tenant_status: "not_verified" }[] = [];
  if (folder.action !== "preserve") {
    const targets = [{ section: root, name: targetName }, ...new Set(folder.targetTables ?? [])].map(
      (target) => typeof target === "string" ? { section: "definitions", name: target } : target,
    );
    for (const target of targets) {
      const container = payload[target.section];
      const definition = isMap(container) && own(container, target.name) ? container[target.name] : undefined;
      if (!isMap(definition)) throw new Error(`Folder target '${target.name}' missing from '${target.section}'. Use transformed target names.`);
      if (definition._meta !== undefined && !isMap(definition._meta)) throw new Error("Invalid _meta object.");
      const meta = definition._meta as Map | undefined;
      if (meta?.dependencies !== undefined && !isMap(meta.dependencies)) throw new Error("Invalid dependencies object.");
      const path = `/${target.section}/${escape(target.name)}/_meta/dependencies/folderAssignment`;
      const before = isMap(meta?.dependencies) ? meta.dependencies.folderAssignment : undefined;
      const hadAssignment = isMap(meta?.dependencies) && own(meta.dependencies, "folderAssignment");
      if (folder.action === "assign") {
        definition._meta ??= {};
        const updatedMeta = definition._meta as Map;
        updatedMeta.dependencies ??= {};
        (updatedMeta.dependencies as Map).folderAssignment = folder.id!;
      } else if (isMap(meta?.dependencies)) {
        delete meta.dependencies.folderAssignment;
      }
      const after = folder.action === "assign" ? folder.id! : null;
      if (folder.action === "remove" ? hadAssignment : before !== after) changes.push({ path, kind: "folder", before: before ?? null, after });
      folderResults.push({ path, action: folder.action, requested_id: folder.id ?? null, tenant_status: "not_verified" });
    }
    warnings.push("Folder metadata is prepared only. CLI save success does not prove folder persistence; read back the saved object and verify. Removal support is also unverified.");
  }
  const serialized = JSON.stringify(payload, null, 2);
  if (policy?.writeObjectPrefixes.length) validateObjectPayload(policy, serialized, options.objectType);
  return {
    status: "PREPARED" as const, tenant_modified: false, source_name: options.sourceName,
    target_name: targetName, object_type: options.objectType, payload: serialized,
    changes, path_results: pathResults, folder_results: folderResults, warnings,
  };
}