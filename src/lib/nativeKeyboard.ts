/**
 * @fileoverview Put the screen back after the iPhone keyboard closes
 *
 * The app's phone screens fill the window and scroll inside themselves, so the
 * page as a whole never needs to move. iOS moves it anyway to keep the field
 * being typed in above the keyboard, and leaves it there when the keyboard
 * closes. The bottom of the screen then floats above a dark strip, and the
 * strip grows each time the keyboard is used, until the app is restarted.
 *
 * Only for screens that never scroll as a whole: on an ordinary scrolling page
 * this would throw the reader back to the top.
 *
 * Android resizes the window for the keyboard instead, so it is left alone.
 *
 * @module nativeKeyboard
 */

import { Capacitor } from '@capacitor/core';

/** The keyboard takes about a quarter of a second to slide away, and iOS can move the page again while it does */
const SETTLE_DELAYS_MS = [0, 120, 350];

function isTextEntry(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el as HTMLElement).isContentEditable;
}

/**
 * Return the page to the top whenever the keyboard closes, for as long as the
 * calling screen is showing. Does nothing outside the iPhone app.
 *
 * @returns a function that stops it, suitable as a useEffect cleanup
 */
export function resetPageWhenKeyboardCloses(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') return () => {};

  const timers = new Set<number>();

  const settle = () => {
    // Focus moved straight to another field, so the keyboard is still up
    if (isTextEntry(document.activeElement)) return;
    if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0);
  };

  const settleSoon = () => {
    for (const delay of SETTLE_DELAYS_MS) {
      const id = window.setTimeout(() => {
        timers.delete(id);
        settle();
      }, delay);
      timers.add(id);
    }
  };

  // A field losing focus is the usual sign that the keyboard is closing. The
  // visible area growing back also covers a field that was removed while it
  // still had focus (a form that closes itself on submit), which fires no
  // focus event at all.
  const viewport = window.visualViewport;
  document.addEventListener('focusout', settleSoon);
  viewport?.addEventListener('resize', settleSoon);

  return () => {
    document.removeEventListener('focusout', settleSoon);
    viewport?.removeEventListener('resize', settleSoon);
    timers.forEach((id) => window.clearTimeout(id));
    timers.clear();
  };
}
