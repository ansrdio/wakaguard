'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Check, Copy, Gift, Loader2, Share2, X } from 'lucide-react';
import {
  friendLine, inviteLink, inviteMessage, joinProblemText, loadReferralSummary, naira, nameInviter, PayTo,
  readInviteName, ReferralSummary, requestCashOut, shortDay,
} from '@/lib/referrals';

/**
 * Invite friends (build 27): the person's invite name and link, how each
 * friend they invited is getting on, what they have earned and Cash out.
 * Everything shown comes from the server (functions/src/referrals.ts).
 */
export function InviteFriends({ onClose }: { onClose: () => void }) {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  // Days left and "ready on" are worked out from when the screen loaded
  const [nowMs, setNowMs] = useState(0);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cashingOut, setCashingOut] = useState(false);

  const load = useCallback(() => {
    loadReferralSummary().then((loaded) => {
      setNowMs(Date.now());
      setSummary(loaded);
    }).catch((err) => {
      console.warn('Could not load Invite friends', err);
      setFailed(true);
    });
  }, []);
  useEffect(() => { load(); }, [load]);
  const retry = () => {
    setFailed(false);
    load();
  };

  const share = async (username: string) => {
    const text = inviteMessage(username);
    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({ title: 'Join me on WakaGuard', text, dialogTitle: 'Invite a friend' });
      } else if (navigator.share) {
        await navigator.share({ title: 'Join me on WakaGuard', text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }
    } catch {
      // Closing the share sheet is not an error
    }
  };

  const copy = async (username: string) => {
    try {
      await navigator.clipboard.writeText(inviteLink(username));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Some web views refuse the clipboard; Share still works
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className="absolute inset-x-0 bottom-0 top-20 bg-white dark:bg-slate-900 rounded-t-3xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Invite friends</h2>
          <button onClick={onClose} aria-label="Close" className="p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5 touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
          {!summary && !failed && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-brand-600 animate-spin" aria-label="Loading" />
            </div>
          )}

          {failed && !summary && (
            <div className="text-center py-12 space-y-3">
              <p className="text-slate-700 dark:text-slate-300">Invite friends could not load. Check your connection.</p>
              <button onClick={retry} className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-900 dark:text-white font-semibold">
                Try again
              </button>
            </div>
          )}

          {summary && (
            <>
              <section className="rounded-2xl bg-brand-50 dark:bg-brand-900/30 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-brand-700 dark:text-brand-300" aria-hidden="true" />
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Earn {naira(summary.rules.reward)} for each friend
                  </h3>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  When a friend you invite makes {summary.rules.tripsNeeded} real trips on {summary.rules.tripsNeeded} different
                  days in their first {summary.rules.windowDays} days, and adds a contact, you earn {naira(summary.rules.reward)}.
                  Take it as airtime or cash.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Your invite name</h3>
                {summary.username ? (
                  <>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">@{summary.username}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Friends type it under &ldquo;Who invited you?&rdquo; when they sign up, or use your link.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => share(summary.username!)}
                        className="flex-1 min-h-12 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold flex items-center justify-center gap-2"
                      >
                        <Share2 className="w-5 h-5" aria-hidden="true" />
                        Share invite
                      </button>
                      <button
                        onClick={() => copy(summary.username!)}
                        className="min-h-12 px-4 rounded-2xl border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-semibold flex items-center justify-center gap-2"
                      >
                        {copied ? <Check className="w-5 h-5" aria-hidden="true" /> : <Copy className="w-5 h-5" aria-hidden="true" />}
                        {copied ? 'Copied' : 'Copy link'}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-600">Choose a username first: it is your invite name.</p>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Your friends</h3>
                {summary.friends.length === 0 ? (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Nobody yet. When someone signs up with your name, they show here with how many trips they have made.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-200 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-2xl">
                    {summary.friends.map((friend, i) => (
                      <li key={`${friend.name}-${i}`} className="p-3 flex items-center gap-3">
                        <Dots done={friend.trips} of={summary.rules.tripsNeeded} earned={friend.state === 'qualified'} />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white truncate">
                            {friend.name ? `@${friend.name}` : 'A friend who left WakaGuard'}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-300">{friendLine(friend, summary.rules, nowMs)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <Money summary={summary} nowMs={nowMs} onCashOut={() => setCashingOut(true)} />

              {summary.canJoin && <WhoInvitedMe onSaved={load} />}
              {summary.invitedBy?.name && (
                <p className="text-sm text-slate-600 dark:text-slate-300">You were invited by @{summary.invitedBy.name}.</p>
              )}

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real trips are not tests, last 15 minutes or more, move about 1 km and end with &ldquo;I&rsquo;ve
                arrived&rdquo;. A friend on your phone, or on a phone that already earned a reward, does not count. At most{' '}
                {summary.rules.perPersonMonthly} friends a month are paid; any more are paid the next month. You see how
                many trips a friend has made, never where they went.{' '}
                <Link href="/terms#invite-friends" className="text-brand-700 underline">Full rules</Link>
              </p>
            </>
          )}
        </div>
      </div>

      {cashingOut && summary && (
        <CashOutForm
          amount={summary.balance.ready}
          onClose={() => setCashingOut(false)}
          onDone={() => { setCashingOut(false); load(); }}
        />
      )}
    </div>
  );
}

/** Trips done, one dot each */
function Dots({ done, of, earned }: { done: number; of: number; earned: boolean }) {
  return (
    <div className="flex gap-1 flex-shrink-0" aria-hidden="true">
      {Array.from({ length: of }, (_, i) => (
        <span
          key={i}
          className={`w-2.5 h-2.5 rounded-full ${earned || i < done ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700'}`}
        />
      ))}
    </div>
  );
}

function Money({ summary, nowMs, onCashOut }: { summary: ReferralSummary; nowMs: number; onCashOut: () => void }) {
  const { balance, cashOut } = summary;
  const why = cashOut.request
    ? `We are sending you ${naira(cashOut.request.amount)} ${cashOut.request.method === 'bank' ? 'by bank transfer' : 'as airtime'}. Payments go out once a week.`
    : cashOut.problem === 'not_open'
      ? `Cash out opens on ${shortDay(cashOut.opensMs)}.`
      : cashOut.problem === 'too_little'
        ? `You can cash out from ${naira(cashOut.minimum)}.`
        : null;

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Your money</h3>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Amount label="Waiting" value={balance.waiting} />
        <Amount label="Ready" value={balance.ready} />
        <Amount label="Paid" value={balance.paid} />
      </div>
      {balance.waiting > 0 && balance.nextReadyMs && balance.nextReadyMs > nowMs && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Money waits {summary.rules.holdDays} days after a friend&rsquo;s last trip, so we can check it. The next is ready on{' '}
          {shortDay(balance.nextReadyMs)}.
        </p>
      )}
      <button
        onClick={onCashOut}
        disabled={cashOut.problem !== null}
        className="w-full min-h-12 rounded-2xl border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-semibold disabled:opacity-50"
      >
        Cash out {balance.ready > 0 ? naira(balance.ready) : ''}
      </button>
      {why && <p className="text-sm text-slate-600 dark:text-slate-300">{why}</p>}
    </section>
  );
}

function Amount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
      <p className="text-lg font-bold text-slate-900 dark:text-white">{naira(value)}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

/** Within the first 7 days, someone who skipped "Who invited you?" can still add it */
function WhoInvitedMe({ onSaved }: { onSaved: () => void }) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const name = readInviteName(value);
    if (!name) {
      setError(`No one has the username ${value.trim().replace(/^@/, '')}. Check the spelling.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const answer = await nameInviter(name, 'typed');
      if (answer.ok) onSaved();
      else setError(joinProblemText(answer.problem, name));
    } catch {
      setError('That did not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-4">
      <label htmlFor="who-invited-me" className="block font-semibold text-slate-900 dark:text-white">Did someone invite you?</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">@</span>
          <input
            id="who-invited-me"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(null); }}
            placeholder="their username"
            maxLength={21}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full min-h-12 pl-8 pr-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button
          onClick={save}
          disabled={saving || !value.trim()}
          className="min-h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-semibold disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" aria-label="Saving" /> : 'Save'}
        </button>
      </div>
      {error && <p className="text-sm text-slate-900 dark:text-white">{error}</p>}
      <p className="text-xs text-slate-500 dark:text-slate-400">You can add this in your first 7 days.</p>
    </section>
  );
}

const field = 'w-full min-h-12 px-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500';

/** How to be paid. Bank details are asked for here only, and kept only until the payment is made */
function CashOutForm({ amount, onClose, onDone }: { amount: number; onClose: () => void; onDone: () => void }) {
  const [method, setMethod] = useState<'airtime' | 'bank'>('airtime');
  const [phone, setPhone] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const send = async () => {
    const payTo: PayTo = method === 'airtime'
      ? { method, phone }
      : { method, bankName, accountNumber, accountName };
    setSending(true);
    setError(null);
    try {
      const answer = await requestCashOut(payTo);
      if (answer.ok) setSent(true);
      else setError(answer.problem === 'details'
        ? (method === 'airtime'
          ? 'Enter a Nigerian mobile number, starting with 0 or +234.'
          : 'Enter the bank\'s name, a 10-digit account number and the name on the account.')
        : 'Cash out is not open for you right now. Close this to see why.');
    } catch {
      setError('That did not send. Check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cash out {naira(amount)}</h3>
          <button onClick={sent ? onDone : onClose} aria-label="Close" className="p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {sent ? (
          <>
            <p className="text-slate-700 dark:text-slate-300">
              Done. We send payments once a week, and this screen shows it as Paid when it has gone.
            </p>
            <button onClick={onDone} className="w-full min-h-12 rounded-2xl bg-brand-600 text-white font-semibold">OK</button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="How to be paid">
              {(['airtime', 'bank'] as const).map((choice) => (
                <button
                  key={choice}
                  role="radio"
                  aria-checked={method === choice}
                  onClick={() => { setMethod(choice); setError(null); }}
                  className={`min-h-12 rounded-xl border font-semibold ${method === choice
                    ? 'border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-900/30 dark:text-brand-200'
                    : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'}`}
                >
                  {choice === 'airtime' ? 'Airtime' : 'Bank transfer'}
                </button>
              ))}
            </div>

            {method === 'airtime' ? (
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone number for the airtime</span>
                <input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
              </label>
            ) : (
              <>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Bank</span>
                  <input value={bankName} onChange={(e) => setBankName(e.target.value)} maxLength={60} className={field} />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Account number (10 digits)</span>
                  <input inputMode="numeric" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} maxLength={12} className={field} />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Name on the account</span>
                  <input value={accountName} onChange={(e) => setAccountName(e.target.value)} maxLength={80} className={field} />
                </label>
              </>
            )}

            {error && <p className="text-sm text-slate-900 dark:text-white">{error}</p>}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              We use these details only to pay you. Once paid, we keep only the last 4 digits.
            </p>
            <button
              onClick={send}
              disabled={sending}
              className="w-full min-h-12 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {sending && <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />}
              Send my {naira(amount)}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
