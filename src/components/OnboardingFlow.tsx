'use client';

import { useState, useEffect } from 'react';
import { OnboardingTutorial } from './OnboardingTutorial';
import { Bell, BellOff, Loader2, ChevronRight, Mail, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { auth } from '@/lib/firebase';
import { askToShowNotifications } from '@/lib/nativeNotifications';

type OnboardingStep = 'tutorial' | 'notifications' | 'auth';
type AuthMode = 'signin' | 'signup' | 'reset';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStep>('tutorial');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [requestingPermission, setRequestingPermission] = useState(false);
  const isNative = Capacitor.isNativePlatform();
  
  // Auth state
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);


  const handleTutorialComplete = () => {
    // Notifications only exist in the phone app, so a browser goes straight to sign-in
    setStep(isNative ? 'notifications' : 'auth');
  };

  const requestNotificationPermission = async () => {
    if (!isNative) {
      setStep('auth');
      return;
    }

    // The web page's Notification API does not exist inside the apps, so this
    // goes through the native plugin
    setRequestingPermission(true);
    try {
      const allowed = await askToShowNotifications();
      setNotificationPermission(allowed ? 'granted' : 'denied');
    } finally {
      setRequestingPermission(false);
      // Move on whatever the answer was
      setStep('auth');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setAuthLoading(false);
      setAuthError('Request timed out. Please try again.');
    }, 15000);

    try {
      if (authMode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password);
        clearTimeout(timeoutId);
        handleAuthComplete();
      } else if (authMode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Send verification email
        await sendEmailVerification(userCredential.user);
        clearTimeout(timeoutId);
        // Creating the account signs the person in. Go on to "Check your
        // email" rather than back to a sign-in form headed "Welcome back" for
        // an account they are already in.
        handleAuthComplete();
      } else if (authMode === 'reset') {
        await sendPasswordResetEmail(auth, email);
        clearTimeout(timeoutId);
        setAuthSuccess('Password reset email sent! Check your inbox.');
        setAuthMode('signin');
        setAuthLoading(false);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Auth error:', err);
      const errorMessages: Record<string, string> = {
        'auth/invalid-email': 'Invalid email address',
        'auth/user-disabled': 'This account has been disabled',
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/invalid-credential': 'Invalid email or password',
        'auth/email-already-in-use': 'An account already exists with this email',
        'auth/weak-password': 'Password should be at least 6 characters',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
        'auth/network-request-failed': 'Network error. Check your connection.',
      };
      setAuthError(errorMessages[err.code] || `Error: ${err.message || 'Please try again.'}`);
      setAuthLoading(false);
    }
  };


  const handleAuthComplete = () => {
    localStorage.setItem('wakaguard_onboarding_complete', 'true');
    onComplete();
  };

  // Allow users to continue as guest (view-only mode)
  const handleContinueAsGuest = () => {
    localStorage.setItem('wakaguard_onboarding_complete', 'true');
    onComplete();
  };

  // Tutorial step
  if (step === 'tutorial') {
    return <OnboardingTutorial onComplete={handleTutorialComplete} />;
  }

  // Notification permission step
  if (step === 'notifications') {
    return (
      <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-900 flex flex-col overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center w-full max-w-md mx-auto">
          <div className="w-24 h-24 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center mb-8">
            <Bell className="w-11 h-11" aria-hidden="true" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
            {isNative ? 'Allow notifications' : 'Notifications'}
          </h1>

          {isNative ? (
            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              While a trip is running, WakaGuard keeps a notification on your phone, so you remember to end the
              trip when you arrive.
            </p>
          ) : (
            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Notifications are part of the phone app.
            </p>
          )}
        </div>

        <div className="px-6 pt-6 w-full max-w-md mx-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}>
          {isNative ? (
            <>
              <button
                onClick={requestNotificationPermission}
                disabled={requestingPermission}
                className="w-full py-4 bg-brand-600 text-white rounded-2xl font-bold text-lg hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {requestingPermission ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bell className="w-5 h-5" aria-hidden="true" />}
                Allow notifications
              </button>
              <button
                onClick={() => setStep('auth')}
                className="w-full mt-2 py-3 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              >
                Not now
              </button>
            </>
          ) : (
            <button
              onClick={() => setStep('auth')}
              className="w-full py-4 bg-brand-600 text-white rounded-2xl font-bold text-lg hover:bg-brand-700 transition-colors"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    );
  }

  // Auth step
  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md my-auto py-8">
        {/* Logo */}
        <div className="w-20 h-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Image 
            src="/icons/icon-96x96.png" 
            alt="WakaGuard" 
            width={56} 
            height={56}
            className="rounded-lg"
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-2">
          {authMode === 'signin' ? 'Welcome back' : authMode === 'signup' ? 'Create your account' : 'Reset your password'}
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-center mb-6">
          {authMode === 'signin'
            ? 'Sign in to start a safe trip'
            : authMode === 'signup'
              ? 'You need an account so your contacts can be told about your trips'
              : 'Enter your email and we will send you a reset link'}
        </p>

        {/* Auth Card */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm p-6">
          {/* Error/Success Messages */}
          {authError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{authError}</p>
            </div>
          )}
          {authSuccess && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400">{authSuccess}</p>
            </div>
          )}

          {/* Email Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
            </div>

            {authMode !== 'reset' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full px-4 py-3 pr-12 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-slate-400" />
                    ) : (
                      <Eye className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 text-white rounded-2xl hover:bg-brand-700 transition-colors font-semibold disabled:opacity-50"
            >
              {authLoading && <Loader2 className="w-5 h-5 animate-spin" />}
              {authMode === 'signin' ? 'Sign in' : authMode === 'signup' ? 'Create account' : 'Send reset email'}
            </button>
          </form>

          {/* Mode Switchers */}
          <div className="mt-5 text-center space-y-2">
            {authMode === 'signin' && (
              <>
                <button
                  onClick={() => { setAuthMode('reset'); setAuthError(null); }}
                  className="text-sm text-brand-700 dark:text-brand-300 hover:underline"
                >
                  Forgot password?
                </button>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Don&apos;t have an account?{' '}
                  <button
                    onClick={() => { setAuthMode('signup'); setAuthError(null); }}
                    className="text-brand-700 dark:text-brand-300 font-medium hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              </>
            )}
            {authMode === 'signup' && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Already have an account?{' '}
                <button
                  onClick={() => { setAuthMode('signin'); setAuthError(null); }}
                  className="text-brand-700 dark:text-brand-300 font-medium hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
            {authMode === 'reset' && (
              <button
                onClick={() => { setAuthMode('signin'); setAuthError(null); }}
                className="text-sm text-brand-700 dark:text-brand-300 hover:underline"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>

        {/* Continue as Guest option */}
        <div className="w-full mt-6 text-center">
          <button
            onClick={handleContinueAsGuest}
            disabled={authLoading}
            className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-sm underline transition-colors disabled:opacity-50"
          >
            Look around without an account
          </button>
          <p className="mt-2 text-slate-500 dark:text-slate-400 text-xs">
            You need an account to start a trip or alert your contacts
          </p>
        </div>
      </div>
    </div>
  );
}

export function useOnboardingStatus() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem('wakaguard_onboarding_complete');
      setShowOnboarding(!completed);
      setChecked(true);
    }
  }, []);

  const completeOnboarding = () => {
    setShowOnboarding(false);
  };

  return { showOnboarding, completeOnboarding, checked };
}
