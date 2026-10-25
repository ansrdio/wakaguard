'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { linesDue, Route, spokenNextTurn } from '@/lib/directions';
import { canSpeak, primeSpeech, setVoiceMuted, speak, stopSpeaking, voiceMuted } from '@/lib/speech';
import type { TripDirections } from '@/hooks/useTripDirections';

export interface DirectionsVoice {
  muted: boolean;
  toggle: () => void;
}

/** Said once when the traveller reaches the destination; matches the panel */
export const ARRIVED_LINE = "You are at your destination. Tap I've arrived to end the trip.";
export const REROUTING_LINE = 'You left the route. Finding a new one.';

/**
 * Speaks the directions of a trip (Beta, build 25, piece 5): Mapbox's lines as
 * each mark is reached, a line when a new route is being found, and one on
 * arrival. Nothing while muted, off the route, or with the screen off (the
 * position is only followed while the screen is on). Null where there is no
 * speech or the server switch `directionsVoice` is off.
 */
export function useDirectionsVoice(directions: TripDirections, enabled: boolean): DirectionsVoice | null {
  const available = enabled && canSpeak();
  const [muted, setMuted] = useState(() => voiceMuted());
  const on = available && !muted;
  const ready = directions.state === 'ready' ? directions : null;
  const route = ready?.route ?? null;
  const guidance = ready?.guidance ?? null;
  const rerouting = ready?.rerouting ?? false;

  // Lines already said on this route; a new route starts afresh
  const said = useRef<{ route: Route | null; keys: Set<string> }>({ route: null, keys: new Set() });
  const wasRerouting = useRef(false);
  // Turned back on: say the next turn, unless a line is due anyway
  const justUnmuted = useRef(false);

  useEffect(() => {
    if (!on || !route) return;
    if (said.current.route !== route) said.current = { route, keys: new Set() };
    const keys = said.current.keys;

    if (rerouting) {
      if (!wasRerouting.current) speak(REROUTING_LINE);
      wasRerouting.current = true;
      justUnmuted.current = false;
      return;
    }
    wasRerouting.current = false;
    if (!guidance) return;

    if (guidance.arrived) {
      if (!keys.has('arrived')) {
        keys.add('arrived');
        speak(ARRIVED_LINE);
      }
      justUnmuted.current = false;
      return;
    }
    const lines = linesDue(route, guidance, keys);
    for (const line of lines) {
      keys.add(line.key);
      speak(line.text);
    }
    if (justUnmuted.current) {
      justUnmuted.current = false;
      if (lines.length === 0 && !guidance.offRoute) speak(spokenNextTurn(guidance));
    }
  }, [on, route, guidance, rerouting]);

  // Quiet when muted, when the trip or its directions end, and when the screen goes off
  const active = on && !!route;
  useEffect(() => {
    if (!active) stopSpeaking();
  }, [active]);
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') stopSpeaking();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stopSpeaking();
    };
  }, []);

  const toggle = useCallback(() => {
    const next = !muted;
    setMuted(next);
    setVoiceMuted(next);
    if (next) {
      stopSpeaking();
    } else {
      // From a tap, so an iPhone allows speech from now on
      primeSpeech();
      justUnmuted.current = true;
    }
  }, [muted]);

  return available ? { muted, toggle } : null;
}
