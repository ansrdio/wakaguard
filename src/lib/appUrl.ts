/**
 * @fileoverview Public web address of WakaGuard
 *
 * Links that leave the app (shared trips, shared reports) must point at the
 * website. Inside the phone app the page's own address is a local one
 * (capacitor://localhost), so never build shareable links from
 * window.location.
 *
 * @module appUrl
 */

export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://wakaguard.com').replace(/\/+$/, '');

/** Public page for a single road report. */
export function buildReportLink(reportId: string): string {
  return `${APP_URL}/r?id=${encodeURIComponent(reportId)}`;
}
