/**
 * @fileoverview Choosing a contact with the phone's own contacts screen
 *
 * The person picks one number there and only that entry is handed to the app
 * (android/app/src/main/java/com/wakaguard/app/ContactPickerPlugin.java and
 * ios/App/App/ContactPickerPlugin.swift). The app therefore needs no
 * permission to read contacts, on Android or on iPhone.
 *
 * @module contactPicker
 */

import { registerPlugin } from '@capacitor/core';

interface ContactPickerPlugin {
  pick(): Promise<{ cancelled: boolean; name?: string | null; phone?: string | null }>;
}

const ContactPicker = registerPlugin<ContactPickerPlugin>('ContactPicker');

export interface PickedContact {
  name: string;
  phone: string;
}

/** Tidies what the phone handed over. Null when nothing usable was chosen. */
export function readPickedContact(picked: { cancelled?: boolean; name?: unknown; phone?: unknown } | null | undefined): PickedContact | null {
  if (!picked || picked.cancelled) return null;
  const phone = typeof picked.phone === 'string' ? picked.phone.replace(/\s/g, '') : '';
  if (!phone) return null;
  return { name: typeof picked.name === 'string' ? picked.name.trim() : '', phone };
}

/** Opens the phone's contacts screen. Resolves to null when the person backs out without choosing. */
export async function pickPhoneContact(): Promise<PickedContact | null> {
  return readPickedContact(await ContactPicker.pick());
}
