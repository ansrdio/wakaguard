import { test } from 'node:test';
import assert from 'node:assert/strict';
import { friendLine, FriendProgress, inviteLink, inviteMessage, naira, readInviteName, shortDay } from '../../src/lib/referralWords';
import { CASH_OUT_OPENS_MS, readUsername } from '../src/referralPlan';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 11, 1, 12, 0);
const RULES = { reward: 500, tripsNeeded: 4, windowDays: 30, holdDays: 7, perPersonMonthly: 10 };
const friend = (changes: Partial<FriendProgress>): FriendProgress => ({
  name: 'ada', trips: 2, state: 'counting', deadlineMs: NOW + 12 * DAY, availableMs: null, refusal: null, ...changes,
});

test('the app reads an invite name the same way the server does', () => {
  for (const typed of ['Deve', '@Deve', ' lord_elijah ', 'ab', '9lives', 'has space', '']) {
    assert.equal(readInviteName(typed), readUsername(typed), typed);
  }
});

test('the invite link and message carry the username', () => {
  assert.equal(inviteLink('Deve'), 'https://wakaguard.com/join?u=Deve');
  assert.match(inviteMessage('Deve'), /Get it from my link, or type Deve under "Who invited you\?" when you sign up: https:\/\/wakaguard\.com\/join\?u=Deve$/);
});

test('each friend\'s line says how far they are, never where they went', () => {
  assert.equal(friendLine(friend({}), RULES, NOW), '2 of 4 trips · 12 days left');
  assert.equal(friendLine(friend({ deadlineMs: NOW + DAY }), RULES, NOW), '2 of 4 trips · 1 day left');
  assert.equal(friendLine(friend({ trips: 4, state: 'needs_contact' }), RULES, NOW), '4 trips done. Waiting for them to add a contact');
  assert.equal(friendLine(friend({ trips: 4, state: 'qualified', availableMs: NOW + 3 * DAY }), RULES, NOW), 'You earned ₦500. Ready on Fri 4 Dec');
  assert.equal(friendLine(friend({ trips: 4, state: 'qualified', availableMs: NOW - DAY }), RULES, NOW), 'You earned ₦500');
  assert.equal(friendLine(friend({ state: 'expired' }), RULES, NOW), 'Ended: 30 days passed with 2 of 4 trips');
  assert.equal(friendLine(friend({ state: 'refused', refusal: 'same_phone' }), RULES, NOW), 'Not paid: their trips came from your phone');
});

test('money and days are written the Nigerian way', () => {
  assert.equal(naira(200000), '₦200,000');
  assert.equal(shortDay(CASH_OUT_OPENS_MS), 'Tue 15 Dec');
});
