'use client';

import { useSyncExternalStore } from 'react';
import { AppLoader } from '@/components/AppLoader';
import { EmailDoneNotice } from '@/components/EmailDoneNotice';
import { emailTaskIn, openPhoneAppHref } from '@/lib/emailLinks';
import { OPEN_APP_HREF } from '@/lib/frontPage';

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

  const task = emailTaskIn(search);
  return (
    <EmailDoneNotice
      task={task}
      openAppHref={phone ? openPhoneAppHref(task) : undefined}
      onUseBrowser={() => window.location.assign(OPEN_APP_HREF)}
    />
  );
}
