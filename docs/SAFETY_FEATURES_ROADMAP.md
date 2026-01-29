# RoadPulse Safety Features - Production Roadmap

## ✅ P0 - Critical Security Fixes (COMPLETED)

### 1. Token-Based Document Access (FIXED)
**Problem:** Original implementation used Firestore queries, requiring list permissions
```typescript
// ❌ BEFORE: Query operation (requires list permission)
const q = query(collection(db, 'trips'), where('shareToken', '==', token));
const snapshot = await getDocs(q);

// ✅ AFTER: Direct get operation (secure, no list needed)
const tripDoc = await getDoc(doc(db, 'trips', token));
```

**Solution Implemented:**
- Token is now used as document ID: `trips/{token}`
- Public route uses `getDoc()` for direct access (no query/list)
- User's active trip reference stored in `users/{uid}.activeTripToken`
- Prevents scraping even with client-side code inspection

**Files Modified:**
- `src/components/SafetyModal.tsx` - Changed from `addDoc()` to `setDoc(doc(db, 'trips', token))`
- `src/app/s/[token]/page.tsx` - Changed from `getDocs(query(...))` to `getDoc(doc(...))`

---

### 2. Firestore Security Rules (IMPLEMENTED)

**Rules Added:** `firestore.rules`

```javascript
match /trips/{tripToken} {
  // PUBLIC GET ONLY - no list/query operations allowed
  allow get: if resource.data.status == 'active'
    && resource.data.expiresAt > request.time;
  
  // DENY ALL LIST OPERATIONS (prevents scraping)
  allow list: if false;
  
  // Owner-only write operations
  allow create: if request.auth != null
    && request.resource.data.uid == request.auth.uid
    && request.resource.data.shareToken == tripToken
    && request.resource.data.expiresAt < request.time + duration.value(24, 'h');
  
  allow update: if request.auth != null
    && resource.data.uid == request.auth.uid;
}
```

**Security Guarantees:**
- ✅ Public can get trip by token (read-only, no list)
- ✅ Cannot enumerate/scrape all trips
- ✅ Token must match docId
- ✅ Expiry enforced at rules level (max 24h)
- ✅ Only owner can create/update/delete

**Other Collections:**
- `trustedContacts`, `safetyTimers`, `alerts`, `checkIns` - owner-only access
- All collections deny public listing

---

## 🔄 P0 - Still TODO (High Priority)

### 3. Location Precision Controls
**Why:** Exact GPS coordinates can reveal sensitive info (home address, etc.)

**Implementation Plan:**
```typescript
// Add to Trip interface
interface Trip {
  // ... existing fields
  locationPrecision: 'exact' | 'approximate'; // User preference
}

// Helper function
function roundLocation(lat: number, lng: number, precision: 'exact' | 'approximate') {
  if (precision === 'exact') {
    return { lat, lng };
  }
  // Round to ~100m accuracy (3 decimal places)
  return {
    lat: Math.round(lat * 1000) / 1000,
    lng: Math.round(lng * 1000) / 1000,
  };
}
```

**UI Changes:**
- Add toggle in SafetyModal: "Share exact location" vs "Share approximate area"
- Public view shows accuracy level: "Exact location" or "Within ~100m"

---

### 4. Token Revoke & Rotation
**Why:** User may accidentally share link publicly or want to regenerate

**Implementation:**
```typescript
// Add to SafetyModal
const handleRegenerateLink = async () => {
  if (!activeTrip) return;
  
  const newToken = generateShareToken();
  
  // Invalidate old trip
  await updateDoc(doc(db, 'trips', activeTrip.id), {
    status: TripStatus.CANCELLED,
  });
  
  // Create new trip with new token
  await setDoc(doc(db, 'trips', newToken), {
    ...activeTrip,
    shareToken: newToken,
    createdAt: serverTimestamp(),
  });
  
  // Update user reference
  await updateDoc(doc(db, 'users', uid), {
    activeTripToken: newToken,
  });
  
  setActiveTrip({ ...activeTrip, id: newToken, shareToken: newToken });
};
```

**UI:**
- Add "Regenerate Link" button in active trip banner
- Confirmation: "Old link will stop working immediately"

---

## 📱 P1 - Notifications (Critical for Real Safety)

### 5. Trusted Contacts System
**Current State:** Collections exist, but no invite/verification flow

**MVP Implementation:**
1. **Invitation Flow**
```typescript
// Add to Trip when starting
interface TripInvitation {
  id: string;
  tripId: string;
  recipientPhone: string;
  recipientEmail?: string;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: Timestamp;
  expiresAt: Timestamp; // 48h expiry
}

// SMS/Email content
const message = `
${userName} has shared their live location with you via RoadPulse Safety.
View their location: ${window.location.origin}/s/${token}

This link is private and expires in 24 hours.
`;
```

2. **Contact Management UI**
   - New component: `TrustedContactsManager.tsx`
   - Add/remove contacts (name + phone/email)
   - Contact verification via OTP (optional for MVP)
   - "Share with all contacts" quick action

