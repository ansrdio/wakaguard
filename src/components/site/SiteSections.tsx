import { AlertTriangle, BellRing, Check, Mail, MapPin, Navigation } from 'lucide-react';
import { ALERT_GRACE_MINUTES } from '@/lib/tripPlanning';
import { COMPANY_ADDRESS, COMPANY_NAME, COMPANY_RC_NUMBER, CONTACT_EMAIL } from '@/lib/company';

/**
 * The parts of the public site that the front page and the About page share:
 * how WakaGuard works, the texts it sends and who runs it. Each is a section
 * with no width of its own, so the page decides the layout around it.
 */

const STEPS = [
  {
    icon: Navigation,
    title: 'Start a trip',
    text: 'Before you set off, say where you are going, how long it should take and who should be told.',
  },
  {
    icon: MapPin,
    title: 'Your phone reports where it is',
    text: 'While the trip runs, your phone sends its position. Anyone you send the trip link to can follow it on a map.',
  },
  {
    icon: Check,
    title: 'Arrive, and it ends',
    text: 'Tap "I\'ve arrived" and the trip closes. The trip link stops working.',
  },
  {
    icon: BellRing,
    title: "If you don't arrive",
    text: `You get a reminder first. If the trip is still running ${ALERT_GRACE_MINUTES} minutes after your arrival time, your contacts get a text with your last known location, even if your phone is off by then.`,
  },
];

/** What a contact receives when a traveller has not arrived. */
export const NOT_ARRIVED_TEXT =
  'Dear Tobi, WakaGuard: Ada has not checked in from a trip to Ibadan, due Tue 4:30 pm. Last location received Tue 4:12 pm: [map link] Track: [trip link] Please call them. Powered by Inskriba Ltd.';

// Written out from the server's templates so a reader can see what a contact receives
const TEXTS = [
  {
    when: 'A traveller shares a trip with a contact',
    example: 'Dear Tobi, WakaGuard: Ada is sharing a trip to Ibadan with you. Expected arrival Tue 4:30 pm. Follow it: [trip link] Powered by Inskriba Ltd.',
  },
  {
    when: 'A traveller has not arrived',
    example: NOT_ARRIVED_TEXT,
  },
  {
    when: 'A traveller presses SOS',
    example: 'Dear Tobi, WakaGuard SOS: Ada needs help. Location: [map link] Track: [trip link] Call them or 112. Powered by Inskriba Ltd.',
  },
  {
    when: 'A traveller tells a contact they are fine',
    example: 'Dear Tobi, WakaGuard: Ada checked in and is OK. Powered by Inskriba Ltd.',
  },
  {
    when: 'A traveller who was overdue checks in',
    example: 'Dear Tobi, WakaGuard: Ada has checked in and ended the trip safely. Powered by Inskriba Ltd.',
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works">
      <h2 id="how-it-works" className="text-2xl font-bold mb-4 scroll-mt-20">How it works</h2>
      <ol className="grid gap-4 sm:grid-cols-2">
        {STEPS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex items-start gap-4">
            <span className="w-11 h-11 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-bold">{title}</h3>
              <p className="text-sm text-slate-700 mt-1">{text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-4 bg-red-50 border border-red-200 rounded-3xl p-5 flex items-start gap-4">
        <span className="w-11 h-11 rounded-full bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="font-bold text-red-900">SOS</h3>
          <p className="text-sm text-red-900 mt-1">
            In danger, one button alerts your contacts straight away and offers to call 112. WakaGuard is not an
            emergency service and does not replace one.
          </p>
        </div>
      </div>
    </section>
  );
}

export function TextsWeSend() {
  return (
    <section aria-labelledby="texts">
      <h2 id="texts" className="text-2xl font-bold mb-2 scroll-mt-20">The text messages WakaGuard sends</h2>
      <p className="text-slate-700 max-w-2xl">
        WakaGuard texts only the contacts a traveller has chosen, and only about that traveller&apos;s own trip.
        It does not send marketing messages. Each one is addressed to the contact by name and ends with our company&apos;s name. They look like this:
      </p>
      <ul className="mt-4 bg-white rounded-3xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {TEXTS.map(({ when, example }) => (
          <li key={when} className="p-5">
            <p className="font-semibold">{when}</p>
            <p className="text-sm text-slate-700 mt-1 font-mono break-words">{example}</p>
          </li>
        ))}
      </ul>
      <p className="text-sm text-slate-600 mt-3">
        If you received one of these and do not want them, ask the person named in it to remove you from their
        contacts, or write to us at the address below.
      </p>
    </section>
  );
}

export function WhoRunsWakaGuard() {
  return (
    <section aria-labelledby="who" className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
      <h2 id="who" className="text-2xl font-bold mb-3 scroll-mt-20">Who runs WakaGuard</h2>
      <p className="text-slate-700">
        WakaGuard is built and run by {COMPANY_NAME}, a company registered with the Corporate Affairs Commission
        of Nigeria.
      </p>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
        <div>
          <dt className="text-slate-500">Company</dt>
          <dd className="font-semibold">{COMPANY_NAME}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Registration number</dt>
          <dd className="font-semibold">RC {COMPANY_RC_NUMBER}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-slate-500">Contact address</dt>
          <dd className="font-semibold">{COMPANY_ADDRESS}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-slate-500">Email</dt>
          <dd className="font-semibold">
            <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-1.5 text-brand-700 hover:underline">
              <Mail className="w-4 h-4" aria-hidden="true" />
              {CONTACT_EMAIL}
            </a>
          </dd>
        </div>
      </dl>
    </section>
  );
}
