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
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
          <Mail className="w-12 h-12 text-blue-600" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-3">Verify Your Email</h1>

        {/* Description */}
        <p className="text-base text-white/80 leading-relaxed mb-2">
          We sent a verification link to:
        </p>
        <p className="text-lg font-semibold text-white mb-6">{email}</p>

        {/* Instructions */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6 text-left">
          <p className="text-white/90 text-sm mb-3">To complete your registration:</p>
          <ol className="space-y-2 text-white/80 text-sm list-decimal list-inside">
            <li>Check your email inbox (and spam folder)</li>
            <li>Click the verification link in the email</li>
            <li>Come back here and tap "I've Verified"</li>
          </ol>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-400/30 rounded-lg">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {sent && (
          <div className="mb-4 p-3 bg-green-500/20 border border-green-400/30 rounded-lg flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-300" />
            <p className="text-sm text-green-200">Verification email sent!</p>
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleRefresh}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-blue-600 rounded-xl font-medium hover:bg-blue-50 transition-colors"
          >
            <CheckCircle className="w-5 h-5" />
            I've Verified My Email
          </button>

          <button
            onClick={handleResendVerification}
            disabled={sending}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/20 text-white rounded-xl font-medium hover:bg-white/30 transition-colors disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
            Resend Verification Email
          </button>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-white/70 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
