const BASE_URL = process.env.APP_BASE_URL || 'https://wakaguard.com';

export interface MessagePayload {
  type: 'sos' | 'checkin' | 'trip_share' | 'one_time';
  lat?: number;
  lng?: number;
  address?: string;
  token?: string;
  message?: string;
  userName?: string;
}

function buildMapsLink(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat},${lng}`;
}

function buildShareLink(token: string): string {
  return `${BASE_URL}/t/${token}`;
}

export function buildSosMessage(payload: MessagePayload): string {
  const parts: string[] = ['WakaGuard SOS: I need help.'];

  if (payload.lat != null && payload.lng != null) {
    parts.push(`Location: ${payload.lat.toFixed(6)},${payload.lng.toFixed(6)}.`);
    parts.push(`Map: ${buildMapsLink(payload.lat, payload.lng)}`);
  }

  if (payload.address) {
    parts.push(`Address: ${payload.address}`);
  }

  if (payload.token) {
    parts.push(`Track: ${buildShareLink(payload.token)}`);
  }

  return parts.join(' ');
}

export function buildCheckinMessage(payload: MessagePayload): string {
  const parts: string[] = ["WakaGuard check-in: I'm OK."];

  if (payload.message) {
    parts.push(payload.message);
  }

  if (payload.lat != null && payload.lng != null) {
    parts.push(`Map: ${buildMapsLink(payload.lat, payload.lng)}`);
  }

  return parts.join(' ');
}

export function buildTripShareMessage(payload: MessagePayload): string {
  if (!payload.token) {
    return 'WakaGuard trip share: Track my trip (link unavailable)';
  }

  const parts: string[] = [
    'WakaGuard trip share: Track my trip here:',
    buildShareLink(payload.token),
    '(expires soon)',
  ];

  return parts.join(' ');
}

export function buildOneTimeMessage(message: string): string {
  const prefix = 'WakaGuard: ';
  const maxLen = 240;
  const available = maxLen - prefix.length;
  const truncated = message.length > available ? message.slice(0, available - 3) + '...' : message;
  return prefix + truncated;
}

export function buildMessageForType(payload: MessagePayload): string {
  switch (payload.type) {
    case 'sos':
      return buildSosMessage(payload);
    case 'checkin':
      return buildCheckinMessage(payload);
    case 'trip_share':
      return buildTripShareMessage(payload);
    case 'one_time':
      return buildOneTimeMessage(payload.message || '');
    default:
      return 'WakaGuard notification';
  }
}
