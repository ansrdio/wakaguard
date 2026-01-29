/**
 * Safe token generator that works on all platforms including older iOS WKWebView.
 * crypto.randomUUID() is not supported on all iOS versions and can crash the app.
 */
export function safeToken(): string {
  // Prefer Web Crypto if available
  const g = globalThis as any;
  if (g.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    g.crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback for environments without crypto
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
}
