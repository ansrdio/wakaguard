/**
 * @fileoverview The app's version and build number, as shown on Profile
 *
 * The phone apps take their real numbers from android/app/build.gradle and the
 * Xcode project. These two must be changed in the same commit as those, and a
 * test (functions/test/appVersion.test.ts) fails when they disagree.
 *
 * @module appVersion
 */

export const APP_VERSION = '1.2.0';
export const APP_BUILD = 25;

/**
 * "Version 1.2.0 (build 21)" in the phone apps, where a tester may be asked
 * which build they have. The website is released on its own and has no build.
 */
export function versionLabel(inPhoneApp: boolean): string {
  return inPhoneApp ? `Version ${APP_VERSION} (build ${APP_BUILD})` : `Version ${APP_VERSION}`;
}
