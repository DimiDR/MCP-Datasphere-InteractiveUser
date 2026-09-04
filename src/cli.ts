import { spawn } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { config } from "./config.js";
import {
  authStatus,
  getValidAccessToken,
  loadToken,
} from "./oauth.js";

const MAX_OUTPUT_CHARS = 200_000;
const BLOCKED_HEAD = new Set(["login", "logout"]);
const STRIP_FLAGS = new Set([
  "--secrets-file",
  "-s",
  "--access-token",
  "-a",
  "--client-secret",
  "-C",
  "--client-id",
  "-c",
]);

export type CliRunResult = {
  ok: boolean;
  exit_code: number | null;
  args: string[];
  stdout: string;
  stderr: string;
  truncated: boolean;
  timed_out?: boolean;
  cache_init_retried?: boolean;
};

export type CliStatus = {
  cli_available: boolean;
  cli_path: string | null;
  cli_entry: string | null;
  version: string | null;
  host: string;
  mcp_authenticated: boolean;
  mcp_token_expired: boolean;
  notes: string[];
};

function redact(text: string): string {
  return text
    .replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_JWT]")
    .replace(/(access_token|refresh_token|client_secret)\s*[:=]\s*["']?[^"'\\s]+/gi, "$1=[REDACTED]");
}

function truncate(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_OUTPUT_CHARS) return { text, truncated: false };
  return {
    text:
      text.slice(0, MAX_OUTPUT_CHARS) +
      `\n… [truncated ${text.length - MAX_OUTPUT_CHARS} chars]`,
    truncated: true,
  };
}

function looksLikeCacheOutdated(stdout: string, stderr: string): boolean {
  const blob = `${stdout}\n${stderr}`.toLowerCase();
  return (
    blob.includes("local cli cache is outdated") ||
    blob.includes("cli cache is outdated") ||
    blob.includes("config cache init")
  );
}

function resolveDatasphereEntry(preferred?: string): {
  command: string;
  argsPrefix: string[];
  displayPath: string;
} | null {
  const candidates: string[] = [];
  if (preferred?.trim()) candidates.push(preferred.trim());
  if (config.cli.path) candidates.push(config.cli.path);
  candidates.push(
    join(
      process.env.APPDATA || "",
      "npm",
      "node_modules",
      "@sap",
      "datasphere-cli",
      "terminal.js",
    ),
    join(
      process.env.APPDATA || "",
      "npm",
      "datasphere.cmd",
    ),
  );

  for (const candidate of candidates) {
    if (!candidate || !existsSync(candidate)) continue;

    if (candidate.endsWith(".js") || candidate.endsWith(".mjs")) {
      return {
        command: process.execPath,
        argsPrefix: [candidate],
        displayPath: candidate,
      };
    }

    if (candidate.endsWith(".cmd") || candidate.endsWith(".bat")) {
      // Prefer resolving the npm shim to terminal.js (no shell:true).
      const fromCmd = tryResolveTerminalFromCmd(candidate);
      if (fromCmd) {
        return {
          command: process.execPath,
          argsPrefix: [fromCmd],
          displayPath: fromCmd,
        };
      }
    }
  }

  // Fall back to PATH lookup via `where`/`which` is fragile; try common global path.
  const npmRoot = join(
    process.env.APPDATA || "",
    "npm",
    "node_modules",
    "@sap",
    "datasphere-cli",
    "terminal.js",
  );
  if (existsSync(npmRoot)) {
    return {
      command: process.execPath,
      argsPrefix: [npmRoot],
      displayPath: npmRoot,
    };
  }

  return null;
}

