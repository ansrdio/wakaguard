'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { Ban } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';

/**
 * The people this person has blocked, with a way to undo each one. Shown by
 * username where the person has one.
 */
export function BlockedPeople({ onShowToast }: { onShowToast?: (message: string, type: 'success' | 'error') => void }) {
  const { blockedUids, loading, blocking, unblockUser } = useBlockedUsers();
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let current = true;
    const unknown = blockedUids.filter((blocked) => !(blocked in names));
    if (unknown.length === 0) return;
    void Promise.all(unknown.map(async (blocked) => {
      try {
        const found = await getDocs(query(collection(db, 'usernames'), where('uid', '==', blocked), limit(1)));
        return [blocked, found.docs[0]?.id ?? ''] as const;
      } catch {
        return [blocked, ''] as const;
      }
    })).then((pairs) => {
      if (current) setNames((known) => ({ ...known, ...Object.fromEntries(pairs) }));
    });
    return () => {
      current = false;
    };
  }, [blockedUids, names]);

  const unblock = async (blocked: string) => {
    const result = await unblockUser(blocked);
    onShowToast?.(result.success ? 'Unblocked' : result.error || 'Could not unblock', result.success ? 'success' : 'error');
  };

  return (
    <div className="p-4 bg-slate-50 rounded-xl">
      <div className="flex items-center gap-3">
        <Ban className="w-5 h-5 text-slate-600" aria-hidden="true" />
        <span className="font-medium text-slate-900">Blocked people</span>
      </div>
      {loading ? (
        <p className="mt-2 text-sm text-slate-600">Loading…</p>
      ) : blockedUids.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">
          You have not blocked anyone. To block someone, open one of their reports or comments.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-200">
          {blockedUids.map((blocked, index) => (
            <li key={blocked} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm text-slate-800 truncate">{names[blocked] || `Blocked person ${index + 1}`}</span>
              <button
                type="button"
                onClick={() => void unblock(blocked)}
                disabled={blocking}
                className="px-3 py-1.5 text-sm font-semibold text-blue-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-60"
              >
                Unblock
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
