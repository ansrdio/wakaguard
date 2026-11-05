import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clock, lagosMinute, reminderSlot, slotAt, usualMessage, usualTimes } from '../src/usualTimes';

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
// Midnight starting Monday 2 November 2026, Nigeria time
const MONDAY = Date.UTC(2026, 10, 1, 23, 0);
const at = (day: number, hour: number, minute: number) => MONDAY + day * DAY + (hour * 60 + minute) * MIN;
const NOW = at(14, 3, 0);

test('a usual time needs starts within 30 minutes of each other on 3 different days', () => {
  const work = [at(10, 7, 20), at(11, 7, 35), at(12, 7, 50), at(12, 7, 55)].map((atMs) => ({ atMs, destination: 'Work', minutes: 40 }));
  const usual = usualTimes(work, NOW);
  assert.equal(usual.length, 1);
  assert.equal(clock(usual[0].minute), '7:35 am', 'the middle of them, the earlier when two are');
  assert.deepEqual([usual[0].days, usual[0].destination, usual[0].minutes], [3, 'Work', 40]);

  assert.deepEqual(usualTimes(work.slice(0, 2), NOW), [], 'two days are not a habit');
  assert.deepEqual(usualTimes([at(10, 7, 0), at(11, 7, 0), at(11, 7, 10)].map((atMs) => ({ atMs })), NOW), [], 'nor two trips on one day');
  assert.deepEqual(usualTimes([at(-1, 7, 0), at(-2, 7, 0), at(10, 7, 0)].map((atMs) => ({ atMs })), NOW), [], 'only the last 14 days');
});

test('a person can have a morning and an evening time', () => {
  const days = [9, 10, 11, 12];
  const starts = [
    ...days.map((d) => ({ atMs: at(d, 7, 30), destination: 'Office' })),
    ...days.map((d) => ({ atMs: at(d, 18, 0), destination: 'Home' })),
  ];
  assert.deepEqual(usualTimes(starts, NOW).map((u) => [clock(u.minute), u.destination]), [['7:30 am', 'Office'], ['6:00 pm', 'Home']]);
});

test('the reminder comes 10 to 25 minutes before, in the quarter hour that holds it', () => {
  assert.equal(reminderSlot(7 * 60 + 30), '0715');
  assert.equal(reminderSlot(7 * 60 + 24), '0700');
  assert.equal(reminderSlot(5), '2345', 'just after midnight goes back to the day before');
  assert.equal(slotAt(at(0, 7, 15)), '0715');
  assert.equal(slotAt(at(0, 7, 29)), '0715');
  assert.equal(lagosMinute(at(3, 18, 5)), 18 * 60 + 5);
});

test('the reminder says when and where in plain words', () => {
  const m = usualMessage({ minute: 7 * 60 + 30, days: 4, destination: 'Work', minutes: 40 });
  assert.equal(m.title, 'Heading out?');
  assert.equal(m.body, 'You usually set off around 7:30 am for Work. Start your trip so your people know you got there.');
  assert.deepEqual(m.data, { kind: 'usual_trip', destination: 'Work', minutes: '40' });
  assert.equal(usualMessage({ minute: 18 * 60, days: 3, destination: null, minutes: null }).body,
    'You usually set off around 6:00 pm. Start your trip so your people know you got there.');
});
