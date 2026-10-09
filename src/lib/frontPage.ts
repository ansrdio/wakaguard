import { Capacitor } from '@capacitor/core';

/**
 * Who gets the landing page and who goes straight into the app.
 *
 * The front page of wakaguard.com explains WakaGuard to someone who has never
 * used it there. Everyone else is "in the app": the phone apps, the site added
 * to a home screen, a browser that has been through the first-run screens, and
 * a visitor who has pressed "Open the app" in this tab.
 */

// Set by the first-run screens (OnboardingFlow) once they are finished or skipped
const FIRST_RUN_DONE_KEY = 'wakaguard_onboarding_complete';
// Kept for the tab, so a reload during the first-run screens does not go back to the landing page
const OPENED_APP_KEY = 'wakaguard_opened_app';

/** A link that opens the app without showing the landing page first. */
export const OPEN_APP_HREF = '/?app=1';

/** Set on <html> by IN_APP_SCRIPT, and read by the two rules in globals.css. */
const IN_APP_ATTRIBUTE = 'data-in-app';

export function visitorIsInApp(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  try {
    return (
      (navigator as Navigator & { standalone?: boolean }).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches ||
      new URLSearchParams(window.location.search).has('app') ||
      localStorage.getItem(FIRST_RUN_DONE_KEY) !== null ||
      sessionStorage.getItem(OPENED_APP_KEY) !== null
    );
  } catch {
    // Storage can be refused, in some private windows for one. That visitor is new here.
    return false;
  }
}

export function rememberAppOpened(): void {
  try {
    sessionStorage.setItem(OPENED_APP_KEY, '1');
  } catch {
    // Nothing to do: the visitor sees the landing page again after a reload
  }
}

/**
 * The same question as visitorIsInApp, asked by the page itself before
 * anything is drawn. The built front page holds the landing page, so without
 * this someone who uses WakaGuard every day would see the landing page until
 * the app's scripts had loaded, which is seconds on a slow connection.
 *
 * It has to be plain script text with nothing imported, so it repeats the rule
 * above. Keep the two the same.
 */
export const IN_APP_SCRIPT = `(function(){try{var w=window,c=w.Capacitor,m=w.webkit&&w.webkit.messageHandlers;if(w.androidBridge||(m&&m.bridge)||(c&&c.isNativePlatform&&c.isNativePlatform())||navigator.standalone===true||w.matchMedia('(display-mode: standalone)').matches||/[?&]app(=|&|$)/.test(location.search)||localStorage.getItem('${FIRST_RUN_DONE_KEY}')!==null||sessionStorage.getItem('${OPENED_APP_KEY}')!==null)document.documentElement.setAttribute('${IN_APP_ATTRIBUTE}','')}catch(e){}})()`;
