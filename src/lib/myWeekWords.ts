/**
 * @fileoverview The words of "Your points this week" (build 27), apart from
 * the server call in myWeek.ts so they can be tested on their own
 * (functions/test/myWeek.test.ts).
 *
 * @module myWeekWords
 */

export interface MyWeek {
  fromMs: number;
  toMs: number;
  points: number;
  realTrips: number;
  roadReports: number;
  firstTestTrip: boolean;
  everydayBonus: boolean;
  days: number;
  missed: { atMs: number; reason: string } | null;
}

/** Why a trip earned nothing, and what to do next time; keyed by the rules' reasons (functions/src/weeklyRules.ts) */
export const MISSED_WORDS: Record<string, string> = {
  'too short': 'It was under 10 minutes.',
  'ended after contacts would have been texted':
    'It ran past its time, so your contacts would have been texted. Next time, tap "More time…" before your time is up.',
  'no location': 'No location came from your phone. "Keep WakaGuard running" in Profile can fix that.',
  'did not move': 'It moved less than 500 m from where it started.',
  'over the daily limit': 'Only 2 trips a day count.',
  'not ended by the traveller': 'It was not ended with "I\'ve arrived".',
  'ended after the week': 'It ended after the week.',
};

const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'Africa/Lagos' });
const WEEK_END = new Intl.DateTimeFormat('en-GB', { weekday: 'long', hour: 'numeric', hour12: true, timeZone: 'Africa/Lagos' });

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The lines under the number */
export function weekLines(week: MyWeek): string[] {
  const lines = [`${plural(week.realTrips, 'trip', 'trips')} counted · ${plural(week.roadReports, 'road report', 'road reports')}`];
  if (week.everydayBonus) lines.push('Everyday bonus: +5');
  if (week.firstTestTrip) lines.push('First test trip: +2');
  return lines;
}

export function missedLine(week: MyWeek): string | null {
  if (!week.missed) return null;
  const why = MISSED_WORDS[week.missed.reason] ?? '';
  return `Your trip on ${DAY.format(week.missed.atMs)} didn't count. ${why}`.trim();
}

/** "Sunday 6 pm", in Nigeria */
export function weekEnds(week: MyWeek): string {
  return WEEK_END.format(week.toMs).replace(',', '').replace(/\s?([ap])m$/i, ' $1m').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}
