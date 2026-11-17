import { test } from 'node:test';
import assert from 'node:assert/strict';
import { navigateUrl, showInMapsUrl } from '../../src/lib/mapsLink';

test('"Navigate with Google Maps" sets the destination and always says how they travel', () => {
  assert.equal(
    navigateUrl(6.5244, 3.3792, false),
    'https://www.google.com/maps/dir/?api=1&destination=6.5244,3.3792&travelmode=driving',
  );
  assert.equal(
    navigateUrl(6.5244, 3.3792, true),
    'https://www.google.com/maps/dir/?api=1&destination=6.5244,3.3792&travelmode=walking',
  );
});

const ANDROID = 'Mozilla/5.0 (Linux; Android 11; Infinix X688B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const COMPUTER = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

test('a report opens at its spot in the maps app, with no route asked for', () => {
  assert.equal(showInMapsUrl(6.5, 3.4, ANDROID), 'https://www.google.com/maps/search/?api=1&query=6.5,3.4');
  assert.equal(showInMapsUrl(6.5, 3.4, IPHONE), 'maps://maps.apple.com/?q=6.5,3.4');
  assert.equal(showInMapsUrl(6.5, 3.4, COMPUTER), 'https://www.google.com/maps/search/?api=1&query=6.5,3.4');
  for (const agent of [ANDROID, IPHONE, COMPUTER]) {
    assert.doesNotMatch(showInMapsUrl(6.5, 3.4, agent), /dir|daddr|destination/);
  }
});
