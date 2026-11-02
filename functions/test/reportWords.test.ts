import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSerious, reportTypeWord } from '../../src/lib/reportWords';

test('every kind of report has one name, wherever it shows', () => {
  assert.equal(reportTypeWord('roadwork'), 'Construction');
  assert.equal(reportTypeWord('closure'), 'Roadblock');
  assert.equal(reportTypeWord('traffic'), 'Heavy traffic');
  assert.equal(reportTypeWord('checkpoint'), 'Checkpoint');
});

test('a kind from an older version still reads properly', () => {
  assert.equal(reportTypeWord('road_block'), 'Road block');
  assert.equal(reportTypeWord(''), 'Report');
});

test('older reports turn into serious or not without being changed', () => {
  assert.equal(isSerious('critical'), true);
  assert.equal(isSerious('high'), true);
  assert.equal(isSerious('medium'), false);
  assert.equal(isSerious('low'), false);
});
