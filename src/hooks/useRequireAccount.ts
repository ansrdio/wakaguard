'use client';

import { useCallback, useState } from 'react';

interface RequireAccountArgs {
  uid: string | null;
  isAnonymous: boolean;
}

export function useRequireAccount({ uid, isAnonymous }: RequireAccountArgs) {
  const [showAuthModal, setShowAuthModal] = useState(false);

  const openAuthModal = useCallback(() => {
    setShowAuthModal(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setShowAuthModal(false);
  }, []);

  const requireAccount = useCallback(
    (_actionName?: string) => {
      if (!uid || isAnonymous) {
        setShowAuthModal(true);
        return false;
      }
      return true;
    },
    [uid, isAnonymous]
  );

  return { requireAccount, showAuthModal, openAuthModal, closeAuthModal };
}
