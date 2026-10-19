import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { LOG_RETENTION_DAYS } from '../src/accountDeletion';
import { KEEP_DAYS } from '../src/retentionPlan';
import { BACKUP_DAYS, KEPT_DAYS, MESSAGE_LOG_DAYS_AFTER_DELETION } from '../../src/lib/dataRetention';

test('the app and the public pages quote the retention period the server applies', () => {
  assert.equal(MESSAGE_LOG_DAYS_AFTER_DELETION, LOG_RETENTION_DAYS);
});

test('the Privacy page quotes the times the daily deletion applies', () => {
  for (const [kind, days] of Object.entries(KEPT_DAYS)) {
    assert.equal(KEEP_DAYS[kind as keyof typeof KEEP_DAYS], days, kind);
  }
});

test('the Privacy page quotes how long backups are kept, as the setup script sets it', () => {
  const script = readFileSync(join(__dirname, '../../ops/setup-safety.mjs'), 'utf8');
  assert.equal(Number(script.match(/const BACKUP_KEEP_DAYS = (\d+);/)?.[1]), BACKUP_DAYS);
});
