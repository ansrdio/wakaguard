'use client';

import { MapPin, X } from 'lucide-react';

interface LocationPermissionPromptProps {
  onAllow: () => void;
  onDismiss: () => void;
}

export function LocationPermissionPrompt({ onAllow, onDismiss }: LocationPermissionPromptProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in slide-in-from-bottom-4 duration-300">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <MapPin className="w-8 h-8 text-blue-600" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Enable Location Access
          </h2>
          
          <p className="text-sm text-slate-600 mb-6">
            Use your location to center the map and speed up reporting road issues in your area.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={onAllow}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium shadow-md hover:shadow-lg"
            >
              Allow
            </button>
            <button
              onClick={onDismiss}
              className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
            >
              Not now
            </button>
          </div>

          <p className="text-xs text-slate-400 mt-4">
            You can change this later in your browser settings
          </p>
        </div>
      </div>
    </div>
  );
}
