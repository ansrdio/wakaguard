import { HeartHandshake } from 'lucide-react';

/**
 * A "Let me know you got there" link (build 29) opened in a browser: on a
 * phone without the app, or a computer. Who asked is not shown here; the
 * app shows it once the person is signed in (lib/tripRequestLink.ts).
 */
export function AskLinkNotice({
  openAppHref,
  browserHref,
}: {
  /** Opens the phone app, on a phone */
  openAppHref?: string;
  /** The web app, with the request */
  browserHref: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
      <div className="max-w-sm w-full">
        <span className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center mx-auto">
          <HeartHandshake className="w-7 h-7" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-slate-900">Someone asked you to let them know when you get there</h1>
        <p className="mt-2 text-slate-700">
          Start a WakaGuard trip with them as your contact. If you don&apos;t arrive on time, they get a text with where
          your phone was last. When you arrive, they get a text that you got there.
        </p>
        {openAppHref && (
          <a href={openAppHref} className="mt-5 block w-full py-3.5 bg-brand-600 text-white rounded-2xl font-bold hover:bg-brand-700">
            Open WakaGuard
          </a>
        )}
        <a
          href={browserHref}
          className={openAppHref
            ? 'mt-3 block w-full py-3 text-sm font-semibold text-blue-700 hover:text-blue-900'
            : 'mt-5 block w-full py-3.5 bg-brand-600 text-white rounded-2xl font-bold hover:bg-brand-700'}
        >
          {openAppHref ? "I don't have the app: use WakaGuard in this browser" : 'Continue to WakaGuard'}
        </a>
      </div>
    </div>
  );
}
