'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuthedUser } from '@/hooks/useAuthedUser';
import { ReportType, Severity, ReportStatus, VerificationStatus } from '@/lib/types';
import { NigerianState } from '@/lib/nigerianStates';
import { computeExpiry } from '@/lib/rules';

export interface OfflineDraft {
  id: string;
  type: ReportType;
  severity: Severity;
  description: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  state: NigerianState;
  photos?: string[]; // Base64 encoded images
  createdAt: number;
  synced: boolean;
  syncError?: string;
}

const DRAFTS_STORAGE_KEY = 'wakaguard_offline_drafts';

export function useOfflineDrafts() {
  const { uid } = useAuthedUser();
  const [drafts, setDrafts] = useState<OfflineDraft[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Load drafts from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const stored = localStorage.getItem(DRAFTS_STORAGE_KEY);
    if (stored) {
      try {
        setDrafts(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse offline drafts:', e);
      }
    }

    // Listen for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save drafts to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
  }, [drafts]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && drafts.some(d => !d.synced) && !syncing) {
      syncDrafts();
    }
  }, [isOnline]);

  const saveDraft = useCallback((draft: Omit<OfflineDraft, 'id' | 'createdAt' | 'synced'>) => {
    const newDraft: OfflineDraft = {
      ...draft,
      id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      synced: false,
    };

    setDrafts(prev => [...prev, newDraft]);
    return newDraft.id;
  }, []);

  const deleteDraft = useCallback((draftId: string) => {
    setDrafts(prev => prev.filter(d => d.id !== draftId));
  }, []);

  const syncDrafts = useCallback(async () => {
    if (!uid || syncing) return;
    
    const unsyncedDrafts = drafts.filter(d => !d.synced);
    if (unsyncedDrafts.length === 0) return;

    setSyncing(true);

    for (const draft of unsyncedDrafts) {
      try {
        const reportRef = doc(collection(db, 'reports'));
        const reportId = reportRef.id;

        // Upload photos if any
        const photoUrls: string[] = [];
        if (draft.photos && draft.photos.length > 0) {
          for (let i = 0; i < draft.photos.length; i++) {
            const base64 = draft.photos[i];
            // Convert base64 to blob
            const response = await fetch(base64);
            const blob = await response.blob();

            const filename = `photo_${Date.now()}_${i}.jpg`;
            const photoRef = ref(storage, `report_photos/${uid}/${reportId}/${filename}`);
            await uploadBytes(photoRef, blob, {
              contentType: blob.type || 'image/jpeg',
            });
            const url = await getDownloadURL(photoRef);
            photoUrls.push(url);
          }
        }

        // Create the report in Firestore
        const now = Timestamp.now();
        const expiresAt = Timestamp.fromMillis(computeExpiry(draft.type));
        const location = {
          lat: draft.location.lat,
          lng: draft.location.lng,
          ...(typeof draft.location.address === 'string' && draft.location.address.trim()
            ? { address: draft.location.address.trim() }
            : {}),
        };

        await setDoc(reportRef, {
          uid,
          type: draft.type,
          severity: draft.severity,
          status: ReportStatus.ACTIVE,
          state: draft.state,
          verification: VerificationStatus.PENDING,
          location,
          description: draft.description,
          photoUrls,
          createdAt: now,
          expiresAt,
          upvotes: 0,
          downvotes: 0,
          commentCount: 0,
          flagCount: 0,
        });

        // Mark as synced
        setDrafts(prev => prev.map(d => 
          d.id === draft.id ? { ...d, synced: true } : d
        ));

        // Remove synced draft after a delay
        setTimeout(() => {
          setDrafts(prev => prev.filter(d => d.id !== draft.id));
        }, 2000);

      } catch (error) {
        console.error(`Failed to sync draft ${draft.id}:`, error);
        setDrafts(prev => prev.map(d => 
          d.id === draft.id ? { ...d, syncError: 'Failed to sync. Will retry.' } : d
        ));
      }
    }

    setSyncing(false);
  }, [uid, drafts, syncing]);

  const pendingCount = drafts.filter(d => !d.synced).length;

  return {
    drafts,
    saveDraft,
    deleteDraft,
    syncDrafts,
    syncing,
    isOnline,
    pendingCount,
  };
}
