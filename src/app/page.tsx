'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { AccountDeletedNotice } from '@/components/AccountDeletedNotice';
import { AppLoader } from '@/components/AppLoader';
import { EmailDoneNotice } from '@/components/EmailDoneNotice';
import { LandingPage } from '@/components/site/LandingPage';
import { emailTaskJustDone } from '@/lib/emailLinks';
import { accountWasJustDeleted, forgetAccountDeleted, rememberAppOpened, visitorIsInApp } from '@/lib/frontPage';

// The app runs only in a browser (Firebase is not set up while the site is
// built), so it stays out of the built page and arrives as a file of its own.
const AppHome = dynamic(() => import('@/components/AppHome').then((m) => m.AppHome), {
  ssr: false,
  loading: () => <AppLoader />,
});

// Ask for that file as soon as the page starts, not when it is first needed
if (typeof window !== 'undefined') {
  import('@/components/AppHome').catch(() => {
    // The app asks again when it is shown, and reports the failure then
  });
}

// Nothing announces a change to the answer; it is read afresh on each render
const neverChanges = () => () => {};
const notKnownYet = () => null;
const notOnTheServer = () => false;

/**
 * The front page. Someone who has not used WakaGuard in this browser gets the
 * landing page; the phone apps and anyone already using WakaGuard get the app.
 *
 * Which of the two is only known in the browser, so the built page holds the
 * landing page and the app's loader, and the stylesheet shows one of them
 * (see lib/frontPage.ts) until this component has asked. The landing page is
 * the one in the built page because it is what a first-time visitor, a search
 * engine or anyone reading the page without running scripts should get.
 */
export default function Home() {
  // null in the built page and for the first moment in the browser
  const arrivedInApp = useSyncExternalStore<boolean | null>(neverChanges, visitorIsInApp, notKnownYet);
  const [pressedOpen, setPressedOpen] = useState(false);
  const inApp = pressedOpen || arrivedInApp;

  // The page reloads after an account is deleted, and says so once
  const justDeleted = useSyncExternalStore(neverChanges, accountWasJustDeleted, notOnTheServer);
  const [noticeClosed, setNoticeClosed] = useState(false);

  // Back from the page an email link opens, in a browser that has never run
  // WakaGuard: their account is in the phone app, so they are sent back to it
  const emailTask = useSyncExternalStore(neverChanges, emailTaskJustDone, notKnownYet);
  const [choseBrowser, setChoseBrowser] = useState(false);
  const sendBackToApp = emailTask !== null && !choseBrowser;

  // So that leaving for another page and coming back, or signing out, stays in the app
  useEffect(() => {
    if (inApp && !sendBackToApp) rememberAppOpened();
  }, [inApp, sendBackToApp]);

  if (justDeleted && !noticeClosed) {
    const closeNotice = () => {
      forgetAccountDeleted();
      setNoticeClosed(true);
    };
    return <AccountDeletedNotice onDone={closeNotice} />;
  }

  if (sendBackToApp) {
    return <EmailDoneNotice task={emailTask} onUseBrowser={() => setChoseBrowser(true)} />;
  }

  if (inApp) {
    return <AppHome />;
  }

  const openApp = () => {
    window.scrollTo(0, 0);
    setPressedOpen(true);
  };

  return (
    <>
      <div className={inApp === null ? 'for-new-visitors' : undefined}>
        <LandingPage onOpenApp={openApp} />
      </div>
      {inApp === null && (
        <div className="for-app-users">
          <AppLoader />
        </div>
      )}
    </>
  );
}
