'use client';

import { CSSProperties, useEffect, useRef } from 'react';
import { useAreaAboveKeyboard } from '@/hooks/useAreaAboveKeyboard';

/**
 * Moves the box being typed in to the middle of the part of the pop-up that
 * scrolls, and moves nothing else.
 *
 * `scrollIntoView` is not used: on an iPhone it also slides the whole page,
 * which the keyboard has already slid once, and the pop-up then follows the
 * page. On a tall form the box ended up above the top of the screen.
 */
function bringToMiddle(field: HTMLElement, popUp: HTMLElement) {
  let scroller: HTMLElement | null = field.parentElement;
  while (scroller) {
    const scrolls = /auto|scroll/.test(getComputedStyle(scroller).overflowY) && scroller.scrollHeight > scroller.clientHeight;
    if (scrolls) break;
    scroller = scroller === popUp ? null : scroller.parentElement;
  }
  if (!scroller) return;
  const fieldAt = field.getBoundingClientRect();
  const scrollerAt = scroller.getBoundingClientRect();
  scroller.scrollTop += fieldAt.top + fieldAt.height / 2 - (scrollerAt.top + scrollerAt.height / 2);
}

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
    const settle = () => {
      const typingIn = document.activeElement;
      if (typingIn instanceof HTMLElement && ref.current?.contains(typingIn)) {
        bringToMiddle(typingIn, ref.current);
      }
    };
    settle();
    // The iPhone goes on sliding things for a moment after the keyboard is up
    const later = setTimeout(settle, 350);
    return () => clearTimeout(later);
  }, [area]);

  const style: CSSProperties | undefined = area
    ? { top: area.top, height: area.height, bottom: 'auto', alignItems: 'flex-start', overflowY: 'auto' }
    : undefined;
  return { ref, style, area };
}
