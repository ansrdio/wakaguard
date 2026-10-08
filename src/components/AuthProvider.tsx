'use client';

import { usePathname } from 'next/navigation';
import { useAuthedUser } from '@/hooks/useAuthedUser';
import { isPlainPage } from '@/lib/plainPages';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { uid, ready } = useAuthedUser();
  const plainPage = isPlainPage(usePathname());

  // A plain page shows the same thing to everyone, so it does not wait for sign-in
  if (!ready && !plainPage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
