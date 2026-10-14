import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HIDE_AT_REPORTERS, countReporters } from '../src/autoHide';

const flag = (reporterId: unknown, status: unknown = 'pending') => ({ reporterId, status });

test('three different people are needed', () => {
  assert.equal(HIDE_AT_REPORTERS, 3);
  assert.equal(countReporters([flag('a'), flag('b')]), 2);
  assert.equal(countReporters([flag('a'), flag('b'), flag('c')]), 3);
});

test('one person reporting the same post again and again counts once', () => {
  assert.equal(countReporters([flag('a'), flag('a'), flag('a'), flag('a')]), 1);
});

test('the author reporting their own post does not count', () => {
  assert.equal(countReporters([flag('author'), flag('a'), flag('b')], 'author'), 2);
});

test('reports already dealt with do not count, so a post put back needs three new people', () => {
  const dealtWith = [flag('a', 'dismissed'), flag('b', 'dismissed'), flag('c', 'resolved')];
  assert.equal(countReporters(dealtWith), 0);
  assert.equal(countReporters([...dealtWith, flag('d'), flag('e')]), 2);
});

test('a report with nobody behind it is not counted', () => {
  assert.equal(countReporters([flag(''), flag(null), flag(undefined), flag(7), {}]), 0);
});
