import { APP_URL } from '@/lib/appUrl';

/** Said when someone tries to create an account without ticking the box */
export const TERMS_NOT_AGREED = 'Tick the box to agree to the Terms of Use before creating your account.';

/**
 * The box a new person ticks to agree to the Terms of Use and Privacy Policy.
 * The links open the pages on the website in a new window, so whatever has
 * been typed into the form is not lost.
 */
export function TermsAgreement({ agreed, onChange }: { agreed: boolean; onChange: (agreed: boolean) => void }) {
  const link = 'font-semibold text-blue-700 underline';
  return (
    <label className="flex items-start gap-3 text-sm text-slate-700 text-left">
      <input
        type="checkbox"
        checked={agreed}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 w-5 h-5 flex-shrink-0 accent-green-700"
      />
      <span>
        I am 18 or older and I agree to the{' '}
        <a href={`${APP_URL}/terms`} target="_blank" rel="noopener noreferrer" className={link}>Terms of Use</a>
        {' '}and{' '}
        <a href={`${APP_URL}/privacy`} target="_blank" rel="noopener noreferrer" className={link}>Privacy Policy</a>.
      </span>
    </label>
  );
}
