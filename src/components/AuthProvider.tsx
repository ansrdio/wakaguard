'use client';

import { AppLoader } from '@/components/AppLoader';
import { useAuthedUser } from '@/hooks/useAuthedUser';
import { useDrawsBeforeAppStarts } from '@/lib/plainPages';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { ready } = useAuthedUser();
  const drawAtOnce = useDrawsBeforeAppStarts();

  // A page drawn at once shows the same thing to everyone, or does its own
  // waiting, so it is not held back for sign-in
  if (!ready && !drawAtOnce) {
    return <AppLoader />;
  }

  return <>{children}</>;
}
