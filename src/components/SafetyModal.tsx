'use client';

import { useState, useEffect } from 'react';
import { X, Shield, MapPin, Clock, Users, AlertTriangle, Copy, Check } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, setDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthedUser } from '@/hooks/useAuthedUser';
import { Trip, TripStatus, Alert, AlertType, CheckIn } from '@/lib/types';
import { generateShareToken, calculateTripExpiry, calculateTimerExpiry, checkRateLimit, formatTimeRemaining, isTripExpired } from '@/lib/safety';
import { Toast } from '@/components/ui/Toast';

interface SafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation?: { lat: number; lng: number } | null;
}

export function SafetyModal({ isOpen, onClose, userLocation }: SafetyModalProps) {
  const { uid } = useAuthedUser();
  const [activeTrip, setActiveTrip] = useState<(Trip & { id: string }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [sosHoldProgress, setSosHoldProgress] = useState(0);
  const [sosHoldActive, setSosHoldActive] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(30);

  // Check for active trip on mount
  useEffect(() => {
    if (!uid || !isOpen) return;

    const checkActiveTrip = async () => {
      const qTrips = query(
        collection(db, 'users', uid, 'trips'),
        where('status', '==', TripStatus.ACTIVE)
      );

      const snap = await getDocs(qTrips);
      if (!snap.empty) {
        const tripDoc = snap.docs[0];
        const tripData = tripDoc.data() as Trip;
        if (tripData.status === TripStatus.ACTIVE && !isTripExpired(tripData.expiresAt)) {
          setActiveTrip({ ...tripData, id: tripDoc.id } as Trip & { id: string });
          return;
        }
      }

      setActiveTrip(null);
    };

    checkActiveTrip();
  }, [uid, isOpen]);

  // Update trip location periodically
  useEffect(() => {
    if (!activeTrip || !userLocation) return;

    const updateInterval = setInterval(async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const tripRef = doc(db, 'users', uid!, 'trips', activeTrip.id);
          await updateDoc(tripRef, {
            lastLocation: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
            },
            lastUpdate: serverTimestamp(),
          });

          try {
            await updateDoc(doc(db, 'sharedTrips', activeTrip.id), {
              lastLocation: {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
              },
              lastUpdate: serverTimestamp(),
            });
          } catch (e) {
          }
        });
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(updateInterval);
  }, [activeTrip, userLocation, uid]);

  const handleStartTrip = async () => {
    if (!uid) {
      setToast({ type: 'error', message: 'Please sign in to use safety features' });
      return;
    }

    if (!userLocation) {
      setToast({ type: 'error', message: 'Location required to start trip sharing' });
      return;
    }

    const rateLimit = checkRateLimit('start_trip');
    if (!rateLimit.allowed) {
      setToast({ type: 'error', message: `Please wait ${rateLimit.retryAfter}s before starting another trip` });
      return;
    }

    setLoading(true);
    try {
      const shareToken = generateShareToken();
      const tripData: Omit<Trip, 'id'> = {
        uid,
        shareToken,
        status: TripStatus.ACTIVE,
        startTime: serverTimestamp() as any,
        expiresAt: Timestamp.fromDate(calculateTripExpiry(24)),
        lastLocation: {
          lat: userLocation.lat,
          lng: userLocation.lng,
        },
        lastUpdate: serverTimestamp() as any,
        notifiedContacts: [],
        createdAt: serverTimestamp() as any,
      };

      await setDoc(doc(db, 'users', uid, 'trips', shareToken), tripData);
      await setDoc(doc(db, 'sharedTrips', shareToken), {
        uid,
        tripId: shareToken,
        status: TripStatus.ACTIVE,
        expiresAt: Timestamp.fromDate(calculateTripExpiry(24)),
        lastLocation: {
          lat: userLocation.lat,
          lng: userLocation.lng,
        },
        lastUpdate: serverTimestamp(),
        destination: null,
        createdAt: serverTimestamp(),
      }, { merge: true });

      setActiveTrip({ ...tripData, id: shareToken } as Trip & { id: string });
      setToast({ type: 'success', message: 'Trip sharing started!' });
    } catch (error) {
      console.error('Error starting trip:', error);
      setToast({ type: 'error', message: 'Failed to start trip sharing' });
    } finally {
      setLoading(false);
    }
  };

  const handleStopTrip = async () => {
    if (!activeTrip) return;

    setLoading(true);
    try {
      const tripRef = doc(db, 'users', uid!, 'trips', activeTrip.id);
      await updateDoc(tripRef, {
        status: TripStatus.COMPLETED,
        endTime: serverTimestamp(),
      });

      try {
        await updateDoc(doc(db, 'sharedTrips', activeTrip.id), {
          status: TripStatus.COMPLETED,
        });
      } catch (e) {
      }

      setActiveTrip(null);
      setToast({ type: 'success', message: 'Trip sharing stopped' });
    } catch (error) {
      console.error('Error stopping trip:', error);
      setToast({ type: 'error', message: 'Failed to stop trip' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyShareLink = () => {
    if (!activeTrip) return;

    const shareUrl = `https://wakaguard.com/s?token=${activeTrip.shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setToast({ type: 'success', message: 'Share link copied!' });
  };

  const handleStartTimer = async () => {
    if (!uid) {
      setToast({ type: 'error', message: 'Please sign in to use safety features' });
      return;
    }

    const rateLimit = checkRateLimit('start_timer');
    if (!rateLimit.allowed) {
      setToast({ type: 'error', message: `Please wait ${rateLimit.retryAfter}s before starting another timer` });
      return;
    }

    setLoading(true);
    try {
      const timerData = {
        duration: timerMinutes,
        startTime: serverTimestamp(),
        expiresAt: calculateTimerExpiry(timerMinutes),
        acknowledged: false,
        notifiedContacts: [],
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'users', uid, 'safetyTimers'), timerData);
      setToast({ type: 'success', message: `Safety timer set for ${timerMinutes} minutes` });
    } catch (error) {
      console.error('Error starting timer:', error);
      setToast({ type: 'error', message: 'Failed to start safety timer' });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCheckIn = async () => {
    if (!uid) {
      setToast({ type: 'error', message: 'Please sign in to use safety features' });
      return;
    }

    const rateLimit = checkRateLimit('check_in');
    if (!rateLimit.allowed) {
      setToast({ type: 'error', message: `Please wait ${rateLimit.retryAfter}s before checking in again` });
      return;
    }

    setLoading(true);
    try {
      const checkInData: Omit<CheckIn, 'id'> = {
        uid,
        tripId: activeTrip?.id,
        location: userLocation || undefined,
        message: 'Quick check-in',
        createdAt: serverTimestamp() as any,
      };

      await addDoc(collection(db, 'users', uid, 'checkIns'), checkInData);
      setToast({ type: 'success', message: 'Check-in sent to trusted contacts!' });
    } catch (error) {
      console.error('Error sending check-in:', error);
      setToast({ type: 'error', message: 'Failed to send check-in' });
    } finally {
      setLoading(false);
    }
  };

  const handleSOSPress = () => {
    setSosHoldActive(true);
    setSosHoldProgress(0);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 2;
      setSosHoldProgress(progress);

      if (progress >= 100) {
        clearInterval(interval);
        triggerSOS();
        setSosHoldActive(false);
      }
    }, 30);

    return interval;
  };

  const handleSOSRelease = (intervalId: NodeJS.Timeout) => {
    clearInterval(intervalId);
    setSosHoldActive(false);
    setSosHoldProgress(0);
  };

  const triggerSOS = async () => {
    if (!uid) return;

    const rateLimit = checkRateLimit('sos');
    if (!rateLimit.allowed) {
      setToast({ type: 'error', message: 'SOS already triggered recently' });
      return;
    }

    try {
      const alertData: Omit<Alert, 'id'> = {
        uid,
        type: AlertType.SOS,
        tripId: activeTrip?.id,
        location: userLocation || undefined,
        message: 'Emergency SOS alert triggered',
        acknowledged: false,
        notifiedContacts: [],
        createdAt: serverTimestamp() as any,
      };

      await addDoc(collection(db, 'users', uid, 'alerts'), alertData);

      // Update trip status if active
      if (activeTrip) {
        const tripRef = doc(db, 'users', uid, 'trips', activeTrip.id);
        await updateDoc(tripRef, {
          status: TripStatus.EMERGENCY,
        });
        setActiveTrip({ ...activeTrip, status: TripStatus.EMERGENCY });

        try {
          await updateDoc(doc(db, 'sharedTrips', activeTrip.id), {
            status: TripStatus.EMERGENCY,
          });
        } catch (e) {
        }
      }

      setToast({ type: 'success', message: 'SOS alert sent to emergency contacts!' });
    } catch (error) {
      console.error('Error triggering SOS:', error);
      setToast({ type: 'error', message: 'Failed to send SOS alert' });
    }
  };

  if (!isOpen) return null;

  // Show login prompt for guests
  if (!uid) {
    return (
      <>
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9000]"
          onClick={onClose}
        />
        <div className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-[9001]">
          <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-2xl w-full md:max-w-md p-6">
            <div className="text-center py-8">
              <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">Safety Center</h2>
              <p className="text-slate-600 mb-6">
                Sign in to access trip sharing, safety timers, and emergency features.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Sign In to Continue
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Modal Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9000]"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-[9001]">
        <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-2xl w-full md:max-w-2xl md:max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Safety Center</h2>
                <p className="text-xs text-slate-500">Stay safe on your journey</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Active Trip Banner */}
            {activeTrip && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                    <span className="text-sm font-semibold text-green-900">Trip Active</span>
                  </div>
                  <button
                    onClick={handleStopTrip}
                    disabled={loading}
                    className="text-xs px-3 py-1.5 bg-white hover:bg-slate-50 border border-green-300 rounded-full text-green-700 font-medium transition-colors disabled:opacity-50"
                  >
                    Stop Sharing
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800">Location sharing active</span>
                </div>
                <button
                  onClick={handleCopyShareLink}
                  className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 border border-green-300 rounded-xl text-sm font-medium text-green-700 transition-colors w-full justify-center"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Link Copied!' : 'Copy Share Link'}
                </button>
              </div>
            )}

            {/* Trip Share */}
            {!activeTrip && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1">Start Trip Share</h3>
                    <p className="text-sm text-slate-600 mb-3">
                      Share your live location with trusted contacts via a secure link
                    </p>
                    <button
                      onClick={handleStartTrip}
                      disabled={loading || !userLocation}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {loading ? 'Starting...' : 'Start Trip Share'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Safety Timer */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-1">Safety Timer</h3>
                  <p className="text-sm text-slate-600 mb-3">
                    Set a timer to notify contacts if you don't check in
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <select
                      value={timerMinutes}
                      onChange={(e) => setTimerMinutes(parseInt(e.target.value))}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={120}>2 hours</option>
                    </select>
                    <button
                      onClick={handleStartTimer}
                      disabled={loading}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 text-sm"
                    >
                      {loading ? 'Starting...' : 'Set Timer'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Check-in */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-1">Quick Check-in</h3>
                  <p className="text-sm text-slate-600 mb-3">
                    Send a quick "I'm safe" message to your trusted contacts
                  </p>
                  <button
                    onClick={handleQuickCheckIn}
                    disabled={loading}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 text-sm"
                  >
                    {loading ? 'Sending...' : 'Send Check-in'}
                  </button>
                </div>
              </div>
            </div>

            {/* SOS */}
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-1">Emergency SOS</h3>
                  <p className="text-sm text-slate-600 mb-3">
                    Press and hold for 3 seconds to send emergency alert
                  </p>
                  <div className="relative">
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const interval = handleSOSPress();
                        (e.target as HTMLButtonElement).dataset.intervalId = String(interval);
                      }}
                      onMouseUp={(e) => {
                        const intervalId = (e.target as HTMLButtonElement).dataset.intervalId;
                        if (intervalId) handleSOSRelease(Number(intervalId) as any);
                      }}
                      onMouseLeave={(e) => {
                        const intervalId = (e.target as HTMLButtonElement).dataset.intervalId;
                        if (intervalId) handleSOSRelease(Number(intervalId) as any);
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        const interval = handleSOSPress();
                        (e.target as HTMLButtonElement).dataset.intervalId = String(interval);
                      }}
                      onTouchEnd={(e) => {
                        const intervalId = (e.target as HTMLButtonElement).dataset.intervalId;
                        if (intervalId) handleSOSRelease(Number(intervalId) as any);
                      }}
                      className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors relative overflow-hidden"
                    >
                      <div 
                        className="absolute inset-0 bg-red-800 transition-all"
                        style={{ width: `${sosHoldProgress}%` }}
                      />
                      <span className="relative z-10">
                        {sosHoldActive ? 'Hold to Confirm...' : 'Hold for Emergency SOS'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
