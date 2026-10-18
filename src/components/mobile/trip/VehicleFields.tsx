'use client';

/** The plate and the other details of a vehicle (lib/vehicle.ts), on the start form and the edit sheet */

import { MAX_PLATE_LENGTH, MAX_VEHICLE_DETAILS_LENGTH } from '@/lib/vehicle';

const inputClass =
  'w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 ' +
  'text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500';

export function VehicleFields({
  plate,
  details,
  onPlate,
  onDetails,
  idPrefix,
}: {
  plate: string;
  details: string;
  onPlate: (value: string) => void;
  onDetails: (value: string) => void;
  idPrefix: string;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={`${idPrefix}-plate`} className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
          Plate number
        </label>
        <input
          id={`${idPrefix}-plate`}
          type="text"
          value={plate}
          maxLength={MAX_PLATE_LENGTH + 4}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => onPlate(e.target.value.toUpperCase())}
          className={`${inputClass} uppercase tracking-wide`}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-details`} className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
          Bus company, driver or colour
        </label>
        <input
          id={`${idPrefix}-details`}
          type="text"
          value={details}
          maxLength={MAX_VEHICLE_DETAILS_LENGTH}
          onChange={(e) => onDetails(e.target.value)}
          className={inputClass}
        />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Your contacts see these only if you don&apos;t arrive or you press SOS.
      </p>
    </div>
  );
}
