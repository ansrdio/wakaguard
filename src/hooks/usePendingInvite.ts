'use client';

import { useEffect } from 'react';
import { forgetInviter, nameInviter, pendingInviter } from '@/lib/referrals';

/**
 * Sends "Who invited you?" to the server once the account is ready: typed
 * when choosing a username, or kept from an invite link opened on the
 * website. A definite answer (saved, or refused) clears it; a failed call
 * leaves it for the next start.
 */
export function usePendingInvite(uid: string | null, ready: boolean): void {
  useEffect(() => {
    if (!uid || !ready) return;
    const pending = pendingInviter();
    if (!pending) return;
    nameInviter(pending.name, pending.via)
      .then(() => forgetInviter())
      .catch((err) => console.warn('Could not send who invited you; trying again next time', err));
  }, [uid, ready]);
}
