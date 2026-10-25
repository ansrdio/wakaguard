/**
 * @fileoverview Speaking the directions (Beta, build 25, piece 5)
 *
 * Both phone apps speak through the phone's own voice (SpeakPlugin.java and
 * ios/App/App/SpeakPlugin.swift, from build 25): Android's WebView has a
 * `speechSynthesis` that says nothing, and the iPhone's is muted by silent mode
 * (the owner's iPhone 16, 25 October 2026), where navigation prompts should be
 * heard. Browsers use the Web Speech API. Lines are only spoken while the screen
 * is on, like the directions themselves.
 *
 * Only used while config/app `directionsVoice` is on (lib/appConfig.ts).
 *
 * @module speech
 */

import { Capacitor, registerPlugin } from '@capacitor/core';

interface SpeakPlugin {
  speak(options: { text: string }): Promise<void>;
  stop(): Promise<void>;
  volume(): Promise<{ level: number; max: number }>;
}

const Speak = registerPlugin<SpeakPlugin>('Speak');

const MUTED_KEY = 'wakaguard_directions_muted';

function androidApp(): boolean {
  return Capacitor.getPlatform() === 'android';
}

/** The phone's own voice, in the Android and iPhone apps from build 25 */
function nativeSpeech(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Speak');
}

function webSpeech(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

/** False in Android builds before 25 and in browsers without speech */
export function canSpeak(): boolean {
  if (nativeSpeech()) return true;
  if (androidApp()) return false;
  return webSpeech();
}

export interface VoiceInfo {
  lang: string;
  localService?: boolean;
}

/** Nigerian English if the phone has it, then British, then any English; one on the phone itself first */
export function pickVoice<T extends VoiceInfo>(voices: readonly T[]): T | null {
  const lang = (v: VoiceInfo) => v.lang.toLowerCase().replace('_', '-');
  const english = voices.filter((v) => lang(v).startsWith('en'));
  for (const wanted of ['en-ng', 'en-gb']) {
    const matches = english.filter((v) => lang(v) === wanted);
    if (matches.length) return matches.find((v) => v.localService) ?? matches[0];
  }
  return english.find((v) => v.localService) ?? english[0] ?? null;
}

/** Says a line, cutting off one still being said */
export function speak(text: string): void {
  if (nativeSpeech()) {
    void Speak.speak({ text }).catch(() => undefined);
    return;
  }
  if (androidApp() || !webSpeech()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const line = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(synth.getVoices());
  if (voice) {
    line.voice = voice;
    line.lang = voice.lang;
  } else {
    line.lang = 'en-GB';
  }
  synth.speak(line);
}

/**
 * iPhones only let a page speak after something has been said from a tap.
 * Called from the tap that starts a trip, and from the voice button, so the
 * first real line is not lost.
 */
export function primeSpeech(): void {
  if (nativeSpeech() || androidApp() || !webSpeech()) return;
  const silent = new SpeechSynthesisUtterance(' ');
  silent.volume = 0;
  window.speechSynthesis.speak(silent);
}

/**
 * True when the phone's media volume, which the spoken lines use, is all the way
 * down. Null where it cannot be read: browsers do not say.
 */
export async function mediaVolumeOff(): Promise<boolean | null> {
  if (!nativeSpeech()) return null;
  try {
    return (await Speak.volume()).level === 0;
  } catch {
    return null;
  }
}

export function stopSpeaking(): void {
  if (nativeSpeech()) {
    void Speak.stop().catch(() => undefined);
    return;
  }
  if (!androidApp() && webSpeech()) window.speechSynthesis.cancel();
}

/** The traveller's choice to keep the directions quiet, kept on the phone */
export function voiceMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTED_KEY) === '1';
  } catch {
    return false;
  }
}

export function setVoiceMuted(muted: boolean): void {
  try {
    if (muted) window.localStorage.setItem(MUTED_KEY, '1');
    else window.localStorage.removeItem(MUTED_KEY);
  } catch {
    // No storage: the choice lasts until the app closes
  }
}
