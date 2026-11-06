/**
 * @fileoverview Grouping nearby pins on a map (GoogleMapView.tsx)
 *
 * The old map grouped road reports with a Leaflet add-on; Google's map has no
 * grouping of its own. Pins closer together on screen than a set distance at
 * the current zoom become one group, shown as a count. Grouping is worked out
 * on the whole world's pixels at that zoom, so moving the map sideways does
 * not change the groups, only zooming does.
 *
 * @module mapGroups
 */

export interface Located {
  location: { lat: number; lng: number };
}

export interface Group<T extends Located> {
  members: T[];
  /** The middle of the group's pins */
  center: { lat: number; lng: number };
}

const TILE = 256;

/** Where a point falls on the world's map at a zoom, in pixels (Web Mercator, as Google draws it) */
export function worldPixel(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const scale = TILE * 2 ** zoom;
  const sin = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

/**
 * Each pin joins the first group whose first pin is within `radiusPx` of it on
 * screen, else starts a group. A radius of 0 leaves every pin on its own.
 */
export function groupNearby<T extends Located>(items: T[], radiusPx: number, zoom: number): Group<T>[] {
  const groups: { anchor: { x: number; y: number }; members: T[] }[] = [];
  for (const item of items) {
    const at = worldPixel(item.location.lat, item.location.lng, zoom);
    const near = radiusPx > 0
      ? groups.find((g) => Math.hypot(g.anchor.x - at.x, g.anchor.y - at.y) <= radiusPx)
      : undefined;
    if (near) near.members.push(item);
    else groups.push({ anchor: at, members: [item] });
  }
  return groups.map(({ members }) => ({
    members,
    center: {
      lat: members.reduce((sum, m) => sum + m.location.lat, 0) / members.length,
      lng: members.reduce((sum, m) => sum + m.location.lng, 0) / members.length,
    },
  }));
}
