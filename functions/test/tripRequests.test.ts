import { test } from 'node:test';
import assert from 'node:assert/strict';
import { askerName, ID_LENGTH, isRequestId, newRequestId } from '../src/tripRequests';

test("the asker's name is kept plain and short", () => {
  assert.equal(askerName('  Mum  '), 'Mum');
  assert.equal(askerName('Aunty   Bisi'), 'Aunty Bisi');
  assert.equal(askerName('<b>Mum</b>'), 'bMum/b');
  assert.equal(askerName(''), null);
  assert.equal(askerName('   '), null);
  assert.equal(askerName('x'.repeat(41)), null);
  assert.equal(askerName(42), null);
});

test('link ids are long, random and made of letters and digits that are not easily mixed up', () => {
  const id = newRequestId();
  assert.equal(id.length, ID_LENGTH);
  assert.ok(isRequestId(id));
  assert.doesNotMatch(id, /[0O1lI]/);
  assert.notEqual(newRequestId(), id);
  // The same bytes give the same id
  const bytes = Buffer.from(Array.from({ length: ID_LENGTH }, (_, i) => i * 7));
  assert.equal(newRequestId(bytes), newRequestId(bytes));
});

test('only ids of that shape are looked up', () => {
  assert.equal(isRequestId('abc'), false);
  assert.equal(isRequestId('a'.repeat(ID_LENGTH - 1) + '0'), false, 'a zero is never in an id');
  assert.equal(isRequestId(null), false);
  assert.equal(isRequestId('../../users/x'), false);
});