function tryResolveTerminalFromCmd(cmdPath: string): string | null {
  try {
    const body = readFileSync(cmdPath, "utf8");
    const match = body.match(
      /["']?%dp0%\\?node_modules\\@sap\\datasphere-cli\\terminal\.js["']?/i,
    );
    if (match) {
      const resolved = join(
        dirname(cmdPath),
        "node_modules",
        "@sap",
        "datasphere-cli",
        "terminal.js",
      );
      if (existsSync(resolved)) return resolved;
    }
    const abs = body.match(
      /["']([^"']*node_modules[/\\]@sap[/\\]datasphere-cli[/\\]terminal\.js)["']/i,
    );
    if (abs?.[1] && existsSync(abs[1])) return abs[1];
  } catch {
    /* ignore */
  }
  return null;
}

async function writeSecretsFile(): Promise<{ path: string; cleanup: () => void }> {
  await getValidAccessToken();
  const token = loadToken();
  if (!token?.access_token) {
    throw new Error(
      "Not authenticated. Call login_interactive first (opens browser for Authorization Code).",
    );
  }

  const dir = mkdtempSync(join(tmpdir(), "dsp-mcp-cli-"));
  const path = join(dir, "secrets.json");
  const secrets: Record<string, string> = {
    tenantUrl: config.datasphere.tenantUrl,
    access_token: token.access_token,
    client_id: config.oauth.clientId,
    client_secret: config.oauth.clientSecret(),
    authorization_url: config.oauth.authorizeUrl,
    token_url: config.oauth.tokenUrl,
  };
  if (token.refresh_token) secrets.refresh_token = token.refresh_token;

  writeFileSync(path, JSON.stringify(secrets, null, 2), "utf8");

  return {
    path,
    cleanup: () => {
      try {
        unlinkSync(path);
      } catch {
        /* ignore */
      }
      try {
        rmdirSync(dir);
      } catch {
        /* ignore */
      }
    },
  };
}

function sanitizeArgs(args: string[]): string[] {
  if (!Array.isArray(args) || args.length === 0) {
    throw new Error("args must be a non-empty string array (CLI tokens after `datasphere`).");
  }
  if (args.some((a) => typeof a !== "string")) {
    throw new Error("args must contain only strings — do not pass a shell command string.");
  }

  const head = args[0]?.toLowerCase();
  if (BLOCKED_HEAD.has(head)) {
    throw new Error(
      `Command "${args[0]}" is blocked. Session is owned by this MCP — use login_interactive / logout.`,
    );
  }
  // config secrets reset
  if (
    args[0]?.toLowerCase() === "config" &&
    args[1]?.toLowerCase() === "secrets" &&
    args[2]?.toLowerCase() === "reset"
  ) {
    throw new Error(
      "config secrets reset is blocked. Session is owned by this MCP — use logout.",
    );
  }

  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const key = a.includes("=") ? a.slice(0, a.indexOf("=")) : a;
    if (STRIP_FLAGS.has(key)) {
      if (!a.includes("=") && i + 1 < args.length && !args[i + 1].startsWith("-")) {
        i += 1; // skip value
      }
      continue;
    }
    // Also strip --host / -H; we inject host ourselves
    if (key === "--host" || key === "-H") {
      if (!a.includes("=") && i + 1 < args.length && !args[i + 1].startsWith("-")) {
        i += 1;
      }
      continue;
    }
    if (key === "--force" || key === "-F") {
      continue; // we inject --force
    }
    out.push(a);
  }
  return out;
}

