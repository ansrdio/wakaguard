/**
 * Sizes the phone screens share, as CSS lengths.
 *
 * The bars at the top and bottom grow on phones with a notch or a home
 * indicator, so anything that has to sit against one of them is placed with
 * these and not with a fixed number.
 */

/** The bottom bar: its row of tabs plus the phone's home-indicator strip (MobileBottomNav) */
export const BOTTOM_NAV_HEIGHT = 'calc(4rem + env(safe-area-inset-bottom, 0px))';

/** The top bar: its row plus the phone's status-bar strip (MobileTopBar) */
export const TOP_BAR_HEIGHT = 'calc(env(safe-area-inset-top, 0px) + 56px)';

/** The reports sheet on the Nearby map when only its heading shows */
export const SHEET_PEEK_HEIGHT = '4rem';

/** How far the sheet's rounded top corners reach down. The map runs under them. */
export const SHEET_CORNER = '1.5rem';

/**
 * Set on the map's box to the height of whatever lies over its bottom edge.
 * The legend, the map's own credit line and its buttons stand clear of it.
 */
export const MAP_BOTTOM_CLEAR = '--map-bottom-clear';
