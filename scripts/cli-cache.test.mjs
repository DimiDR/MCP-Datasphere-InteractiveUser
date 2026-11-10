import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectCliCache, isCliCacheFailure } from '../dist/cli-cache.js';
import { authorizeCli, parsePolicy } from '../dist/policy.js';

test('cache diagnostics distinguish host mismatch, missing/invalid settings without modifying files', () => {
  const home = mkdtempSync(join(tmpdir(), 'dsp-cache-test-'));
  const directory = join(home, '.@sap', 'datasphere-cli', '.cache');
  const path = join(directory, 'settings.json');
  const tenant = 'https://tenant-qas.example.invalid';
  try {
    assert.equal(inspectCliCache(tenant, home, false).status, 'missing');
    mkdirSync(directory, { recursive: true });
    for (const [host, status] of [[tenant + '/', 'host_matches'], ['https://tenant-dev.example.invalid', 'host_differs']]) {
      const raw = JSON.stringify({ host, secret: 'MUST_NOT_RETURN' });
      writeFileSync(path, raw);
      const diagnostic = inspectCliCache(tenant, home, false);
      assert.equal(diagnostic.status, status);
      assert.equal(diagnostic.host_matches, status === 'host_matches');
      assert.equal(JSON.stringify(diagnostic).includes('MUST_NOT_RETURN'), false);
      assert.equal(readFileSync(path, 'utf8'), raw);
    }
    for (const raw of ['not JSON', '{"host":"https://user:password@tenant.invalid"}', '{"host":"http://tenant.invalid"}', '{"host":"https://tenant.invalid/?secret=test"}']) {
      writeFileSync(path, raw);
      assert.equal(inspectCliCache(tenant, home, false).status, 'unreadable_or_invalid');
    }
    writeFileSync(path, '{}');
    assert.equal(inspectCliCache(tenant, home, false).status, 'host_unavailable');
    assert.equal(inspectCliCache(tenant, home, true).status, 'legacy_location_unchecked');
    assert.equal(inspectCliCache(tenant, home, true).settings_path, null);
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test('cache errors are recognized and incorrect table aliases have actionable safeguard errors', () => {
  for (const message of ['Failed to initialize the local CLI cache', 'LOCAL CLI CACHE IS OUTDATED', 'cli cache is outdated', 'Run datasphere config cache init']) {
    assert.ok(isCliCacheFailure('', message));
    assert.ok(isCliCacheFailure(message, ''));
  }
  for (const message of ['unauthorized', 'connection timeout', 'invalid table', '']) assert.equal(isCliCacheFailure(message, ''), false);
  for (const type of ['tables', 'table', 'dwctable', 'dwc_table']) {
    assert.throws(() => authorizeCli(parsePolicy({}), ['objects', type, 'list', '--space', 'DEV']), /list_table_names.*local-tables.*remote-tables/);
  }
});