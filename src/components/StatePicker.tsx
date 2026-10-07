'use client';

import { PILOT_STATES } from '@/lib/nigerianStates';
import { MapPin, Search, X } from 'lucide-react';
import { useState } from 'react';

interface StatePickerProps {
  onStateSelect: (state: string) => void;
  onCancel?: () => void;
}

export function StatePicker({ onStateSelect, onCancel }: StatePickerProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStates = PILOT_STATES.filter(state =>
    state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-brand-600" aria-hidden="true" />
            <h2 className="text-xl font-bold text-gray-900">Choose your state</h2>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search states"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>

        {/* State List */}
        <div className="flex-1 overflow-y-auto p-4 touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
          {filteredStates.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {filteredStates.map((state) => (
                <button
                  key={state}
                  onClick={() => onStateSelect(state)}
                  className="px-4 py-3 text-left border border-gray-200 rounded-xl hover:bg-brand-50 hover:border-brand-300 transition-colors group"
                >
                  <span className="font-medium text-gray-900 group-hover:text-brand-700">
                    {state}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">
                No states found matching "{searchQuery}"
              </p>
              <p className="text-xs text-gray-400">
                Try a different search term
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <p className="text-center text-xs text-gray-500">
            Used to show reports near you. You can change it later.
          </p>
        </div>
      </div>
    </div>
  );
}
