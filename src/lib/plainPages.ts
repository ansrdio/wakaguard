import { useSelectedLayoutSegments } from 'next/navigation';

// Plain information: nothing on these depends on who is signed in or on the chosen theme
const PLAIN_PAGES = ['/about', '/privacy', '/support', '/guidelines'];

/**
 * Whether the page being shown is drawn at once instead of waiting for the app
 * to start, which also puts its text in the page itself, where search engines
 * and anyone checking the site without running scripts can read it.
 *
 * That is the plain pages, and the front page, which does its own waiting:
 * until the app has started it draws the landing page, which is the same for
 * everyone.
 *
 * The answer comes from the page that was built, not from the address bar. The
 * host serves the front page for any address it does not know, and what the
 * browser draws first has to match what was built.
 */
export function useDrawsBeforeAppStarts(): boolean {
  const page = `/${useSelectedLayoutSegments().join('/')}`;
  return page === '/' || PLAIN_PAGES.includes(page);
}
