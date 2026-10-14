import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REPORT_PICTURE_TYPES, TRAVEL_PICTURE_MODES, reportPictureSvg, travelPictureSvg } from '../../src/lib/pictures';
import { TRAVEL_MODES } from '../../src/lib/travelMode';

// The report types of src/lib/types.ts, written out here because that file needs Firebase
const REPORT_TYPES = ['pothole', 'traffic', 'accident', 'roadwork', 'hazard', 'closure', 'checkpoint', 'other'];

const count = (text: string, piece: string) => text.split(piece).length - 1;

test('every kind of road report has a picture of its own', () => {
  assert.deepEqual([...REPORT_PICTURE_TYPES].sort(), [...REPORT_TYPES].sort());
  const seen = new Set(REPORT_TYPES.map((type) => reportPictureSvg(type)));
  assert.equal(seen.size, REPORT_TYPES.length);
});

test('every way of travelling has a picture of its own', () => {
  assert.deepEqual([...TRAVEL_PICTURE_MODES].sort(), TRAVEL_MODES.map((mode) => mode.id).sort());
  const seen = new Set(TRAVEL_MODES.map((mode) => travelPictureSvg(mode.id)));
  assert.equal(seen.size, TRAVEL_MODES.length);
});

test('a kind that is not known still gets a picture', () => {
  assert.equal(reportPictureSvg('landslide'), reportPictureSvg('other'));
  assert.equal(travelPictureSvg('canoe'), travelPictureSvg('other'));
});

test('each picture is one whole drawing, at the size asked for, with nothing that runs', () => {
  const all = [
    ...REPORT_TYPES.map((type) => reportPictureSvg(type, 30)),
    ...TRAVEL_MODES.map((mode) => travelPictureSvg(mode.id, 30)),
  ];
  for (const svg of all) {
    assert.ok(svg.startsWith('<svg ') && svg.endsWith('</svg>'), svg.slice(0, 40));
    assert.match(svg, /width="30" height="30" viewBox="0 0 64 64"/);
    assert.equal(count(svg, '<svg'), 1);
    assert.equal(count(svg, '<g '), count(svg, '</g>'));
    assert.doesNotMatch(svg, /<script|onload=|onclick=|href=|javascript:/i);
    assert.doesNotMatch(svg, /undefined|NaN/);
  }
});
