'use client';

import { useEffect, useState } from 'react';

/** A keyboard takes far more than this; browser toolbars sliding in and out take less */
const KEYBOARD_MIN_HEIGHT = 120;

export interface VisibleArea {
  /** Where the visible part starts, from the top of the window */
  top: number;
  /** How tall it is */
  height: number;
}

/**
 * The part of the window that is still in view while the iPhone's keyboard is
 * up, or null when nothing is covering the window.
 *
 * The iPhone lays its keyboard over the page without making the window any
 * smaller, so anything fixed to the whole window (a dialog and its backdrop)
 * keeps its lower half underneath the keyboard. A dialog that fits itself to
 * this area instead stays in view and can be scrolled.
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
      const covered = window.innerHeight - viewport.height > KEYBOARD_MIN_HEIGHT;
      const next = covered ? { top: Math.round(viewport.offsetTop), height: Math.round(viewport.height) } : null;
      setArea((now) => (now?.top === next?.top && now?.height === next?.height ? now : next));
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
