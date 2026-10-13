'use client';

import { CSSProperties, useEffect, useRef } from 'react';
import { useAreaAboveKeyboard } from '@/hooks/useAreaAboveKeyboard';

/**
 * Keeps a pop-up above the iPhone's keyboard. Put `ref` and `style` on the
 * element that covers the whole window (the dimmed backdrop): while the
 * keyboard is up it is fitted to the part of the window still in view, can be
 * scrolled, and brings the box being typed in into sight.
 *
 * On Android and in desktop browsers the window itself shrinks, the hook
 * returns no style and nothing changes.
 */
export function useKeyboardSafeOverlay<T extends HTMLElement = HTMLDivElement>() {
  const area = useAreaAboveKeyboard();
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!area) return;
    const typingIn = document.activeElement;
    if (typingIn instanceof HTMLElement && ref.current?.contains(typingIn)) {
      typingIn.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [area]);

  const style: CSSProperties | undefined = area
    ? { top: area.top, height: area.height, bottom: 'auto', alignItems: 'flex-start', overflowY: 'auto' }
    : undefined;
  return { ref, style, area };
}
