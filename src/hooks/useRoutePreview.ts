'use client';

import { useEffect, useState } from 'react';
import { Route, routeProfile } from '@/lib/directions';
import { directionsAvailable, fetchRoute } from '@/lib/directionsFetch';
import { whereThePhoneIs } from '@/lib/reportDistance';
import { Point } from '@/lib/destinationPoint';

export type RoutePreview =
  | { state: 'off' }
  | { state: 'finding' }
  | { state: 'none' }
  | { state: 'found'; route: Route };

/**
 * The route from where the phone is to the destination pin, for the start form
 * (directions Beta, build 25). Asked again only when the pin moves or the trip
 * changes between on foot and on the road. Nothing is asked while directions
 * are switched off or there is no pin.
 */
export function useRoutePreview(enabled: boolean, point: Point | null, travelMode: string | null): RoutePreview {
  const profile = routeProfile(travelMode);
  const key = enabled && point && directionsAvailable() ? `${point.lat},${point.lng},${profile}` : null;
  const [preview, setPreview] = useState<{ key: string | null; value: RoutePreview }>({ key: null, value: { state: 'off' } });

  useEffect(() => {
    if (!key || !point) return;
    let live = true;
    setPreview({ key, value: { state: 'finding' } });
    void (async () => {
      const from = await whereThePhoneIs();
      const route = from ? await fetchRoute(from, point, profile) : null;
      if (live) setPreview({ key, value: route ? { state: 'found', route } : { state: 'none' } });
    })();
    return () => { live = false; };
    // The key holds the point and the profile
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return key && preview.key === key ? preview.value : { state: 'off' };
}