3. **Notification Delivery**
   - **Phase 1 (MVP):** Email via Resend/SendGrid API
   - **Phase 2:** SMS via Twilio
   - **Phase 3:** Push notifications (if contact is app user)

**Integration Points:**
- Trip start → Send invitations to selected contacts
- SOS trigger → Immediate alerts to all contacts
- Timer expired → Alert if not acknowledged
- Check-in → Confirmation to contacts

---

### 6. Server-Side Rate Limiting
**Current:** localStorage-based (client-side, bypassable)

**Production Solution:**

**Option A: Cloud Functions (Recommended)**
```typescript
// functions/src/safety.ts
export const createTrip = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new Error('Unauthorized');
  
  // Rate limit check
  const userRef = admin.firestore().doc(`users/${uid}`);
  const userData = await userRef.get();
  const lastTrip = userData.data()?.lastTripCreated;
  
  if (lastTrip && Date.now() - lastTrip.toMillis() < 60000) {
    throw new Error('Rate limit: Wait 1 minute between trips');
  }
  
  // Create trip with server timestamp
  const token = generateSecureToken();
  await admin.firestore().doc(`trips/${token}`).set({
    uid,
    shareToken: token,
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  
  // Update user's last action
  await userRef.update({
    lastTripCreated: admin.firestore.FieldValue.serverTimestamp(),
    activeTripToken: token,
  });
  
  return { token };
});
```

**Option B: Firebase App Check (Prevent Bot Abuse)**
- Add App Check to project settings
- Verify App Check tokens in Firestore rules
- Blocks scripted abuse, allows legitimate clients

**Implementation Priority:**
1. Add App Check (30 min setup, huge security gain)
2. Migrate create operations to Cloud Functions (2-3 hours)
3. Add server-side rate limiting (1 hour)

---

## 🎨 P1 - UX Polish

### 7. Safety Home State
**Add to SafetyModal when no trusted contacts exist:**
```tsx
{contacts.length === 0 && (
  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
    <Users className="w-12 h-12 text-blue-600 mx-auto mb-3" />
    <h3 className="font-semibold text-blue-900 mb-2">
      Add Trusted Contacts
    </h3>
    <p className="text-sm text-blue-700 mb-4">
      Add family or friends to notify them when you need help
    </p>
    <button className="px-4 py-2 bg-blue-600 text-white rounded-xl">
      Add Contact
    </button>
  </div>
)}
```

### 8. Trip Banner Polish
**Current:** Basic active/stop UI

**Enhanced:**
```tsx
<div className="bg-green-50 border border-green-200 rounded-2xl p-4">
  <div className="flex items-center justify-between mb-3">
    <div>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
        <span className="text-sm font-semibold text-green-900">Trip Active</span>
      </div>
      <p className="text-xs text-green-700">
        Started {formatTimeAgo(trip.startTime)} • 
        Ends {formatTimeRemaining(trip.expiresAt)}
      </p>
      <p className="text-xs text-green-600 mt-1">
        Last update: {lastUpdateAgo}
      </p>
    </div>
  </div>
  
  {/* Actions */}
  <div className="flex gap-2">
    <button className="flex-1 bg-white border border-green-300 ...">
      <Copy /> Copy Link
    </button>
    <button className="flex-1 bg-white border border-orange-300 ...">
      <RefreshCw /> Regenerate
    </button>
    <button className="flex-1 bg-white border border-red-300 ...">
      <AlertTriangle /> SOS
    </button>
  </div>
  
  <button className="w-full mt-2 bg-slate-100 ...">
    Stop Sharing
  </button>
</div>
```

### 9. Mental Model Clarity
**Add help tooltips:**
- **Trip Share:** "Real-time location sharing via secure link"
- **Safety Timer:** "Get notified if I don't check in by deadline"
- **Quick Check-in:** "Send 'I'm safe' to all contacts"
- **SOS:** "Emergency alert with location to all contacts"

---

## 🛡️ P2 - Reliability & Edge Cases

### 10. Offline Mode
**Problem:** Location updates fail when offline

**Solution:**
```typescript
// Queue location updates
const queuedUpdates = useRef<LocationUpdate[]>([]);

useEffect(() => {
  window.addEventListener('online', async () => {
    // Flush queued updates when back online
    for (const update of queuedUpdates.current) {
      await updateDoc(doc(db, 'trips', update.tripId), {
        lastLocation: update.location,
        lastUpdate: serverTimestamp(),
      });
    }
    queuedUpdates.current = [];
  });
}, []);
```

### 11. Permission Handling
**Add explicit permission checks:**
```typescript
const requestLocationPermission = async () => {
  if (!navigator.geolocation) {
    throw new Error('Geolocation not supported');
  }
  
  // Request permission explicitly
  const result = await navigator.permissions.query({ name: 'geolocation' });
  
  if (result.state === 'denied') {
    throw new Error('Location permission denied. Please enable in browser settings.');
  }
  
  return result.state === 'granted';
};
```

