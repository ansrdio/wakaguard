'use client';

import { CloudFog, CloudLightning, CloudRain, CloudSun, Thermometer } from 'lucide-react';
import type { TravelMode } from '@/lib/travelMode';
import { WEATHER_CREDIT, WeatherAhead, WeatherKind, weatherLine } from '@/lib/weatherWords';

const ICONS: Record<WeatherKind, typeof CloudRain> = {
  storm: CloudLightning,
  'heavy-rain': CloudRain,
  rain: CloudRain,
  fog: CloudFog,
  heat: Thermometer,
};

/** One line on what the weather will do here, with MET Norway's credit. Nothing until it is known. */
export function WeatherLine({ ahead, travelMode, className = '' }: {
  ahead: WeatherAhead | null;
  travelMode?: TravelMode | null;
  className?: string;
}) {
  const line = weatherLine(ahead, travelMode);
  if (!line) return null;
  const Icon = line.kind ? ICONS[line.kind] : CloudSun;
  const warn = line.tone === 'warn';
  return (
    <div
      className={`${warn
        ? 'rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-2.5'
        : ''} ${className}`}
      aria-live="polite"
    >
      <p className={`flex items-start gap-2 text-sm ${warn ? 'text-amber-950 dark:text-amber-100 font-medium' : 'text-slate-600 dark:text-slate-300'}`}>
        <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${warn ? 'text-amber-700 dark:text-amber-300' : 'text-sky-600 dark:text-sky-300'}`} aria-hidden="true" />
        {line.text}
      </p>
      <p className="mt-0.5 pl-6 text-[11px] text-slate-500 dark:text-slate-400">{WEATHER_CREDIT}</p>
    </div>
  );
}
