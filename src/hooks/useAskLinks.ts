'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { askIdFrom, rememberAsk } from '@/lib/tripRequestLink';

/**
 * Picks up "Let me know you got there" links (build 29): on the website from
 * this page's address, in the phone apps from the link that opened the app
 * (at start or while it was running). The id is kept until the person has
 * seen the request (lib/tripRequestLink.ts).
 */
export function useAskLinks(): void {
  useEffect(() => {
    const fromPage = askIdFrom(window.location.search);
    if (fromPage) {
      rememberAsk(fromPage);
      // So reloading the page does not ask again
      const url = new URL(window.location.href);
      url.searchParams.delete('ask');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
    if (!Capacitor.isNativePlatform()) return;

    let stopped = false;
    let remove: (() => void) | null = null;
    App.getLaunchUrl()
      .then((launch) => {
        const id = launch?.url ? askIdFrom(launch.url) : null;
        if (id) rememberAsk(id);
      })
      .catch(() => {});
    App.addListener('appUrlOpen', ({ url }) => {
      const id = askIdFrom(url);
      if (id) rememberAsk(id);
    }).then((handle) => {
      if (stopped) void handle.remove();
      else remove = () => void handle.remove();
    }).catch(() => {});
    return () => {
      stopped = true;
      remove?.();
    };
  }, []);
}
