'use client';

import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Check, HeartHandshake, Loader2, X } from 'lucide-react';
import { readContactPhone } from '@/lib/contactPhone';
import { askLink, askMessage, createProblemWords } from '@/lib/tripRequestLink';
import { createTripRequest } from '@/lib/tripRequests';

/**
 * "Let me know you got there" (build 29): someone who worries makes a link
 * and sends it themselves, from their own phone. WakaGuard sends nothing
 * now; the person who opens the link decides whether to start a trip with
 * them as a contact (functions/src/tripRequests.ts).
 */
export function AskToKnowSheet({ defaultName, onClose }: { defaultName: string; onClose: () => void }) {
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const send = async (url: string) => {
    const text = askMessage(url);
    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({ title: 'Let me know you got there', text, dialogTitle: 'Send the link' });
      } else if (navigator.share) {
        await navigator.share({ title: 'Let me know you got there', text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }
    } catch {
      // Closing the share sheet is not an error
    }
  };

  const make = async () => {
    setProblem(null);
    if (!name.trim()) {
      setProblem(createProblemWords('name'));
      return;
    }
    const read = readContactPhone(phone);
    if (!read.ok) {
      setProblem(createProblemWords('phone'));
      return;
    }
    setBusy(true);
    try {
      const made = await createTripRequest(name.trim(), read.phoneE164);
      if (!made.ok) {
        setProblem(createProblemWords(made.problem));
        return;
      }
      const url = askLink(made.id);
      setLink(url);
      await send(url);
    } catch {
      setProblem('Could not make the link. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(askMessage(link));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Some web views refuse the clipboard; sending still works
    }
  };

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white';

  return (
    <div className="fixed inset-0 z-50 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="ask-to-know-title">
      <div className="absolute inset-x-0 bottom-0 top-20 bg-white dark:bg-slate-900 rounded-t-3xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 id="ask-to-know-title" className="text-lg font-bold text-slate-900 dark:text-white">Let me know you got there</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 -m-2 text-slate-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="flex gap-3">
            <span className="w-11 h-11 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200 flex items-center justify-center flex-shrink-0">
              <HeartHandshake className="w-6 h-6" aria-hidden="true" />
            </span>
            <p className="text-sm text-slate-700 dark:text-slate-200">
              Send someone a link. When they open it, WakaGuard asks if they want to start a trip with you as their
              contact. If they don&apos;t arrive on time, you get a text with where their phone was last. Nothing is
              sent to you until they start a trip.
            </p>
          </div>

          {!link ? (
            <>
              <label className="block">
                <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1.5">Your name, as they know you</span>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="name" className={inputClass} />
              </label>
              <label className="block">
                <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1.5">Your phone number</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Nigerian mobile number"
                  className={inputClass}
                />
                <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1">
                  They see it when they open the link, so they can add you as a contact.
                </span>
              </label>
              {problem && <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-300">{problem}</p>}
              <button
                type="button"
                onClick={() => void make()}
                disabled={busy}
                className="w-full min-h-12 rounded-2xl bg-brand-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {busy && <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />}
                Make the link and send it
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <p className="flex items-center gap-2 font-semibold text-brand-800 dark:text-brand-200">
                <Check className="w-5 h-5" aria-hidden="true" /> Your link is ready
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">It works for 7 days. Send it to everyone you want to hear from.</p>
              <button type="button" onClick={() => void send(link)} className="w-full min-h-12 rounded-2xl bg-brand-600 text-white font-semibold">
                Send it
              </button>
              <button
                type="button"
                onClick={() => void copy()}
                className="w-full min-h-12 rounded-2xl border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 font-semibold"
              >
                {copied ? 'Copied' : 'Copy the message'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
