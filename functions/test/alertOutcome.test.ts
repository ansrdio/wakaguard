import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeOverdueAlert, describeSosAlert, describeTripAlert, watcherCaption } from '../../src/lib/alertOutcome';

const overdue = (fields: Record<string, unknown>) => describeOverdueAlert({ status: 'active', overdueAt: {}, ...fields });
const sos = (fields: Record<string, unknown>) => describeSosAlert({ status: 'emergency', ...fields });

test('overdue: nothing to say while the trip is on time or inside the wait', () => {
  assert.equal(describeOverdueAlert({ status: 'active' }), null);
  assert.equal(describeTripAlert({ status: 'active' }), null);
});

test('overdue: says how many contacts a text was sent to, and never says delivered', () => {
  const one = overdue({ overdueAlertState: 'sent', overdueAlertSent: 1, overdueAlertTotal: 1 })!;
  assert.equal(one.tone, 'sent');
  assert.match(one.text, /^A text saying you are overdue was sent to your contact\./);
  const two = overdue({ overdueAlertState: 'sent', overdueAlertSent: 2, overdueAlertTotal: 2 })!;
  assert.match(two.text, /was sent to your 2 contacts\./);
  // An older server does not record the counts
  assert.match(overdue({ overdueAlertState: 'sent' })!.text, /was sent to your contacts\./);
  for (const outcome of [one, two]) assert.doesNotMatch(outcome.text, /deliver|have been told|were alerted/i);
});

test('overdue: a text that went to only some contacts is reported as a problem', () => {
  const outcome = overdue({ overdueAlertState: 'partial', overdueAlertSent: 1, overdueAlertTotal: 3 })!;
  assert.equal(outcome.tone, 'problem');
  assert.match(outcome.text, /sent to 1 of your 3 contacts\. The rest could not be sent/);
  assert.equal(outcome.texted, true);
});

test('overdue: texting switched off or failing is never reported as contacts being told', () => {
  for (const state of ['blocked', 'failed', 'no_contacts']) {
    const outcome = overdue({ overdueAlertState: state, overdueAlertSent: 0, overdueAlertTotal: 2, overdueAlertAttempts: 3 })!;
    assert.equal(outcome.tone, 'problem', state);
    assert.equal(outcome.texted, false, state);
    assert.doesNotMatch(outcome.text, /was sent to|have been told|were alerted/, state);
  }
  assert.match(overdue({ overdueAlertState: 'blocked' })!.text, /could not text your contacts\. Call them yourself/);
  assert.match(overdue({ overdueAlertState: 'no_contacts' })!.text, /^Nobody was told/);
});

test('overdue: a failed text says whether the server is still trying', () => {
  assert.match(overdue({ overdueAlertState: 'failed', overdueAlertAttempts: 1 })!.text, /trying again/);
  assert.match(overdue({ overdueAlertState: 'failed', overdueAlertAttempts: 3 })!.text, /Call them yourself/);
});

test('overdue: while the texts are going out it says so', () => {
  assert.equal(overdue({ overdueAlertState: 'sending' })!.tone, 'pending');
  assert.equal(overdue({})!.tone, 'pending');
  assert.match(overdue({})!.text, /are being texted now/);
});

test('SOS: nothing unless the trip is an emergency', () => {
  assert.equal(describeSosAlert({ status: 'active', sosAlertState: 'sent' }), null);
});

test('SOS: tells apart started on the phone, received, sent and not sent', () => {
  assert.match(sos({})!.text, /^SOS started\. Your contacts are texted as soon as WakaGuard receives it\./);
  assert.match(sos({ sosAlertState: 'sending' })!.text, /^SOS received\. Your contacts are being texted now\./);
  assert.match(sos({ sosAlertState: 'sent', sosAlertSent: 2, sosAlertTotal: 2 })!.text, /^An SOS text was sent to your 2 contacts\./);
  assert.match(sos({ sosAlertState: 'partial', sosAlertSent: 1, sosAlertTotal: 2 })!.text, /sent to 1 of your 2 contacts/);
  for (const state of ['blocked', 'failed']) {
    const outcome = sos({ sosAlertState: state })!;
    assert.equal(outcome.tone, 'problem');
    assert.match(outcome.text, /could not be sent\. Call them, or call 112\./);
  }
  assert.match(sos({ sosAlertState: 'no_contacts' })!.text, /^No SOS text was sent/);
  for (const state of [undefined, 'sending', 'sent', 'partial', 'blocked', 'failed', 'no_contacts']) {
    assert.match(sos({ sosAlertState: state })!.text, /End the trip when you are safe\.$/);
  }
});

test('an SOS takes over from an overdue alert on the same trip', () => {
  const outcome = describeTripAlert({ status: 'emergency', overdueAt: {}, overdueAlertState: 'sent', sosAlertState: 'sent', sosAlertTotal: 1 })!;
  assert.equal(outcome.kind, 'sos');
});

test('watcherCaption: the words after the contacts\' names follow what happened', () => {
  assert.equal(watcherCaption(null, 2), "will be told if you don't arrive");
  assert.equal(watcherCaption(overdue({ overdueAlertState: 'sent' }), 1), 'has been sent a text');
  assert.equal(watcherCaption(overdue({ overdueAlertState: 'sent' }), 2), 'have been sent a text');
  assert.equal(watcherCaption(overdue({ overdueAlertState: 'sending' }), 1), 'is being texted');
  assert.equal(watcherCaption(overdue({ overdueAlertState: 'partial' }), 3), 'were not all sent a text');
  assert.equal(watcherCaption(overdue({ overdueAlertState: 'blocked' }), 2), 'could not be texted');
});
