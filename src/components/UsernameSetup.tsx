'use client';

import { useState } from 'react';
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
      
      if (usernameSnap.exists()) {
        setIsAvailable(false);
        setError('Username is already taken');
      } else {
        setIsAvailable(true);
        setError(null);
      }
    } catch (err) {
      console.error('Error checking username:', err);
      setError('Error checking availability');
      setIsAvailable(null);
    } finally {
      setChecking(false);
    }
  };

  // Handle input change with debounced availability check
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setUsername(value);
    setIsAvailable(null);
    
    if (value.length >= 3) {
      // Debounce the check
      const timeoutId = setTimeout(() => checkAvailability(value), 500);
      return () => clearTimeout(timeoutId);
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
        if (usernameSnap.exists()) {
          throw new Error('Username was just taken. Please choose another.');
        }
        
        // Reserve the username
        transaction.set(usernameRef, {
          uid,
          usernameLower,
          createdAt: serverTimestamp(),
        });
        
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
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AtSign className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Choose Your Username</h1>
          <p className="text-blue-100">
            This is how other users will identify you in the community
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-xl">
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
                      : 'border-slate-300 focus:ring-blue-500'
                }`}
                maxLength={20}
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
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
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
