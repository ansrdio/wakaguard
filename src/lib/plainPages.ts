/**
 * Pages that are plain information: nothing on them depends on who is signed
 * in or on the chosen theme. They are shown at once instead of waiting for the
 * app to start, which also puts their text in the page itself, where search
 * engines and anyone checking the site without running scripts can read it.
 */
export function isPlainPage(pathname: string | null): boolean {
  return pathname === '/about';
}
