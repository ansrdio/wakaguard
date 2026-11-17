'use client';

import { HeartHandshake, Loader2 } from 'lucide-react';

/**
 * Someone asked the traveller to let them know they got there (build 29,
 * lib/tripRequestLink.ts). Nothing happens until the traveller chooses: they
 * add the asker as a contact and plan the trip, or put it off.
 */
export function TripRequestCard(props:
  | { name: string; busy: boolean; onAdd: () => void; onLater: () => void }
  | { problem: string; onDone: () => void }
  | { guest: true; onSignIn: () => void; onLater: () => void }) {
  if ('guest' in props) {
    // Who asked is only shown to an account: the link alone does not reveal their number
    return (
      <section aria-labelledby="trip-request-title" className="rounded-3xl bg-brand-50 dark:bg-brand-900/40 border border-brand-200 dark:border-brand-800 p-5">
        <div className="flex gap-3">
          <span className="w-11 h-11 rounded-full bg-brand-600 text-white flex items-center justify-center flex-shrink-0">
            <HeartHandshake className="w-6 h-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="trip-request-title" className="font-bold text-slate-900 dark:text-white">
              Someone asked you to let them know when you get there
            </h2>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
              Create a free account to see who asked and start a trip with them as your contact.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <button type="button" onClick={props.onSignIn} className="w-full min-h-12 rounded-2xl bg-brand-600 text-white font-semibold">
            Create an account
          </button>
          <button type="button" onClick={props.onLater} className="w-full min-h-11 text-sm font-semibold text-slate-600 dark:text-slate-300">
            Not now
          </button>
        </div>
      </section>
    );
  }
  if ('problem' in props) {
    return (
      <section className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5" aria-live="polite">
        <p className="text-sm text-slate-700 dark:text-slate-200">{props.problem}</p>
        <button type="button" onClick={props.onDone} className="mt-3 text-sm font-semibold text-brand-700 dark:text-brand-300">
          OK
        </button>
      </section>
    );
  }
  const { name, busy, onAdd, onLater } = props;
  return (
    <section
      aria-labelledby="trip-request-title"
      className="rounded-3xl bg-brand-50 dark:bg-brand-900/40 border border-brand-200 dark:border-brand-800 p-5"
    >
      <div className="flex gap-3">
        <span className="w-11 h-11 rounded-full bg-brand-600 text-white flex items-center justify-center flex-shrink-0">
          <HeartHandshake className="w-6 h-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="trip-request-title" className="font-bold text-slate-900 dark:text-white break-words">
            {name} asked you to let them know when you get there
          </h2>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
            If you don&apos;t arrive on time, WakaGuard texts {name} where your phone was last. When you tap
            &quot;I&apos;ve arrived&quot;, {name} gets a text that you got there.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={onAdd}
          disabled={busy}
          className="w-full min-h-12 rounded-2xl bg-brand-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy && <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />}
          Add {name} and plan the trip
        </button>
        <button type="button" onClick={onLater} disabled={busy} className="w-full min-h-11 text-sm font-semibold text-slate-600 dark:text-slate-300">
          Not now
        </button>
      </div>
    </section>
  );
}
