'use client';

import { useSyncExternalStore } from 'react';
import { AppLoader } from '@/components/AppLoader';
import { AskLinkNotice } from '@/components/AskLinkNotice';
import { EmailDoneNotice } from '@/components/EmailDoneNotice';
import { emailTaskIn, openPhoneAppHref } from '@/lib/emailLinks';
import { OPEN_APP_HREF } from '@/lib/frontPage';
import { askAppHref, askBrowserHref, askIdFrom } from '@/lib/tripRequestLink';

// Neither answer changes while the page is open
const neverChanges = () => () => {};
const notKnownYet = () => null;

const addressSays = () => window.location.search;
// The button that opens the app is no use on a computer
const onAPhone = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export function BackToApp() {
  // Only known in the browser; the built page holds the loader
  const search = useSyncExternalStore<string | null>(neverChanges, addressSays, notKnownYet);
  const phone = useSyncExternalStore<boolean | null>(neverChanges, onAPhone, notKnownYet);
  if (search === null) return <AppLoader />;

  // "Let me know you got there" (build 29), opened where the app did not take the link
  const askId = askIdFrom(search);
  if (askId) return <AskLinkNotice openAppHref={phone ? askAppHref(askId) : undefined} browserHref={askBrowserHref(askId)} />;

  const task = emailTaskIn(search);
  return (
    <EmailDoneNotice
      task={task}
      openAppHref={phone ? openPhoneAppHref(task) : undefined}
      onUseBrowser={() => window.location.assign(OPEN_APP_HREF)}
    />
  );
}
