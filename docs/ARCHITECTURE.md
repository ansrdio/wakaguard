# WakaGuard Architecture Overview

This document provides a comprehensive overview of the WakaGuard (RoadPulse) system architecture.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │   Web Browser    │  │  Android App     │  │    iOS App       │          │
│  │   (Next.js)      │  │  (Capacitor)     │  │   (Capacitor)    │          │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘          │
│           │                     │                     │                     │
│           └─────────────────────┴─────────────────────┘                     │
│                                 │                                           │
│                    ┌────────────▼────────────┐                              │
│                    │   Next.js App Router    │                              │
│                    │   (React 19 + SSR)      │                              │
│                    └────────────┬────────────┘                              │
│                                 │                                           │
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │
┌─────────────────────────────────┼───────────────────────────────────────────┐
│                              FIREBASE LAYER                                  │
├─────────────────────────────────┼───────────────────────────────────────────┤
│                                 │                                           │
│  ┌──────────────────────────────▼──────────────────────────────────┐       │
│  │                      Firebase Hosting                            │       │
│  │              (SSR via Cloud Functions)                           │       │
│  └──────────────────────────────┬──────────────────────────────────┘       │
│                                 │                                           │
│  ┌──────────────┐  ┌────────────▼────────────┐  ┌──────────────────┐       │
│  │   Firebase   │  │      Firestore          │  │    Firebase      │       │
│  │     Auth     │  │   (NoSQL Database)      │  │    Storage       │       │
│  │              │  │                         │  │   (Images)       │       │
│  └──────────────┘  └─────────────────────────┘  └──────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Modules

### 1. Authentication (`src/hooks/useAuthedUser.ts`)

Handles Firebase Authentication with support for:
- **Anonymous Auth**: Auto-creates anonymous user on first visit
- **Google Sign-In**: OAuth-based upgrade from anonymous
- **Session Persistence**: Maintains auth state across sessions

```typescript
// Auth flow
User visits app → Anonymous auth → Optional Google sign-in → Profile creation
```

### 2. Reports System (`src/hooks/useReports.ts`, `src/lib/actions.ts`)

The core civic reporting functionality:

| Collection | Purpose |
|------------|---------|
| `reports` | Road hazard reports with location, photos, status |
| `votes` | User votes (up/down) with deterministic IDs |
| `comments` | Community discussion on reports |
| `flags` | Content moderation flags |

**Report Lifecycle:**
```
Create → Active → [Voted/Commented] → Resolved/Expired
```

### 3. Safety System (`src/hooks/useSafety.ts`, `src/lib/safety.ts`)

The "Safe Trip" feature for personal safety:

| Collection | Purpose |
|------------|---------|
| `trips` | Active trip sessions with share tokens |
| `safetyTimers` | Check-in reminder timers |
| `alerts` | SOS alerts and timer expirations |
| `checkIns` | User check-in history |
| `trustedContacts` | User's emergency contacts |

**Safe Trip Flow:**
```
Start Trip → Share Link → Timer Set → Check-in/End → Contacts Notified
```

### 4. Map System (`src/components/MapView.tsx`)

Interactive map using Leaflet:
- **Marker Clustering**: Groups nearby reports for performance
- **Real-time Updates**: Subscription to Firestore changes
- **Location Tracking**: Browser Geolocation API

---

## Data Models

### Report
```typescript
interface Report {
  id: string;
  uid: string;                    // Creator's user ID
  type: ReportType;               // 'pothole' | 'accident' | 'checkpoint' | etc.
  status: 'active' | 'resolved';
  description: string;
  location: { lat: number; lng: number };
  photos: string[];               // Firebase Storage URLs
  state: string;                  // Nigerian state
  upvotes: number;
  downvotes: number;
  createdAt: Timestamp;
}
```

### Trip (Safe Trip)
```typescript
interface Trip {
  id: string;
  uid: string;
  shareToken: string;             // URL-safe token for sharing
  status: 'active' | 'completed' | 'cancelled' | 'emergency';
  destination?: string;
  expectedDurationMinutes?: number;
  endsAt?: Timestamp;
  trustedContactIds?: string[];
  lastLocation?: { lat: number; lng: number };
  expiresAt: Timestamp;
  createdAt: Timestamp;
}
```

---

## Security Architecture

### Firestore Rules Strategy

| Collection | Read | Write |
|------------|------|-------|
| `reports` | Public | Auth + owner validation |
| `trips` | Token-based GET only | Owner only |
| `users` | Owner only | Owner only |
| `votes` | Auth | Auth + deterministic ID |

### Key Security Features

1. **Trip Token Security**: Trips use cryptographically random tokens as document IDs. List operations are denied to prevent enumeration attacks.

2. **Vote Deduplication**: Vote documents use `{userId}_{reportId}` as document ID, enforced in rules.

3. **File Upload Validation**: Storage rules enforce:
   - Image MIME type
   - 5MB size limit
   - Owner path matching

---

## Component Hierarchy

```
App (layout.tsx)
├── MobileHome.tsx                 # Mobile layout (< 768px)
│   ├── MobileTopBar.tsx
│   ├── MapView.tsx
│   ├── ReportsBottomSheet.tsx
│   ├── MobileBottomNav.tsx
│   └── Screens/
│       ├── SafetyScreen.tsx       # Safety tab
│       └── ProfileScreen.tsx      # Profile tab
│
└── DesktopHome.tsx                # Desktop layout (>= 768px)
    ├── FilterBar.tsx
    ├── MapView.tsx
    ├── ReportList.tsx
    └── ReportDetailsCard.tsx
```

---

## State Management

The app uses React hooks for state management:

| Hook | Purpose |
|------|---------|
| `useAuthedUser` | Global auth state |
| `useReports` | Report list + filters |
| `useSafety` | Safety features state |
| `useSelectedState` | Nigerian state filter |
| `useOfflineDrafts` | IndexedDB offline storage |

**No Redux/Zustand** - Firebase's real-time listeners + React hooks provide sufficient state management.

---

## Deployment Architecture

### Firebase Hosting (Production)
- SSR via Cloud Functions (Next.js)
- CDN-backed static assets
- Automatic SSL certificates

### Capacitor Mobile Apps
- WebView loads Firebase Hosting URL
- Native plugins for contacts, camera
- Server mode: `capacitor.config.ts` points to production URL

---

## Performance Optimizations

1. **Report Clustering**: Leaflet marker clusters reduce DOM nodes
2. **Image Compression**: Client-side compression before upload (max 1200px)
3. **Lazy Loading**: Components and images load on demand
4. **Firestore Indexes**: Compound indexes for common queries

---

## Future Architecture Considerations

1. **Push Notifications**: Firebase Cloud Messaging for trip alerts
2. **SMS/WhatsApp Integration**: Backend service for contact notifications
3. **Offline Sync**: Full offline report submission queue
4. **Analytics Pipeline**: BigQuery export for traffic insights
