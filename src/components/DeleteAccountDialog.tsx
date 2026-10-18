'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Loader2, X } from 'lucide-react';
import { confirmPassword, deleteAccount, type DeletionProblem } from '@/lib/accountDeletion';
import { useAreaAboveKeyboard } from '@/hooks/useAreaAboveKeyboard';
import { MESSAGE_LOG_DAYS_AFTER_DELETION } from '@/lib/dataRetention';
import { auth } from '@/lib/firebase';
import { accountProviders, confirmWithSocial, PROVIDER_NAMES, SOCIAL_PROBLEM_TEXT } from '@/lib/socialSignIn';

const PASSWORD_PROBLEMS: Record<DeletionProblem, string> = {
  'wrong-password': 'That password is not right. Try again.',
  'too-many-attempts': 'Too many tries. Wait a few minutes and try again.',
  offline: 'No connection. Check your internet and try again.',
  'trip-running': 'End your trip first, then delete your account.',
  failed: 'That did not work. Please try again.',
};

/**
 * Asks whether to delete the account, and for the password again. Once the
 * password is right the deletion itself takes over the whole screen (see
 * AccountDeletionScreen), so this dialog only ever shows password problems.
 */
export function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [checking, setChecking] = useState(false);
  const [problem, setProblem] = useState<DeletionProblem | null>(null);
  // An account made with Google or Apple has no password: it is confirmed by signing in with that again
  const [socialProblem, setSocialProblem] = useState<string | null>(null);
  const signsInWith = accountProviders((auth.currentUser?.providerData ?? []).map((p) => p.providerId));
  const confirmBy = signsInWith.password ? null : signsInWith.social[0] ?? null;

  const confirmSocially = async () => {
    if (!confirmBy || checking) return;
    setChecking(true);
    setSocialProblem(null);
    const failed = await confirmWithSocial(confirmBy);
    if (failed) {
      setSocialProblem(failed === 'cancelled'
        ? `Not deleted. Sign in with ${PROVIDER_NAMES[confirmBy]} to confirm it is you.`
        : SOCIAL_PROBLEM_TEXT[failed](PROVIDER_NAMES[confirmBy]));
      setChecking(false);
      return;
    }
    void deleteAccount();
  };

  // On an iPhone the keyboard comes up over the lower half of the dialog,
  // which is where the password goes. The dialog keeps to the part of the
  // screen still in view, and brings the field to the middle of it.
  const aboveKeyboard = useAreaAboveKeyboard();
  const backdrop = useRef<HTMLDivElement>(null);
  const passwordField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const box = backdrop.current;
    const field = passwordField.current;
    if (!aboveKeyboard || !box || !field || document.activeElement !== field) return;
    const fieldAt = field.getBoundingClientRect();
    const boxAt = box.getBoundingClientRect();
    box.scrollTop += fieldAt.top + fieldAt.height / 2 - (boxAt.top + boxAt.height / 2);
  }, [aboveKeyboard]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (confirmBy) {
      void confirmSocially();
      return;
    }
    if (!password || checking) return;

    setChecking(true);
    setProblem(null);
    const wrong = await confirmPassword(password);
    if (wrong) {
      setProblem(wrong);
      setChecking(false);
      return;
    }
    void deleteAccount();
  };

  return (
    <div
      ref={backdrop}
      // The form's own margins centre it while there is room, and let it start
      // at the top, where it can be scrolled, when there is not
      className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 overflow-y-auto"
      style={aboveKeyboard ? { top: aboveKeyboard.top, height: aboveKeyboard.height, bottom: 'auto' } : undefined}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 my-auto"
      >
        <div className="flex items-center justify-between">
          <h2 id="delete-account-title" className="text-xl font-bold text-slate-900">Delete your account?</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 text-slate-600 hover:bg-slate-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-700">This removes your account for good. It cannot be undone.</p>
        <ul className="text-sm text-slate-700 space-y-2 list-disc pl-5">
          <li>
            <strong>Deleted now:</strong> your profile, your contacts, your trips and where they went, and any road
            reports, comments and votes you posted.
          </li>
          <li>
            <strong>Kept for {MESSAGE_LOG_DAYS_AFTER_DELETION} days, then deleted:</strong> the record of texts
            WakaGuard sent to your contacts.
          </li>
        </ul>

        {confirmBy ? (
          <div>
            <p className="text-sm text-slate-900">To confirm it is you, sign in with {PROVIDER_NAMES[confirmBy]} once more.</p>
            {socialProblem && <p role="alert" className="mt-2 text-sm text-red-700">{socialProblem}</p>}
          </div>
        ) : (
        <div>
          <label htmlFor="delete-account-password" className="block text-sm font-medium text-slate-900 mb-1">
            Enter your password to confirm
          </label>
          <input
            id="delete-account-password"
            ref={passwordField}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={problem ? true : undefined}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          {problem && (
            <p role="alert" className="mt-2 text-sm text-red-700">{PASSWORD_PROBLEMS[problem]}</p>
          )}
        </div>
        )}

        <div className="space-y-2">
          <button
            type="submit"
            disabled={(!confirmBy && !password) || checking}
            className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {checking && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {confirmBy ? `Confirm with ${PROVIDER_NAMES[confirmBy]} and delete` : 'Delete my account'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-slate-100 text-slate-900 rounded-xl font-semibold hover:bg-slate-200"
          >
            Keep my account
          </button>
        </div>
      </form>
    </div>
  );
}
