import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isTextEntry } from '../../src/lib/nativeKeyboard';

const el = (tagName: string, extra: Record<string, unknown> = {}) => ({ tagName, ...extra }) as unknown as Element;

test('isTextEntry: fields that bring up the keyboard', () => {
  assert.equal(isTextEntry(el('INPUT', { type: 'text' })), true);
  assert.equal(isTextEntry(el('INPUT', { type: 'tel' })), true);
  assert.equal(isTextEntry(el('INPUT', { type: 'password' })), true);
  assert.equal(isTextEntry(el('TEXTAREA')), true);
  assert.equal(isTextEntry(el('SELECT')), true);
  assert.equal(isTextEntry(el('DIV', { isContentEditable: true })), true);
});

test('isTextEntry: controls that take focus without a keyboard', () => {
  assert.equal(isTextEntry(el('INPUT', { type: 'checkbox' })), false);
  assert.equal(isTextEntry(el('INPUT', { type: 'radio' })), false);
  assert.equal(isTextEntry(el('INPUT', { type: 'file' })), false);
  assert.equal(isTextEntry(el('BUTTON')), false);
  assert.equal(isTextEntry(el('BODY')), false);
  assert.equal(isTextEntry(null), false);
});
