'use client';

/**
 * The weather where you are, always in the top bar: a picture and the
 * temperature, asked for again every 30 minutes while the app is in use
 * (useWeatherAhead). Tapping it shows the next few hours. Only when location
 * is already allowed: the weather is never a reason to ask. Chosen by the
 * owner on 18 October 2026 over weather notifications through the day, which
 * would get WakaGuard's notifications, and the trip reminders, switched off.
 */

import { useState } from 'react';
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSun, Moon, Sun, X, type LucideIcon } from 'lucide-react';
import { useWeatherAhead } from '@/hooks/useWeatherAhead';
import { useBackToClose } from '@/hooks/useBackToClose';
import { formatClock } from '@/lib/tripPlanning';
import { WEATHER_CREDIT, WEATHER_ICON_WORDS, WeatherAhead, WeatherIcon, weatherIcon, weatherLine } from '@/lib/weatherWords';

const PICTURES: Record<WeatherIcon, LucideIcon> = {
  'clear-day': Sun, 'clear-night': Moon, 'partly-day': CloudSun, 'partly-night': CloudMoon,
  cloudy: Cloud, 'light-rain': CloudDrizzle, rain: CloudRain, storm: CloudLightning, fog: CloudFog,
};

/** Rain and storms in blue and amber, so a glance is enough */
const TINT: Partial<Record<WeatherIcon, string>> = {
  'clear-day': 'text-amber-500', 'partly-day': 'text-amber-500', 'light-rain': 'text-blue-600 dark:text-blue-400',
  rain: 'text-blue-600 dark:text-blue-400', storm: 'text-amber-600 dark:text-amber-400',
};

function Picture({ symbol, className }: { symbol: string | null; className: string }) {
  const icon = weatherIcon(symbol);
  const Shape = PICTURES[icon];
  return <Shape className={`${className} ${TINT[icon] ?? 'text-slate-500 dark:text-slate-300'}`} aria-hidden="true" />;
}

function WeatherSheet({ ahead, onClose }: { ahead: WeatherAhead; onClose: () => void }) {
  useBackToClose(true, onClose);
  const nowHour = ahead.next[0];
  const line = weatherLine(ahead);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="weather-title">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="weather-title" className="text-xl font-bold text-slate-900 dark:text-white">Weather here</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-full bg-slate-100 dark:bg-slate-700">
            <X className="w-5 h-5 text-slate-700 dark:text-slate-200" aria-hidden="true" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <Picture symbol={nowHour.symbol} className="w-10 h-10" />
          <p className="text-slate-900 dark:text-white">
            <span className="text-3xl font-bold">{nowHour.temperature !== null ? `${nowHour.temperature}°C` : '—'}</span>
            <span className="block text-sm text-slate-600 dark:text-slate-300">{WEATHER_ICON_WORDS[weatherIcon(nowHour.symbol)]}</span>
          </p>
        </div>
        {line && (
          <p className={`text-sm ${line.tone === 'warn' ? 'text-amber-800 dark:text-amber-300 font-medium' : 'text-slate-600 dark:text-slate-300'}`}>
            {line.text}
          </p>
        )}
        <ol className="grid grid-cols-6 gap-1 text-center" aria-label="The next hours">
          {ahead.next.map((hour) => (
            <li key={hour.atMs} className="flex flex-col items-center gap-1 rounded-xl bg-slate-50 dark:bg-slate-900 py-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {formatClock(hour.atMs).replace(':00', '').replace(/\s?([AP])M/i, (_, m) => `${m.toLowerCase()}m`)}
              </span>
              <Picture symbol={hour.symbol} className="w-5 h-5" />
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {hour.temperature !== null ? `${hour.temperature}°` : '—'}
              </span>
              <span className="sr-only">{WEATHER_ICON_WORDS[weatherIcon(hour.symbol)]}</span>
            </li>
          ))}
        </ol>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          For your area, roughly. Updated every 30 minutes. {WEATHER_CREDIT}
        </p>
      </div>
    </div>
  );
}

export function WeatherChip() {
  return <WeatherChipView ahead={useWeatherAhead(true, 6)} />;
}

/** The icon for a forecast already in hand */
export function WeatherChipView({ ahead }: { ahead: WeatherAhead | null }) {
  const [open, setOpen] = useState(false);
  const nowHour = ahead?.next[0];
  if (!ahead || !nowHour || nowHour.temperature === null) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Weather here: ${WEATHER_ICON_WORDS[weatherIcon(nowHour.symbol)]}, ${nowHour.temperature} degrees`}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100"
      >
        <Picture symbol={nowHour.symbol} className="w-4 h-4" />
        {nowHour.temperature}°
      </button>
      {open && <WeatherSheet ahead={ahead} onClose={() => setOpen(false)} />}
    </>
  );
}
