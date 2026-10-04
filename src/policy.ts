/** Fail-closed application safeguard. SAP authorizations still apply independently. */
export type Operation = "read" | "write" | "delete";
export type Policy = Readonly<{
  read: boolean;
  write: boolean;
  delete: boolean;
  writeSpaces: readonly string[];
  objectPrefixes: readonly string[];
}>;

export function parsePolicy(env: NodeJS.ProcessEnv): Policy {
  const boolean = (name: string, fallback: boolean): boolean => {
    const raw = env[name];
    if (raw === undefined) return fallback;
    if (raw.trim() === "true") return true;
    if (raw.trim() === "false") return false;
    throw new Error(`${name} must be exactly true or false.`);
  };
  const raw = env.DSP_ALLOWED_WRITE_SPACES?.trim() ?? "";
  const spaces = raw ? raw.split(",").map((s) => s.trim()) : [];
  if (spaces.some((s) => !/^[A-Za-z0-9_]+$/.test(s))) {
    throw new Error("DSP_ALLOWED_WRITE_SPACES must contain comma-separated technical Space IDs (letters, digits, underscore); no wildcards.");
  }
  const prefixRaw = env.DSP_ALLOWED_OBJECT_PREFIXES?.trim() ?? "";
  const prefixes = prefixRaw ? prefixRaw.split(",").map((s) => s.trim()) : [];
  if (prefixes.some((s) => !/^[A-Za-z0-9_]+\*?$/.test(s))) {
    throw new Error("DSP_ALLOWED_OBJECT_PREFIXES must contain comma-separated prefixes, optionally ending in * (e.g. ABZ*,HRA). Bare * and empty entries are not allowed.");
  }
  return Object.freeze({
    read: boolean("DSP_ALLOW_READ", true),
    write: boolean("DSP_ALLOW_WRITE", false),
    delete: boolean("DSP_ALLOW_DELETE", false),
    writeSpaces: Object.freeze([...new Set(spaces)]),
    objectPrefixes: Object.freeze([...new Set(prefixes.map((s) => s.replace(/\*$/, "")))]),
  });
}

export function assertObjectName(policy: Policy, name: string): void {
  if (!policy.objectPrefixes.length) return;
  if (!/^[A-Za-z0-9_][A-Za-z0-9_.]*$/.test(name) ||
      !policy.objectPrefixes.some((prefix) => name.startsWith(prefix))) {
    throw new Error(`Safeguard: object '${name}' does not match DSP_ALLOWED_OBJECT_PREFIXES.`);
  }
}

/** Inspect every submitted object, not references to existing source objects. */
export function validateObjectPayload(policy: Policy, raw: string, objectType: string): string {
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { throw new Error("Safeguard: object payload must be valid JSON."); }
  const isMap = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === "object" && !Array.isArray(value);
  if (!isMap(payload)) throw new Error("Safeguard: object payload must be a JSON object.");
  const root = ({ "data-flows": "dataflows", "transformation-flows": "transformationflows", "task-chains": "taskchains" } as Record<string, string>)[objectType] ?? "definitions";
  if (!isMap(payload[root]) || !Object.keys(payload[root]).length) {
    throw new Error(`Safeguard: cannot determine object names; non-empty '${root}' required.`);
  }
  const namedSections = new Set(["definitions", "dataflows", "transformationflows", "taskchains", "businessLayerDefinitions", "editorSettings", "sharing"]);
  for (const [section, value] of Object.entries(payload)) {
    if (["$version", "version", "meta"].includes(section)) continue;
    if (!namedSections.has(section) || !isMap(value)) {
      throw new Error(`Safeguard: unsupported payload section '${section}' with name restrictions enabled.`);
    }
    for (const [name, definition] of Object.entries(value)) {
      assertObjectName(policy, name);
      if (!isMap(definition)) throw new Error(`Safeguard: invalid definition for '${name}'.`);
    }
  }
  // Serialize the exact parsed representation checked above, including duplicate-key normalization.
  return JSON.stringify(payload);
}

