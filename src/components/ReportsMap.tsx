'use client';

/**
 * The road reports map: Google's when its key is set (build 27, lib/googleMaps.ts),
 * else the old OpenStreetMap one, kept for tests against the emulators.
 */

import dynamic from 'next/dynamic';
import type { MapViewProps } from './MapView';
import { USES_GOOGLE_MAPS } from '@/lib/googleMaps';

const ReportsMap = dynamic<MapViewProps>(() => (USES_GOOGLE_MAPS ? import('./GoogleMapView') : import('./MapView')), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-100 dark:bg-slate-800" />,
});

export default ReportsMap;
