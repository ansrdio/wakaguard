'use client';

import { useState } from 'react';
import { MapPin, Navigation, AlertCircle } from 'lucide-react';
import { detectStateFromGeolocation } from '@/lib/geolocation';
import { normalizeStateName, PILOT_STATES } from '@/lib/nigerianStates';
import { StatePicker } from './StatePicker';

interface OnboardingGateProps {
  onStateSelected: (state: string) => void;
}

type ViewState = 'initial' | 'detecting' | 'picker' | 'error';

export function OnboardingGate({ onStateSelected }: OnboardingGateProps) {
  const [viewState, setViewState] = useState<ViewState>('initial');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);

  const handleUseLocation = async () => {
    setViewState('detecting');
    setDetecting(true);
    setErrorMessage(null);

    try {
      const result = await detectStateFromGeolocation();

      if (result.state) {
        // Check if detected state is in pilot states
        if (PILOT_STATES.includes(result.state)) {
          // Successfully detected a pilot state
          onStateSelected(result.state);
        } else {
          // Detected state is not in pilot program yet
          setErrorMessage(`${result.state} is not in our pilot program yet. Please select a pilot state.`);
          setViewState('picker');
        }
      } else {
        // Detection failed or state not in our list
        setErrorMessage(result.error || 'Could not detect your state');
        setViewState('picker');
      }
    } catch (error) {
      console.error('Location detection error:', error);
      setErrorMessage('An unexpected error occurred');
      setViewState('picker');
    } finally {
      setDetecting(false);
    }
  };

  const handlePickState = () => {
    setViewState('picker');
  };

  const handleStateSelect = (state: string) => {
    // Normalize the state name
    const normalized = normalizeStateName(state);
    if (normalized) {
      onStateSelected(normalized);
    }
  };

  const handleCancelPicker = () => {
    setViewState('initial');
    setErrorMessage(null);
  };

  // State Picker Modal
  if (viewState === 'picker') {
    return (
      <>
        {errorMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] max-w-md w-full mx-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">{errorMessage}</p>
                <p className="text-xs text-yellow-700 mt-1">Please select your state manually</p>
              </div>
            </div>
          </div>
        )}
        <StatePicker 
          onStateSelect={handleStateSelect}
          onCancel={handleCancelPicker}
        />
      </>
    );
  }

  // Detecting Location
  if (viewState === 'detecting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="text-center max-w-md">
          <div className="relative inline-block mb-6">
            <div className="w-24 h-24 bg-blue-100 rounded-full animate-ping absolute"></div>
            <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center relative">
              <Navigation className="w-12 h-12 text-white animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Detecting Your Location</h2>
          <p className="text-gray-600 mb-4">
            Please allow location access when prompted...
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // Initial Welcome Screen
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-blue-500 rounded-full mb-4">
            <MapPin className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Welcome to WakaGuard</h1>
          <p className="text-gray-600 text-lg">
            Track road conditions in your area
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <p className="text-center text-gray-700 mb-6">
            To get started, we need to know which Nigerian state you want to monitor
          </p>

          <div className="space-y-3">
            {/* Use Location Button */}
            <button
              onClick={handleUseLocation}
              disabled={detecting}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <Navigation className="w-5 h-5" />
              <div className="text-left">
                <div className="font-semibold">Use My Location</div>
                <div className="text-xs opacity-90">Automatically detect your state</div>
              </div>
            </button>

            {/* Pick State Button */}
            <button
              onClick={handlePickState}
              disabled={detecting}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-gray-700 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <MapPin className="w-5 h-5" />
              <div className="text-left">
                <div className="font-semibold">Pick My State</div>
                <div className="text-xs opacity-70">Choose from list manually</div>
              </div>
            </button>
          </div>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>Your selection will be saved for future visits</p>
        </div>
      </div>
    </div>
  );
}
