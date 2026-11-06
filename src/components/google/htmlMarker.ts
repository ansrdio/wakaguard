/**
 * A pin made of ordinary HTML on a Google map: the trip's dots, the report
 * pictures, the cluster counts. Built on Google's OverlayView, which needs no
 * map ID and is not being retired (unlike google.maps.Marker), so the pins can
 * keep the look they had on the old map.
 */

import type { GoogleMapsLibraries } from '@/lib/googleMaps';

export type MarkerAnchor = 'center' | 'bottom';

export interface HtmlMarker {
  readonly element: HTMLElement;
  setMap(map: google.maps.Map | null): void;
  setPosition(position: google.maps.LatLngLiteral): void;
}

interface MarkerOptions {
  /** Which point of the element sits on the spot: its middle (dots) or its bottom (pins) */
  anchor?: MarkerAnchor;
  /** Taps go to the element instead of the map */
  clickable?: boolean;
  zIndex?: number;
}

type MarkerClass = new (
  position: google.maps.LatLngLiteral,
  element: HTMLElement,
  anchor: MarkerAnchor,
  clickable: boolean
) => HtmlMarker;

const classes = new WeakMap<typeof google.maps.OverlayView, MarkerClass>();

/** Google's OverlayView only exists once its script has loaded, so the class is made then, once */
function markerClass(OverlayView: typeof google.maps.OverlayView): MarkerClass {
  const known = classes.get(OverlayView);
  if (known) return known;

  class Overlay extends OverlayView implements HtmlMarker {
    constructor(
      private position: google.maps.LatLngLiteral,
      readonly element: HTMLElement,
      private readonly anchor: MarkerAnchor,
      private readonly clickable: boolean
    ) {
      super();
      element.style.position = 'absolute';
    }

    onAdd() {
      const panes = this.getPanes();
      if (!panes) return;
      (this.clickable ? panes.overlayMouseTarget : panes.overlayLayer).appendChild(this.element);
      if (this.clickable) OverlayView.preventMapHitsAndGesturesFrom(this.element);
    }

    draw() {
      const point = this.getProjection()?.fromLatLngToDivPixel(this.position);
      if (!point) return;
      this.element.style.left = `${point.x}px`;
      this.element.style.top = `${point.y}px`;
      this.element.style.transform = this.anchor === 'center' ? 'translate(-50%, -50%)' : 'translate(-50%, -100%)';
    }

    onRemove() {
      this.element.remove();
    }

    setPosition(position: google.maps.LatLngLiteral) {
      this.position = position;
      this.draw();
    }
  }

  classes.set(OverlayView, Overlay);
  return Overlay;
}

export function createHtmlMarker(
  libs: GoogleMapsLibraries,
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  element: HTMLElement,
  { anchor = 'center', clickable = false, zIndex }: MarkerOptions = {}
): HtmlMarker {
  if (zIndex !== undefined) element.style.zIndex = String(zIndex);
  const Overlay = markerClass(libs.maps.OverlayView);
  const marker = new Overlay(position, element, anchor, clickable);
  marker.setMap(map);
  return marker;
}

/** A round dot of a fixed size on screen, as the old map's CircleMarker drew */
export function dotElement({ size, fill, ring = '#ffffff', ringWidth = 3, shadow = false }: {
  size: number;
  fill: string;
  ring?: string;
  ringWidth?: number;
  shadow?: boolean;
}): HTMLDivElement {
  const dot = document.createElement('div');
  Object.assign(dot.style, {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    background: fill,
    border: `${ringWidth}px solid ${ring}`,
    boxSizing: 'border-box',
    boxShadow: shadow ? '0 1px 4px rgba(0,0,0,0.35)' : 'none',
  });
  return dot;
}

/**
 * A dot with a label that opens when it is tapped and closes on a second tap,
 * as the old map's tooltips did ("Going here", "Stopped at a checkpoint, 2:14 pm").
 */
export function labelledDotElement(dot: HTMLElement, label: string): HTMLDivElement {
  const holder = document.createElement('div');
  holder.style.cursor = 'pointer';
  holder.setAttribute('role', 'button');
  holder.setAttribute('aria-label', label);
  holder.appendChild(dot);

  const bubble = document.createElement('div');
  bubble.textContent = label;
  Object.assign(bubble.style, {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translate(-50%, -6px)',
    whiteSpace: 'nowrap',
    background: '#ffffff',
    color: '#0f172a',
    font: '600 12px/1.3 system-ui, -apple-system, sans-serif',
    padding: '4px 8px',
    borderRadius: '6px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
    display: 'none',
  });
  holder.appendChild(bubble);
  holder.addEventListener('click', (event) => {
    event.stopPropagation();
    bubble.style.display = bubble.style.display === 'none' ? 'block' : 'none';
  });
  return holder;
}
