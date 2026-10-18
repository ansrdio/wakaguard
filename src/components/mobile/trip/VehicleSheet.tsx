'use client';

/** Add or change the vehicle on a running trip: the plate is usually only seen on boarding */

import { useState } from 'react';
import { X } from 'lucide-react';
import { useBackToClose } from '@/hooks/useBackToClose';
import { readVehicle, Vehicle } from '@/lib/vehicle';
import { VehicleFields } from '@/components/mobile/trip/VehicleFields';

export function VehicleSheet({
  current,
  processing,
  onSave,
  onClose,
}: {
  current: Vehicle | null;
  processing: boolean;
  onSave: (vehicle: Vehicle | null) => void;
  onClose: () => void;
}) {
  const [plate, setPlate] = useState(current?.plate ?? '');
  const [details, setDetails] = useState(current?.details ?? '');
  useBackToClose(true, onClose);
  const next = readVehicle(plate, details);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="vehicle-title">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="vehicle-title" className="text-xl font-bold text-slate-900 dark:text-white">Vehicle details</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-full bg-slate-100 dark:bg-slate-700">
            <X className="w-5 h-5 text-slate-700 dark:text-slate-200" aria-hidden="true" />
          </button>
        </div>
        <VehicleFields plate={plate} details={details} onPlate={setPlate} onDetails={setDetails} idPrefix="trip-vehicle" />
        <button
          type="button"
          disabled={processing || (!next && !current)}
          onClick={() => onSave(next)}
          className="w-full py-3.5 rounded-2xl font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {next || !current ? 'Save' : 'Remove vehicle details'}
        </button>
      </div>
    </div>
  );
}
