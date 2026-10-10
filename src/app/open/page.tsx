import type { Metadata } from 'next';
import { BackToApp } from '@/components/BackToApp';

export const metadata: Metadata = {
  title: 'Back to WakaGuard',
  robots: { index: false },
};

/**
 * Where "Continue" leads after a link in an email the phone app sent. The
 * phones are told this address belongs to the app, so most people never see
 * this page: the app opens instead. It is drawn where a phone opened the
 * address in its browser anyway, and for someone who read the email on a
 * computer (see lib/emailLinks.ts).
 */
export default function OpenPage() {
  return <BackToApp />;
}
