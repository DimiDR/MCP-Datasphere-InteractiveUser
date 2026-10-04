import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateObjectPayload, type Policy } from "./policy.js";

/** Called on normalized, authorized CLI args before authentication or spawning. */
export function checkedObjectPayload(policy: Policy, args: string[], cwd: string): string | undefined {
  if (!policy.objectPrefixes.length || args[0] !== "objects" || !["create", "update"].includes(args[2])) return;
  const file = args.indexOf("--file-path");
  const input = args.indexOf("--input");
  if ((file >= 0) === (input >= 0)) {
    throw new Error("Safeguard: provide exactly one --file-path or --input with name restrictions enabled.");
  }
  const raw = file >= 0 ? readFileSync(resolve(cwd, args[file + 1]), "utf8") : args[input + 1];
  return validateObjectPayload(policy, raw, args[1]);
}

/** Send a private snapshot so changing the original file cannot bypass validation. */
export function snapshotArgs(args: string[], path: string): string[] {
  const output = [...args];
  const index = output.indexOf("--file-path") >= 0 ? output.indexOf("--file-path") : output.indexOf("--input");
  if (index < 0) throw new Error("Safeguard: missing payload argument.");
  output.splice(index, 2, "--file-path", path);
  return output;
}
