'use client';

/**
 * "Continue with Apple" and "Continue with Google" (lib/socialSignIn.ts), at
 * the top of the sign-in and sign-up forms. Either can create an account in
 * one tap, so each needs the same "18 or older" tick as creating one with an
 * email; the form shows that tick above these buttons.
 */

import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Loader2 } from 'lucide-react';
import { useAppConfig } from '@/hooks/useAppConfig';
import { PROVIDER_NAMES, SOCIAL_PROBLEM_TEXT, SocialProvider, socialProvidersFor, signInWithSocial } from '@/lib/socialSignIn';

/** The sign-in buttons for this phone or browser; none until switched on in config/app */
export function useSocialProviders(): SocialProvider[] {
  const config = useAppConfig();
  return socialProvidersFor(Capacitor.getPlatform(), config?.signInWith ?? { google: false, apple: false });
}

export function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

export function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
      <path d="M16.37 1.43c0 1.14-.49 2.27-1.18 3.08-.74.9-1.99 1.57-2.99 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.57-2.27 1.21-2.98.8-.94 2.14-1.64 3.25-1.68.03.13.05.28.05.43zm4.56 15.71c-.03.07-.46 1.58-1.52 3.12-.94 1.34-1.94 2.71-3.43 2.71-1.52 0-1.9-.88-3.63-.88-1.7 0-2.3.91-3.67.91-1.38 0-2.33-1.26-3.43-2.8C4.97 18.38 3.93 15.57 3.93 12.92c0-4.28 2.8-6.55 5.55-6.55 1.45 0 2.68.95 3.6.95.87 0 2.22-1.01 3.9-1.01.61 0 2.89.06 4.37 2.19-.13.09-2.38 1.37-2.38 4.19 0 3.26 2.85 4.42 2.96 4.45z" />
    </svg>
  );
}

export function SocialSignInButtons({
  providers,
  agreed,
  onNeedAgreement,
  onSignedIn,
  onProblem,
  disabled = false,
}: {
  providers: SocialProvider[];
  agreed: boolean;
  /** Tapped without the tick */
  onNeedAgreement: () => void;
  onSignedIn: () => void;
  onProblem: (text: string | null) => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  if (providers.length === 0) return null;

  const go = async (provider: SocialProvider) => {
    if (!agreed) {
      onNeedAgreement();
      return;
    }
    setBusy(provider);
    onProblem(null);
    const result = await signInWithSocial(provider);
    setBusy(null);
    if (result.ok) onSignedIn();
    else if (result.problem !== 'cancelled') onProblem(SOCIAL_PROBLEM_TEXT[result.problem](PROVIDER_NAMES[provider]));
  };

  return (
    <div className="space-y-3">
      {providers.map((provider) => (
        <button
          key={provider}
          type="button"
          onClick={() => void go(provider)}
          disabled={disabled || busy !== null}
          className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-colors disabled:opacity-60 ${
            provider === 'apple'
              ? 'bg-black text-white hover:bg-slate-900'
              : 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 dark:bg-white dark:text-slate-800'
          }`}
        >
          {busy === provider ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : provider === 'apple' ? <AppleMark /> : <GoogleMark />}
          Continue with {PROVIDER_NAMES[provider]}
        </button>
      ))}
    </div>
  );
}

/** "or with your email", between the buttons and the email form */
export function OrWithEmail() {
  return (
    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400" aria-hidden="true">
      <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
      or with your email
      <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}
