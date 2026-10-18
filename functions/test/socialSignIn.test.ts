import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accountProviders, readSocialProblem, socialProvidersFor } from '../../src/lib/socialSignIn';
import { readAppConfig } from '../../src/lib/appConfig';

test('the buttons stay hidden until switched on in config/app', () => {
  assert.deepEqual(readAppConfig({}).signInWith, { google: false, apple: false });
  assert.deepEqual(readAppConfig({ signInWith: { google: true, apple: 'yes' } }).signInWith, { google: true, apple: false });
  assert.deepEqual(socialProvidersFor('ios', { google: false, apple: false }), []);
});

test('Apple only on an iPhone, first; Google in both phone apps; neither on the website yet', () => {
  const on = { google: true, apple: true };
  assert.deepEqual(socialProvidersFor('ios', on), ['apple', 'google']);
  assert.deepEqual(socialProvidersFor('android', on), ['google']);
  assert.deepEqual(socialProvidersFor('web', on), []);
  assert.deepEqual(socialProvidersFor('ios', { google: true, apple: false }), ['google']);
});

test('an account without a password is confirmed with its provider', () => {
  assert.deepEqual(accountProviders(['password']), { password: true, social: [] });
  assert.deepEqual(accountProviders(['google.com']), { password: false, social: ['google'] });
  assert.deepEqual(accountProviders(['apple.com', 'google.com']), { password: false, social: ['google', 'apple'] });
});

test('what went wrong is told plainly, and a cancel says nothing', () => {
  assert.equal(readSocialProblem({ code: 'auth/popup-closed-by-user' }), 'cancelled');
  assert.equal(readSocialProblem({ message: 'The user canceled the sign-in flow.' }), 'cancelled');
  assert.equal(readSocialProblem({ message: 'The operation couldn’t be completed. (com.apple.AuthenticationServices.AuthorizationError error 1001.)' }), 'cancelled');
  assert.equal(readSocialProblem({ code: 'auth/account-exists-with-different-credential' }), 'exists-with-password');
  assert.equal(readSocialProblem({ code: 'auth/operation-not-allowed' }), 'not-switched-on');
  assert.equal(readSocialProblem({ code: 'auth/network-request-failed' }), 'offline');
  assert.equal(readSocialProblem(new Error('boom')), 'failed');
});
