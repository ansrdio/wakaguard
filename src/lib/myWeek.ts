/**
 * @fileoverview "Your points this week" on Profile (build 27): the server
 * scores the week (functions/src/myWeek.ts, with the Sunday script's rules);
 * myWeekWords.ts says it in words.
 *
 * @module myWeek
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebaseFunctions';
import type { MyWeek } from './myWeekWords';

export async function fetchMyWeek(): Promise<MyWeek> {
  const result = await httpsCallable<Record<string, never>, MyWeek>(functions, 'myWeek')({});
  return result.data;
}

