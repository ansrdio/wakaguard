'use client';

import { useEffect } from 'react';
import { installErrorReporting } from '@/lib/sendErrorReport';

/** Starts reporting faults that nothing else catches (lib/errorReports.ts). Renders nothing. */
export function ErrorReporting() {
  useEffect(() => {
    installErrorReporting();
  }, []);
  return null;
}
