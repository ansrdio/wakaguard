/**
 * @fileoverview Safety features hook for WakaGuard
 * 
 * This hook provides the Safe Trip API for managing:
 * - Trip sharing with trusted contacts
 * - Safety timers with check-in reminders
 * - Emergency SOS alerts
 * - Quick check-ins and checkpoint logging
 * 
 * The Safe Trip feature unifies trip sharing and safety timers into a single
 * cohesive experience, allowing users to share their location while also
 * setting automatic check-in reminders.
 * 
 * @module useSafety
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, doc, setDoc, updateDoc, query, where, onSnapshot, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthedUser } from '@/hooks/useAuthedUser';
import { generateShareToken, calculateTripExpiry, calculateTimerExpiry, calculateTripEnd } from '@/lib/safety';
import { Trip, TripStatus, SafetyTimer, AlertType } from '@/lib/types';

/**
 * Configuration options for starting a Safe Trip.
 */
export interface SafeTripOptions {
  expectedDurationMinutes?: number;
  trustedContactIds?: string[];
  destinationLabel?: string;
}

/**
 * Return type for the useSafety hook.
 * Provides methods and state for all safety features.
 */
interface UseSafetyReturn {
  // === TRIP SHARING (LEGACY API) ===
  /** Currently active trip, or null if no trip is active */
  activeTrip: Trip | null;
  /** Start a new trip with optional destination */
  startTrip: (destination?: string) => Promise<{ success: boolean; shareUrl?: string; error?: string }>;
  /** End the current active trip */
  endTrip: () => Promise<{ success: boolean; error?: string }>;
  /** Update trip location (called periodically during active trip) */
  updateTripLocation: (lat: number, lng: number) => Promise<void>;
  
  // === SAFETY TIMER (LEGACY API) ===
  /** Currently active timer, or null if no timer is active */
  activeTimer: SafetyTimer | null;
  /** Start a safety timer with specified duration in minutes */
  startTimer: (minutes: number) => Promise<{ success: boolean; error?: string }>;
  /** Cancel the active timer (user checked in safely) */
  cancelTimer: () => Promise<{ success: boolean; error?: string }>;
  /** Acknowledge timer without canceling (snooze-like behavior) */
  acknowledgeTimer: () => Promise<{ success: boolean; error?: string }>;
  
  // === EMERGENCY SOS ===
  /** Trigger emergency SOS alert (notifies contacts, logs location) */
  triggerSOS: () => Promise<{ success: boolean; error?: string }>;
  
  // === SAFE TRIP (UNIFIED API) ===
  /** Start a Safe Trip with duration, contacts, and destination */
  startSafeTrip: (options: SafeTripOptions) => Promise<{ success: boolean; shareUrl?: string; error?: string }>;
  /** End the Safe Trip and associated timer */
  endSafeTrip: () => Promise<{ success: boolean; error?: string }>;
  /** Push back the expected arrival time (also clears an overdue state on the server) */
  extendSafeTrip: (minutes: number) => Promise<{ success: boolean; error?: string }>;
  /** Acknowledge the Safe Trip timer (check-in without ending trip) */
  acknowledgeSafeTripTimer: () => Promise<{ success: boolean; error?: string }>;
  
  // === QUICK ACTIONS ===
  /** Send a quick "I'm safe" check-in */
  sendQuickCheckIn: (message?: string) => Promise<{ success: boolean; error?: string }>;
  /** Log a checkpoint stop (Nigeria-specific feature) */
  logCheckpointStop: () => Promise<{ success: boolean; error?: string }>;
  
  // === STATE ===
  /** Whether safety data is still loading */
  loading: boolean;
}

