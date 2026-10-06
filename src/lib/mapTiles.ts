/**
 * @fileoverview Background map tiles
 *
 * The default is OpenStreetMap's own tile server: it needs no API key, so the
 * map works out of the box. Its usage policy only allows light traffic, which
 * is fine for development and a small pilot. Before a wider launch, point the
 * app at a provider with an account and an API key by setting
 * NEXT_PUBLIC_MAP_TILE_URL (and NEXT_PUBLIC_MAP_TILE_ATTRIBUTION), for example:
 *
 *   https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=YOUR_KEY
 *
 * The URL uses Leaflet's template format: {z}/{x}/{y}, optional {s} and {r}.
 * Tile keys are public (they are sent from the browser); restrict them to the
 * app's domains in the provider's dashboard.
 *
 * @module mapTiles
 */

const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const MAP_TILES = {
  url: process.env.NEXT_PUBLIC_MAP_TILE_URL || OSM_URL,
  attribution: process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION || OSM_ATTRIBUTION,
  /** OpenStreetMap serves tiles up to zoom 19 */
  maxZoom: 19,
};
