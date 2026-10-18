/**
 * @fileoverview Background map tiles
 *
 * Mapbox's map pictures when NEXT_PUBLIC_MAPBOX_TOKEN is set (the owner chose
 * Mapbox on 14 October 2026), through its Static Tiles API: 512-pixel tiles
 * shown with Leaflet. They cost about the same data as OpenStreetMap's, and
 * the first 200,000 a month are free. Mapbox's terms ask for its wordmark on
 * the map and "Improve this map" in the credits (MapboxLogo.tsx).
 *
 * Without the token the map falls back to OpenStreetMap's own tile server,
 * which needs no key but only allows light traffic. Any other provider can
 * be set with NEXT_PUBLIC_MAP_TILE_URL (and NEXT_PUBLIC_MAP_TILE_ATTRIBUTION),
 * in Leaflet's template format: {z}/{x}/{y}, optional {s} and {r}.
 *
 * Tile keys are public (they are sent from the browser); restrict them to the
 * app's addresses in the provider's dashboard.
 *
 * @module mapTiles
 */

const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MAPBOX_STYLE = 'mapbox/streets-v12';
const MAPBOX_ATTRIBUTION =
  '&copy; <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener noreferrer">Mapbox</a> ' +
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> ' +
  '<strong><a href="https://www.mapbox.com/map-feedback/" target="_blank" rel="noopener noreferrer">Improve this map</a></strong>';

const custom = process.env.NEXT_PUBLIC_MAP_TILE_URL;

/** True when the map shows Mapbox's pictures, which must carry its wordmark */
export const USES_MAPBOX = !custom && !!MAPBOX_TOKEN;

/** Everything a Leaflet TileLayer needs: <TileLayer {...MAP_TILES} /> */
export const MAP_TILES = custom
  ? { url: custom, attribution: process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION || OSM_ATTRIBUTION, maxZoom: 19 }
  : USES_MAPBOX
    ? {
        url: `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE}/tiles/512/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`,
        attribution: MAPBOX_ATTRIBUTION,
        maxZoom: 19,
        // A 512-pixel tile covers four of Leaflet's usual 256-pixel ones
        tileSize: 512,
        zoomOffset: -1,
      }
    : { url: OSM_URL, attribution: OSM_ATTRIBUTION, maxZoom: 19 };
