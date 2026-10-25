import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canSpeak, pickVoice, voiceMuted } from '../../src/lib/speech';

const voice = (lang: string, localService = true) => ({ lang, localService });

test('Nigerian English is picked when the phone has it', () => {
  assert.equal(pickVoice([voice('en-US'), voice('en-GB'), voice('en-NG')])?.lang, 'en-NG');
  // Some phones write the region with an underscore
  assert.equal(pickVoice([voice('en_US'), voice('en_NG')])?.lang, 'en_NG');
});

test('then British English, then any English, a voice on the phone first', () => {
  assert.equal(pickVoice([voice('en-US'), voice('en-GB')])?.lang, 'en-GB');
  assert.equal(pickVoice([voice('fr-FR'), voice('en-AU')])?.lang, 'en-AU');
  const online = voice('en-GB', false);
  const onPhone = voice('en-GB', true);
  assert.equal(pickVoice([online, onPhone]), onPhone);
  assert.equal(pickVoice([voice('yo-NG'), voice('fr-FR')]), null, 'no English voice: the phone chooses');
  assert.equal(pickVoice([]), null);
});

test('without a phone or a browser, nothing is spoken and nothing is muted', () => {
  assert.equal(canSpeak(), false);
  assert.equal(voiceMuted(), false);
});
