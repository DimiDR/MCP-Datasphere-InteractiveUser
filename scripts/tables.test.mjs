import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePolicy, authorizeCli } from '../dist/policy.js';

Object.assign(process.env, {
  DSP_OAUTH_CLIENT_ID: 'test', DSP_OAUTH_AUTHORIZE_URL: 'https://example.invalid/authorize',
  DSP_OAUTH_TOKEN_URL: 'https://example.invalid/token', DSP_TENANT_URL: 'https://example.invalid',
  DSP_ALLOWED_OBJECT_PREFIXES: '',
});
const { config } = await import('../dist/config.js');
const { listTableNames } = await import('../dist/tables.js');
const result = (rows, rawCount = rows.length, extra = {}) => ({
  ok: true, exit_code: 0, args: [], stdout: JSON.stringify(rows), stderr: '',
  truncated: false, list_page: { raw_count: rawCount }, ...extra,
});

test('table inventory paginates all Spaces/types and returns compact output pages', async () => {
  const policy = config.policy;
  config.policy = parsePolicy({});
  const calls = [];
  const run = async ({ args }) => {
    authorizeCli(config.policy, args);
    calls.push(args);
    if (args[0] === 'spaces') return result(['B', 'A', 'A']);
    const space = args[4], skip = Number(args[8]);
    assert.equal(args[5], '--top');
    assert.equal(args[6], '100');
    const size = args[1] === 'local-tables' ? (space === 'A' ? 280 : 1) : (space === 'A' ? 0 : 2);
    return result(Array.from({ length: Math.max(0, Math.min(100, size - skip)) }, (_, i) => ({
      technicalName: `${args[1] === 'local-tables' ? 'LT' : 'RT'}_${String(skip + i).padStart(3, '0')}`,
    })));
  };
  try {
    const first = await listTableNames({ top: 200 }, run);
    assert.equal(first.total_count, 283);
    assert.equal(first.enumeration_complete, true);
    assert.equal(first.value.length, 200);
    assert.equal(first.has_more, true);
    assert.equal(first.next_skip, 200);
    assert.deepEqual(first.spaces, [
      { space_id: 'A', local_tables: 280, remote_tables: 0 },
      { space_id: 'B', local_tables: 1, remote_tables: 2 },
    ]);
    const last = await listTableNames({ skip: first.next_skip, top: 200 }, run);
    assert.equal(last.value.length, 83);
    assert.equal(last.has_more, false);
    assert.equal(last.next_skip, null);
    assert.equal(new Set([...first.value, ...last.value].map(t => `${t.space_id}/${t.type}/${t.technical_name}`)).size, 283);
    assert.ok(calls.some(a => a[4] === 'A' && a[1] === 'local-tables' && a[8] === '280'));
  } finally { config.policy = policy; }
});

test('filtered empty and short pages advance by raw counts, not visible counts', async () => {
  const policy = config.policy;
  config.policy = parsePolicy({ DSP_ALLOW_READ_OBJECT_PREFIXES: 'OK_' });
  const offsets = [];
  try {
    const inventory = await listTableNames({ spaceId: 'DEV', tableType: 'local-tables' }, async ({ args }) => {
      const approved = authorizeCli(config.policy, args);
      assert.ok(approved.includes('--filter'));
      const offset = Number(args[8]);
      offsets.push(offset);
      if (offset === 0) return result([], 25);
      if (offset === 25) return result([{ technicalName: 'OK_TABLE' }, { technicalName: 'PRIVATE' }], 25);
      return result([]);
    });
    assert.deepEqual(offsets, [0, 25, 50]);
    assert.equal(inventory.total_count, 1);
    assert.equal(inventory.value[0].technical_name, 'OK_TABLE');
    assert.equal(inventory.spaces[0].remote_tables, null);
    assert.equal(JSON.stringify(inventory).includes('PRIVATE'), false);
  } finally { config.policy = policy; }
});

test('invalid input, disabled reads and bad backend pages fail closed', async () => {
  const policy = config.policy;
  config.policy = parsePolicy({});
  let calls = 0;
  const run = async () => { calls++; return result([]); };
  try {
    for (const options of [{ spaceId: '../PRIVATE' }, { spaceId: '' }, { top: 201 }, { skip: -1 }, { tableType: 'views' }]) {
      await assert.rejects(() => listTableNames(options, run));
    }
    assert.equal(calls, 0);
    for (const bad of [result([], 0, { ok: false }), result([], 0, { truncated: true }),
      result([], 0, { stdout: '{}' }), result([], 0, { stdout: 'not JSON' }),
      result([{ technicalName: 'A' }], 0), result([{}]), result([], 101)]) {
      await assert.rejects(() => listTableNames({ spaceId: 'DEV', tableType: 'local-tables' }, async () => bad), /unavailable/);
    }
    await assert.rejects(() => listTableNames({ spaceId: 'DEV', tableType: 'local-tables' }, async () => result([{ technicalName: 'A' }])), /did not advance/);
    assert.equal((await listTableNames({}, run)).total_count, 0);
    config.policy = parsePolicy({ DSP_ALLOW_READ: 'false' });
    calls = 0;
    await assert.rejects(() => listTableNames({}, run), /DSP_ALLOW_READ/);
    assert.equal(calls, 0);
    assert.throws(() => authorizeCli(parsePolicy({}), ['objects', 'tables', 'list', '--space', 'DEV']), /local-tables.*remote-tables/);
  } finally { config.policy = policy; }
});