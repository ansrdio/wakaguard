/**
 * @fileoverview What to tell someone whose phone stops WakaGuard during a trip
 *
 * Many phones close apps that are running in the background to save battery.
 * Tecno, Infinix and itel phones do it most readily, and some Samsungs. When
 * it happens during a trip the phone stops sending its position, and a
 * contact sees only where the traveller was. In the first two days of testing
 * (12 and 13 October 2026) three testers' long trips went quiet this way.
 *
 * Approved by the owner on 14 October 2026; the Phone Master step is still to
 * be checked on a Tecno, Infinix or itel phone. Settings are named differently
 * from phone to phone, so the steps name the usual words and say that they vary.
 *
 * No Firebase access (functions/test/keepRunning.test.ts).
 *
 * @module keepRunning
 */

export type PhoneKind = 'android' | 'ios' | 'web';

export interface KeepRunningStep {
  title: string;
  body: string;
}

export interface KeepRunningHelp {
  intro: string;
  steps: KeepRunningStep[];
  /** True where a button can take the person to WakaGuard's page in the phone's settings */
  offersSettings: boolean;
}

const ANDROID: KeepRunningStep[] = [
  {
    title: 'Let WakaGuard use the battery freely',
    body: 'In your phone\'s settings open Apps, then WakaGuard, then Battery, and choose Unrestricted. '
      + 'Some phones call it "Don\'t optimise" or "No restrictions".',
  },
  {
    title: 'Switch off battery saver for the trip',
    body: 'Battery saver and ultra power saving close apps you are not looking at. Turn them off until you arrive.',
  },
  {
    title: 'Leave WakaGuard among your recent apps',
    body: 'Swiping WakaGuard away, or tapping "Clear all", stops it. You can use other apps or lock the phone; just do not clear it.',
  },
  {
    title: 'On Tecno, Infinix and itel phones',
    body: 'Open Phone Master, find Auto-start and switch it on for WakaGuard. Then open your recent apps and lock '
      + 'WakaGuard with the padlock, so the phone does not clear it.',
  },
  {
    title: 'Keep the "Safe Trip active" notification',
    body: 'It is what tells your phone a trip is running. If you turned WakaGuard\'s notifications off, turn them back on.',
  },
];

const IOS: KeepRunningStep[] = [
  {
    title: 'Allow location always',
    body: 'In the Settings app open WakaGuard, then Location, and choose Always. Keep Precise Location on.',
  },
  {
    title: 'Switch off Low Power Mode for the trip',
    body: 'Low Power Mode pauses apps you are not looking at. Turn it off in Settings, under Battery, until you arrive.',
  },
  {
    title: 'Do not swipe WakaGuard closed',
    body: 'You can use other apps or lock the phone. Swiping WakaGuard up and away in the app switcher stops it.',
  },
];

const WEB: KeepRunningStep[] = [
  {
    title: 'Use the WakaGuard app for trips',
    body: 'A website can only share your position while its page is open on the screen. The app keeps sharing it '
      + 'when the phone is locked or you are using something else.',
  },
  {
    title: 'If you stay on the website',
    body: 'Keep this page open and the screen on until you arrive.',
  },
];

/** The help for a kind of phone. Anything that is not an Android phone or an iPhone is treated as a browser. */
export function keepRunningHelp(kind: string): KeepRunningHelp {
  if (kind === 'android') {
    return {
      intro: 'Some phones close apps to save battery. If yours closes WakaGuard during a trip, your contacts '
        + 'stop seeing where you are. These steps stop that. The names differ a little from phone to phone.',
      steps: ANDROID,
      offersSettings: true,
    };
  }
  if (kind === 'ios') {
    return {
      intro: 'An iPhone pauses apps it thinks are not needed. These settings keep WakaGuard sharing your '
        + 'position for the whole trip.',
      steps: IOS,
      offersSettings: true,
    };
  }
  return {
    intro: 'You are using WakaGuard in a browser, which cannot share your position in the background.',
    steps: WEB,
    offersSettings: false,
  };
}

/**
 * Makers whose phones close apps that are not on the screen, readily enough
 * that their owners are shown the steps without having to go looking. The
 * app's own browser names the phone in its user agent ("Infinix X688B").
 */
const CLOSES_APPS = /\b(infinix|tecno|itel)\b/i;

export function closesBackgroundApps(userAgent: string): boolean {
  return CLOSES_APPS.test(userAgent);
}

/**
 * Whether to put the steps in front of someone who has not asked for them.
 * Never on an iPhone, and never again once they have said they are done.
 */
export function shouldOfferKeepRunning(platform: string, userAgent: string, alreadyDone: boolean): boolean {
  return platform !== 'ios' && !alreadyDone && closesBackgroundApps(userAgent);
}

const DONE_KEY = 'wakaguard_keep_running_done';

export function hasDoneKeepRunning(): boolean {
  try {
    return window.localStorage.getItem(DONE_KEY) === '1';
  } catch {
    // Nothing to remember it in: better not to ask on every visit
    return true;
  }
}

export function rememberKeepRunningDone(): void {
  try {
    window.localStorage.setItem(DONE_KEY, '1');
  } catch {
    // Nothing to do; it is offered again next time
  }
}
