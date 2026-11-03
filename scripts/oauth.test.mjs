import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

Object.assign(process.env, {
  DSP_OAUTH_CLIENT_ID: "test", DSP_OAUTH_CLIENT_SECRET: "test",
  DSP_OAUTH_AUTHORIZE_URL: "https://example.invalid/authorize",
  DSP_OAUTH_TOKEN_URL: "https://example.invalid/token", DSP_TENANT_URL: "https://example.invalid",
  DSP_ACCESS_TOKEN: "", DSP_REFRESH_TOKEN: "", DSP_ACCESS_TOKEN_EXPIRES_AT: "",
});
const { config } = await import("../dist/config.js");
let serial = 0;
const jwt = exp => `header.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.signature`;

test("environment tokens import, refresh, persist across restarts and respect logout", async () => {
  const directory = mkdtempSync(join(tmpdir(), "dsp-oauth-"));
  const originalFile = config.tokenFile;
  const originalFetch = globalThis.fetch;
  config.tokenFile = join(directory, "token.json");
  const fresh = () => import(`../dist/oauth.js?test=${++serial}`);
  try {
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    process.env.DSP_ACCESS_TOKEN = jwt(expiry);
    process.env.DSP_REFRESH_TOKEN = "initial-refresh";
    writeFileSync(config.tokenFile, JSON.stringify({ access_token: "old", expires_at: 1 }));
    let oauth = await fresh();
    assert.equal(oauth.loadToken().access_token, process.env.DSP_ACCESS_TOKEN);
    assert.equal(oauth.loadToken().expires_at, expiry * 1000 - 60000);
    assert.equal(oauth.authStatus().authenticated, true);
    assert.equal(await oauth.getValidAccessToken(), process.env.DSP_ACCESS_TOKEN);

    process.env.DSP_ACCESS_TOKEN = jwt(1);
    oauth = await fresh();
    let refreshCalls = 0;
    globalThis.fetch = async (url, options) => {
      refreshCalls++;
      assert.equal(url, config.oauth.tokenUrl);
      assert.equal(options.body.get("grant_type"), "refresh_token");
      assert.equal(options.body.get("refresh_token"), "initial-refresh");
      return new Response(JSON.stringify({ access_token: "renewed", refresh_token: "rotated", expires_in: 3600 }));
    };
    assert.equal(await oauth.getValidAccessToken(), "renewed");
    assert.equal(refreshCalls, 1);
    oauth = await fresh();
    assert.equal(await oauth.getValidAccessToken(), "renewed");
    assert.equal(oauth.loadToken().refresh_token, "rotated");
    assert.equal(refreshCalls, 1);
    oauth.clearToken();
    assert.equal(oauth.loadToken(), null);

    process.env.DSP_ACCESS_TOKEN = "opaque";
    process.env.DSP_ACCESS_TOKEN_EXPIRES_AT = "not-a-date";
    oauth = await fresh();
    assert.throws(() => oauth.loadToken(), /ISO date-time/);
    process.env.DSP_ACCESS_TOKEN_EXPIRES_AT = new Date(Date.now() + 3600000).toISOString();
    oauth = await fresh();
    assert.equal(oauth.authStatus().authenticated, true);
    assert.equal(JSON.parse(readFileSync(config.tokenFile, "utf8")).access_token, "opaque");
    process.env.DSP_ACCESS_TOKEN_EXPIRES_AT = "";
    process.env.DSP_ACCESS_TOKEN = "other-opaque";
    process.env.DSP_REFRESH_TOKEN = "";
    oauth = await fresh();
    assert.equal(oauth.authStatus().expired, true);
    await assert.rejects(() => oauth.getValidAccessToken(), /no refresh_token/);
  } finally {
    config.tokenFile = originalFile;
    globalThis.fetch = originalFetch;
    rmSync(directory, { recursive: true, force: true });
  }
});