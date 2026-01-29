# Production Deployment Checklist

## 🔐 Security (Critical)

### ✅ Completed
- [x] Firestore security rules enforce server-side validation
- [x] Votes use deterministic doc IDs (`{userId}_{reportId}`)
- [x] Vote counts can't be manipulated directly (only via transactions)
- [x] Verification status locked to 'pending' on report creation
- [x] Users can only modify their own content

### ⚠️ TODO Before Launch

#### 1. Rate Limiting (Currently Client-Side Only)
**Current:** Client checks before submit (can be bypassed)

**Required for Production:**
```javascript
// Firebase Cloud Function
exports.createReport = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new Error('Unauthorized');
  
  const userId = context.auth.uid;
  
  // Server-side rate limit check
  const recentReports = await db.collection('reports')
    .where('uid', '==', userId)
    .where('createdAt', '>', oneHourAgo)
    .get();
    
  if (recentReports.size >= 5) {
    throw new Error('Rate limit: 5 reports per hour');
  }
  
  // Create report
  // ...
});
```

**Alternative:** Use Firestore rules with time-based checks (complex)

#### 2. Admin Role Check
**Current:** All authenticated users can update flags

**Required:**
```javascript
// Set admin custom claim
admin.auth().setCustomUserClaims(adminUid, { admin: true });

// Update firestore.rules:
function isAdmin() {
  return request.auth.token.admin == true;
}
```

#### 3. Environment Variables
Move sensitive config to `.env.local`:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
# etc...
```

---

## 📊 Firestore Indexes

### Required Composite Indexes

**Run app → Firestore will prompt with links**

Expected indexes:
1. `reports`: state + status + createdAt (DESC)
2. `reports`: state + status + verification + createdAt (DESC)
3. `flags`: targetId + status (if using moderation queries)

See `FIRESTORE_INDEXES.md` for details.

---

## 🚀 Performance

### ✅ Optimizations Implemented
- [x] Deterministic vote doc IDs (no query overhead)
- [x] Client-side radius filtering (reduces Firestore reads)
- [x] Client-side sorting (Recent/Upvoted/Nearest)
- [x] Reports cached per state (1-minute TTL)
- [x] Marker clustering (reduces DOM nodes)

### Consider Adding
- [ ] Service Worker for offline support
- [ ] Image CDN (e.g., Cloudflare, Imgix)
- [ ] Firestore bundle for initial data load

---

## 🔍 Monitoring

### Set Up Firebase Analytics
```typescript
// app/layout.tsx
import { getAnalytics } from 'firebase/analytics';

if (typeof window !== 'undefined') {
  const analytics = getAnalytics(app);
}
```

### Key Metrics to Track
- Reports created per day
- Voting engagement rate
- Flag rate (moderation load)
- Average session duration
- Mobile vs desktop usage

---

## 🧪 Testing Checklist

### Security Rules
```bash
# Install emulator
firebase emulators:start --only firestore

# Test rules
npm run test:rules
```

### End-to-End Tests
- [ ] Create report with photos
- [ ] Vote on report (up/down/toggle)
- [ ] Flag report with reason
- [ ] Duplicate detection warning
- [ ] Rate limiting enforcement
- [ ] Share report link
- [ ] Radius filter with location
- [ ] Sort by Recent/Upvoted/Nearest
- [ ] Marker clustering in dense areas
- [ ] Mobile bottom sheet for report details

---

## 🌍 Launch Preparation

### 1. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 2. Deploy Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```

### 3. Deploy Functions (if implemented)
```bash
firebase deploy --only functions
```

### 4. Deploy Frontend
```bash
npm run build
npm run start # test production build locally
# Then deploy to Vercel/Netlify
```

### 5. Domain & SSL
- [ ] Configure custom domain
- [ ] Enable HTTPS
- [ ] Update Firebase authorized domains

### 6. Enable Authentication Providers
- [ ] Google Sign-In (configured)
- [ ] Email/Password (if needed)
- [ ] Phone Auth (for Nigerian users)

---

## 📱 PWA Setup (Optional but Recommended)

Add to `public/manifest.json`:
```json
{
  "name": "RoadPulse Nigeria",
  "short_name": "RoadPulse",
  "description": "Report and track road issues in Nigeria",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## 🔴 Known Limitations (Document for Users)

1. **Rate Limiting**: Currently enforced client-side only
   - Workaround: Monitor reports collection for abuse
   - Solution: Implement Cloud Functions before scaling

2. **Admin Moderation**: All auth users can update flags
   - Workaround: Restrict flag updates in rules (done)
   - Solution: Add custom admin claims

3. **Photo Storage Costs**: No compression server-side
   - Mitigation: Client-side compression to 600KB (implemented)
   - Consider: CDN + resize on upload (Cloud Functions)

---

## ✅ Production-Ready Features

- Voting system with transaction safety
- Report flagging with duplicate prevention
- Duplicate report detection (spatial + temporal)
- Reverse geocoding for addresses
- Share report links
- Radius filtering (2km/5km/10km)
- Sort by Recent/Upvoted/Nearest
- Marker clustering
- Mobile-responsive UI
- Bottom sheet on mobile
- Quick report type selection
- Resolve/Still There confirmations
- Photo uploads with compression

**The app is MVP-ready with these caveats documented above.**
