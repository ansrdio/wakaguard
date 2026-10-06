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

export function buildShareLink(token: string): string {
  return `${BASE_URL}/s?token=${token}`;
}

export function buildSosMessage(payload: MessagePayload): string {
  const parts: string[] = [
    payload.userName ? `WakaGuard SOS: ${payload.userName} needs help.` : 'WakaGuard SOS: I need help.',
  ];

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

// -------------------------------------------------------------------------
// Server-initiated messages (overdue monitor)
// -------------------------------------------------------------------------

/** Format a time for contacts in Nigeria, e.g. "Tue 4:30 PM". */
export function formatLagosTime(ms: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(ms));
}

export interface OverduePayload {
  userName: string;
  kind: 'trip' | 'timer';
  deadlineMs: number;
  destination?: string | null;
  lat?: number | null;
  lng?: number | null;
  lastUpdateMs?: number | null;
  token?: string | null;
}

export function buildOverdueMessage(p: OverduePayload): string {
  const due = formatLagosTime(p.deadlineMs);
  const parts: string[] = [];

  if (p.kind === 'trip') {
    const where = p.destination ? ` to ${p.destination}` : '';
    parts.push(`WakaGuard: ${p.userName} has not checked in from a trip${where}, due ${due}.`);
  } else {
    parts.push(`WakaGuard: ${p.userName} set a safety timer and has not checked in, due ${due}.`);
  }

  if (p.lat != null && p.lng != null) {
    const seen = p.lastUpdateMs ? ` received ${formatLagosTime(p.lastUpdateMs)}` : '';
    parts.push(`Last location${seen}: ${buildMapsLink(p.lat, p.lng)}`);
  } else if (p.kind === 'trip') {
    parts.push('No location was received.');
  }

  if (p.token) {
    parts.push(`Track: ${buildShareLink(p.token)}`);
  }

  parts.push('Please call them.');
  return parts.join(' ');
}

export function buildAllClearMessage(p: {
  userName: string;
  reason: 'ended' | 'extended' | 'checked_in';
  newDeadlineMs?: number | null;
}): string {
  if (p.reason === 'extended' && p.newDeadlineMs) {
    return `WakaGuard: ${p.userName} has checked in and extended the trip. New expected arrival ${formatLagosTime(p.newDeadlineMs)}.`;
  }
  if (p.reason === 'ended') {
    return `WakaGuard: ${p.userName} has checked in and ended the trip safely.`;
  }
  return `WakaGuard: ${p.userName} has checked in safely.`;
}
