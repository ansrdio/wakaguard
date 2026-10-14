/**
 * @fileoverview WakaGuard's own pictures, in place of emoji
 *
 * Emoji look different on every phone and say nothing about where the app is
 * from. These are drawn in the app's own colours: the green, danfo yellow,
 * adire indigo, palm oil red and cream of the first concept (12 October 2026).
 *
 * Each picture is kept as plain SVG text, because the map needs it as text
 * (a map pin is a piece of HTML, not a React component) and the screens can
 * use the same text. Nothing here comes from a person: it is all written out
 * below, so it is safe to put on the page as it is.
 *
 * No Firebase or DOM access (functions/test/pictures.test.ts).
 *
 * @module pictures
 */

const GREEN = '#11763F';
const YELLOW = '#F7B500';
const INDIGO = '#1E2A5E';
const RED = '#C2410C';
const CREAM = '#FBF3E0';
const TYRE = '#111827';
const HUB = '#9CA3AF';
const GLASS = '#BFD7EA';

const tile = (fill: string) => `<rect width="64" height="64" rx="14" fill="${fill}"/>`;

const tenth = (n: number) => Math.round(n * 10) / 10;

/** The back of a car `w` wide, centred on `cx`: rear window, brake lights on, number plate, tyres */
function carFromBehind(cx: number, top: number, w: number, fill: string): string {
  const h = w * 0.8;
  const x = (f: number) => tenth(cx - w / 2 + f * w);
  const y = (f: number) => tenth(top + f * h);
  const box = (fx: number, fy: number, fw: number, fh: number, round: number, colour: string) =>
    `<rect x="${x(fx)}" y="${y(fy)}" width="${tenth(fw * w)}" height="${tenth(fh * h)}" rx="${tenth(round * w)}" fill="${colour}"/>`;
  return `<path d="M${x(0.22)} ${y(0)} H${x(0.78)} Q${x(0.86)} ${y(0)} ${x(0.9)} ${y(0.12)} L${x(0.98)} ${y(0.46)} H${x(0.02)} L${x(0.1)} ${y(0.12)} Q${x(0.14)} ${y(0)} ${x(0.22)} ${y(0)} Z" fill="${fill}"/>`
    + `<path d="M${x(0.27)} ${y(0.09)} H${x(0.73)} L${x(0.82)} ${y(0.4)} H${x(0.18)} Z" fill="${GLASS}"/>`
    + box(0.06, 0.78, 0.18, 0.22, 0.04, TYRE) + box(0.76, 0.78, 0.18, 0.22, 0.04, TYRE)
    + box(0, 0.42, 1, 0.42, 0.1, fill)
    + box(0.07, 0.52, 0.2, 0.12, 0.03, RED) + box(0.73, 0.52, 0.2, 0.12, 0.03, RED)
    + box(0.37, 0.62, 0.26, 0.12, 0.02, CREAM);
}

/** One picture for each kind of road report, on a coloured tile. Keys are the report types in lib/types.ts */
const REPORT_PICTURES: Record<string, string> = {
  // A hole in the road, with the broken edge of the tar and the lane marking above it
  pothole:
    tile(YELLOW)
    + `<ellipse cx="32" cy="36" rx="20" ry="10" fill="${INDIGO}"/>`
    + `<path d="M14 36 L20 30 L26 35 L33 28 L40 34 L50 32" fill="none" stroke="${YELLOW}" stroke-width="2.5" stroke-linejoin="round"/>`
    + `<path d="M10 18 H54" stroke="${INDIGO}" stroke-width="3" stroke-dasharray="7 6" stroke-linecap="round" fill="none"/>`,

  // Go-slow: the queue ahead, seen from the car behind, brake lights on.
  // Chosen by the owner on 13 October over three boxes in a row, which read as a battery.
  traffic:
    tile(YELLOW)
    + carFromBehind(32, 7, 20, INDIGO) + carFromBehind(32, 15, 30, GREEN) + carFromBehind(32, 27, 46, INDIGO),

  accident:
    tile(RED)
    + `<path d="M32 10 L37 24 L52 20 L42 32 L54 42 L39 41 L36 55 L29 42 L14 46 L23 34 L11 24 L26 25 Z" fill="${YELLOW}"/>`
    + `<path d="M32 22 V36" stroke="${RED}" stroke-width="4" stroke-linecap="round" fill="none"/><circle cx="32" cy="43" r="2.5" fill="${RED}"/>`,

  // A road cone
  roadwork:
    tile(INDIGO)
    + `<path d="M32 12 L46 48 H18 Z" fill="${YELLOW}"/><path d="M27 26 H37 M23 37 H41" stroke="${CREAM}" stroke-width="4" fill="none"/>`
    + `<rect x="12" y="48" width="40" height="6" rx="3" fill="${YELLOW}"/>`,

  hazard:
    tile(YELLOW)
    + `<path d="M32 11 L55 51 H9 Z" fill="none" stroke="${INDIGO}" stroke-width="5" stroke-linejoin="round"/>`
    + `<path d="M32 25 V38" stroke="${INDIGO}" stroke-width="5" stroke-linecap="round" fill="none"/><circle cx="32" cy="45" r="3" fill="${INDIGO}"/>`,

  // Road closed: the no-entry sign
  closure:
    tile(RED)
    + `<circle cx="32" cy="32" r="20" fill="${CREAM}"/><rect x="18" y="27" width="28" height="10" rx="3" fill="${RED}"/>`,

  // A barrier across the road
  checkpoint:
    tile(INDIGO)
    + `<rect x="12" y="20" width="8" height="32" rx="2" fill="${CREAM}"/><rect x="16" y="22" width="40" height="9" rx="3" fill="${CREAM}"/>`
    + `<path d="M24 22 L30 31 M36 22 L42 31 M48 22 L54 31" stroke="${RED}" stroke-width="5" fill="none"/>`,

  // Anything else: a pin on the map
  other:
    tile(GREEN)
    + `<path d="M32 54 L19 33 A15 15 0 1 1 45 33 Z" fill="${CREAM}"/><circle cx="32" cy="25" r="6" fill="${GREEN}"/>`,
};

