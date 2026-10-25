'use client';

import { ArrowUp, CornerUpLeft, CornerUpRight, Flag, Loader2, Navigation, RotateCw, Volume2, VolumeX } from 'lucide-react';
import { formatDistance } from '@/lib/directions';
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

/**
 * The next turn on a trip (directions Beta, build 25), for the trip card and the
 * trip map. Nothing at all while directions are off for this trip.
 */
export function DirectionsLine({ directions, className = '' }: { directions: TripDirections; className?: string }) {
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

  const { route, guidance, rerouting, voice } = directions;
  const ready = (content: React.ReactNode) => (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 min-w-0">{content}</div>
      {voice && <VoiceButton voice={voice} />}
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
