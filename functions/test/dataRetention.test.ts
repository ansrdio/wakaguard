import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOG_RETENTION_DAYS } from '../src/accountDeletion';
import { MESSAGE_LOG_DAYS_AFTER_DELETION } from '../../src/lib/dataRetention';

test('the app and the public pages quote the retention period the server applies', () => {
  assert.equal(MESSAGE_LOG_DAYS_AFTER_DELETION, LOG_RETENTION_DAYS);
});
