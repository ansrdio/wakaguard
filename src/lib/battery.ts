/**
 * @fileoverview The phone's battery during a trip (build 29)
 *
 * A dead battery is the commonest reason a phone goes quiet, and "battery 4%"
 * helps a contact judge whether to worry. The phone apps send the level with
 * each location update (hooks/useTripLocationSync.ts); the server keeps it with
 * the trip and its page (functions/src/tripLocation.ts) and adds it to the
 * alert texts (functions/src/templates.ts).
 *
 * @module battery
 */

import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';

export interface BatteryReading {
  /** 0 to 100 */
  level: number;
  charging: boolean;
}

/** As kept on the trip page */
export interface KeptBattery extends BatteryReading {
  atMs?: number;
}

/** At or below this, and not charging, contacts are told the phone may switch off */
export const LOW_BATTERY = 15;
/** A reading is not waited for longer than this: the position matters more */
const READ_WAIT_MS = 2000;

/** A reading from what the phone says (a level from 0 to 1), or null when it says nothing usable */
export function readingFrom(levelFraction: unknown, charging: unknown): BatteryReading | null {
  // Simulators and some phones answer -1 or nothing
  if (typeof levelFraction !== 'number' || !Number.isFinite(levelFraction) || levelFraction < 0 || levelFraction > 1) return null;
  return { level: Math.round(levelFraction * 100), charging: charging === true };
}

/** The battery now, or null when the phone does not say */
export async function readBattery(): Promise<BatteryReading | null> {
  const read = async (): Promise<BatteryReading | null> => {
    if (Capacitor.isNativePlatform()) {
      const info = await Device.getBatteryInfo();
      return readingFrom(info.batteryLevel, info.isCharging);
    }
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean }> };
    if (!nav.getBattery) return null;
    const battery = await nav.getBattery();
    return readingFrom(battery.level, battery.charging);
  };
  try {
    return await Promise.race([read(), new Promise<null>((resolve) => setTimeout(() => resolve(null), READ_WAIT_MS))]);
  } catch {
    return null;
  }
}

/** What the server kept, checked, or null */
export function keptBattery(value: unknown): KeptBattery | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.level !== 'number' || !Number.isFinite(v.level) || v.level < 0 || v.level > 100) return null;
  return { level: Math.round(v.level), charging: v.charging === true, ...(typeof v.atMs === 'number' ? { atMs: v.atMs } : {}) };
}

/**
 * The line on the trip page. `stale` is when no update has come for a while:
 * the battery is then as it was at the last update.
 */
export function batteryLine(battery: KeptBattery | null, stale: boolean): { text: string; low: boolean } | null {
  if (!battery) return null;
  const low = !battery.charging && battery.level <= LOW_BATTERY;
  if (stale) {
    return low
      ? { text: `Battery was ${battery.level}% then. Their phone may have switched off.`, low }
      : { text: `Battery was ${battery.level}% then${battery.charging ? ', charging' : ''}.`, low };
  }
  if (battery.charging) return { text: `Battery ${battery.level}%, charging`, low: false };
  return low ? { text: `Battery low: ${battery.level}%. Their phone may switch off soon.`, low } : { text: `Battery ${battery.level}%`, low };
}
