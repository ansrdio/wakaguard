/**
 * @fileoverview What the traveller is riding in: the plate number, and the
 * bus company, driver or colour
 *
 * Optional, added when starting a trip or later from the trip card, since the
 * plate is usually only seen on boarding. Kept with the private trip. Contacts
 * see it only once they have been alerted (overdue, or an SOS), when the
 * server copies it to the page they open (functions/src/vehicle.ts), and the
 * alert text carries the plate.
 *
 * Plates are not checked against a format: commercial, state and foreign
 * plates all differ. What is typed is only tidied.
 *
 * @module vehicle
 */

/** Must match the server's (functions/src/vehicle.ts; checked by a test) */
export const MAX_PLATE_LENGTH = 12;
export const MAX_VEHICLE_DETAILS_LENGTH = 60;

export interface Vehicle {
  plate: string;
  details: string;
}

/** Capitals, digits, spaces and dashes, as plates are written */
export function cleanPlate(typed: unknown): string {
  if (typeof typed !== 'string') return '';
  return typed.toUpperCase().replace(/[^A-Z0-9 -]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_PLATE_LENGTH).trim();
}

export function cleanVehicleDetails(typed: unknown): string {
  if (typeof typed !== 'string') return '';
  return typed.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_VEHICLE_DETAILS_LENGTH).trim();
}

/** What was typed, cleaned, or null when nothing was */
export function readVehicle(plate: unknown, details: unknown): Vehicle | null {
  const v = { plate: cleanPlate(plate), details: cleanVehicleDetails(details) };
  return v.plate || v.details ? v : null;
}

/** The vehicle as stored on a trip, or null */
export function storedVehicle(value: unknown): Vehicle | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  return readVehicle(v.plate, v.details);
}

/** One line for the trip card and the contacts' page: "Plate KJA 12 AB · Blue bus" */
export function vehicleSummary(vehicle: Vehicle): string {
  return [vehicle.plate && `Plate ${vehicle.plate}`, vehicle.details].filter(Boolean).join(' · ');
}
