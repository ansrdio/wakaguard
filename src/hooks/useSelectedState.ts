'use client';

import { useState, useEffect } from 'react';
import { NigerianState, NIGERIAN_STATES } from '@/lib/nigerianStates';

const STORAGE_KEY = 'wakaguard_selected_nigeria_state';

/**
 * Hook to manage selected Nigerian state with localStorage persistence
 * Default is null (no state selected - will trigger onboarding)
 */
export function useSelectedState() {
  const [selectedState, setSelectedStateInternal] = useState<NigerianState | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        // Validate that stored value is a valid NigerianState
        const parsed = stored as NigerianState;
        if (NIGERIAN_STATES.includes(parsed)) {
          setSelectedStateInternal(parsed);
        } else {
          // Invalid state in storage, clear it
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading selected state from localStorage:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage when state changes
  const setSelectedState = (state: NigerianState | null) => {
    setSelectedStateInternal(state);

    if (typeof window === 'undefined') return;

    try {
      if (state === null) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, state);
      }
    } catch (error) {
      console.error('Error saving selected state to localStorage:', error);
    }
  };

  return {
    selectedState,
    setSelectedState,
    isLoaded,
  };
}
