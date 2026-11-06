/**
 * The small part of Google's Maps JavaScript API that WakaGuard uses
 * (lib/googleMaps.ts). Written by hand rather than adding @types/google.maps;
 * add to it as more of the API is used. Names and shapes follow Google's
 * reference: https://developers.google.com/maps/documentation/javascript/reference
 */

declare namespace google.maps {
  interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
  }

  class LatLngBounds {
    constructor();
    extend(point: LatLng | LatLngLiteral): LatLngBounds;
    contains(point: LatLng | LatLngLiteral): boolean;
    getNorthEast(): LatLng;
    getSouthWest(): LatLng;
    isEmpty(): boolean;
  }

  interface Padding {
    top: number;
    right: number;
    bottom: number;
    left: number;
  }

  interface MapOptions {
    center?: LatLngLiteral;
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    disableDefaultUI?: boolean;
    zoomControl?: boolean;
    gestureHandling?: 'cooperative' | 'greedy' | 'none' | 'auto';
    clickableIcons?: boolean;
    keyboardShortcuts?: boolean;
    backgroundColor?: string;
  }

  interface MapsEventListener {
    remove(): void;
  }

  interface MapMouseEvent {
    latLng: LatLng | null;
  }

  class Map {
    constructor(element: HTMLElement, options?: MapOptions);
    getCenter(): LatLng | undefined;
    getZoom(): number | undefined;
    getBounds(): LatLngBounds | undefined;
    getDiv(): HTMLElement;
    setCenter(center: LatLng | LatLngLiteral): void;
    setZoom(zoom: number): void;
    panTo(center: LatLng | LatLngLiteral): void;
    fitBounds(bounds: LatLngBounds, padding?: number | Padding): void;
    addListener(eventName: string, handler: (event: MapMouseEvent) => void): MapsEventListener;
  }

  enum SymbolPath {
    CIRCLE = 0,
  }

  interface GSymbol {
    path: SymbolPath | string;
    scale?: number;
    fillColor?: string;
    fillOpacity?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
  }

  interface IconSequence {
    icon: GSymbol;
    offset?: string;
    repeat?: string;
  }

  interface PolylineOptions {
    path?: LatLngLiteral[];
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
    icons?: IconSequence[];
    clickable?: boolean;
    zIndex?: number;
    map?: Map | null;
  }

  class Polyline {
    constructor(options?: PolylineOptions);
    setMap(map: Map | null): void;
    setOptions(options: PolylineOptions): void;
  }

  interface CircleOptions {
    center?: LatLngLiteral;
    radius?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
    fillColor?: string;
    fillOpacity?: number;
    clickable?: boolean;
    zIndex?: number;
    map?: Map | null;
  }

  class Circle {
    constructor(options?: CircleOptions);
    setMap(map: Map | null): void;
    setOptions(options: CircleOptions): void;
  }

  interface Point {
    x: number;
    y: number;
  }

  interface MapCanvasProjection {
    fromLatLngToDivPixel(latLng: LatLng | LatLngLiteral): Point | null;
  }

  interface MapPanes {
    floatPane: Element;
    mapPane: Element;
    markerLayer: Element;
    overlayLayer: Element;
    overlayMouseTarget: Element;
  }

  class OverlayView {
    static preventMapHitsAndGesturesFrom(element: Element): void;
    setMap(map: Map | null): void;
    getMap(): Map | null;
    getPanes(): MapPanes | null;
    getProjection(): MapCanvasProjection | null;
    onAdd(): void;
    draw(): void;
    onRemove(): void;
  }

  namespace event {
    function addListenerOnce(instance: object, eventName: string, handler: () => void): MapsEventListener;
    function clearInstanceListeners(instance: object): void;
  }

  interface MapsLibrary {
    Map: typeof Map;
    Polyline: typeof Polyline;
    Circle: typeof Circle;
    OverlayView: typeof OverlayView;
  }

  interface CoreLibrary {
    LatLng: typeof LatLng;
    LatLngBounds: typeof LatLngBounds;
    event: typeof event;
  }

  function importLibrary(name: 'maps'): Promise<MapsLibrary>;
  function importLibrary(name: 'core'): Promise<CoreLibrary>;
}

interface Window {
  /** Called by Google's script when our key is refused (wrong address, limit reached, key removed) */
  gm_authFailure?: () => void;
}
