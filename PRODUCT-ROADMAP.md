# WakaGuard Product Roadmap

## Vision
Nigeria's #1 road safety and logistics platform - protecting travelers and powering deliveries.

---

## Phase 1: WakaGuard Safety App (Current - Launch Saturday)

### Core Features
- [x] Road hazard reporting (potholes, accidents, flooding)
- [x] Community upvoting/verification
- [x] User authentication (email/password)
- [x] Email verification flow
- [ ] Safe Trip sharing with live tracking
- [ ] Trusted contacts management
- [ ] SOS emergency alerts
- [ ] Safety timer/check-in reminders
- [ ] Checkpoint stop logging
- [ ] Gamification (points, levels, badges)

### Revenue: None (Free app, build user base)

---

## Phase 2: Ad Network Integration (Post-Launch Week 1-2)

### Ad Placements
| Placement | Type | Location |
|-----------|------|----------|
| **Banner Ads** | Non-intrusive | Bottom of map screen |
| **Interstitial** | Full screen | After creating report (occasional) |
| **Native Ads** | Blended content | In report feed |
| **Rewarded Ads** | Opt-in video | Watch ad → earn bonus points |

### Ad Networks to Integrate
1. **Google AdMob** - Primary (best fill rates in Nigeria)
2. **Meta Audience Network** - Secondary
3. **Unity Ads** - For rewarded video

### Implementation
```
src/
├── components/
│   ├── ads/
│   │   ├── BannerAd.tsx
│   │   ├── InterstitialAd.tsx
│   │   ├── NativeAd.tsx
│   │   └── RewardedAd.tsx
│   └── ...
├── hooks/
│   └── useAds.ts
└── lib/
    └── adConfig.ts
```

### Revenue Estimate (Nigeria)
| Metric | Value |
|--------|-------|
| eCPM (banner) | $0.30 - $0.80 |
| eCPM (interstitial) | $1.00 - $3.00 |
| eCPM (rewarded) | $2.00 - $5.00 |
| 10K DAU | ~$50-150/day |
| 100K DAU | ~$500-1500/day |

### Ad-Free Premium Option
- ₦500/month ($0.60) - Remove all ads
- Bonus: Extra daily points, priority support

---

## Phase 3: WakaLogistics Delivery Platform (Week 4-8)

### Overview
Crowdsourced delivery platform where verified drivers accept and complete delivery tasks. Customers track deliveries in real-time with WakaGuard's safety features.

### User Types

