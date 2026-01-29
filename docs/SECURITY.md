# WakaGuard Security Documentation

This document outlines the security practices implemented in the WakaGuard application.

## Overview

WakaGuard handles sensitive user data including:
- Location data (GPS coordinates)
- Personal information (trusted contacts, phone numbers)
- Authentication credentials

## Authentication

### Firebase Authentication
- **Anonymous Auth**: Users start with anonymous accounts for frictionless onboarding
- **Google Sign-In**: Optional upgrade to permanent account
- **Session Persistence**: `browserLocalPersistence` maintains sessions across browser restarts

### Security Considerations
- Anonymous users can be linked to Google accounts without data loss
- No password storage (OAuth only)
- Firebase handles token refresh automatically

## Firestore Security Rules

All database access is controlled by `firestore.rules`. Key patterns:

### Public Read, Authenticated Write
```javascript
// Reports - civic data is publicly viewable
allow read: if true;
allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
```

### Owner-Only Access
```javascript
// Users collection - private to owner
allow read, write: if request.auth != null && request.auth.uid == userId;
```

### Token-Based Public Access
```javascript
// Trips - GET only by token, no list operations
allow get: if resource.data.status == 'active' && resource.data.expiresAt > request.time;
allow list: if false;  // Prevents enumeration
```

### Vote Deduplication
```javascript
// Deterministic doc ID: {userId}_{reportId}
allow write: if voteId.matches('^' + request.auth.uid + '_[a-zA-Z0-9]+$');
```

## Storage Security Rules

File uploads are controlled by `storage.rules`:

```javascript
// Only images, max 5MB, owner path only
allow write: if isAuthenticated()
             && isOwner(uid)
             && isValidImage()
             && isUnderSizeLimit();
```

## API Key Security

### Client-Side Keys (NEXT_PUBLIC_*)
Firebase API keys are designed to be public. Security is enforced by:
1. Firebase Security Rules (not the API key)
2. Domain restrictions in Firebase Console
3. App Check (optional, not yet implemented)

### Recommendations for Production
1. **Enable App Check**: Prevents unauthorized API access
2. **Restrict API Keys**: In Google Cloud Console, restrict keys to your domain
3. **Monitor Usage**: Set up alerts for unusual API usage patterns

## Trip Sharing Security

### Token Generation
```typescript
// Cryptographically secure 64-character hex token
const array = new Uint8Array(32);
crypto.getRandomValues(array);
return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
```

### Token Properties
- 256 bits of entropy (impossible to guess)
- Used as Firestore document ID
- No list operations allowed (prevents scraping)
- Auto-expiry after 24 hours

## Data Privacy

### Location Data
- Location is only shared during active trips
- Location updates stop when trip ends
- No historical location storage beyond trip duration
- Users control when to start/stop sharing

### Trusted Contacts
- Stored per-user, not globally accessible
- Only owner can read/write their contacts
- Phone numbers stored for notification (future feature)

## Rate Limiting

Client-side rate limiting prevents abuse:
```typescript
const RATE_LIMIT_MS = 60000; // 1 minute between safety actions
```

Server-side rate limiting should be implemented via Cloud Functions for production.

## Recommendations for Production

### High Priority
1. [ ] Enable Firebase App Check
2. [ ] Add server-side rate limiting via Cloud Functions
3. [ ] Implement admin role verification (custom claims)
4. [ ] Add request logging for security auditing

### Medium Priority
1. [ ] Implement report/comment moderation queue
2. [ ] Add suspicious activity detection
3. [ ] Set up security monitoring alerts
4. [ ] Regular security rule audits

### Low Priority
1. [ ] Penetration testing
2. [ ] SOC 2 compliance review
3. [ ] GDPR compliance documentation

## Incident Response

### If API Key is Compromised
1. Rotate keys in Firebase Console
2. Update `.env.local` with new keys
3. Redeploy application
4. Review access logs for unauthorized activity

### If Data Breach Suspected
1. Disable affected user accounts
2. Review Firestore audit logs
3. Notify affected users
4. Document and report incident

## Contact

For security concerns, contact the development team at [security email].
