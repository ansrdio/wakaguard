'use client';

import { useEffect, useState } from 'react';

/** A keyboard takes far more than this; browser toolbars sliding in and out take less */
const KEYBOARD_MIN_HEIGHT = 120;

export interface VisibleArea {
  /** Where the visible part starts, from the top of the window */
  top: number;
  /** How tall it is */
  height: number;
  /** How much of the window lies below it */
  below: number;
}

/**
 * The part of the window that is still in view while the iPhone's keyboard is
 * up, or null when nothing is covering the window.
 *
 * With the keyboard up, the iPhone keeps the window (and anything fixed to it,
 * such as a dialog and its backdrop) at its full height and shows only a slice
 * of it, slid to wherever the box being typed in is. A dialog that fits itself
 * to that slice stays in view and can be scrolled.
 *
 * The slice is measured against the page's own height. It must not be
 * measured against window.innerHeight: on an iPhone that shrinks along with
 * the slice, so the two never differ and the keyboard is never noticed (which
 * is what this did until build 22 was tried on a simulated iPhone).
 *
 * Android makes the window itself shorter for the keyboard, so there the
 * answer is always null and nothing needs to change.
 */
export function useAreaAboveKeyboard(): VisibleArea | null {
  const [area, setArea] = useState<VisibleArea | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      const windowHeight = document.documentElement.clientHeight;
      // Pinching in also shows a slice of the window; that is not a keyboard
      const pinched = viewport.scale > 1.01;
      const covered = !pinched && windowHeight - viewport.height > KEYBOARD_MIN_HEIGHT;
      const top = Math.round(viewport.offsetTop);
      const height = Math.round(viewport.height);
      const next = covered ? { top, height, below: Math.max(0, windowHeight - top - height) } : null;
      setArea((now) => (
        now?.top === next?.top && now?.height === next?.height && now?.below === next?.below ? now : next
      ));
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

  return area;
}
