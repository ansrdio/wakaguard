import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_BUILD, APP_VERSION, versionLabel } from '../../src/lib/appVersion';

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('the build shown on Profile is the build the phone apps carry', () => {
  const gradle = read('android/app/build.gradle');
  assert.equal(Number(/versionCode (\d+)/.exec(gradle)?.[1]), APP_BUILD, 'android/app/build.gradle versionCode');
  assert.equal(/versionName "([^"]+)"/.exec(gradle)?.[1], APP_VERSION, 'android/app/build.gradle versionName');

  const xcode = read('ios/App/App.xcodeproj/project.pbxproj');
  const builds = [...xcode.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g)].map((match) => Number(match[1]));
  assert.ok(builds.length > 0);
  assert.deepEqual([...new Set(builds)], [APP_BUILD], 'CURRENT_PROJECT_VERSION in the Xcode project');
  const versions = [...xcode.matchAll(/MARKETING_VERSION = ([\d.]+);/g)].map((match) => match[1]);
  assert.deepEqual([...new Set(versions)], [APP_VERSION], 'MARKETING_VERSION in the Xcode project');
});

test('the build number is shown in the phone apps only', () => {
  assert.equal(versionLabel(true), `Version ${APP_VERSION} (build ${APP_BUILD})`);
  assert.equal(versionLabel(false), `Version ${APP_VERSION}`);
});
