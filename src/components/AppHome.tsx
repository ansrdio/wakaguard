'use client';

import { useState, useEffect } from 'react';
import { useReports } from '@/hooks/useReports';
import { useSelectedState } from '@/hooks/useSelectedState';
import { useAuthedUser } from '@/hooks/useAuthedUser';
import { useUserStats } from '@/hooks/useUserStats';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { OnboardingGate } from '@/components/OnboardingGate';
import { OnboardingFlow, useOnboardingStatus } from '@/components/OnboardingFlow';
import { UsernameSetup } from '@/components/UsernameSetup';
import { EmailVerification } from '@/components/EmailVerification';
import { DesktopHome } from '@/components/DesktopHome';
import { MobileHome } from '@/components/mobile/MobileHome';
import { NigerianState } from '@/lib/nigerianStates';
import { resetPageWhenKeyboardCloses } from '@/lib/nativeKeyboard';
import { AppLoader } from '@/components/AppLoader';
import { AccountDeletionScreen } from '@/components/AccountDeletionScreen';
import { useAccountDeletion } from '@/lib/accountDeletion';

/**
 * The app itself: the first-run screens, then the trip, nearby and profile
 * screens. The front page (app/page.tsx) decides whether a visitor gets this
 * or the landing page.
 */
export function AppHome() {
  const { selectedState, setSelectedState, isLoaded } = useSelectedState();
  const { ready: authReady, uid, email, emailVerified, needsUsername } = useAuthedUser();
  const { checkDailyLogin } = useUserStats(uid);
  const { mounted, isDesktop } = useResponsiveLayout();

  // Every phone screen on this page (first-run steps, sign-in, home) fills the
  // window and scrolls inside itself, so iOS must not leave the page shifted
  // after typing
  useEffect(() => (isDesktop ? undefined : resetPageWhenKeyboardCloses()), [isDesktop]);

  // Check daily login for streak points
  useEffect(() => {
    if (uid && emailVerified) {
      checkDailyLogin();
    }
  }, [uid, emailVerified, checkDailyLogin]);
  const { showOnboarding, completeOnboarding, checked: onboardingChecked } = useOnboardingStatus();
  const deletion = useAccountDeletion();
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationPromptDismissed, setLocationPromptDismissed] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const effectiveState: NigerianState = (selectedState ?? 'Lagos') as NigerianState;
  const { reports: rawReports, loading, error } = useReports(effectiveState);

  // Location handling
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocating(false);
        setShowLocationPrompt(false);
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission denied. Please enable location in your browser settings.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError('Location information unavailable.');
        } else if (error.code === error.TIMEOUT) {
          setLocationError('Location request timed out.');
        } else {
          setLocationError('An unknown error occurred while getting your location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  // An account being deleted: the profile below is disappearing as this shows
  if (deletion.stage !== 'idle') {
    return <AccountDeletionScreen deletion={deletion} />;
  }

  // Show onboarding if state not selected
  if (!isLoaded || !authReady || !onboardingChecked) {
    return <AppLoader />;
  }

  // Show onboarding flow for first-time users (tutorial + notifications + auth)
  if (showOnboarding) {
    return <OnboardingFlow onComplete={completeOnboarding} />;
  }

  // Show email verification screen for unverified users
  if (uid && email && !emailVerified) {
    return <EmailVerification email={email} />;
  }

  // Show username setup for authenticated users without a username
  if (uid && needsUsername) {
    return <UsernameSetup uid={uid} onComplete={() => {}} />;
  }

  if (!selectedState) {
    return <OnboardingGate onStateSelected={(state) => setSelectedState(state as NigerianState)} />;
  }

  // Show skeleton while mounting to avoid hydration mismatch
  if (!mounted) {
    return <AppLoader />;
  }

  // Route to appropriate layout
  if (isDesktop) {
    return (
      <DesktopHome
        rawReports={rawReports}
        loading={loading}
        error={error}
        selectedState={selectedState}
        effectiveState={effectiveState}
        onStateChange={setSelectedState}
        userLocation={userLocation}
        onLocate={handleLocateMe}
        locating={locating}
        showLocationPrompt={showLocationPrompt}
        onDismissLocationPrompt={() => {
          setShowLocationPrompt(false);
          setLocationPromptDismissed(true);
        }}
        locationError={locationError}
        onClearLocationError={() => setLocationError(null)}
      />
    );
  }

  return (
    <MobileHome
      rawReports={rawReports}
      loading={loading}
      selectedState={selectedState}
      effectiveState={effectiveState}
      onStateChange={setSelectedState}
      userLocation={userLocation}
      onLocate={handleLocateMe}
      locating={locating}
    />
  );
}