### 12. Analytics Events
**Add non-PII tracking:**
```typescript
// lib/analytics.ts
export function trackSafetyEvent(event: string, properties?: Record<string, any>) {
  // Use your analytics provider (Mixpanel, Amplitude, etc.)
  analytics.track(event, {
    ...properties,
    timestamp: Date.now(),
  });
}

// Usage
trackSafetyEvent('trip_started', { duration: '24h' });
trackSafetyEvent('sos_triggered', { tripActive: true });
trackSafetyEvent('timer_set', { minutes: 30 });
```

---

## 🚀 Product Extensions (Aligned with RoadPulse Mission)

### 13. Safe Route Check (High Value!)
**Concept:** Overlay road safety data on trip sharing

**Implementation:**
```typescript
// Public trip view shows nearby reports
const nearbyReports = reports.filter(r => 
  calculateDistance(r.location.lat, r.location.lng, trip.lastLocation.lat, trip.lastLocation.lng) < 5000 // 5km
);

// Visualize on map
<MapView
  reports={nearbyReports}
  userLocation={trip.lastLocation}
  highlightDangerZones={true}
/>
```

**UI:**
- "⚠️ 3 active road issues nearby" banner
- Map overlay with hazard markers
- Makes safety feel integrated, not separate

### 14. Community Verification
**Finish the verification system:**
- "Still there?" button on report cards
- "Resolved" status with community vote threshold
- Auto-expire old reports (already partially done)
- Badges/reputation for helpful verifiers

### 15. Trusted Circles
**Group contacts for one-tap sharing:**
```typescript
interface TrustedCircle {
  id: string;
  uid: string;
  name: string; // "Family", "Work", "Friends"
  contactIds: string[];
  createdAt: Timestamp;
}

// One-tap share
<button onClick={() => shareWithCircle('family')}>
  Share with Family
</button>
```

### 16. Panic Preset
**Pre-configured emergency message:**
```typescript
const sosPresets = {
  medical: "Medical emergency. Location attached.",
  accident: "I've been in an accident. Need help.",
  threat: "I feel unsafe. Please check on me.",
  custom: user.customSOSMessage || "I need help. Last location attached."
};

// UI in SafetyModal
<select value={sosPreset} onChange={e => setSosPreset(e.target.value)}>
  <option value="medical">Medical Emergency</option>
  <option value="accident">Accident</option>
  <option value="threat">Feel Unsafe</option>
  <option value="custom">Custom Message</option>
</select>
```

---

## 🎯 Implementation Priority

### This Week (P0 - Security)
1. ✅ Token as docId (DONE)
2. ✅ Firestore rules (DONE)
3. ⏳ Location precision toggle
4. ⏳ Token regeneration

### Next Week (P1 - Notifications)
5. ⏳ Trusted contacts UI
6. ⏳ Email notifications (Resend)
7. ⏳ App Check setup
8. ⏳ Cloud Function wrappers

### Following Week (P1 - Polish)
9. ⏳ Empty state improvements
10. ⏳ Trip banner enhancements
11. ⏳ Help tooltips

### Before Launch (P2)
12. ⏳ Offline handling
13. ⏳ Permission error states
14. ⏳ Analytics integration
15. ⏳ Edge case testing

### Post-Launch (Extensions)
16. ⏳ Safe Route Check
17. ⏳ Community verification finish
18. ⏳ Trusted Circles
19. ⏳ Panic presets

---

## 📋 Testing Checklist

### Security
- [ ] Public route cannot list trips
- [ ] Expired trips return 403
- [ ] Cannot access other user's trips
- [ ] Token regeneration invalidates old link
- [ ] Rate limiting works (try 5 rapid creates)

### Functionality
- [ ] Trip share starts successfully
- [ ] Location updates every 30s
- [ ] Copy link works
- [ ] Public view shows correct location
- [ ] Stop sharing works
- [ ] SOS updates trip status to emergency
- [ ] Safety timer creates correctly
- [ ] Check-in stores location

### Edge Cases
- [ ] Offline → online transition
- [ ] Location permission denied
- [ ] Trip expired while viewing
- [ ] User closes browser (trip persists)
- [ ] Multiple devices (trip syncs)

### UX
- [ ] Loading states clear
- [ ] Error messages helpful
- [ ] Toast notifications work
- [ ] Mobile responsive
- [ ] Long-press SOS works on touch

---

## 🔒 Current Security Status

✅ **Production-Safe (with rules deployed):**
- Token-based document access (no query/list)
- Firestore rules enforce get-only for public
- Owner-only write operations
- Expiry validation at rules level
- Private collections locked down

⚠️ **Still Client-Side (needs improvement):**
- Rate limiting (localStorage-based)
- Trip creation logic (should be Cloud Function)
- No App Check verification

🎯 **Recommended Before Launch:**
1. Deploy Firestore rules (`firebase deploy --only firestore:rules`)
2. Add Firebase App Check
3. Migrate trip creation to Cloud Function
4. Set up email notifications

---

**Status:** MVP complete, P0 security fixes done. Ready for P1 notifications and polish.
