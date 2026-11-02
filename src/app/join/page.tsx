'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Check, Copy, Loader2 } from 'lucide-react';
import { useAppConfig } from '@/hooks/useAppConfig';
import { DEFAULT_UPDATE_URL_ANDROID, DEFAULT_UPDATE_URL_IOS } from '@/lib/appConfig';
import { OPEN_APP_HREF } from '@/lib/frontPage';
import { inviterFromTrip, readInviteName, rememberInviter } from '@/lib/referrals';
import { storeLinkWithInviter } from '@/lib/installReferrer';

/**
 * Where an invite link leads (Invite friends, build 27). /join?u=<username>
 * comes from a friend's Share; /join?trip=<link> from "Get WakaGuard" on a
 * trip page, which finds the traveller's username here. The name then fills
 * in "Who invited you?": kept in this browser for signing up on the website,
 * passed to Google Play with the install for the Android app, and copied by
 * the iPhone button for the iPhone app to paste. It is also shown large, to
 * type.
 */
function JoinContent() {
  const params = useSearchParams();
  const fromLink = readInviteName(params.get('u'));
  const trip = params.get('trip');
  const [name, setName] = useState<string | null>(fromLink);
  const [looking, setLooking] = useState(!fromLink && !!trip);
  const [copied, setCopied] = useState(false);
  const config = useAppConfig();

  useEffect(() => {
    if (fromLink) {
      rememberInviter(fromLink, 'link');
      return;
    }
    if (!trip) return;
    inviterFromTrip(trip)
      .then((found) => {
        setName(found);
        if (found) rememberInviter(found, 'trip');
      })
      .catch(() => setName(null))
      .finally(() => setLooking(false));
  }, [fromLink, trip]);

  const copy = async () => {
    if (!name) return;
    try {
      await navigator.clipboard.writeText(name);
      setCopied(true);
    } catch {
      // The name is on screen to type
    }
  };

  const via = fromLink ? 'link' : 'trip';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-2">
          <Image src="/icons/icon-48x48.png" alt="" width={28} height={28} className="rounded-lg" />
          <span className="text-lg font-bold">WakaGuard</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <section className="space-y-3">
          <h1 className="text-3xl font-bold leading-tight">
            {looking ? 'You are invited to WakaGuard' : name ? `${name} invited you to WakaGuard` : 'You are invited to WakaGuard'}
          </h1>
          <p className="text-slate-700">
            Start a trip and say when you will get there. If you don&rsquo;t arrive, the people you chose get a text
            with your last location. It&rsquo;s free.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
          <h2 className="font-semibold">1. Get the app</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <a
              href={storeLinkWithInviter(config?.updateUrlAndroid ?? DEFAULT_UPDATE_URL_ANDROID, name, via)}
              className="flex-1 min-h-12 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold flex items-center justify-center"
            >
              Android: Google Play
            </a>
            <a
              href={config?.updateUrlIos ?? DEFAULT_UPDATE_URL_IOS}
              onClick={copy}
              className="flex-1 min-h-12 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold flex items-center justify-center"
            >
              iPhone
            </a>
          </div>
          <p className="text-sm text-slate-600">
            Or <Link href={OPEN_APP_HREF} className="text-brand-700 underline">use WakaGuard in this browser</Link>.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3">
          <h2 className="font-semibold">2. Say who invited you</h2>
          {looking ? (
            <Loader2 className="w-6 h-6 text-brand-600 animate-spin" aria-label="Loading" />
          ) : name ? (
            <>
              <p className="text-slate-700">
                On Android, the app fills in &ldquo;Who invited you?&rdquo; for you. On iPhone, the button above copies
                the name: in the app, tap Paste under &ldquo;Who invited you?&rdquo;. Or type it:
              </p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{name}</span>
                <button
                  onClick={copy}
                  className="min-h-10 px-3 rounded-xl border border-slate-300 text-sm font-semibold flex items-center gap-1"
                >
                  {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-sm text-slate-600">
                When you have made 4 real trips, {name} earns a reward from us. They see how many trips you have
                made, never where you went.
              </p>
            </>
          ) : (
            <p className="text-slate-700">
              Ask the person who sent this link for their WakaGuard username, and type it under &ldquo;Who invited
              you?&rdquo; when you sign up.
            </p>
          )}
        </section>

        <p className="text-xs text-slate-500">
          <Link href="/about" className="underline">About WakaGuard</Link>
          {' · '}
          <Link href="/privacy" className="underline">Privacy</Link>
          {' · '}
          <Link href="/terms#invite-friends" className="underline">Invite rules</Link>
        </p>
      </main>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  );
}
