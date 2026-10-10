import type { Metadata } from 'next';
import { EmailLinkPage } from '@/components/EmailLinkPage';

export const metadata: Metadata = {
  title: 'WakaGuard',
  robots: { index: false },
  // The address holds a one-time code; it should not travel on to any page opened from here
  referrer: 'no-referrer',
};

/**
 * Where the links in WakaGuard's emails lead, once Firebase's "Customize
 * action URL" setting points here: it verifies the email address, or takes a
 * new password, and then sends the person back to where they use WakaGuard
 * (see lib/emailLinks.ts).
 */
export default function ConfirmPage() {
  return <EmailLinkPage />;
}
