# WakaGuard Launch Checklist

**Goal:** App Store submission by Saturday (Feb 1), Beta testing starts Feb 1

---

## 🔴 HIGH PRIORITY (Before Saturday)

### 1. SMTP & Email Setup
- [ ] Verify `wakaguard.com` domain in AWS SES
- [ ] Add DKIM/SPF records to SiteGround DNS
- [ ] Configure Firebase SMTP with `noreply@wakaguard.com`

### 2. Email Templates (Firebase Console)
| Template | Subject |
|----------|---------|
| Email Verification | Welcome to WakaGuard! Verify your email |
| Password Reset | Reset your WakaGuard password |
| Email Change | Confirm your new email address |

### 3. Safety Features (Fix/Test)
- [ ] **Start Safe Trip** - Test trip creation with location
- [ ] **Share Trip Link** - Test `/s/[token]` page loads correctly
- [ ] **End Trip** - Verify trip status updates to completed
- [ ] **Add Trusted Contacts** - Test contact picker on mobile
- [ ] **Quick Check-in** - Test check-in saves to Firestore
- [ ] **Safety Timer** - Test timer creation & countdown display
- [ ] **SOS Alert** - Test SOS saves alert + calls 112
- [ ] **Checkpoint Stop** - Test logging checkpoint alerts
- [ ] **Contact Notifications** - SMS/Email to trusted contacts (Cloud Function)

### 4. Image Upload Improvements
- [ ] Better compression algorithm (reduce file size before upload)
- [ ] Progress indicator during upload
- [ ] Retry button on failure
- [ ] Offline queue for failed uploads
- [ ] File size/type validation with user feedback

### 5. App Configuration
- [ ] Update `capacitor.config.ts` server URL to `https://wakaguard.com`
- [ ] Update app name to "WakaGuard" in all configs
- [ ] App icon (iOS 1024x1024, Android 512x512)
- [ ] Splash screen with WakaGuard branding

---

## 🟡 APP STORE SUBMISSION (Saturday)

### iOS (TestFlight)
- [ ] App Store Connect account ready
- [ ] App icon 1024x1024 (no alpha channel)
- [ ] Screenshots: 6.5" iPhone (1284x2778), 5.5" iPhone (1242x2208)
- [ ] App name, subtitle, keywords
- [ ] Description (short + full)
- [ ] Privacy policy URL: `https://wakaguard.com/privacy`
- [ ] Support URL: `https://wakaguard.com/support`
- [ ] Age rating questionnaire completed
- [ ] Build & upload IPA to TestFlight
- [ ] Submit for Beta App Review

### Android (Play Console)
- [ ] Play Console account ready
- [ ] App icon 512x512
- [ ] Feature graphic 1024x500
- [ ] Screenshots (phone 1080x1920, tablet 1200x1920)
- [ ] Short description (80 characters max)
- [ ] Full description (4000 characters max)
- [ ] Privacy policy URL
- [ ] Build signed AAB
- [ ] Upload to Internal Testing track
- [ ] Add tester emails

---

## 🟢 BETA TESTING PREP (Feb 1)

- [ ] In-app feedback button
- [ ] Firebase Crashlytics enabled and tested
- [ ] Analytics events for key user actions
- [ ] Beta tester invite email template
- [ ] Known issues documentation
- [ ] Bug report form/email setup

---

## 📋 Daily Plan

### Day 1 (Tomorrow)
1. AWS SES domain verification + DKIM records
2. Configure Firebase email templates
3. Fix & test all safety features

### Day 2
1. Image upload improvements
2. Update capacitor.config.ts to wakaguard.com
3. Create app icons & splash screen

### Day 3
1. iOS build & TestFlight upload
2. Android AAB build & Play Console upload
3. Create privacy policy & support pages

### Day 4 (Saturday)
1. Submit iOS for Beta App Review
2. Publish Android Internal Testing
3. Final testing on both platforms
4. Prepare beta tester invite emails

---

## Notes

- Domain: `wakaguard.com` (connected to Firebase Hosting, SSL pending)
- Firebase Project: `routepulse-5701f`
- Safety features use: `useSafety` hook, `SafetyScreen.tsx`
- Gamification: Points awarded for reports, daily login streaks

---

*Last updated: Jan 27, 2026*
