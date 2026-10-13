import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FLAG_CHOICES, flagReasonFor } from '../../src/lib/flagReasons';

// The reasons the database rules accept for a flag (firestore.rules)
const ACCEPTED = ['spam', 'inappropriate', 'incorrect', 'duplicate', 'other'];

test('every choice on the report form is filed under a reason the database accepts', () => {
  for (const choice of FLAG_CHOICES) {
    assert.ok(ACCEPTED.includes(flagReasonFor(choice.label)), choice.label);
  }
  assert.equal(flagReasonFor('False information'), 'incorrect');
  assert.equal(flagReasonFor('  harassment or hate speech '), 'inappropriate');
});

test('a reason typed by the person is filed under other', () => {
  assert.equal(flagReasonFor('This road does not exist'), 'other');
  assert.equal(flagReasonFor(''), 'other');
});
