'use client';

import { useRef, useState } from 'react';
import { doc, setDoc, getDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Check, X, AtSign } from 'lucide-react';

interface UsernameSetupProps {
  uid: string;
  onComplete: () => void;
}

export function UsernameSetup({ uid, onComplete }: UsernameSetupProps) {
  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  // What is in the box now. A check for an earlier, shorter name can finish
  // last, and must not mark the name on screen as available.
  const latestValue = useRef('');
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Validate username format
  const validateUsername = (value: string): string | null => {
    if (value.length < 3) return 'Username must be at least 3 characters';
    if (value.length > 20) return 'Username must be 20 characters or less';
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) {
      return 'Username must start with a letter and contain only letters, numbers, and underscores';
    }
    return null;
  };

  // Check username availability
  const checkAvailability = async (value: string) => {
    const validationError = validateUsername(value);
    if (validationError) {
      setError(validationError);
      setIsAvailable(null);
      return;
    }

    setChecking(true);
    setError(null);
    
    try {
      const usernameRef = doc(db, 'usernames', value.toLowerCase());
      const usernameSnap = await getDoc(usernameRef);
      if (latestValue.current !== value) return;

      if (usernameSnap.exists() && usernameSnap.data()?.uid !== uid) {
        setIsAvailable(false);
        setError('Username is already taken');
      } else {
        setIsAvailable(true);
        setError(null);
      }
    } catch (err) {
      console.error('Error checking username:', err);
      if (latestValue.current !== value) return;
      setError('Error checking availability');
      setIsAvailable(null);
    } finally {
      if (latestValue.current === value) setChecking(false);
    }
  };

  // Handle input change with debounced availability check
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setUsername(value);
    setIsAvailable(null);
    setChecking(false);
    latestValue.current = value;
    if (checkTimer.current) clearTimeout(checkTimer.current);

    if (value.length >= 3) {
      // Wait for a pause in typing, then check only the latest name
      checkTimer.current = setTimeout(() => checkAvailability(value), 500);
    } else if (value.length > 0) {
      setError('Username must be at least 3 characters');
    } else {
      setError(null);
    }
  };

  // Save username
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAvailable || saving) return;
    
    const validationError = validateUsername(username);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Use a transaction to ensure atomicity
      await runTransaction(db, async (transaction) => {
        const usernameLower = username.toLowerCase();
        const usernameRef = doc(db, 'usernames', usernameLower);
        const userRef = doc(db, 'users', uid);
        
        // Check again within transaction
        const usernameSnap = await transaction.get(usernameRef);
        if (usernameSnap.exists() && usernameSnap.data()?.uid !== uid) {
          throw new Error('That username is taken. Please choose another.');
        }

        // Reserve the username. It can already be this person's: an earlier
        // try that was saved but never heard back is run again from the top.
        if (!usernameSnap.exists()) {
          transaction.set(usernameRef, {
            uid,
            usernameLower,
            createdAt: serverTimestamp(),
          });
        }
        
        // Update user profile
        transaction.update(userRef, {
          username: username,
          usernameUpdatedAt: serverTimestamp(),
        });
      });

      onComplete();
    } catch (err: any) {
      console.error('Error saving username:', err);
      setError(err.message || 'Failed to save username');
      setIsAvailable(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center mx-auto mb-6">
            <AtSign className="w-11 h-11" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Choose a username</h1>
          <p className="text-slate-600 dark:text-slate-300">
            It appears on any road reports you post. Your contacts see the name you give when you start a trip.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">@</span>
              <input
                type="text"
                value={username}
                onChange={handleChange}
                placeholder="your_username"
                className={`w-full pl-8 pr-10 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-colors ${
                  error 
                    ? 'border-red-300 focus:ring-red-500' 
                    : isAvailable 
                      ? 'border-green-300 focus:ring-green-500' 
                      : 'border-slate-300 focus:ring-brand-500'
                }`}
                maxLength={20}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checking && <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />}
                {!checking && isAvailable === true && <Check className="w-5 h-5 text-green-500" />}
                {!checking && isAvailable === false && <X className="w-5 h-5 text-red-500" />}
              </div>
            </div>
            
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
            {isAvailable && !error && (
              <p className="mt-2 text-sm text-green-600">Username is available!</p>
            )}
            
            <p className="mt-2 text-xs text-slate-500">
              3-20 characters. Letters, numbers, and underscores only. Must start with a letter.
            </p>
          </div>

          <button
            type="submit"
            disabled={!isAvailable || saving || !!error}
            className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              'Continue'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
