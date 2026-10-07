'use client';

import { useEffect, useState } from 'react';
import { isTextEntry } from '@/lib/nativeKeyboard';

/** A keyboard takes far more than this; browser toolbars sliding in and out take less */
const KEYBOARD_MIN_HEIGHT = 120;

/**
 * True while the phone's keyboard is covering the lower part of the screen.
 *
 * Focus alone is not enough: Android's Back button closes the keyboard and
 * leaves the field focused. So this also needs the visible area to have shrunk
 * from the tallest it has been at the current width.
 */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    const size = () => ({
      width: viewport?.width ?? window.innerWidth,
      height: viewport?.height ?? window.innerHeight,
    });

    let tallest = size();
    const update = () => {
      const now = size();
      // A new width means the phone was turned, so start measuring again
      if (now.width !== tallest.width || now.height > tallest.height) tallest = now;
      setOpen(isTextEntry(document.activeElement) && tallest.height - now.height > KEYBOARD_MIN_HEIGHT);
    };

    update();
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    window.addEventListener('resize', update);
    viewport?.addEventListener('resize', update);
    return () => {
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
      window.removeEventListener('resize', update);
      viewport?.removeEventListener('resize', update);
    };
  }, []);

  return open;
}
