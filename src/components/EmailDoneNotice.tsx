import { Check } from 'lucide-react';
import type { EmailTaskDone } from '@/lib/emailLinks';

const WORDS: Record<EmailTaskDone, { done: string; next: string }> = {
  verify: {
    done: 'Your email is verified',
    next: 'Go back to the WakaGuard app and tap "I\'ve verified".',
  },
  reset: {
    done: 'Your password is changed',
    next: 'Go back to the WakaGuard app and sign in with your new password.',
  },
  unknown: {
    done: "That's done",
    next: 'Go back to the WakaGuard app to carry on. If it still asks you to check your email, tap "I\'ve verified".',
  },
};

/**
 * Shown to someone who has come back from the page an email link opens, in a
 * browser that has never run WakaGuard: they signed up in the phone app, and
 * that is where they should carry on.
 */
export function EmailDoneNotice({ task, onUseBrowser }: { task: EmailTaskDone; onUseBrowser: () => void }) {
  const words = WORDS[task];
  return (
    <div role="status" className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
      <div className="max-w-sm w-full">
        <span className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center mx-auto">
          <Check className="w-7 h-7" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-slate-900">{words.done}</h1>
        <p className="mt-2 text-slate-700">{words.next}</p>
        <p className="mt-2 text-sm text-slate-600">You can close this page.</p>
        <button
          type="button"
          onClick={onUseBrowser}
          className="mt-6 w-full py-3 text-sm font-semibold text-blue-700 hover:text-blue-900"
        >
          I use WakaGuard in this browser, not the app
        </button>
      </div>
    </div>
  );
}
