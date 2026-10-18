'use client';

/**
 * "Stop WakaGuard texts to my number", at the foot of the trip page a text
 * links to. Texts come from a sender name, so a contact cannot reply STOP;
 * the link they were sent is the proof the number is theirs
 * (functions/src/textOptOut.ts).
 */

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { readContactPhone } from '@/lib/contactPhone';
import { OptOutAction, sendOptOut } from '@/lib/textOptOut';

const PROBLEMS = {
  not_matched: 'That number is not one of the contacts for this trip. Enter the number this WakaGuard text came to.',
  too_many: 'Too many tries from this link. Please try again in an hour.',
  failed: 'Could not reach WakaGuard. Check your connection and try again.',
} as const;

export function StopTexts({ token, who }: { token: string; who: string }) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<OptOutAction>('stop');
  const [typed, setTyped] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ action: OptOutAction; number: string } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const person = who || 'the person who shared this trip';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const phone = readContactPhone(typed);
    if (!phone.ok) {
      setProblem(phone.error);
      return;
    }
    setSending(true);
    setProblem(null);
    const answer = await sendOptOut(token, phone.phoneE164, action);
    setSending(false);
    if (answer === 'stopped' || answer === 'resumed') {
      setDone({ action, number: typed.trim() });
      setTyped('');
    } else {
      setProblem(PROBLEMS[answer]);
    }
  };

  const switchTo = (next: OptOutAction) => {
    setAction(next);
    setDone(null);
    setProblem(null);
    setOpen(true);
  };

  if (done) {
    return (
      <section className="border-t border-slate-200 pt-4 text-sm text-slate-700" role="status">
        {done.action === 'stop' ? (
          <>
            <p className="font-semibold text-slate-900">WakaGuard will not text {done.number} again.</p>
            <p className="mt-1">{who || 'The person who shared this trip'} will see that you asked.</p>
            <button type="button" onClick={() => switchTo('resume')} className="mt-2 font-semibold text-brand-700 underline">
              Turn texts back on
            </button>
          </>
        ) : (
          <p className="font-semibold text-slate-900">WakaGuard texts will reach {done.number} again.</p>
        )}
      </section>
    );
  }

  if (!open) {
    return (
      <section className="border-t border-slate-200 pt-4">
        <button type="button" onClick={() => switchTo('stop')} className="text-sm font-medium text-slate-600 underline">
          Stop WakaGuard texts to my number
        </button>
      </section>
    );
  }

  const stopping = action === 'stop';
  return (
    <section className="border-t border-slate-200 pt-4" aria-labelledby="stop-texts-title">
      <h2 id="stop-texts-title" className="font-bold text-slate-900">
        {stopping ? 'Stop WakaGuard texts' : 'Turn WakaGuard texts back on'}
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        {stopping
          ? `Enter the number this text came to. WakaGuard will not text it again, for this trip or anyone else's, and ${person} will see that you asked.`
          : 'Enter the number you stopped texts to. WakaGuard texts will reach it again.'}
      </p>
      {stopping && (
        <p className="mt-2 text-sm font-medium text-amber-800">
          You will not be told if {person}, or anyone else who has you as a contact, is overdue or sends an SOS.
        </p>
      )}
      <form onSubmit={submit} className="mt-3 space-y-3">
        <label className="block">
          <span className="block text-sm font-medium text-slate-700">Your mobile number</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="mt-1 w-full px-4 py-3 rounded-2xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        {problem && <p className="text-sm text-red-700" role="alert">{problem}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={sending}
            className="px-5 py-3 rounded-2xl font-semibold bg-slate-900 text-white disabled:opacity-60 flex items-center gap-2"
          >
            {sending && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {stopping ? 'Stop texts' : 'Turn texts back on'}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="text-sm font-medium text-slate-600 underline">
            Cancel
          </button>
        </div>
        {stopping && (
          <button type="button" onClick={() => switchTo('resume')} className="text-sm text-slate-600 underline">
            Stopped texts before? Turn them back on
          </button>
        )}
      </form>
    </section>
  );
}
