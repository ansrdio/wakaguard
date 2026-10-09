import { useSelectedLayoutSegments } from 'next/navigation';

/**
 * Whether the page being shown is drawn at once instead of waiting for the app
 * to start, which also puts its text in the page itself, where search engines
 * and anyone checking the site without running scripts can read it.
 *
 * /about is plain information: nothing on it depends on who is signed in or on
 * the chosen theme. The front page does its own waiting: until the app has
 * started it draws the landing page, which is the same for everyone.
 *
 * The answer comes from the page that was built, not from the address bar. The
 * host serves the front page for any address it does not know, and what the
 * browser draws first has to match what was built.
 */
export function useDrawsBeforeAppStarts(): boolean {
  const page = `/${useSelectedLayoutSegments().join('/')}`;
  return page === '/' || page === '/about';
}
