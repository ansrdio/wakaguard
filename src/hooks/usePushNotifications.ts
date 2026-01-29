'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthedUser } from '@/hooks/useAuthedUser';

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | 'default';
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

  // Check if push notifications are supported
  useEffect(() => {
    if (typeof window === 'undefined') {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    const isSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    
    setState(prev => ({
      ...prev,
      isSupported,
      permission: isSupported ? Notification.permission : 'default',
      loading: false,
    }));

    // Check if already subscribed
    if (isSupported && Notification.permission === 'granted') {
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setState(prev => ({ ...prev, isSubscribed: !!subscription }));
    } catch (error) {
      console.error('Error checking push subscription:', error);
    }
  };

  // Request permission and subscribe
  const subscribe = useCallback(async () => {
    if (!state.isSupported || !uid) {
      return { success: false, error: 'Push notifications not supported' };
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission !== 'granted') {
        setState(prev => ({ ...prev, loading: false }));
        return { success: false, error: 'Permission denied' };
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      // Note: In production, you would use your VAPID public key here
      // For now, we'll use a placeholder that works for local testing
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 
        'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      // Save subscription to Firestore
      await setDoc(doc(db, 'pushSubscriptions', uid), {
        uid,
        subscription: JSON.parse(JSON.stringify(subscription)),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      setState(prev => ({ ...prev, isSubscribed: true, loading: false }));
      return { success: true };

    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      setState(prev => ({ ...prev, loading: false }));
      return { success: false, error: 'Failed to subscribe' };
    }
  }, [state.isSupported, uid]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!state.isSupported) {
      return { success: false, error: 'Push notifications not supported' };
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      setState(prev => ({ ...prev, isSubscribed: false, loading: false }));
      return { success: true };

    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      setState(prev => ({ ...prev, loading: false }));
      return { success: false, error: 'Failed to unsubscribe' };
    }
  }, [state.isSupported]);

  // Send a test notification (local only)
  const sendTestNotification = useCallback(async () => {
    if (!state.isSupported || state.permission !== 'granted') {
      return { success: false, error: 'Notifications not enabled' };
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('WakaGuard Test', {
        body: 'Push notifications are working!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
      });
      return { success: true };
    } catch (error) {
      console.error('Error sending test notification:', error);
      return { success: false, error: 'Failed to send notification' };
    }
  }, [state.isSupported, state.permission]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}
