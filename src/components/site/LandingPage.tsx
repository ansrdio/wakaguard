import type { MouseEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BatteryWarning, Link2Off, Mail, MessageSquareText, Users } from 'lucide-react';
import { HowItWorks, NOT_ARRIVED_TEXT, TextsWeSend, WhoRunsWakaGuard } from '@/components/site/SiteSections';
import { COMPANY_ADDRESS, COMPANY_NAME, COMPANY_RC_NUMBER, CONTACT_EMAIL } from '@/lib/company';
import { OPEN_APP_HREF } from '@/lib/frontPage';

const PROMISES = [
  {
    icon: BatteryWarning,
    title: 'Works when your phone is off',
    text: 'The alert is sent from our servers, not from your phone. A flat battery or no signal does not stop it.',
  },
  {
    icon: Users,
    title: 'Only the people you choose',
    text: 'WakaGuard texts the contacts you pick for a trip, about that trip. It does not send marketing messages.',
  },
  {
    icon: Link2Off,
    title: 'Sharing ends when you arrive',
    text: 'Tap "I\'ve arrived" and the trip closes. The link your contacts were following stops working.',
  },
];

/**
 * The front page of wakaguard.com for someone who has not used WakaGuard in
 * this browser: what it is, how it works, what it sends and who runs it, with
 * the app one tap away.
 *
 * "Open the app" is a real link, so it also works before the page's scripts
 * have loaded; once they have, onOpenApp swaps the app in without a reload.
 */
export function LandingPage({ onOpenApp }: { onOpenApp: () => void }) {
  const openApp = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    onOpenApp();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/icons/icon-96x96.png" alt="" width={32} height={32} className="rounded-lg" />
            <span className="text-xl font-bold">WakaGuard</span>
          </div>
          <nav aria-label="On this page" className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-700">
            <a href="#how-it-works" className="hover:text-brand-700">How it works</a>
            <a href="#texts" className="hover:text-brand-700">The texts we send</a>
            <a href="#who" className="hover:text-brand-700">Who runs it</a>
            <Link href="/support" className="hover:text-brand-700">Support</Link>
          </nav>
          <a
            href={OPEN_APP_HREF}
            onClick={openApp}
            className="px-4 py-2 bg-brand-600 text-white rounded-full text-sm font-semibold hover:bg-brand-700"
          >
            Open the app
          </a>
        </div>
      </header>

      <main>
        <section className="bg-gradient-to-b from-brand-50 to-slate-50">
          <div className="max-w-6xl mx-auto px-4 py-12 sm:py-20 grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Travel safety for Nigeria</p>
              <h1 className="mt-3 text-4xl sm:text-5xl font-bold leading-tight">
                If you don&apos;t arrive, the people you chose are told.
              </h1>
              <p className="mt-5 text-lg text-slate-700 max-w-xl">
                Start a trip in WakaGuard before you set off. If you have not checked in by your arrival time,
                WakaGuard texts the people you chose with your last known location.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <a
                  href={OPEN_APP_HREF}
                  onClick={openApp}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-600 text-white rounded-2xl font-bold hover:bg-brand-700"
                >
                  Open the app
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </a>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center px-6 py-3.5 bg-white text-slate-900 border border-slate-300 rounded-2xl font-bold hover:bg-slate-100"
                >
                  See how it works
                </a>
              </div>
              <p className="mt-6 text-sm text-slate-600">
                A product of <strong>{COMPANY_NAME}</strong> (RC {COMPANY_RC_NUMBER}), a company registered in
                Nigeria.
              </p>
            </div>

            <figure className="w-full max-w-md mx-auto bg-white rounded-3xl border border-slate-200 shadow-lg p-5">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <span className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0">
                  <MessageSquareText className="w-5 h-5" aria-hidden="true" />
                </span>
                <p className="font-semibold">Text message to Tobi</p>
              </div>
              <blockquote className="mt-4 bg-slate-100 rounded-2xl rounded-tl-md p-4 leading-relaxed break-words">
                {NOT_ARRIVED_TEXT}
              </blockquote>
              <figcaption className="mt-4 text-sm text-slate-600">
                What a contact receives when a traveller has not arrived.
              </figcaption>
            </figure>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 py-12 space-y-14">
          <section aria-label="What you can count on">
            <ul className="grid gap-4 md:grid-cols-3">
              {PROMISES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
                  <span className="w-11 h-11 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <h2 className="mt-4 font-bold">{title}</h2>
                  <p className="text-sm text-slate-700 mt-1">{text}</p>
                </li>
              ))}
            </ul>
          </section>

          <HowItWorks />
          <TextsWeSend />
          <WhoRunsWakaGuard />

          <section className="bg-brand-700 text-white rounded-3xl p-8 sm:p-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold">Travelling today?</h2>
              <p className="mt-1 text-brand-50">Start a trip before you set off.</p>
            </div>
            <a
              href={OPEN_APP_HREF}
              onClick={openApp}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-brand-800 rounded-2xl font-bold hover:bg-brand-50 flex-shrink-0"
            >
              Open the app
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </a>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-8 grid gap-8 sm:grid-cols-[2fr_1fr] text-sm text-slate-600">
          <div>
            <div className="flex items-center gap-2 text-slate-900">
              <Image src="/icons/icon-48x48.png" alt="" width={24} height={24} className="rounded-md" />
              <span className="font-bold">WakaGuard</span>
            </div>
            <p className="mt-3">
              WakaGuard is a product of {COMPANY_NAME} (RC {COMPANY_RC_NUMBER}).
            </p>
            <p className="mt-1">{COMPANY_ADDRESS}</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="mt-1 inline-flex items-center gap-1.5 text-brand-700 hover:underline">
              <Mail className="w-4 h-4" aria-hidden="true" />
              {CONTACT_EMAIL}
            </a>
          </div>
          <nav aria-label="More about WakaGuard" className="flex flex-col gap-2">
            <Link href="/about" className="hover:underline">About</Link>
            <Link href="/privacy" className="hover:underline">Privacy policy</Link>
            <Link href="/support" className="hover:underline">Support</Link>
            <Link href="/guidelines" className="hover:underline">Guidelines</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