function spawnCli(
  entry: { command: string; argsPrefix: string[] },
  cliArgs: string[],
  options: { cwd: string; timeoutMs: number; secretsPath: string },
): Promise<{
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}> {
  const fullArgs = [
    ...entry.argsPrefix,
    ...cliArgs,
    "--host",
    config.datasphere.tenantUrl,
    "--secrets-file",
    options.secretsPath,
    "--force",
  ];

  return new Promise((resolvePromise) => {
    const child = spawn(entry.command, fullArgs, {
      cwd: options.cwd,
      shell: false,
      windowsHide: true,
      env: {
        ...process.env,
        // Avoid interactive prompts hanging the MCP process
        CI: process.env.CI || "1",
      },
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 2000).unref?.();
    }, options.timeoutMs);

    child.stdout?.on("data", (buf: Buffer) => {
      stdout += buf.toString("utf8");
    });
    child.stderr?.on("data", (buf: Buffer) => {
      stderr += buf.toString("utf8");
    });

    child.on("error", (e) => {
      clearTimeout(timer);
      resolvePromise({
        exitCode: 1,
        stdout,
        stderr: `${stderr}\n${e.message}`.trim(),
        timedOut,
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolvePromise({
        exitCode: code,
        stdout,
        stderr,
        timedOut,
      });
    });
  });
}

function packResult(
  args: string[],
  raw: {
    exitCode: number | null;
    stdout: string;
    stderr: string;
    timedOut: boolean;
  },
  extra?: Partial<CliRunResult>,
): CliRunResult {
  const out = truncate(redact(raw.stdout));
  const errOut = truncate(redact(raw.stderr));
  return {
    ok: !raw.timedOut && raw.exitCode === 0,
    exit_code: raw.exitCode,
    args,
    stdout: out.text,
    stderr: errOut.text,
    truncated: out.truncated || errOut.truncated,
    timed_out: raw.timedOut || undefined,
    ...extra,
  };
}

export async function datasphereCliStatus(): Promise<CliStatus> {
  const notes: string[] = [];
  const entry = resolveDatasphereEntry();
  const auth = authStatus();

  if (!entry) {
    notes.push(
      "datasphere CLI not found. Install with: npm install -g @sap/datasphere-cli",
    );
    notes.push(
      "Or set DSP_CLI_PATH to terminal.js (preferred) or datasphere.cmd.",
    );
  }

  if (!auth.authenticated) {
    notes.push(
      "MCP token missing or expired. Call login_interactive (do not run datasphere login — same localhost:8080 port).",
    );
  }

  let version: string | null = null;
  if (entry) {
    try {
      const ver = await new Promise<string>((resolvePromise) => {
        const child = spawn(entry.command, [...entry.argsPrefix, "--version"], {
          shell: false,
          windowsHide: true,
        });
        let out = "";
        child.stdout?.on("data", (b: Buffer) => {
          out += b.toString("utf8");
        });
        child.stderr?.on("data", (b: Buffer) => {
          out += b.toString("utf8");
        });
        child.on("close", () => resolvePromise(out.trim()));
        child.on("error", () => resolvePromise(""));
        setTimeout(() => {
          child.kill();
          resolvePromise(out.trim());
        }, 15_000).unref?.();
      });
      version = ver || null;
    } catch {
      version = null;
    }
  }

  if (entry && auth.authenticated) {
    notes.push(
      "CLI session uses this MCP's Interactive Usage token via a temp secrets file — no separate datasphere login.",
    );
  }

  return {
    cli_available: Boolean(entry),
    cli_path: entry?.displayPath ?? null,
    cli_entry: entry ? `${entry.command} ${entry.argsPrefix.join(" ")}` : null,
    version,
    host: config.datasphere.tenantUrl,
    mcp_authenticated: auth.authenticated,
    mcp_token_expired: auth.expired,
    notes,
  };
}

export async function datasphereCliRun(options: {
  args: string[];
  workingDirectory?: string;
  timeoutSeconds?: number;
}): Promise<CliRunResult> {
  const sanitized = sanitizeArgs(options.args);
  const entry = resolveDatasphereEntry();
  if (!entry) {
    throw new Error(
      "datasphere CLI not found. Install @sap/datasphere-cli globally or set DSP_CLI_PATH.",
    );
  }

  const cwd = options.workingDirectory
    ? resolve(options.workingDirectory)
    : config.root;
  if (!existsSync(cwd)) {
    throw new Error(`working_directory does not exist: ${cwd}`);
  }

  const timeoutSeconds = Math.min(
    600,
    Math.max(30, options.timeoutSeconds ?? config.cli.timeoutSeconds),
  );
  const timeoutMs = timeoutSeconds * 1000;

  const secrets = await writeSecretsFile();
  try {
    let result = await spawnCli(entry, sanitized, {
      cwd,
      timeoutMs,
      secretsPath: secrets.path,
    });

    let cacheInitRetried = false;
    if (
      !result.timedOut &&
      result.exitCode !== 0 &&
      looksLikeCacheOutdated(result.stdout, result.stderr)
    ) {
      cacheInitRetried = true;
      const init = await spawnCli(entry, ["config", "cache", "init"], {
        cwd,
        timeoutMs,
        secretsPath: secrets.path,
      });
      if (init.exitCode === 0 && !init.timedOut) {
        result = await spawnCli(entry, sanitized, {
          cwd,
          timeoutMs,
          secretsPath: secrets.path,
        });
      } else {
        return packResult(sanitized, init, { cache_init_retried: true });
      }
    }

    return packResult(sanitized, result, {
      cache_init_retried: cacheInitRetried || undefined,
    });
  } finally {
    secrets.cleanup();
  }
}
