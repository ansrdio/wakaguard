'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { Eye, EyeOff, Loader2, TriangleAlert } from 'lucide-react';
import { AppLoader } from '@/components/AppLoader';
import { EmailDoneNotice } from '@/components/EmailDoneNotice';
import { APP_URL } from '@/lib/appUrl';
import { emailLinkFrom, openPhoneAppHref, type EmailTask } from '@/lib/emailLinks';
import { auth } from '@/lib/firebase';
import { OPEN_APP_HREF, usedHereBefore } from '@/lib/frontPage';

// None of these change while the page is open
const neverChanges = () => () => {};
const notKnownYet = () => null;
const addressSays = () => window.location.search;
const onAPhone = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// Firebase's own page for these links, which Hosting serves on our address too
const FIREBASE_PAGE = '/__/auth/action';

type Stage =
  | { at: 'working' }
  | { at: 'new-password'; email: string }
  | { at: 'done' }
  | { at: 'failed'; why: 'used' | 'offline' | 'other' };

function whyItFailed(error: unknown): 'used' | 'offline' | 'other' {
  const code = (error as { code?: string })?.code ?? '';
  if (code === 'auth/invalid-action-code' || code === 'auth/expired-action-code') return 'used';
  if (code === 'auth/network-request-failed') return 'offline';
  return 'other';
}

const FAILED: Record<'used' | 'offline' | 'other', (task: EmailTask) => { title: string; text: string }> = {
  used: (task) => ({
    title: 'This link has expired or was already used',
    text:
      task === 'verify'
        ? 'If you have already verified your email, go back to WakaGuard. If not, open WakaGuard and tap "Send the email again".'
        : 'Open WakaGuard and ask for a new password reset email.',
  }),
  offline: () => ({
    title: 'Could not reach WakaGuard',
    text: 'Check your connection, then try again.',
  }),
  other: () => ({
    title: 'Something went wrong',
    text: 'Try the link again. If it keeps happening, open WakaGuard and ask for a new email.',
  }),
};

export function EmailLinkPage() {
  // Only known in the browser; the built page holds the loader
  const search = useSyncExternalStore<string | null>(neverChanges, addressSays, notKnownYet);
  const phone = useSyncExternalStore<boolean | null>(neverChanges, onAPhone, notKnownYet);
  const link = search === null ? undefined : emailLinkFrom(search, APP_URL);

  const [stage, setStage] = useState<Stage>({ at: 'working' });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // The code in the link works once, so the page must ask once
  const asked = useRef(false);
  useEffect(() => {
    if (!link || asked.current) return;
    asked.current = true;

    if (link.task === 'other') {
      window.location.replace(`${FIREBASE_PAGE}${window.location.search}`);
      return;
    }
    const failed = (error: unknown) => setStage({ at: 'failed', why: whyItFailed(error) });
    if (link.task === 'verify') {
      applyActionCode(auth, link.code).then(() => {
        // Someone who uses WakaGuard in this browser is signed in here: straight back in
        if (usedHereBefore()) window.location.replace(OPEN_APP_HREF);
        else setStage({ at: 'done' });
      }, failed);
    } else {
      verifyPasswordResetCode(auth, link.code).then((email) => setStage({ at: 'new-password', email }), failed);
    }
  }, [link]);

  if (link === undefined) return <AppLoader />;

  if (link === null) {
    return (
      <Problem
        title="This link is not complete"
        text="Open the email again and tap the link there. If your mail app cut it short, copy the whole address into your browser."
      />
    );
  }
  if (link.task === 'other') return <AppLoader />;

  if (stage.at === 'working') return <AppLoader />;

  if (stage.at === 'failed') {
    const words = FAILED[stage.why](link.task);
    return (
      <Problem
        title={words.title}
        text={words.text}
        onRetry={stage.why === 'used' ? undefined : () => window.location.reload()}
      />
    );
  }

  if (stage.at === 'done') {
    return (
      <EmailDoneNotice
        task={link.task}
        openAppHref={link.appOpens && phone ? openPhoneAppHref(link.task) : undefined}
        onUseBrowser={() => window.location.assign(OPEN_APP_HREF)}
      />
    );
  }

  const saveNewPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    setSaving(true);
    try {
      await confirmPasswordReset(auth, link.code, password);
      setPassword('');
      setStage({ at: 'done' });
    } catch (error) {
      const code = (error as { code?: string })?.code ?? '';
      if (code === 'auth/weak-password') setPasswordError('Password should be at least 6 characters');
      else if (whyItFailed(error) === 'offline') setPasswordError('Could not reach WakaGuard. Check your connection and try again.');
      else setStage({ at: 'failed', why: whyItFailed(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <form onSubmit={saveNewPassword} className="max-w-sm w-full">
        <h1 className="text-xl font-bold text-slate-900">Choose a new password</h1>
        <p className="mt-2 text-slate-700 break-words">
          For your WakaGuard account, <span className="font-semibold">{stage.email}</span>
        </p>

        <label htmlFor="new-password" className="mt-5 block text-sm font-semibold text-slate-900">
          New password
        </label>
        <div className="mt-1 relative">
          <input
            id="new-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
            className="w-full px-4 py-3 pr-12 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
          <button
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-800"
          >
            {showPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-600">At least 6 characters.</p>

        {passwordError && (
          <p role="alert" className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {passwordError}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-5 w-full py-3.5 bg-brand-600 text-white rounded-2xl font-bold hover:bg-brand-700 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />}
          Save new password
        </button>
      </form>
    </div>
  );
}

function Problem({ title, text, onRetry }: { title: string; text: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
      <div className="max-w-sm w-full">
        <span className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <TriangleAlert className="w-7 h-7" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-slate-700">{text}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 w-full py-3.5 bg-brand-600 text-white rounded-2xl font-bold hover:bg-brand-700"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
