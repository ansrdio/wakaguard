/**
 * The vehicle a traveller said they were in (src/lib/vehicle.ts), as it may
 * go to their contacts once they have been alerted: on the page they open and,
 * the plate only, in the alert text.
 */

import { sanitizeForSms } from './smsText';

/** Must match the app's (src/lib/vehicle.ts; checked by a test) */
export const MAX_PLATE_LENGTH = 12;
export const MAX_VEHICLE_DETAILS_LENGTH = 60;

type DocData = FirebaseFirestore.DocumentData;

function plateOf(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.toUpperCase().replace(/[^A-Z0-9 -]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_PLATE_LENGTH).trim();
}

function detailsOf(value: unknown): string {
  // Links are taken out, as anywhere a traveller's words reach a contact
  return sanitizeForSms(value, { maxLength: MAX_VEHICLE_DETAILS_LENGTH });
}

/** The trip's vehicle, cleaned, or null when it has none */
export function readTripVehicle(trip: DocData | undefined | null): { plate: string; details: string } | null {
  const v = trip?.vehicle;
  if (!v || typeof v !== 'object') return null;
  const vehicle = { plate: plateOf(v.plate), details: detailsOf(v.details) };
  return vehicle.plate || vehicle.details ? vehicle : null;
}

/** For the page contacts open, once they are alerted: { vehicle } or nothing */
export function vehicleForContacts(trip: DocData | undefined | null): { vehicle?: { plate: string; details: string } } {
  const vehicle = readTripVehicle(trip);
  return vehicle ? { vehicle } : {};
}

/** The plate for the alert text, or null */
export function plateForText(trip: DocData | undefined | null): string | null {
  return readTripVehicle(trip)?.plate || null;
}
