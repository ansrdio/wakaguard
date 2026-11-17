/**
 * @fileoverview The server calls behind "Let me know you got there" (build 29)
 *
 * functions/src/tripRequests.ts does the work: making a link needs a confirmed
 * account and at most 10 a day; opening one returns the asker's name and
 * number to a signed-in person. Kept apart from tripRequestLink.ts so that file
 * loads without Firebase (and is tested on its own).
 *
 * @module tripRequests
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebaseFunctions';
import type { CreateProblem, ReadProblem } from './tripRequestLink';

const call = (data: Record<string, unknown>) =>
  httpsCallable<Record<string, unknown>, Record<string, unknown>>(functions, 'tripRequests')(data).then((r) => r.data);

export async function createTripRequest(name: string, phone: string):
  Promise<{ ok: true; id: string } | { ok: false; problem: CreateProblem }> {
  const answer = await call({ action: 'create', name, phone });
  return answer.ok === true && typeof answer.id === 'string'
    ? { ok: true, id: answer.id }
    : { ok: false, problem: (answer.problem as CreateProblem) ?? 'name' };
}

export async function readTripRequest(id: string):
  Promise<{ ok: true; name: string; phone: string } | { ok: false; problem: ReadProblem }> {
  const answer = await call({ action: 'read', id });
  return answer.ok === true && typeof answer.name === 'string' && typeof answer.phone === 'string'
    ? { ok: true, name: answer.name, phone: answer.phone }
    : { ok: false, problem: (answer.problem as ReadProblem) ?? 'not_found' };
}
