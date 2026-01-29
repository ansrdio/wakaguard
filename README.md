# WakaGuard (RoadPulse)

A civic road safety platform for Nigerian drivers. Report road hazards, share trips with trusted contacts, and access emergency services - all in one app.

## 🚗 Features

### Road Reports
- **Create Reports**: Photo + location-based road hazard reports (potholes, accidents, checkpoints, etc.)
- **Real-time Map**: View reports on an interactive Leaflet map with clustering
- **Voting System**: Upvote/downvote to surface accurate reports
- **State Filtering**: Filter reports by Nigerian state
- **Comments**: Community discussion on reports

### Safe Trip (Safety Features)
- **Trip Sharing**: Share live location with trusted contacts via secure link
- **Safety Timer**: Set check-in reminders that alert contacts if missed
- **Quick Check-in**: One-tap "I'm safe" status updates
- **Checkpoint Logging**: Nigeria-specific "stopped at checkpoint" quick action
- **Emergency SOS**: Quick access to Nigerian emergency numbers (112, 199, 122)

### Mobile-First Design
- Responsive UI optimized for mobile browsers
- Native Android/iOS apps via Capacitor
- Offline draft support for poor connectivity areas

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router, React 19) |
| **Styling** | Tailwind CSS 4 |
| **Backend** | Firebase (Auth, Firestore, Storage, Hosting) |
| **Maps** | Leaflet + React-Leaflet |
| **Mobile** | Capacitor 8 (Android/iOS) |
| **Icons** | Lucide React |

---

## 📁 Project Structure

```
roadpulse/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Main entry (redirects to mobile/desktop)
│   │   ├── r/[id]/             # Public report detail page
│   │   ├── s/[token]/          # Public trip tracking page
│   │   ├── admin/              # Admin moderation panel
│   │   └── (static pages)      # privacy, support, guidelines
│   │
│   ├── components/
│   │   ├── mobile/             # Mobile-specific UI
│   │   │   ├── screens/        # Tab screens (SafetyScreen, ProfileScreen)
│   │   │   ├── MobileHome.tsx  # Main mobile layout
│   │   │   └── MobileBottomNav.tsx
│   │   ├── DesktopHome.tsx     # Desktop layout
│   │   ├── MapView.tsx         # Leaflet map component
│   │   ├── CreateReportModal.tsx
│   │   └── AuthModal.tsx       # Login/signup modal
│   │
│   ├── hooks/                  # React hooks
│   │   ├── useSafety.ts        # Safe Trip API (trips, timers, SOS)
│   │   ├── useReports.ts       # Report fetching/filtering
│   │   ├── useAuthedUser.ts    # Firebase auth state
│   │   ├── useVote.ts          # Voting logic
│   │   └── useOfflineDrafts.ts # IndexedDB offline storage
│   │
│   ├── lib/                    # Utilities & helpers
│   │   ├── types.ts            # TypeScript interfaces
│   │   ├── firebase.ts         # Firebase initialization
│   │   ├── safety.ts           # Safety helper functions
│   │   ├── geolocation.ts      # Location utilities
│   │   └── nigerianStates.ts   # State data
│   │
│   └── contexts/               # React contexts
│       └── OnboardingContext.tsx
│
├── android/                    # Capacitor Android project
├── ios/                        # Capacitor iOS project
├── functions/                  # Firebase Cloud Functions
├── docs/                       # Internal documentation
├── firestore.rules             # Firestore security rules
├── storage.rules               # Storage security rules
└── firebase.json               # Firebase config
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (recommended: 20)
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)
- Android Studio (for Android builds)
- Xcode (for iOS builds, macOS only)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd roadpulse

# Install dependencies
npm install

# Copy environment template
cp .env.local.example .env.local
# Edit .env.local with your Firebase credentials

# Start development server
npm run dev
```

### Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Anonymous + Google Sign-In)
3. Create a Firestore database
4. Enable Storage
5. Copy web app credentials to `.env.local`
6. Deploy security rules:
   ```bash
   firebase deploy --only firestore:rules,storage:rules
   ```

### Build & Deploy

```bash
# Build for production
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting

# Build Android APK
npx cap sync android
# Open in Android Studio: android/
```

---

## 🔒 Security

### Environment Variables
- All Firebase credentials use `NEXT_PUBLIC_` prefix (client-side only)
- `.env.local` is gitignored - never commit secrets
- API keys are restricted to your domain in Firebase Console

### Firestore Rules
- Reports: Public read, authenticated create/update
- Trips: Owner-only access, token-based public tracking
- Users: Owner-only read/write
- See `firestore.rules` for full implementation

### Storage Rules
- Images: Public read, authenticated upload (owner path only)
- 5MB file size limit enforced
- Image MIME type validation

---

## 📱 Mobile Apps

### Android
```bash
npx cap sync android
npx cap open android
# Build APK in Android Studio
```

### iOS
```bash
npx cap sync ios
npx cap open ios
# Build in Xcode
```

---

## 📚 Documentation

- `docs/ARCHITECTURE.md` - System architecture overview
- `docs/SAFETY_FEATURES_ROADMAP.md` - Safety feature specs
- `docs/PRODUCTION_CHECKLIST.md` - Production deployment checklist
- `docs/backlog.md` - Feature backlog and roadmap

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 👥 Team

Built by ANSRD Labs for Nigerian road safety.
