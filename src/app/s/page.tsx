'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Trip, TripStatus } from '@/lib/types';
import { MapPin, Clock, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import { formatTimeRemaining, isTripExpired } from '@/lib/safety';
import { lazy } from 'react';

const MapView = lazy(() => import('@/components/MapView'));

function SharedTripContent() {
  const searchParams = useSearchParams();
  // Read token from query param instead of path param
  const token = searchParams.get('token') || '';
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateAgo, setLastUpdateAgo] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchTrip = async () => {
      try {
        const tripDoc = await getDoc(doc(db, 'trips', token));
        
        if (!tripDoc.exists()) {
          setError('Trip not found or has ended');
          return;
        }

        const tripData = tripDoc.data() as Trip;

        if (tripData.status !== TripStatus.ACTIVE) {
          setError('This trip has ended');
          return;
        }

        if (isTripExpired(tripData.expiresAt)) {
          setError('This trip share link has expired');
          return;
        }

        setTrip(tripData);
      } catch (err) {
        console.error('Error fetching trip:', err);
        setError('Failed to load trip information');
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
    const interval = setInterval(fetchTrip, 30000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (!trip?.lastUpdate) return;

    const updateTimestamp = () => {
      const now = Date.now();
      const diff = now - trip.lastUpdate!.toMillis();
      const minutes = Math.floor(diff / 60000);
      
      if (minutes === 0) {
        setLastUpdateAgo('Just now');
      } else if (minutes === 1) {
        setLastUpdateAgo('1 minute ago');
      } else if (minutes < 60) {
        setLastUpdateAgo(`${minutes} minutes ago`);
      } else {
        const hours = Math.floor(minutes / 60);
        setLastUpdateAgo(`${hours} hour${hours > 1 ? 's' : ''} ago`);
      }
    };

    updateTimestamp();
    const interval = setInterval(updateTimestamp, 10000);
    return () => clearInterval(interval);
  }, [trip?.lastUpdate]);

  // No token provided
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">No Trip Token</h1>
          <p className="text-sm text-slate-600">Please provide a valid trip token in the URL.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
          <p className="text-slate-600">Loading trip information...</p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            {error || 'Trip Not Found'}
          </h1>
          <p className="text-sm text-slate-600">
            The trip you&apos;re looking for may have ended or the link may be invalid.
          </p>
        </div>
      </div>
    );
  }

  const isEmergency = trip.status === TripStatus.EMERGENCY;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Shared Trip Location</h1>
              <p className="text-xs text-slate-500">WakaGuard Safety</p>
            </div>
          </div>
        </div>
      </header>

      {isEmergency && (
        <div className="bg-red-600 text-white px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
            <span className="font-semibold">EMERGENCY: This person has triggered an SOS alert</span>
          </div>
        </div>
      )}

      <main className="flex-1 p-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-3 h-3 rounded-full ${isEmergency ? 'bg-red-600 animate-pulse' : 'bg-green-600 animate-pulse'}`} />
                <span className={`text-sm font-semibold ${isEmergency ? 'text-red-900' : 'text-green-900'}`}>
                  {isEmergency ? 'Emergency Alert' : 'Trip Active'}
                </span>
              </div>

              <div className="flex items-start gap-3 mb-4 pb-4 border-b border-slate-200">
                <Clock className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 mb-1">Last updated</p>
                  <p className="text-sm font-medium text-slate-900">{lastUpdateAgo}</p>
                </div>
              </div>

              {trip.lastLocation && (
                <div className="flex items-start gap-3 mb-4">
                  <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Current location</p>
                    <p className="text-sm font-medium text-slate-900">
                      {trip.lastLocation.lat.toFixed(6)}, {trip.lastLocation.lng.toFixed(6)}
                    </p>
                    {trip.lastLocation.accuracy && (
                      <p className="text-xs text-slate-500 mt-1">
                        Accuracy: ±{Math.round(trip.lastLocation.accuracy)}m
                      </p>
                    )}
                  </div>
                </div>
              )}

              {trip.destination && (
                <div className="flex items-start gap-3 mb-4">
                  <CheckCircle className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Destination</p>
                    <p className="text-sm font-medium text-slate-900">{trip.destination}</p>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500 mb-1">Share expires</p>
                <p className="text-sm font-medium text-slate-700">
                  {formatTimeRemaining(trip.expiresAt)}
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">About This Share</h3>
              <p className="text-xs text-blue-700 leading-relaxed">
                Someone you know has shared their live location with you using WakaGuard Safety. 
                This page updates automatically every 30 seconds.
              </p>
            </div>

            {isEmergency && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-red-900 mb-2">Emergency Alert</h3>
                <p className="text-xs text-red-700 leading-relaxed">
                  This person has triggered an emergency SOS alert. If you&apos;re a trusted contact, 
                  please check on their wellbeing or contact emergency services if needed.
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[70vh] lg:h-[calc(100vh-8rem)]">
            {trip.lastLocation ? (
              <Suspense fallback={<div className="flex items-center justify-center h-full"><p>Loading map...</p></div>}>
                <MapView
                  reports={[]}
                  selectedReportId={null}
                  onMarkerClick={() => {}}
                  selectedState={null}
                  userLocation={trip.lastLocation}
                  onLocate={undefined}
                  locating={false}
                />
              </Suspense>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">Waiting for location update...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-4">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs text-slate-500 text-center">
            Powered by <span className="font-semibold text-slate-700">WakaGuard</span> Safety • 
            This is a secure, token-based share link
          </p>
        </div>
      </footer>
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function SharedTripPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    }>
      <SharedTripContent />
    </Suspense>
  );
}
