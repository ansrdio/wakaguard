'use client';

import { useState } from 'react';
import { Mail, RefreshCw, LogOut, CheckCircle, Loader2 } from 'lucide-react';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface EmailVerificationProps {
  email: string;
}

export function EmailVerification({ email }: EmailVerificationProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResendVerification = async () => {
    if (!auth.currentUser) return;
    
    setSending(true);
    setError(null);
    
    try {
      await sendEmailVerification(auth.currentUser);
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } catch (err: any) {
      console.error('Error sending verification email:', err);
      if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a few minutes.');
      } else {
        setError('Failed to send verification email. Try again.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleRefresh = () => {
    // Reload the page to check if email is now verified
    window.location.reload();
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-900 flex flex-col overflow-y-auto">
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center w-full max-w-md mx-auto">
        <div className="w-24 h-24 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center mb-8">
          <Mail className="w-11 h-11" aria-hidden="true" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Check your email</h1>
        <p className="text-base text-slate-600 dark:text-slate-300">We sent a link to</p>
        <p className="text-lg font-semibold text-slate-900 dark:text-white mb-6 break-all">{email}</p>

        <ol className="w-full space-y-2 text-left text-sm text-slate-700 dark:text-slate-200 list-decimal list-inside bg-slate-50 dark:bg-slate-800 rounded-2xl p-4">
          <li>Open the email (look in spam too)</li>
          <li>Tap the link inside it</li>
          <li>Come back here and tap &quot;I&apos;ve verified&quot;</li>
        </ol>

        {error && (
          <div role="alert" className="w-full mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {sent && (
          <div role="status" className="w-full mt-4 p-3 bg-brand-50 border border-brand-200 rounded-xl flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4 text-brand-700" aria-hidden="true" />
            <p className="text-sm text-brand-800">Email sent again</p>
          </div>
        )}
      </div>

      <div className="px-6 pt-6 w-full max-w-md mx-auto space-y-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}>
        <button
          onClick={handleRefresh}
          className="w-full py-4 bg-brand-600 text-white rounded-2xl font-bold text-lg hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-5 h-5" aria-hidden="true" />
          I&apos;ve verified
        </button>

        <button
          onClick={handleResendVerification}
          disabled={sending}
          className="w-full py-3.5 rounded-2xl font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" aria-hidden="true" />}
          Send the email again
        </button>

        <button
          onClick={handleSignOut}
          className="w-full py-3 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </div>
  );
}
