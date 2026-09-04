import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { spawn } from "node:child_process";
import { URL } from "node:url";
import open from "open";
import { config } from "./config.js";

export type TokenSet = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  expires_at?: number;
  scope?: string;
  obtained_at: string;
};

let memoryToken: TokenSet | null = null;

export function loadToken(): TokenSet | null {
  if (memoryToken && !isExpired(memoryToken)) {
    return memoryToken;
  }
  if (!existsSync(config.tokenFile)) {
    return null;
  }
  try {
    const raw = JSON.parse(readFileSync(config.tokenFile, "utf8")) as TokenSet;
    memoryToken = raw;
    return raw;
  } catch {
    return null;
  }
}

export function saveToken(token: TokenSet): void {
  const expiresAt =
    token.expires_at ??
    (token.expires_in
      ? Date.now() + Math.max(0, token.expires_in - 60) * 1000
      : undefined);
  memoryToken = {
    ...token,
    expires_at: expiresAt,
    obtained_at: token.obtained_at || new Date().toISOString(),
  };
  writeFileSync(config.tokenFile, JSON.stringify(memoryToken, null, 2), "utf8");
}

export function clearToken(): void {
  memoryToken = null;
  if (existsSync(config.tokenFile)) {
    unlinkSync(config.tokenFile);
  }
}

export function isExpired(token: TokenSet): boolean {
  if (!token.expires_at) return false;
  return Date.now() >= token.expires_at;
}

export function authStatus(): {
  authenticated: boolean;
  expired: boolean;
  has_refresh_token: boolean;
  expires_at?: string;
  obtained_at?: string;
} {
  const token = loadToken();
  if (!token?.access_token) {
    return { authenticated: false, expired: false, has_refresh_token: false };
  }
  const expired = isExpired(token);
  return {
    authenticated: !expired,
    expired,
    has_refresh_token: Boolean(token.refresh_token),
    expires_at: token.expires_at
      ? new Date(token.expires_at).toISOString()
      : undefined,
    obtained_at: token.obtained_at,
  };
}

async function exchangeCode(code: string): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.oauth.redirectUri,
    client_id: config.oauth.clientId,
    client_secret: config.oauth.clientSecret(),
  });

  const res = await fetch(config.oauth.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }
  const json = JSON.parse(text) as TokenSet;
  if (!json.access_token) {
    throw new Error(`Token response missing access_token: ${text}`);
  }
  return {
    ...json,
    obtained_at: new Date().toISOString(),
  };
}

async function refreshAccessToken(refreshToken: string): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.oauth.clientId,
    client_secret: config.oauth.clientSecret(),
  });

  const res = await fetch(config.oauth.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Refresh failed (${res.status}): ${text}`);
  }
  const json = JSON.parse(text) as TokenSet;
  return {
    ...json,
    refresh_token: json.refresh_token || refreshToken,
    obtained_at: new Date().toISOString(),
  };
}

export async function getValidAccessToken(): Promise<string> {
  let token = loadToken();
  if (!token?.access_token) {
    throw new Error(
      "Not authenticated. Call tool login_interactive first (opens browser for Authorization Code).",
    );
  }
  if (!isExpired(token)) {
    return token.access_token;
  }
  if (!token.refresh_token) {
    clearToken();
    throw new Error(
      "Access token expired and no refresh_token. Call login_interactive again.",
    );
  }
  token = await refreshAccessToken(token.refresh_token);
  saveToken(token);
  return token.access_token;
}

function buildAuthorizeUrl(state: string): string {
  const url = new URL(config.oauth.authorizeUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.oauth.clientId);
  url.searchParams.set("redirect_uri", config.oauth.redirectUri);
  url.searchParams.set("state", state);
  // Do NOT set prompt=login: XSUAA rewrites the Location with a raw "|" in
  // client_id, which immediately yields HTTP 400. Use InPrivate instead.
  return url.toString();
}

function spawnDetached(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      shell: false,
    });
    child.on("error", reject);
    child.unref();
    setImmediate(resolve);
  });
}

/**
 * Open a localhost bounce page in a private window.
 * Never put the authorize URL (contains "|" in client_id) on a Windows command line —
 * that caused HTTP 400 Bad Request.
 */
async function openPrivateBrowser(startUrl: string): Promise<void> {
  const localApp = process.env.LOCALAPPDATA || "";
  const programFiles = process.env["ProgramFiles"] || "C:\\Program Files";
  const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const candidates: Array<{ cmd: string; args: string[] }> = [
    {
      cmd: `${programFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
      args: ["--inprivate", startUrl],
    },
    {
      cmd: `${programFilesX86}\\Microsoft\\Edge\\Application\\msedge.exe`,
      args: ["--inprivate", startUrl],
    },
    {
      cmd: `${localApp}\\Google\\Chrome\\Application\\chrome.exe`,
      args: ["--incognito", startUrl],
    },
    {
      cmd: `${programFiles}\\Google\\Chrome\\Application\\chrome.exe`,
      args: ["--incognito", startUrl],
    },
  ];

  for (const c of candidates) {
    if (!existsSync(c.cmd)) continue;
    try {
      await spawnDetached(c.cmd, c.args);
      return;
    } catch {
      // try next
    }
  }

  console.error("Could not launch Edge/Chrome InPrivate. Open this URL manually:\n", startUrl);
  await open(startUrl);
}