const wheel = (cx: number, cy: number, r: number) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${TYRE}"/><circle cx="${cx}" cy="${cy}" r="${Math.round(r * 0.4 * 10) / 10}" fill="${HUB}"/>`;

const carBody = (fill: string) =>
  `<path d="M4 44 V30 Q4 24 12 22 L28 6 Q32 2 40 2 H74 Q82 2 86 8 L98 22 Q112 24 112 34 V44 Z" fill="${fill}"/>`
  + `<path d="M34 8 H54 V22 H22 Z M60 8 H76 L88 22 H60 Z" fill="${GLASS}"/>${wheel(30, 46, 10)}${wheel(88, 46, 10)}`;

/** One picture for each way of travelling, with no tile behind it. Keys are the ids in lib/travelMode.ts */
const TRAVEL_PICTURES: Record<string, string> = {
  // A danfo: the yellow bus with its two black stripes
  bus:
    `<g transform="translate(3,17) scale(0.5)"><rect width="116" height="50" rx="9" fill="${YELLOW}"/>`
    + `<rect y="28" width="116" height="4" fill="${TYRE}"/><rect y="35" width="116" height="4" fill="${TYRE}"/>`
    + `<rect x="10" y="7" width="22" height="15" rx="3" fill="${INDIGO}"/><rect x="37" y="7" width="22" height="15" rx="3" fill="${INDIGO}"/>`
    + `<rect x="64" y="7" width="22" height="15" rx="3" fill="${INDIGO}"/><rect x="92" y="7" width="18" height="18" rx="3" fill="${GLASS}"/>`
    + `${wheel(28, 52, 10)}${wheel(90, 52, 10)}</g>`,

  keke:
    `<g transform="translate(2,10) scale(0.62)"><path d="M6 52 L16 16 Q20 4 34 4 H72 Q86 4 88 20 L92 52 Z" fill="${YELLOW}"/>`
    + `<path d="M22 20 Q24 12 34 12 H46 V34 H18 Z" fill="${GLASS}"/><rect x="52" y="12" width="28" height="22" rx="3" fill="${INDIGO}"/>`
    + `<rect x="6" y="40" width="86" height="5" fill="${GREEN}"/>${wheel(20, 60, 9)}${wheel(78, 60, 9)}</g>`,

  // A motorcycle and its rider
  okada:
    `<g transform="translate(2,16) scale(0.58)"><circle cx="18" cy="54" r="14" fill="none" stroke="${TYRE}" stroke-width="5"/>`
    + `<circle cx="88" cy="54" r="14" fill="none" stroke="${TYRE}" stroke-width="5"/>`
    + `<path d="M18 54 L40 34 H70 L88 54 M70 34 L78 20 H90" fill="none" stroke="${RED}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<rect x="36" y="26" width="34" height="9" rx="4" fill="${TYRE}"/><circle cx="58" cy="2" r="9" fill="${GREEN}"/>`
    + `<path d="M46 28 Q50 10 60 12 L74 22" fill="none" stroke="${GREEN}" stroke-width="9" stroke-linecap="round"/></g>`,

  car: `<g transform="translate(3,18) scale(0.52)">${carBody(GREEN)}</g>`,

  // The same car in taxi yellow, with the sign on its roof
  taxi:
    `<g transform="translate(3,20) scale(0.52)"><rect x="44" y="-8" width="24" height="11" rx="3" fill="${INDIGO}"/>${carBody(YELLOW)}`
    + `<rect x="4" y="30" width="108" height="4" fill="${TYRE}"/></g>`,

  foot:
    `<circle cx="34" cy="13" r="6.5" fill="${GREEN}"/>`
    + `<path d="M34 23 L30 38 L21 53 M30 38 L41 53 M33 27 L22 33 M34 27 L45 34" fill="none" stroke="${GREEN}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`,

  other:
    `<circle cx="16" cy="32" r="6" fill="${INDIGO}"/><circle cx="32" cy="32" r="6" fill="${INDIGO}"/><circle cx="48" cy="32" r="6" fill="${INDIGO}"/>`,
};

function asSvg(inside: string, size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${inside}</svg>`;
}

/** The kinds of road report that have a picture of their own */
export const REPORT_PICTURE_TYPES = Object.keys(REPORT_PICTURES);

/** The ways of travelling that have a picture of their own */
export const TRAVEL_PICTURE_MODES = Object.keys(TRAVEL_PICTURES);

/** The picture for a kind of road report, as SVG text. A kind that is not known gets the plain pin. */
export function reportPictureSvg(type: string, size = 64): string {
  return asSvg(REPORT_PICTURES[type] ?? REPORT_PICTURES.other, size);
}

/** The picture for a way of travelling, as SVG text. One that is not known gets the three dots of "other". */
export function travelPictureSvg(mode: string, size = 64): string {
  return asSvg(TRAVEL_PICTURES[mode] ?? TRAVEL_PICTURES.other, size);
}
