import { Check } from 'lucide-react';
import { MESSAGE_LOG_DAYS_AFTER_DELETION } from '@/lib/dataRetention';

/** Shown once, on the page that loads after an account has been deleted. */
export function AccountDeletedNotice({ onDone }: { onDone: () => void }) {
  return (
    <div role="status" className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
      <div className="max-w-sm w-full">
        <span className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center mx-auto">
          <Check className="w-7 h-7" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-slate-900">Your account has been deleted</h1>
        <p className="mt-2 text-slate-700">
          Your profile, contacts, trips and reports are gone. The record of texts sent to your contacts will be
          deleted in {MESSAGE_LOG_DAYS_AFTER_DELETION} days.
        </p>
        <button
          type="button"
          onClick={onDone}
          className="mt-5 w-full py-3.5 bg-brand-600 text-white rounded-2xl font-bold hover:bg-brand-700"
        >
          Done
        </button>
      </div>
    </div>
  );
}
