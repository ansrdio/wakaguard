import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { HowItWorks, TextsWeSend, WhoRunsWakaGuard } from '@/components/site/SiteSections';
import { COMPANY_NAME, COMPANY_RC_NUMBER } from '@/lib/company';
import { OPEN_APP_HREF } from '@/lib/frontPage';

export const metadata: Metadata = {
  title: `About WakaGuard, a product of ${COMPANY_NAME}`,
  description:
    'WakaGuard is a travel-safety app for Nigeria. If you do not arrive when you said you would, it texts the people you chose with your last known location.',
};

/**
 * What WakaGuard is and who runs it, for someone who has not installed it:
 * a visitor, a reviewer, or a contact who received a text and wants to know
 * where it came from. The front page says the same to a first-time visitor;
 * this one is always here, whoever is looking.
 */
export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
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

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-12">
        <section>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
            If you don&apos;t arrive, the people you chose are told.
          </h1>
          <p className="mt-4 text-lg text-slate-700 max-w-2xl">
            WakaGuard is a travel-safety app for Nigeria. Start a trip before you set off. If you have not checked in
            by your arrival time, WakaGuard texts the people you chose with your last known location.
          </p>
          <p className="mt-4 text-slate-700">
            WakaGuard is a product of <strong>{COMPANY_NAME}</strong> (RC {COMPANY_RC_NUMBER}), a company registered
            in Nigeria.
          </p>
        </section>

        <HowItWorks />
        <TextsWeSend />
        <WhoRunsWakaGuard />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-slate-600">
          <p>WakaGuard is a product of {COMPANY_NAME}.</p>
          <nav aria-label="More about WakaGuard" className="flex gap-4">
            <Link href="/privacy" className="hover:underline">Privacy policy</Link>
            <Link href="/support" className="hover:underline">Support</Link>
            <Link href="/guidelines" className="hover:underline">Guidelines</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
