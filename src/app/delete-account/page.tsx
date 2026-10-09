import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { COMPANY_NAME, COMPANY_RC_NUMBER, CONTACT_EMAIL } from '@/lib/company';
import { MESSAGE_LOG_DAYS_AFTER_DELETION } from '@/lib/dataRetention';
import { OPEN_APP_HREF } from '@/lib/frontPage';

export const metadata: Metadata = {
  title: 'Delete your WakaGuard account',
  description:
    'How to delete your WakaGuard account and the data held with it, what is deleted, and what is kept and for how long.',
};

const DELETED = [
  'Your sign-in: your email address and password',
  'Your profile and username',
  'Your trusted contacts',
  'Your trips: destinations, times, positions and trip links',
  'SOS alerts and checkpoint stops you logged',
  'Road reports, photos, comments and votes you posted',
  'Your notification settings',
];

/**
 * How to delete an account, for someone who is not in the app: the address
 * the app stores ask for, and the one the privacy policy points to. What it
 * says is deleted and kept has to match functions/src/accountDeletion.ts.
 */
export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icons/icon-48x48.png" alt="" width={28} height={28} className="rounded-lg" />
            <span className="text-lg font-bold">WakaGuard</span>
          </Link>
          <Link
            href={OPEN_APP_HREF}
            className="px-4 py-2 bg-brand-600 text-white rounded-full text-sm font-semibold hover:bg-brand-700"
          >
            Open the app
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        <section>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">Delete your WakaGuard account</h1>
          <p className="mt-4 text-lg text-slate-700">
            You can delete your account, and the data held with it, at any time. It takes about a minute and you
            do not need to contact us.
          </p>
          <p className="mt-3 text-slate-700">
            WakaGuard is a product of <strong>{COMPANY_NAME}</strong> (RC {COMPANY_RC_NUMBER}).
          </p>
        </section>

        <section aria-labelledby="how" className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <h2 id="how" className="text-2xl font-bold mb-3">How to delete it</h2>
          <ol className="list-decimal pl-5 space-y-2 text-slate-700">
            <li>Open WakaGuard on your phone, or sign in at wakaguard.com.</li>
            <li>
              On a phone, open <strong>Profile</strong> and tap <strong>Delete account</strong>. On the website,
              open the account menu at the top right and choose <strong>Delete account</strong>.
            </li>
            <li>Enter your password and confirm.</li>
          </ol>
          <p className="mt-4 text-sm text-slate-600">
            If a trip is running, end it first. If you have forgotten your password, use &quot;Forgot
            password?&quot; on the sign-in screen to set a new one, then delete your account.
          </p>
        </section>

        <section aria-labelledby="deleted">
          <h2 id="deleted" className="text-2xl font-bold mb-3">What is deleted</h2>
          <p className="text-slate-700">All of this is deleted straight away, and cannot be brought back:</p>
          <ul className="mt-3 list-disc pl-5 space-y-1.5 text-slate-700">
            {DELETED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="kept">
          <h2 id="kept" className="text-2xl font-bold mb-3">What is kept, and for how long</h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li>
              The record of texts WakaGuard sent to your contacts (the contact&apos;s name and number, the message
              and the time) is kept for <strong>{MESSAGE_LOG_DAYS_AFTER_DELETION} days</strong>, in case a contact
              disputes a message or a bill from our SMS provider needs checking. It is then deleted automatically.
            </li>
            <li>
              Our SMS provider and the mobile networks keep their own records of the texts they delivered, under
              their own policies.
            </li>
          </ul>
        </section>

        <section aria-labelledby="some">
          <h2 id="some" className="text-2xl font-bold mb-3">Deleting some data and keeping your account</h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li>You can remove a trusted contact in the app at any time.</li>
            <li>
              To have a report, comment or photo removed, or to ask for a copy of your data, write to{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-700 hover:underline">{CONTACT_EMAIL}</a>.
            </li>
          </ul>
        </section>

        <section aria-labelledby="cannot">
          <h2 id="cannot" className="text-2xl font-bold mb-3">If you cannot sign in</h2>
          <p className="text-slate-700">
            Write to{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-700 hover:underline">{CONTACT_EMAIL}</a>{' '}
            from the email address on the account, with the subject &quot;Delete my WakaGuard account&quot;. We
            will confirm the account is yours and delete it within 30 days.
          </p>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-slate-600">
          <p>WakaGuard is a product of {COMPANY_NAME}.</p>
          <nav aria-label="More about WakaGuard" className="flex gap-4">
            <Link href="/about" className="hover:underline">About</Link>
            <Link href="/privacy" className="hover:underline">Privacy policy</Link>
            <Link href="/support" className="hover:underline">Support</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
