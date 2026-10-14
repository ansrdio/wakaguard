import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPickedContact } from '../../src/lib/contactPicker';

test('a chosen number comes through without its spaces, with the name tidied', () => {
  assert.deepEqual(readPickedContact({ cancelled: false, name: ' Aunty Ngozi ', phone: '+234 803 123 4567' }), { name: 'Aunty Ngozi', phone: '+2348031234567' });
  assert.deepEqual(readPickedContact({ cancelled: false, name: 'Mum', phone: '0803 123 4567' }), { name: 'Mum', phone: '08031234567' });
});

test('backing out, or an entry with no number, gives nothing', () => {
  assert.equal(readPickedContact({ cancelled: true }), null);
  assert.equal(readPickedContact({ cancelled: false, name: 'No number', phone: '' }), null);
  assert.equal(readPickedContact({ cancelled: false, name: 'No number', phone: null }), null);
  assert.equal(readPickedContact(null), null);
  assert.equal(readPickedContact(undefined), null);
});

test('a number saved with no name still comes through', () => {
  assert.deepEqual(readPickedContact({ cancelled: false, name: null, phone: '08031234567' }), { name: '', phone: '08031234567' });
});
