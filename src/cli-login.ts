#!/usr/bin/env node
/**
 * Standalone CLI login (outside MCP) — useful to obtain .token.json before Cursor.
 * Usage: npm run login
 * Optional: LOGIN_TIMEOUT_SECONDS=900 npm run login
 */
import { readFileSync, existsSync } from "node:fs";
import { loginInteractive, authStatus } from "./oauth.js";
import { config } from "./config.js";

const timeoutSeconds = Number(process.env.LOGIN_TIMEOUT_SECONDS || "900");
const result = await loginInteractive({
  openBrowser: true,
  timeoutMs: Math.max(30, timeoutSeconds) * 1000,
});
let identity = null;
if (existsSync(config.tokenFile)) {
  try {
    const token = JSON.parse(readFileSync(config.tokenFile, "utf8"));
    const payload = JSON.parse(
      Buffer.from(token.access_token.split(".")[1], "base64url").toString("utf8"),
    );
    identity = {
      user_name: payload.user_name,
      email: payload.email,
      given_name: payload.given_name,
      family_name: payload.family_name,
      origin: payload.origin,
      zdn: payload.ext_attr?.zdn,
      grant_type: payload.grant_type,
    };
  } catch {
    identity = { decode_error: true };
  }
}
console.log(JSON.stringify({ ok: true, ...result, ...authStatus(), identity }, null, 2));