function sendHtml(res: ServerResponse, status: number, body: string): void {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  res.end(body);
}

function loginStartHtml(authorizeUrl: string): string {
  // Embed via JSON so %, |, ! stay correctly encoded in the browser redirect.
  const hrefJson = JSON.stringify(authorizeUrl);
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/>
<title>SAP Datasphere login</title>
</head><body>
<p>Redirecting to SAP Datasphere login…</p>
<p>If nothing happens, <a id="go" href="#">click here</a>.</p>
<script>
const href = ${hrefJson};
document.getElementById("go").href = href;
location.replace(href);
</script>
</body></html>`;
}

/**
 * Starts a one-shot localhost callback server, opens the browser for IdP login,
 * exchanges the authorization code, and persists the token.
 */
export async function loginInteractive(options?: {
  openBrowser?: boolean;
  timeoutMs?: number;
}): Promise<{ authorize_url: string; expires_at?: string }> {
  config.oauth.clientSecret(); // fail fast if secret missing

  const openBrowser = options?.openBrowser !== false;
  const timeoutMs = options?.timeoutMs ?? 5 * 60 * 1000;
  const redirect = new URL(config.oauth.redirectUri);
  if (redirect.hostname !== "localhost" && redirect.hostname !== "127.0.0.1") {
    throw new Error(
      `Redirect URI must be localhost for this smoke test: ${config.oauth.redirectUri}`,
    );
  }
  const port = Number(redirect.port || 80);
  const callbackPath = redirect.pathname || "/callback";
  const startPath = "/login-start";
  const state = randomBytes(16).toString("hex");
  const authorizeUrl = buildAuthorizeUrl(state);
  const bounceUrl = `http://127.0.0.1:${port}${startPath}`;

  console.error("Authorize URL (for debug):", authorizeUrl);
  console.error("Opening private browser at:", bounceUrl);

  const token = await new Promise<TokenSet>((resolve, reject) => {
    let settled = false;
    const succeed = (value: TokenSet) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    };

    const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const reqUrl = new URL(req.url || "/", `http://127.0.0.1:${port}`);
        if (reqUrl.pathname === startPath) {
          sendHtml(res, 200, loginStartHtml(authorizeUrl));
          return;
        }
        if (reqUrl.pathname !== callbackPath) {
          sendHtml(res, 404, "<h1>Not found</h1>");
          return;
        }
        const err = reqUrl.searchParams.get("error");
        if (err) {
          const desc = reqUrl.searchParams.get("error_description") || err;
          sendHtml(res, 400, `<h1>OAuth error</h1><p>${desc}</p>`);
          server.close();
          fail(new Error(`OAuth error: ${desc}`));
          return;
        }
        const code = reqUrl.searchParams.get("code");
        const returnedState = reqUrl.searchParams.get("state");
        if (!code) {
          sendHtml(res, 400, "<h1>Missing code</h1>");
          return;
        }
        if (returnedState !== state) {
          sendHtml(res, 400, "<h1>Invalid state</h1>");
          server.close();
          fail(new Error("OAuth state mismatch"));
          return;
        }
        const exchanged = await exchangeCode(code);
        sendHtml(
          res,
          200,
          "<h1>Login OK</h1><p>You can close this tab and return to Cursor.</p>",
        );
        server.close();
        succeed(exchanged);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        sendHtml(res, 500, `<h1>Token exchange failed</h1><pre>${msg}</pre>`);
        server.close();
        fail(e);
      }
    });

    const timer = setTimeout(() => {
      server.close();
      fail(new Error(`Login timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    server.on("error", (e) => {
      fail(e);
    });

    server.listen(port, "127.0.0.1", async () => {
      if (openBrowser) {
        try {
          await openPrivateBrowser(bounceUrl);
        } catch {
          // Caller can open bounceUrl / authorize_url manually
        }
      }
    });
  });

  saveToken(token);
  return {
    authorize_url: authorizeUrl,
    expires_at: token.expires_at
      ? new Date(token.expires_at).toISOString()
      : token.expires_in
        ? new Date(Date.now() + token.expires_in * 1000).toISOString()
        : undefined,
  };
}
