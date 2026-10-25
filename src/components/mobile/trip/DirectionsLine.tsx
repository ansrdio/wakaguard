'use client';

import { ArrowUp, Clock, CornerUpLeft, CornerUpRight, Flag, Loader2, Navigation, RotateCw, Volume2, VolumeX, X } from 'lucide-react';
import { formatDistance, Guidance, minutesToGo, Route } from '@/lib/directions';
import { formatClock } from '@/lib/tripPlanning';
import type { TripDirections } from '@/hooks/useTripDirections';
import type { DirectionsVoice } from '@/hooks/useDirectionsVoice';

/** An arrow for the turn, read from Mapbox's own wording */
function TurnIcon({ instruction, arrived }: { instruction: string; arrived: boolean }) {
  const words = instruction.toLowerCase();
  const Icon = arrived || words.includes('arrive') || words.includes('destination')
    ? Flag
    : words.includes('roundabout')
      ? RotateCw
      : words.includes('left')
        ? CornerUpLeft
        : words.includes('right')
          ? CornerUpRight
          : ArrowUp;
  return <Icon className="w-6 h-6" aria-hidden="true" />;
}

/** Mutes or unmutes the spoken directions (piece 5); the choice is kept on the phone */
function VoiceButton({ voice }: { voice: DirectionsVoice }) {
  const Icon = voice.muted ? VolumeX : Volume2;
  return (
    <button
      type="button"
      onClick={voice.toggle}
      aria-pressed={!voice.muted}
      aria-label={voice.muted ? 'Speak the directions' : 'Mute the spoken directions'}
      className="w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
    </button>
  );
}

/** The trip's check-in time, for the line under the directions */
export interface DirectionsDeadline {
  endsAtMs: number;
  /** Minutes after the check-in time before contacts are told (shorter on a test trip) */
  graceMinutes: number;
  nowMs: number;
  onAddTime: () => void;
}

/**
 * Under the next turn: when contacts are told, a warning when the rest of the
 * route will not fit before the check-in time, "Add time", and "Stop
 * directions", which hides the directions while the trip carries on (design
 * PDF of 23 October, build 25).
 */
function DirectionsFooter({ deadline, route, guidance, onStop }: {
  deadline: DirectionsDeadline | null;
  route: Route;
  guidance: Guidance | null;
  onStop: () => void;
}) {
  let words: string | null = null;
  let late = false;
  if (deadline) {
    const { endsAtMs, graceMinutes, nowMs } = deadline;
    const toldAtMs = endsAtMs + graceMinutes * 60000;
    const checkIn = formatClock(endsAtMs, nowMs);
    const toldAt = formatClock(toldAtMs, nowMs);
    if (nowMs >= toldAtMs) {
      // Contacts are being told: the trip card says so, not this line
      words = null;
    } else if (nowMs >= endsAtMs) {
      late = true;
      words = `You are past your ${checkIn} check-in. Add time, or your contacts are told from ${toldAt}.`;
    } else if (guidance && !guidance.offRoute && minutesToGo(route, guidance) > (endsAtMs - nowMs) / 60000) {
      late = true;
      words = `At this pace you will arrive after ${checkIn}. Add time, or your contacts are told from ${toldAt}.`;
    } else {
      words = `Check in by ${checkIn}. Your contacts are told from ${toldAt}.`;
    }
  }

  return (
    <div className="mt-3">
      {words && (
        <p className={`text-sm ${late ? 'text-amber-800 dark:text-amber-300 font-medium' : 'text-slate-600 dark:text-slate-300'}`}>
          {words}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {words && deadline && (
          <button
            type="button"
            onClick={deadline.onAddTime}
            className={`min-h-12 px-4 rounded-xl text-sm font-semibold flex items-center gap-1.5 ${
              late
                ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-200'
                : 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600'
            }`}
          >
            <Clock className="w-4 h-4" aria-hidden="true" />
            Add time
          </button>
        )}
        <button
          type="button"
          onClick={onStop}
          className="min-h-12 px-4 rounded-xl text-sm font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <X className="w-4 h-4" aria-hidden="true" />
          Stop directions
        </button>
      </div>
    </div>
  );
}

/**
 * The next turn on a trip (directions Beta, build 25), for the trip card and the
 * trip map. Nothing at all while directions are off for this trip.
 */
export function DirectionsLine({ directions, deadline = null, className = '' }: {
  directions: TripDirections;
  /** The check-in time and "Add time", shown under the next turn; null during an SOS */
  deadline?: DirectionsDeadline | null;
  className?: string;
}) {
  if (directions.state === 'off') return null;

  const beta = (
    <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300">Beta</span>
  );

  if (directions.state === 'finding') {
    return (
      <div className={`flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        Finding the route&hellip; {beta}
      </div>
    );
  }

  if (directions.state === 'none') {
    return (
      <div className={`flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 ${className}`}>
        <Navigation className="w-4 h-4" aria-hidden="true" />
        No route found for this trip. {beta}
      </div>
    );
  }

  if (directions.state === 'stopped') {
    return (
      <div className={`flex items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-300 ${className}`}>
        <span className="flex items-center gap-2">
          <Navigation className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          Directions stopped. Your trip carries on.
        </span>
        <button
          type="button"
          onClick={directions.resume}
          className="relative after:absolute after:-inset-x-2 after:-inset-y-3.5 flex-shrink-0 font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          Show directions
        </button>
      </div>
    );
  }

  const { route, guidance, rerouting, voice, stop } = directions;
  const ready = (content: React.ReactNode) => (
    <div className={className}>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">{content}</div>
        {voice && <VoiceButton voice={voice} />}
      </div>
      {voice && !voice.muted && voice.volumeOff && (
        <p className="mt-2 text-sm font-medium text-amber-800 dark:text-amber-300" role="status">
          Your media volume is off. Turn it up to hear the directions.
        </p>
      )}
      {!guidance?.arrived && <DirectionsFooter deadline={deadline} route={route} guidance={guidance} onStop={stop} />}
    </div>
  );

  if (rerouting) {
    return ready(
      <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200" role="status">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        You left the route. Finding a new one&hellip; {beta}
      </div>
    );
  }

  if (!guidance) {
    return ready(
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <Navigation className="w-4 h-4" aria-hidden="true" />
        Directions ready: {formatDistance(route.distanceM)} to go. Waiting for your position&hellip; {beta}
      </div>
    );
  }

  if (guidance.arrived) {
    return ready(
      <div className="flex items-center gap-3" role="status">
        <span className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center flex-shrink-0">
          <Flag className="w-5 h-5" aria-hidden="true" />
        </span>
        <p className="text-sm text-slate-800 dark:text-slate-100">
          <span className="font-semibold">You are at your destination.</span> Tap &ldquo;I&apos;ve arrived&rdquo; to end the trip.
        </p>
      </div>
    );
  }

  return ready(
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <span className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center flex-shrink-0">
        <TurnIcon instruction={guidance.nextInstruction} arrived={false} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-bold text-slate-900 dark:text-white">
          {guidance.offRoute ? 'Off the route' : `In ${formatDistance(guidance.toNextM)}`}
        </p>
        <p className="text-sm text-slate-700 dark:text-slate-200 truncate">{guidance.nextInstruction}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
          {formatDistance(guidance.remainingM)} to go · look only when it is safe {beta}
        </p>
      </div>
    </div>
  );
}
