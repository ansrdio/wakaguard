import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { COMPANY_ADDRESS, COMPANY_NAME, COMPANY_RC_NUMBER, CONTACT_EMAIL } from '@/lib/company';

export const metadata: Metadata = {
  title: 'Terms of Use - WakaGuard',
  description: 'The terms you agree to when you create a WakaGuard account.',
};

/** Shown on the page and changed whenever the terms change */
const LAST_UPDATED = '13 October 2026';

const SECTIONS: { title: string; paragraphs: string[]; points?: string[] }[] = [
  {
    title: '1. About these terms',
    paragraphs: [
      `WakaGuard is a product of ${COMPANY_NAME} (RC ${COMPANY_RC_NUMBER}), a company registered in Nigeria. "We" and "us" mean ${COMPANY_NAME}.`,
      'These terms apply whenever you use the WakaGuard app or website. By creating an account you agree to them. If you do not agree, please do not use WakaGuard.',
      'You must be 18 or older to create an account.',
    ],
  },
  {
    title: '2. What WakaGuard does',
    paragraphs: [
      'Before you travel, you start a trip and say when you expect to arrive. If you have not ended the trip by then, WakaGuard sends a text message to the trusted contacts you chose, with your name and your last known location. WakaGuard also shows road reports made by other travellers.',
    ],
  },
  {
    title: '3. WakaGuard is not an emergency service',
    paragraphs: [
      'WakaGuard does not send help. It does not contact the police, an ambulance, the fire service or any rescue service. It tells the people you chose; what they do next is up to them.',
      'If you are in danger, call 112 or your local emergency number.',
    ],
  },
  {
    title: '4. An alert can fail or arrive late',
    paragraphs: [
      'WakaGuard depends on things we do not control. An alert may be late, incomplete or may not arrive at all because of:',
    ],
    points: [
      'your phone being off, out of battery, damaged, or set to stop apps running in the background',
      'no mobile signal or data where you are',
      'location that is switched off, not allowed, or inaccurate',
      'the mobile networks that carry text messages, including a contact whose line blocks them',
      'a contact whose phone is off or who does not see the message',
    ],
  },
  {
    title: '5. Do not rely on WakaGuard alone',
    paragraphs: [
      'Treat WakaGuard as one extra precaution, not your only one. Tell someone your plans, and take the same care you would without the app.',
      'Never use your phone while driving or riding. Set up your trip before you move, and report road conditions only when it is safe to do so.',
    ],
  },
  {
    title: '6. Your account',
    paragraphs: [
      'Give a real email address, keep your password to yourself, and tell us if you think someone else has used your account. You are responsible for what is done with your account.',
    ],
  },
  {
    title: '7. Your trusted contacts',
    paragraphs: [
      'Only add people who have agreed to be your contact. They will receive text messages that carry your name and your location. By adding a contact you confirm that you have their permission to give us their name and phone number for this purpose.',
    ],
  },
  {
    title: '8. Road reports and comments',
    paragraphs: [
      'What you post can be seen by other people. You are responsible for it. When you post, you agree that you will not:',
    ],
    points: [
      'post a report you know to be false or misleading',
      'post anything abusive, hateful, threatening, sexual or unlawful',
      'post personal details about another person, such as their name, number plate with accusations, phone number or home',
      'post advertising or spam',
      'use reports to help anyone avoid the police or to cause harm',
    ],
  },
  {
    title: '9. What we may do with posts and accounts',
    paragraphs: [
      'You can report a post or a comment, and block the person who made it, from inside the app. We review reports and may remove any post, and suspend or close any account, that breaks these terms or our Community Guidelines.',
      'You keep ownership of what you post. You give us permission to store it, show it in WakaGuard and use it to improve the service. Road reports are opinions of the people who post them. We do not check each one and cannot promise that a report is accurate, or that a road with no report is safe.',
    ],
  },
  {
    title: '10. Your information',
    paragraphs: [
      'Our Privacy Policy explains what we collect, including your location during a trip, why, and how to ask for a copy or for deletion. It forms part of these terms.',
    ],
  },
  {
    title: '11. Changes and testing',
    paragraphs: [
      'WakaGuard is new and is still being tested. Features may change, stop working for a time, or be removed. We may also show messages from sponsors, which are always marked as such.',
    ],
  },
  {
    title: '12. Ending your use',
    paragraphs: [
      'You can stop using WakaGuard and delete your account at any time, from Profile in the app or from the Delete account page on our website. We may suspend or close an account that breaks these terms.',
    ],
  },
  {
    title: '13. Our responsibility to you',
    paragraphs: [
      'We provide WakaGuard with reasonable care, but without any promise that it will always be available or free of faults. As far as the law allows, we are not responsible for loss or harm that results from an alert that fails or is late, from a location that is wrong, from what other people post, or from how your contacts respond.',
      'Nothing in these terms takes away any right you have under Nigerian law that cannot be taken away by agreement.',
    ],
  },
  {
    title: '14. The law that applies',
    paragraphs: [
      'These terms are governed by the laws of the Federal Republic of Nigeria, and the courts of Nigeria will decide any dispute about them.',
    ],
  },
  {
    title: '15. Changes to these terms',
    paragraphs: [
      'When we change these terms we will change the date at the top and tell you in the app. If you keep using WakaGuard after a change, you accept the new terms.',
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Terms of Use</h1>
          </div>
          <p className="text-gray-600 mb-8">Last updated: {LAST_UPDATED}</p>

          {SECTIONS.map((section) => (
            <section key={section.title} className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-gray-700 leading-relaxed mb-4">{paragraph}</p>
              ))}
              {section.points && (
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  {section.points.map((point) => <li key={point}>{point}</li>)}
                </ul>
              )}
            </section>
          ))}

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Contact us</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              {COMPANY_NAME}, {COMPANY_ADDRESS}
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-700 underline">{CONTACT_EMAIL}</a>
            </p>
            <p className="text-gray-700">
              See also our <Link href="/privacy" className="text-blue-700 underline">Privacy Policy</Link> and{' '}
              <Link href="/guidelines" className="text-blue-700 underline">Community Guidelines</Link>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