#### Drivers (WakaRiders)
- Sign up with:
  - Valid ID (NIN, Driver's License)
  - Vehicle registration
  - Profile photo
  - Bank account for payouts
- Features:
  - View nearby delivery requests
  - Accept/decline jobs
  - In-app navigation
  - Earnings dashboard
  - Instant/scheduled cash out
  - Safety features (SOS, checkpoint alerts)

#### Customers
- Individual users or businesses
- Features:
  - Create delivery request (pickup → dropoff)
  - Set package details (size, fragile, etc.)
  - Get instant price quote
  - Track driver live on map
  - Share tracking link with recipient
  - In-app payment
  - Rate and tip driver

### Database Schema (Firestore)

```typescript
// Delivery request
interface Delivery {
  id: string;
  customerId: string;
  driverId?: string;
  status: 'pending' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  
  pickup: {
    address: string;
    lat: number;
    lng: number;
    contactName: string;
    contactPhone: string;
    instructions?: string;
  };
  
  dropoff: {
    address: string;
    lat: number;
    lng: number;
    contactName: string;
    contactPhone: string;
    instructions?: string;
  };
  
  package: {
    size: 'small' | 'medium' | 'large' | 'xlarge';
    description: string;
    fragile: boolean;
    value?: number;
  };
  
  pricing: {
    baseFare: number;
    distanceFee: number;
    total: number;
    currency: 'NGN';
    driverEarnings: number;
    platformFee: number;
  };
  
  tracking: {
    shareToken: string;
    lastLocation?: { lat: number; lng: number };
    lastUpdate?: Timestamp;
  };
  
  timestamps: {
    created: Timestamp;
    accepted?: Timestamp;
    pickedUp?: Timestamp;
    delivered?: Timestamp;
  };
}

// Driver profile
interface Driver {
  uid: string;
  status: 'pending' | 'approved' | 'suspended';
  
  profile: {
    fullName: string;
    phone: string;
    photoUrl: string;
  };
  
  verification: {
    idType: 'nin' | 'drivers_license' | 'voters_card';
    idNumber: string;
    idPhotoUrl: string;
    vehicleType: 'motorcycle' | 'car' | 'van';
    vehiclePlate: string;
    verifiedAt?: Timestamp;
  };
  
  earnings: {
    balance: number;
    totalEarned: number;
    totalDeliveries: number;
  };
  
  rating: {
    average: number;
    count: number;
  };
  
  bankAccount: {
    bankCode: string;
    accountNumber: string;
    accountName: string;
  };
}
```

### Pricing Model (Lagos)

| Package Size | Base Fare | Per KM | Example 5km |
|--------------|-----------|--------|-------------|
| Small (envelope) | ₦500 | ₦100 | ₦1,000 |
| Medium (shoebox) | ₦700 | ₦120 | ₦1,300 |
| Large (backpack) | ₦1,000 | ₦150 | ₦1,750 |
| XLarge (suitcase) | ₦1,500 | ₦200 | ₦2,500 |

**Platform fee:** 18% of total
**Driver keeps:** 82%

### Payment Integration
- **Paystack** - Cards, bank transfer, USSD
- **Flutterwave** - Backup processor
- Driver payouts via Paystack Transfer API

### App Screens (New)

```
Customer Flow:
├── DeliveryHome.tsx (create new delivery)
├── PackageDetails.tsx (size, description)
├── LocationPicker.tsx (pickup & dropoff)
├── PriceQuote.tsx (confirm & pay)
├── TrackDelivery.tsx (live map)
├── DeliveryHistory.tsx
└── RateDriver.tsx

Driver Flow:
├── DriverHome.tsx (available jobs)
├── JobDetails.tsx (accept/decline)
├── ActiveDelivery.tsx (navigation + status updates)
├── DriverEarnings.tsx
├── CashOut.tsx
└── DriverProfile.tsx
```

### Revenue Projections

| Scale | Deliveries/Day | Revenue/Day | Monthly |
|-------|----------------|-------------|---------|
| Soft launch | 50 | ₦13,500 | ₦405,000 (~$500) |
| Growth | 500 | ₦135,000 | ₦4M (~$5,000) |
| Scale | 5,000 | ₦1.35M | ₦40M (~$50,000) |

---

## Phase 4: Business Dashboard (Week 8-12)

### Target Customers
- E-commerce stores
- Restaurants
- Pharmacies
- Document delivery services

### Features
- Bulk delivery uploads (CSV)
- API integration for automated orders
- Monthly invoicing
- Dedicated account manager
- Priority driver matching
- Analytics dashboard

### Pricing
| Plan | Deliveries/Month | Price | Per Delivery |
|------|------------------|-------|--------------|
| Starter | 100 | ₦15,000 | ₦150 |
| Growth | 500 | ₦60,000 | ₦120 |
| Enterprise | 2,000+ | Custom | ₦80-100 |

---

## Timeline Summary

| Phase | Timeframe | Focus |
|-------|-----------|-------|
| **Phase 1** | Now - Saturday | Launch safety app |
| **Phase 2** | Week 1-2 | Ad integration |
| **Phase 3** | Week 4-8 | WakaLogistics MVP |
| **Phase 4** | Week 8-12 | Business dashboard |

---

## Success Metrics

### Phase 1 (Safety App)
- 1,000 downloads first month
- 100 daily active users
- 500 hazard reports

### Phase 2 (Ads)
- $100/day ad revenue at 10K DAU
- 5% premium conversion

### Phase 3 (Logistics)
- 50 verified drivers
- 100 deliveries/day within 30 days
- 4.5+ average rating

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js + React + Capacitor |
| Backend | Firebase (Auth, Firestore, Storage, Functions) |
| Payments | Paystack |
| Maps | Google Maps API |
| Ads | Google AdMob |
| Analytics | Firebase Analytics + Crashlytics |
| Notifications | Firebase Cloud Messaging |

---

*Last updated: Jan 27, 2026*