export function assertOperation(policy: Policy, operation: Operation, space?: string): void {
  if (!policy[operation]) throw new Error(`Safeguard: ${operation} disabled by DSP_ALLOW_${operation.toUpperCase()}.`);
  if (operation !== "read" && (!space || !policy.writeSpaces.includes(space))) {
    throw new Error(`Safeguard: Space '${space ?? ""}' is not in DSP_ALLOWED_WRITE_SPACES.`);
  }
}

const objectTypes = new Set([
  "remote-tables", "local-tables", "views", "analytic-models", "er-models",
  "data-flows", "replication-flows", "transformation-flows", "task-chains",
  "data-access-controls", "business-entities", "fact-models", "consumption-models",
  "intelligent-lookups", "contexts", "types", "ontologies", "services",
]);

/** Only known command/option combinations can reach the CLI. No inherited scope. */
export function authorizeCli(policy: Policy, args: string[]): string[] {
  const deny = (message: string): never => { throw new Error(`Safeguard: ${message}`); };
  if (!Array.isArray(args) || !args.length || args.some((a) => typeof a !== "string" || !a || a.includes("\0"))) {
    return deny("args must be non-empty CLI string tokens.");
  }
  const objects = args[0] === "objects" && objectTypes.has(args[1]);
  const spaces = args[0] === "spaces";
  const action = args[objects ? 2 : 1];
  if (!(objects && ["list", "read", "create", "update", "delete"].includes(action)) &&
      !(spaces && ["list", "read"].includes(action))) {
    return deny("command is not approved. Use objects <type> list/read/create/update/delete or spaces list/read.");
  }
  const operation: Operation = action === "delete" ? "delete" : ["create", "update"].includes(action) ? "write" : "read";
  const valueFlags = new Set(["--space"]);
  const boolFlags = new Set<string>();
  if (objects && action === "list") ["--technical-names", "--filter", "--select", "--top", "--skip"].forEach((f) => valueFlags.add(f));
  if (objects && ["read", "delete"].includes(action)) valueFlags.add("--technical-name");
  if (objects && action === "read") valueFlags.add("--accept");
  if (operation === "write") {
    ["--file-path", "--input", "--custom-validation-options"].forEach((f) => valueFlags.add(f));
    ["--save-anyway", "--allow-missing-dependencies", "--no-deploy"].forEach((f) => boolFlags.add(f));
  }
  if (operation === "delete") boolFlags.add("--force");
  if (spaces && action === "read") boolFlags.add("--no-space-definition");
  const output = args.slice(0, objects ? 3 : 2);
  const seen = new Set<string>();
  let space: string | undefined;
  for (let i = output.length; i < args.length; i++) {
    const token = args[i];
    const eq = token.indexOf("=");
    const rawFlag = eq < 0 ? token : token.slice(0, eq);
    // Short options are command-dependent; only the unambiguous Space alias is accepted.
    const flag = rawFlag === "-y" ? "--space" : rawFlag;
    if (seen.has(flag)) return deny(`duplicate option ${flag}.`);
    seen.add(flag);
    if (boolFlags.has(flag) && eq < 0) { output.push(flag); continue; }
    if (!valueFlags.has(flag)) return deny(`unsupported option ${rawFlag}; use documented long options.`);
    const value = eq < 0 ? args[++i] : token.slice(eq + 1);
    if (!value || value.startsWith("-")) return deny(`missing value for ${flag}.`);
    if (flag === "--space") {
      if (!/^[A-Za-z0-9_]+$/.test(value)) return deny("invalid technical Space ID.");
      space = value;
    }
    output.push(flag, value);
  }
  if ((objects || action === "read") && !space) return deny("explicit --space is required; CLI defaults are not used.");
  assertOperation(policy, operation, space);
  if (operation === "delete" && policy.objectPrefixes.length) {
    const index = output.indexOf("--technical-name");
    if (index < 0) return deny("explicit --technical-name required with name restrictions enabled.");
    assertObjectName(policy, output[index + 1]);
  }
  return output;
}
