import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

export type ShareMode = "start" | "checkin" | "end";

export interface ShareOptions {
  mode?: ShareMode;
  destination?: string | null;
}

/**
 * Opens the native share sheet to share a Safe Trip link.
 * Supports different modes: start, checkin, end.
 * On web, falls back to copying to clipboard.
 */
export async function shareSafeTripLink(
  shareUrl: string,
  opts?: ShareOptions
): Promise<void> {
  const mode = opts?.mode ?? "start";
  const dest = opts?.destination ? ` Destination: ${opts.destination}.` : "";

  const text =
    mode === "checkin"
      ? `Quick check-in: I am OK.${dest} Track here: ${shareUrl}`
      : mode === "end"
      ? `Safe Trip ended. I am safe.${dest}`
      : `I started a WakaGuard Safe Trip.${dest} Track me here: ${shareUrl}`;

  const title =
    mode === "checkin"
      ? "WakaGuard Check-in"
      : mode === "end"
      ? "WakaGuard Trip Ended"
      : "WakaGuard Safe Trip";

  // Native share sheet on Android/iOS
  if (Capacitor.isNativePlatform()) {
    await Share.share({
      title,
      text,
      url: mode === "end" ? undefined : shareUrl,
      dialogTitle: "Share with trusted contact",
    });
    return;
  }

  // Web fallback: copy to clipboard
  await navigator.clipboard.writeText(mode === "end" ? text : `${text}`);
}

/**
 * Share a report link via native share sheet or clipboard.
 */
export async function shareReportLink(shareUrl: string, description: string): Promise<void> {
  const text = `Check out this road hazard report on WakaGuard: ${description}`;

  if (Capacitor.isNativePlatform()) {
    await Share.share({
      title: "WakaGuard Report",
      text,
      url: shareUrl,
      dialogTitle: "Share report",
    });
    return;
  }

  await navigator.clipboard.writeText(shareUrl);
}
