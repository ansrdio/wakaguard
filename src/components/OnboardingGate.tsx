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
          <div className="fixed top-4 left-4 right-4 z-[60] max-w-md mx-auto">
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
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900 p-6">
        <div className="text-center max-w-md">
          <div className="relative inline-block mb-8">
            <div className="w-24 h-24 bg-brand-100 rounded-full animate-ping absolute"></div>
            <div className="w-24 h-24 bg-brand-600 rounded-full flex items-center justify-center relative">
              <Navigation className="w-11 h-11 text-white" aria-hidden="true" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Finding your state</h2>
          <p className="text-slate-600 dark:text-slate-300">Allow location access if your phone asks.</p>
        </div>
      </div>
    );
  }

  // First question after signing in
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900">
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center w-full max-w-md mx-auto">
        <div className="w-24 h-24 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center mb-8">
          <MapPin className="w-11 h-11" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Which state are you in?</h1>
        <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          We use it to show what other travellers have reported near you. You can change it at any time.
        </p>
      </div>

      <div className="px-6 pt-6 w-full max-w-md mx-auto space-y-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}>
        <button
          onClick={handleUseLocation}
          disabled={detecting}
          className="w-full py-4 bg-brand-600 text-white rounded-2xl font-bold text-lg hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Navigation className="w-5 h-5" aria-hidden="true" />
          Use my location
        </button>
        <button
          onClick={handlePickState}
          disabled={detecting}
          className="w-full py-4 rounded-2xl font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <MapPin className="w-5 h-5" aria-hidden="true" />
          Choose a state
        </button>
      </div>
    </div>
  );
}
