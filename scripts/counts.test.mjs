import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parsePolicy } from '../dist/policy.js';

Object.assign(process.env, {
  DSP_OAUTH_CLIENT_ID: 'test', DSP_OAUTH_AUTHORIZE_URL: 'https://example.invalid/authorize',
  DSP_OAUTH_TOKEN_URL: 'https://example.invalid/token', DSP_TENANT_URL: 'https://example.invalid',
  DSP_ACCESS_TOKEN: '', DSP_ALLOWED_OBJECT_PREFIXES: '',
});
const { config } = await import('../dist/config.js');
const { countRelationalEntity } = await import('../dist/datasphere.js');

test('relational counts are live, exact, filtered, guarded and never inferred from rows', async () => {
  const original = { policy: config.policy, tokenFile: config.tokenFile, fetch: globalThis.fetch };
  const directory = mkdtempSync(join(tmpdir(), 'dsp-count-'));
  config.tokenFile = join(directory, 'token.json');
  writeFileSync(config.tokenFile, JSON.stringify({ access_token: 'test', expires_at: Date.now() + 3600000 }));
  config.policy = parsePolicy({ DSP_ALLOW_READ_OBJECT_PREFIXES: 'SOURCE_' });
  let calls = 0;
  let body = { '@odata.count': 763877426, value: [{ secret: 'must not return' }] };
  let status = 200;
  globalThis.fetch = async (raw, init) => {
    calls++;
    const url = new URL(raw);
    assert.match(url.pathname, /\/relational\/DEV\/SOURCE_TABLE\/Rows$/);
    assert.equal(url.searchParams.get('$top'), '0');
    assert.equal(url.searchParams.get('$count'), 'true');
    assert.equal(url.searchParams.get('$filter'), "Change_Type eq 'I'");
    assert.equal(init.redirect, 'error');
    assert.ok(init.signal instanceof AbortSignal);
    return new Response(JSON.stringify(body), { status });
  };
  const options = { spaceId: 'DEV', assetId: 'SOURCE_TABLE', entityName: 'Rows', filter: "Change_Type eq 'I'" };
  try {
    for (const bad of ['..', '../PRIVATE', 'Rows?x=1', '', 'Rows/Other']) {
      await assert.rejects(() => countRelationalEntity({ ...options, entityName: bad }), /Safeguard:/);
    }
    await assert.rejects(() => countRelationalEntity({ ...options, assetId: 'PRIVATE' }), /Safeguard:/);
    await assert.rejects(() => countRelationalEntity({ ...options, timeoutSeconds: 0 }), /timeout_seconds/);
    assert.equal(calls, 0);
    const result = await countRelationalEntity(options);
    assert.equal(result.count, 763877426);
    assert.equal(result.availability, 'available');
    assert.equal('rows' in result, false);
    assert.equal(JSON.stringify(result).includes('secret'), false);
    body = { '@odata.count': 0 };
    assert.equal((await countRelationalEntity(options)).count, 0);
    body = { '@odata.count': '9007199254740993' };
    assert.equal((await countRelationalEntity(options)).count, '9007199254740993');
    for (const invalid of [undefined, null, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, 'NaN', '1.5']) {
      body = { '@odata.count': invalid, value: [1, 2, 3] };
      const missing = await countRelationalEntity(options);
      assert.equal(missing.availability, 'unavailable');
      assert.equal('count' in missing, false);
    }
    status = 404;
    await assert.rejects(() => countRelationalEntity(options), /exposed for relational consumption/);
    globalThis.fetch = async () => { throw new DOMException('Timed out', 'TimeoutError'); };
    await assert.rejects(() => countRelationalEntity(options), { name: 'TimeoutError' });
    config.policy = parsePolicy({ DSP_ALLOW_READ: 'false' });
    const previousCalls = calls;
    await assert.rejects(() => countRelationalEntity(options), /DSP_ALLOW_READ/);
    assert.equal(calls, previousCalls);
  } finally {
    config.policy = original.policy;
    config.tokenFile = original.tokenFile;
    globalThis.fetch = original.fetch;
    rmSync(directory, { recursive: true, force: true });
  }
});