'use client';

import { installNativeGeolocation } from '@/lib/nativeGeolocation';

// Runs when this module loads, before any screen asks for location
installNativeGeolocation();

/** Set-up that only applies inside the phone app. Renders nothing. */
export function NativeSetup() {
  return null;
}