/**
 * Hook for managing safety features in WakaGuard.
 * 
 * Provides real-time subscription to active trips and timers,
 * and methods to start/end trips, set timers, trigger SOS, etc.
 * 
 * @returns {UseSafetyReturn} Safety state and methods
 * @example
 * const { activeTrip, startSafeTrip, endSafeTrip, triggerSOS } = useSafety();
 * 
 * // Start a 45-minute Safe Trip
 * const result = await startSafeTrip({
 *   expectedDurationMinutes: 45,
 *   destinationLabel: 'Home',
 *   trustedContactIds: ['contact1', 'contact2']
 * });
 * 
 * if (result.success) {
 *   console.log('Share URL:', result.shareUrl);
 * }
 */
export function useSafety(): UseSafetyReturn {
  const { uid } = useAuthedUser();
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [activeTimer, setActiveTimer] = useState<SafetyTimer | null>(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to active trip
  useEffect(() => {
    if (!uid || typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const tripsRef = collection(db, 'users', uid, 'trips');
    // An SOS moves the trip to 'emergency'; it must stay visible so tracking
    // continues and the traveller can still end it.
    const q = query(
      tripsRef,
      where('status', 'in', [TripStatus.ACTIVE, TripStatus.EMERGENCY])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const tripDoc = snapshot.docs[0];
        setActiveTrip({ id: tripDoc.id, ...tripDoc.data() } as Trip);
      } else {
        setActiveTrip(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

  // Subscribe to active timer
  useEffect(() => {
    if (!uid || typeof window === 'undefined') return;

    const timersRef = collection(db, 'users', uid, 'safetyTimers');
    const q = query(
      timersRef,
      where('acknowledged', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const timerDoc = snapshot.docs[0];
        setActiveTimer({ id: timerDoc.id, ...timerDoc.data() } as SafetyTimer);
      } else {
        setActiveTimer(null);
      }
    });

    return () => unsubscribe();
  }, [uid]);

  // Start a trip
  const startTrip = useCallback(async (destination?: string) => {
    if (!uid) return { success: false, error: 'Not authenticated' };
    
    try {
      const shareToken = generateShareToken();
      const expiresAt = calculateTripExpiry(24);

      // Get current location
      let lastLocation: { lat: number; lng: number } | undefined;
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          });
        });
        lastLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      } catch (e) {
        console.warn('Could not get location for trip');
      }

      const destinationValue = destination?.trim();
      const tripData: Omit<Trip, 'id'> = {
        uid,
        shareToken,
        status: TripStatus.ACTIVE,
        startTime: serverTimestamp() as any,
        expiresAt: Timestamp.fromDate(expiresAt),
        lastUpdate: serverTimestamp() as any,
        notifiedContacts: [],
        createdAt: serverTimestamp() as any,
        ...(destinationValue ? { destination: destinationValue } : {}),
        ...(lastLocation ? { lastLocation } : {}),
      };

      await setDoc(doc(db, 'users', uid, 'trips', shareToken), tripData);
      await setDoc(doc(db, 'sharedTrips', shareToken), {
        uid,
        tripId: shareToken,
        status: TripStatus.ACTIVE,
        expiresAt: Timestamp.fromDate(expiresAt),
        lastLocation: lastLocation ? { lat: lastLocation.lat, lng: lastLocation.lng } : null,
        lastUpdate: serverTimestamp(),
        destination: destinationValue ?? null,
        createdAt: serverTimestamp(),
      }, { merge: true });

      const shareUrl = `https://wakaguard.com/s?token=${shareToken}`;
      return { success: true, shareUrl };
    } catch (error) {
      console.error('Error starting trip:', error);
      return { success: false, error: 'Failed to start trip' };
    }
  }, [uid]);

  // End a trip
  const endTrip = useCallback(async () => {
    if (!uid || !activeTrip) return { success: false, error: 'No active trip' };

    try {
      await updateDoc(doc(db, 'users', uid, 'trips', activeTrip.id), {
        status: TripStatus.COMPLETED,
        endTime: serverTimestamp(),
      });

      try {
        await updateDoc(doc(db, 'sharedTrips', activeTrip.id), {
          status: TripStatus.COMPLETED,
        });
      } catch (e) {
      }

      return { success: true };
    } catch (error) {
      console.error('Error ending trip:', error);
      return { success: false, error: 'Failed to end trip' };
    }
  }, [uid, activeTrip]);

  // Update trip location
  const updateTripLocation = useCallback(async (lat: number, lng: number) => {
    if (!activeTrip) return;

    try {
      if (!uid) return;
      await updateDoc(doc(db, 'users', uid, 'trips', activeTrip.id), {
        lastLocation: { lat, lng, updatedAt: serverTimestamp() },
        lastUpdate: serverTimestamp(),
      });

      try {
        await updateDoc(doc(db, 'sharedTrips', activeTrip.id), {
          lastLocation: { lat, lng },
          lastUpdate: serverTimestamp(),
        });
      } catch (e) {
      }
    } catch (error) {
      console.error('Error updating trip location:', error);
    }
  }, [activeTrip, uid]);

  // Start a safety timer
  const startTimer = useCallback(async (minutes: number) => {
    if (!uid) return { success: false, error: 'Not authenticated' };

    try {
      const timerId = `timer_${uid}_${Date.now()}`;
      const expiresAt = calculateTimerExpiry(minutes);

      const timerData: Omit<SafetyTimer, 'id'> = {
        uid,
        duration: minutes,
        startTime: serverTimestamp() as any,
        expiresAt: Timestamp.fromDate(expiresAt),
        acknowledged: false,
        notifiedContacts: [],
        createdAt: serverTimestamp() as any,
        shouldNotifyContacts: true,
      };

      await setDoc(doc(db, 'users', uid, 'safetyTimers', timerId), timerData);
      return { success: true };
    } catch (error) {
      console.error('Error starting timer:', error);
      return { success: false, error: 'Failed to start timer' };
    }
  }, [uid]);

  // Cancel a timer
  const cancelTimer = useCallback(async () => {
    if (!activeTimer) return { success: false, error: 'No active timer' };

    try {
      if (!uid) return { success: false, error: 'Not authenticated' };
      await updateDoc(doc(db, 'users', uid, 'safetyTimers', activeTimer.id), {
        acknowledged: true,
        acknowledgedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error canceling timer:', error);
      return { success: false, error: 'Failed to cancel timer' };
    }
  }, [activeTimer, uid]);

  // Acknowledge timer (check-in)
  const acknowledgeTimer = useCallback(async () => {
    return cancelTimer();
  }, [cancelTimer]);

  // Trigger emergency SOS
  const triggerSOS = useCallback(async () => {
    if (!uid) return { success: false, error: 'Not authenticated' };

    try {
      // Location is best effort: the alert must go out even without a GPS fix.
      // The server falls back to the trip's last known position.
      let location: { lat: number; lng: number } | null = null;
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          });
        });
        location = { lat: position.coords.latitude, lng: position.coords.longitude };
      } catch (e) {
        console.warn('Could not get location for SOS');
      }

      const alertId = `sos_${uid}_${Date.now()}`;
      const alertData = {
        type: AlertType.SOS,
        location,
        tripId: activeTrip?.id || null,
        acknowledged: false,
        notifiedContacts: [],
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', uid, 'alerts', alertId), alertData);

      if (activeTrip) {
        try {
          await updateDoc(doc(db, 'users', uid, 'trips', activeTrip.id), {
            status: TripStatus.EMERGENCY,
          });
        } catch (e) {
        }
        try {
          await updateDoc(doc(db, 'sharedTrips', activeTrip.id), {
            status: TripStatus.EMERGENCY,
          });
        } catch (e) {
        }
      }

      // Also open phone dialer as fallback
      window.location.href = 'tel:112'; // Nigeria emergency number

      return { success: true };
    } catch (error) {
      // Even if the alert could not be saved, still open the dialer
      console.error('Error triggering SOS:', error);
      window.location.href = 'tel:112';
      return { success: true }; // Still consider it success since we're calling emergency
    }
  }, [uid, activeTrip]);

  // ============================================
  // Safe Trip API (Unified Experience)
  // ============================================

  // Start a Safe Trip with optional timer and trusted contacts
  const startSafeTrip = useCallback(async (options: SafeTripOptions) => {
    console.log('startSafeTrip called, uid:', uid);
    console.log('options:', JSON.stringify(options));
    
    if (!uid) {
      console.log('No uid - not authenticated');
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const shareToken = generateShareToken();
      const now = new Date();
      const expiresAt = calculateTripExpiry(24);
      
      // Calculate trip end time if duration is specified
      const endsAt = options.expectedDurationMinutes 
        ? calculateTripEnd(now, options.expectedDurationMinutes)
        : null;

      // Get current location - use null instead of undefined (Firestore rejects undefined)
      let lastLocation: { lat: number; lng: number; accuracy: number; updatedAt: Timestamp } | null = null;
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          });
        });
        lastLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          updatedAt: Timestamp.now(),
        };
      } catch (e) {
        console.warn('Could not get location for Safe Trip');
      }

      // Create trip document - use null instead of undefined for optional fields
      const tripData = {
        uid,
        shareToken,
        status: TripStatus.ACTIVE,
        startTime: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
        destination: options.destinationLabel ?? null,
        lastLocation,
        lastUpdate: serverTimestamp(),
        notifiedContacts: [],
        createdAt: serverTimestamp(),
        // Safe Trip specific fields
        expectedDurationMinutes: options.expectedDurationMinutes ?? null,
        endsAt: endsAt ? Timestamp.fromDate(endsAt) : null,
        trustedContactIds: options.trustedContactIds ?? [],
        shouldNotifyContacts: true,
      };

      await setDoc(doc(db, 'users', uid, 'trips', shareToken), tripData);
      await setDoc(doc(db, 'sharedTrips', shareToken), {
        uid,
        tripId: shareToken,
        status: TripStatus.ACTIVE,
        expiresAt: Timestamp.fromDate(expiresAt),
        lastLocation: lastLocation
          ? { lat: lastLocation.lat, lng: lastLocation.lng, accuracy: lastLocation.accuracy }
          : null,
        lastUpdate: serverTimestamp(),
        destination: options.destinationLabel ?? null,
        createdAt: serverTimestamp(),
        endsAt: endsAt ? Timestamp.fromDate(endsAt) : null,
      }, { merge: true });

      // The trip's endsAt is the single deadline. The server watches it and alerts
      // contacts if the trip is still active afterwards, so no linked timer is needed.

      const shareUrl = `https://wakaguard.com/s?token=${shareToken}`;
      return { success: true, shareUrl };
    } catch (error: any) {
      console.error('Error starting Safe Trip:', error);
      console.error('Error details:', error?.code, error?.message);
      return { success: false, error: `Failed: ${error?.message || 'Unknown error'}` };
    }
  }, [uid]);

  // End a Safe Trip and any linked timers
  const endSafeTrip = useCallback(async () => {
    if (!uid || !activeTrip) return { success: false, error: 'No active trip' };

    try {
      // End the trip
      await updateDoc(doc(db, 'users', uid, 'trips', activeTrip.id), {
        status: TripStatus.COMPLETED,
        endTime: serverTimestamp(),
      });

      try {
        await updateDoc(doc(db, 'sharedTrips', activeTrip.id), {
          status: TripStatus.COMPLETED,
        });
      } catch (e) {
      }

      // Also acknowledge any linked timer
      if (activeTimer?.tripId === activeTrip.id) {
        await updateDoc(doc(db, 'users', uid, 'safetyTimers', activeTimer.id), {
          acknowledged: true,
          acknowledgedAt: serverTimestamp(),
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error ending Safe Trip:', error);
      return { success: false, error: 'Failed to end Safe Trip' };
    }
  }, [uid, activeTrip, activeTimer]);

  // Push back the expected arrival time
  const extendSafeTrip = useCallback(async (minutes: number) => {
    if (!uid || !activeTrip) return { success: false, error: 'No active trip' };
    if (!(minutes > 0)) return { success: false, error: 'Invalid duration' };

    try {
      // Extend from now if already past the deadline, otherwise from the deadline
      const baseMs = Math.max(Date.now(), activeTrip.endsAt?.toMillis() ?? 0);
      const endsAt = Timestamp.fromMillis(baseMs + minutes * 60 * 1000);

      await updateDoc(doc(db, 'users', uid, 'trips', activeTrip.id), { endsAt });
      try {
        await updateDoc(doc(db, 'sharedTrips', activeTrip.id), { endsAt });
      } catch (e) {
      }

      return { success: true };
    } catch (error) {
      console.error('Error extending Safe Trip:', error);
      return { success: false, error: 'Failed to add time' };
    }
  }, [uid, activeTrip]);

  // Acknowledge Safe Trip timer (check-in without ending trip)
  const acknowledgeSafeTripTimer = useCallback(async () => {
    if (!activeTimer) return { success: false, error: 'No active timer' };

    try {
      if (!uid) return { success: false, error: 'Not authenticated' };
      await updateDoc(doc(db, 'users', uid, 'safetyTimers', activeTimer.id), {
        acknowledged: true,
        acknowledgedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error acknowledging timer:', error);
      return { success: false, error: 'Failed to check in' };
    }
  }, [activeTimer, uid]);

  // Send a quick check-in
  const sendQuickCheckIn = useCallback(async (message?: string) => {
    if (!uid) return { success: false, error: 'Not authenticated' };

    try {
      // Get current location
      let location: { lat: number; lng: number } | undefined;
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          });
        });
        location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      } catch (e) {
        console.warn('Could not get location for check-in');
      }

      const checkInData = {
        uid,
        tripId: activeTrip?.id || null,
        message: message?.trim() || 'Quick check-in: I am safe',
        createdAt: serverTimestamp(),
        ...(location ? { location } : {}),
      };

      await addDoc(collection(db, 'users', uid, 'checkIns'), checkInData);

      // If there's an active timer, acknowledge it
      if (activeTimer) {
        await updateDoc(doc(db, 'users', uid, 'safetyTimers', activeTimer.id), {
          acknowledged: true,
          acknowledgedAt: serverTimestamp(),
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending check-in:', error);
      return { success: false, error: 'Failed to send check-in' };
    }
  }, [uid, activeTrip, activeTimer]);

  // Log a checkpoint stop (Nigeria-specific)
  const logCheckpointStop = useCallback(async () => {
    if (!uid) return { success: false, error: 'Not authenticated' };

    try {
      // Get current location
      let location: { lat: number; lng: number } | undefined;
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          });
        });
        location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      } catch (e) {
        console.warn('Could not get location for checkpoint');
      }

      const alertId = `checkpoint_${uid}_${Date.now()}`;
      const alertData = {
        type: AlertType.CHECKPOINT_STOP,
        tripId: activeTrip?.id || null,
        message: 'Stopped at a checkpoint',
        acknowledged: false,
        notifiedContacts: [],
        createdAt: serverTimestamp(),
        // Flag for future backend notification
        shouldNotifyContacts: true,
        ...(location ? { location } : {}),
      };

      await setDoc(doc(db, 'users', uid, 'alerts', alertId), alertData);

      return { success: true };
    } catch (error) {
      console.error('Error logging checkpoint stop:', error);
      return { success: false, error: 'Failed to log checkpoint' };
    }
  }, [uid, activeTrip]);

  return {
    // Legacy trip functions
    activeTrip,
    startTrip,
    endTrip,
    updateTripLocation,
    // Legacy timer functions
    activeTimer,
    startTimer,
    cancelTimer,
    acknowledgeTimer,
    // Emergency
    triggerSOS,
    // Safe Trip unified API
    startSafeTrip,
    endSafeTrip,
    extendSafeTrip,
    acknowledgeSafeTripTimer,
    // Quick actions
    sendQuickCheckIn,
    logCheckpointStop,
    // State
    loading,
  };
}
