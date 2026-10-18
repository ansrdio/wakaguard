'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AppConfig, readAppConfig } from '@/lib/appConfig';

/** The app-wide switches in config/app, kept up to date; null until read or if it cannot be */
export function useAppConfig(): AppConfig | null {
  const [config, setConfig] = useState<AppConfig | null>(null);
  useEffect(() => {
    return onSnapshot(
      doc(db, 'config', 'app'),
      (snap) => setConfig(snap.exists() ? readAppConfig(snap.data()) : null),
      () => setConfig(null)
    );
  }, []);
  return config;
}
