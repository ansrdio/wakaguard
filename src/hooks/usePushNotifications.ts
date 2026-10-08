'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { setPushOptOut } from '@/lib/pushRegistration';
import { PushNotifications } from '@capacitor/push-notifications';
import { Geolocation } from '@capacitor/geolocation';
import { db } from '@/lib/firebase';
import { useAuthedUser } from '@/hooks/useAuthedUser';

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: 'granted' | 'denied' | 'default';
  loading: boolean;
}

export function usePushNotifications() {
  const { uid } = useAuthedUser();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'default',
    loading: true,
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    const checkSupport = async () => {
      if (Capacitor.isNativePlatform()) {
        setState(prev => ({
          ...prev,
          isSupported: true,
          loading: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          isSupported: false,
          loading: false,
        }));
      }
    };

    checkSupport();
  }, []);

  useEffect(() => {
    if (!state.isSupported || !uid) return;
    checkSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, state.isSupported]);

  const checkSubscription = async () => {
    try {
      if (!uid || !db) return;
      const snap = await getDoc(doc(db, 'pushSubscriptions', uid));
      const token = snap.exists() ? (snap.data() as any)?.fcmToken : null;
      setState(prev => ({ ...prev, isSubscribed: !!token }));
    } catch (error) {
      console.error('Error checking push subscription:', error);
    }
  };

  const subscribe = useCallback(async () => {
    if (!state.isSupported || !uid || !db) {
      return { success: false, error: 'Push notifications not supported' };
    }

    if (!Capacitor.isNativePlatform()) {
      return { success: false, error: 'Native push only supported on mobile' };
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        setState(prev => ({ ...prev, loading: false, permission: 'denied' }));
        return { success: false, error: 'Permission denied' };
      }

      setState(prev => ({ ...prev, permission: 'granted' }));
      setPushOptOut(false);

      await PushNotifications.register();

      const tokenListener = await PushNotifications.addListener('registration', async (token) => {
        console.log('Push registration success, token:', token.value);

        try {
          const platform = Capacitor.getPlatform();

          const existing = await getDoc(doc(db, 'pushSubscriptions', uid));
          
          if (existing.exists()) {
            await setDoc(doc(db, 'pushSubscriptions', uid), {
              fcmToken: token.value,
              platform,
              updatedAt: serverTimestamp(),
            }, { merge: true });
          } else {
            await setDoc(doc(db, 'pushSubscriptions', uid), {
              uid,
              fcmToken: token.value,
              platform,
              location: null,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }

          const perm = await Geolocation.requestPermissions();
          if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
            throw new Error('Location permission not granted');
          }

          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          await setDoc(
            doc(db, 'pushSubscriptions', uid),
            {
              location: { lat, lng },
              locationUpdatedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          console.log('Location updated for push notifications');
          setState(prev => ({ ...prev, isSubscribed: true, loading: false }));
          tokenListener.remove();
        } catch (err) {
          console.error('Failed to complete push subscription setup:', err);
          setState(prev => ({ ...prev, loading: false }));
          tokenListener.remove();
        }
      });

      await PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
        setState(prev => ({ ...prev, loading: false }));
      });

      return { success: true };

    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      setState(prev => ({ ...prev, loading: false }));
      return { success: false, error: 'Failed to subscribe' };
    }
  }, [state.isSupported, uid]);

  const unsubscribe = useCallback(async () => {
    if (!state.isSupported || !db) {
      return { success: false, error: 'Push notifications not supported' };
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      if (uid) {
        await deleteDoc(doc(db, 'pushSubscriptions', uid));
      }

      await PushNotifications.removeAllListeners();
      // Remembered, so the automatic registration does not put the token back
      setPushOptOut(true);

      setState(prev => ({ ...prev, isSubscribed: false, loading: false }));
      return { success: true };

    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      setState(prev => ({ ...prev, loading: false }));
      return { success: false, error: 'Failed to unsubscribe' };
    }
  }, [state.isSupported, uid]);

  const sendTestNotification = useCallback(async () => {
    return { success: false, error: 'Test notifications not implemented for native' };
  }, []);

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}
