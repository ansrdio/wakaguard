# RoadPulse Product Backlog

**Prioritized User Stories with Acceptance Criteria**

---

## 🔴 P0 - Critical (Must Have for Launch)

### Security & Infrastructure

**BACK-001: Deploy Firestore Security Rules**
- **As a** system administrator
- **I want** production-ready Firestore security rules deployed
- **So that** user data is protected and abuse is prevented

**Acceptance Criteria:**
- [ ] Rules deployed via `firebase deploy --only firestore:rules`
- [ ] trips/{token} allows get-only, denies list
- [ ] reports, comments, votes enforce owner-only writes
- [ ] Safety collections (trustedContacts, alerts) owner-locked
- [ ] Test in Firebase console: unauthorized reads/writes fail

---

**BACK-002: Create Required Firestore Indexes**
- **As a** developer
- **I want** all required composite indexes created
- **So that** queries don't fail in production

**Acceptance Criteria:**
- [ ] Index: reports (state, status, createdAt desc)
- [ ] Index: comments (reportId, status, createdAt desc)
- [ ] Index: votes (reportId, uid)
- [ ] Index: flags (targetType, status, createdAt desc)
- [ ] All indexes created via Firebase console or CLI
- [ ] No "index required" errors in production

---

**BACK-003: Add Firebase App Check**
- **As a** system administrator
- **I want** App Check enabled to prevent bot abuse
- **So that** only legitimate clients can access Firebase services

**Acceptance Criteria:**
- [ ] App Check configured in Firebase console
- [ ] reCAPTCHA v3 or App Attest provider enabled
- [ ] Enforcement mode set to "Enforce" for production
- [ ] Debug tokens generated for development
- [ ] Verified abuse protection works

---

### Testing & Validation

**BACK-004: Cross-Device Testing**
- **As a** QA tester
- **I want** the app tested on real iOS and Android devices
- **So that** mobile UX is validated before launch

**Acceptance Criteria:**
- [ ] Tested on iPhone (Safari)
- [ ] Tested on Android (Chrome)
- [ ] Map/List tabs work correctly
- [ ] Navigate button launches correct maps app
- [ ] Touch targets appropriate size (min 44px)
- [ ] No layout breaking on notched devices

---

## 🟠 P1 - High Priority (Launch Week)

### User Experience

**BACK-005: User Attribution in Comments**
- **As a** report viewer
- **I want** to see who posted each comment
- **So that** I can identify credible sources and community members

**Acceptance Criteria:**
- [ ] Comments display username or anonymous ID
- [ ] Fetch user profile data from Firestore
- [ ] Fallback to "Anonymous User" if profile missing
- [ ] Add avatar placeholder or initials
- [ ] Performance: batch user lookups, cache results

---

**BACK-006: Comment Moderation UI**
- **As a** report viewer
- **I want** to flag inappropriate comments
- **So that** the community stays safe and respectful

**Acceptance Criteria:**
- [ ] Flag icon button on each comment
- [ ] Flag modal with reason selection (spam, inappropriate, etc.)
- [ ] Submit flag writes to flags collection
- [ ] Disabled state if already flagged by user
- [ ] Toast notification on success/error
- [ ] Rate limiting: 1 flag per comment per user

---

**BACK-007: Edit/Delete Own Comments**
- **As a** comment author
- **I want** to edit or delete my comments
- **So that** I can correct mistakes or remove unwanted content

**Acceptance Criteria:**
- [ ] Edit/delete icons visible only on own comments
- [ ] Edit mode: textarea with current text, save/cancel buttons
- [ ] Delete confirmation modal
- [ ] Firestore update on edit, status=removed on delete
- [ ] Edited comments show "(edited)" indicator
- [ ] Rate limiting: prevent rapid edit spam

---

**BACK-008: Floating Report Button (Mobile)**
- **As a** mobile user (Persona 1)
- **I want** a persistent Report button visible while scrolling
- **So that** I can quickly create reports without scrolling back to header

**Acceptance Criteria:**
- [ ] FAB (Floating Action Button) bottom-right on mobile only
- [ ] Plus icon, blue background, shadow
- [ ] Fixed position, z-index above content
- [ ] Opens CreateReportModal on tap
- [ ] Hide when modal/drawer open
- [ ] Accessible: aria-label "Create report"

---

### Backend & Reliability

**BACK-009: Server-Side Rate Limiting**
- **As a** system administrator
- **I want** rate limiting enforced server-side via Cloud Functions
- **So that** abuse cannot be bypassed by manipulating localStorage

**Acceptance Criteria:**
- [ ] Cloud Function: `createTrip` with rate limit check
- [ ] Cloud Function: `createReport` with rate limit check
- [ ] Cloud Function: `triggerSOS` with rate limit check
- [ ] Store last action timestamp in user doc
- [ ] Return 429 error if rate limit exceeded
- [ ] Client shows appropriate error message

---

**BACK-010: Real Safety Notifications**
- **As a** trusted contact (Persona 6)
- **I want** to receive SMS/email when someone shares their trip or triggers SOS
- **So that** I can respond to emergencies

**Acceptance Criteria:**
- [ ] Email notifications via SendGrid/Resend
- [ ] SMS notifications via Twilio (optional)
- [ ] Triggered on: trip start, SOS, timer expired
- [ ] Message includes: user name, location link, timestamp
- [ ] Notification preferences stored in user settings
- [ ] Delivery tracking (sent/failed status)

---

**BACK-011: Offline Support (Basic)**
- **As a** mobile user
- **I want** the app to handle offline gracefully
- **So that** I don't lose data or see confusing errors

**Acceptance Criteria:**
- [ ] Detect offline state (navigator.onLine)
- [ ] Show "You're offline" banner when detected
- [ ] Queue location updates for trip sharing
- [ ] Flush queue when back online
- [ ] Disable actions that require network
- [ ] Cache last viewed reports (IndexedDB)

---

## 🟡 P2 - Medium Priority (Post-Launch Month 1)

### Analytics & Monitoring

**BACK-012: Event Tracking**
- **As a** product manager
- **I want** key user actions tracked
- **So that** I can understand usage patterns and optimize

**Acceptance Criteria:**
- [ ] Integrate analytics provider (Mixpanel/Amplitude/GA4)
- [ ] Track: report_created, report_voted, report_commented
- [ ] Track: filter_applied, sort_changed, state_changed
- [ ] Track: trip_started, sos_triggered, check_in_sent
- [ ] Track: navigate_clicked (persona 2 validation)
- [ ] No PII in events (anonymize user IDs)
- [ ] Dashboard with key metrics

---

**BACK-013: Error Tracking**
- **As a** developer
- **I want** production errors automatically logged
- **So that** I can fix issues before users report them

**Acceptance Criteria:**
- [ ] Integrate Sentry or Rollbar
- [ ] Source maps uploaded for stack traces
- [ ] User context attached (non-PII)
- [ ] Error grouping and deduplication
- [ ] Slack/email alerts for critical errors
- [ ] Performance monitoring (slow queries)

---

### Features & Polish

**BACK-014: Report Lifecycle (Resolved State)**
- **As a** report viewer (Persona 4)
- **I want** reports to auto-archive when confirmed resolved
- **So that** the map stays current and useful

**Acceptance Criteria:**
- [ ] Cloud Function: check confirmations.resolved count
- [ ] If resolved > 3 and no still_there in 24h, set status=resolved
- [ ] Resolved reports hidden from map by default
- [ ] "Show resolved" toggle in filters
- [ ] Visual: resolved reports grayed out on map
- [ ] Resolved reports excluded from "recent" count

---

**BACK-015: Safe Route Check (Integration Feature)**
- **As a** trip sharer (Persona 6 + Persona 2)
- **I want** to see road hazards along my trip route
- **So that** I can avoid dangerous areas

**Acceptance Criteria:**
- [ ] Trip sharing public view shows nearby reports (5km radius)
- [ ] Map overlay: hazard markers on trip route
- [ ] Banner: "⚠️ 3 active road issues nearby"
- [ ] Click marker: show report details preview
- [ ] Filter by severity (show only high/critical)
- [ ] Makes safety feel integrated with community data

---

**BACK-016: Trusted Circles**
- **As a** safety user (Persona 6)
- **I want** to create groups of trusted contacts (Family, Work, Friends)
- **So that** I can share trips with one tap

**Acceptance Criteria:**
- [ ] Manage circles in safety settings
- [ ] Add/remove contacts to circles
- [ ] Trip share modal: "Share with Family" quick action
- [ ] All circle members notified simultaneously
- [ ] Circle management UI: add/edit/delete
- [ ] Firestore: trustedCircles collection

---

**BACK-017: Report Photos Gallery Enhancement**
- **As a** report viewer
- **I want** better photo viewing experience
- **So that** I can clearly see reported conditions

**Acceptance Criteria:**
- [ ] Full-screen photo viewer with swipe navigation
- [ ] Pinch-to-zoom on photos
- [ ] Download/share photo actions
- [ ] Photo count indicator "1 of 5"
- [ ] Keyboard navigation (left/right arrows)
- [ ] ESC to close lightbox

---

**BACK-018: Filter Bar Enhancements**
- **As a** report consumer (Persona 2)
- **I want** more intuitive filtering controls
- **So that** I can quickly find relevant reports

**Acceptance Criteria:**
- [ ] Visual grouping: fieldset/legend for filter categories
- [ ] "Active filters" badge count
- [ ] Quick filters: "Critical only", "Last 24h", "Near me"
- [ ] Filter presets: save/load custom filter combinations
- [ ] Improved mobile layout: collapsible sections
- [ ] Keyboard shortcuts: Cmd/Ctrl+F to focus search

---

## 🔵 P3 - Low Priority (Future Enhancements)

### Advanced Features

**BACK-019: Panic Preset Messages**
- **As a** safety user
- **I want** customizable SOS messages
- **So that** emergency contacts receive context-specific alerts

**Acceptance Criteria:**
- [ ] Settings: configure SOS message templates
- [ ] Presets: Medical, Accident, Threat, Custom
- [ ] SOS modal: select preset before triggering
- [ ] Template includes: message + location + timestamp
- [ ] Test send to verify notifications work

---

**BACK-020: Report Heatmap View**
- **As a** data analyst or power user
- **I want** a heatmap overlay showing report density
- **So that** I can identify high-risk areas at a glance

**Acceptance Criteria:**
- [ ] Leaflet heatmap plugin integration
- [ ] Toggle: Markers | Heatmap | Both
- [ ] Color gradient: green (low) to red (high)
- [ ] Filter by report type before generating heatmap
- [ ] Performance: sample data if > 1000 reports

---

**BACK-021: Community Verification Badges**
- **As a** frequent contributor (Persona 4)
- **I want** badges for helpful verification actions
- **So that** I'm incentivized to keep data accurate

**Acceptance Criteria:**
- [ ] Badge: "Helper" (10 confirmations)
- [ ] Badge: "Verifier" (50 confirmations)
- [ ] Badge: "Guardian" (100 confirmations)
- [ ] Display badge next to username in comments
- [ ] Profile page: badge showcase
- [ ] Firestore: user stats tracking

---

**BACK-022: Push Notifications (Web)**
- **As a** frequent user
- **I want** push notifications for safety alerts
- **So that** I receive urgent updates even when app is closed

**Acceptance Criteria:**
- [ ] Service worker for push notifications
- [ ] Permission prompt on first safety action
- [ ] Firebase Cloud Messaging integration
- [ ] Notification types: SOS alert, trip update, comment reply
- [ ] Notification settings: enable/disable by type
- [ ] Works on Android Chrome, iOS Safari (limited)

---

### Admin & Moderation

**BACK-023: Admin Dashboard Improvements**
- **As an** admin moderator
- **I want** better tools for managing flagged content
- **So that** I can efficiently moderate the platform

**Acceptance Criteria:**
- [ ] Fix TypeScript errors in admin/mod/page.tsx
- [ ] Bulk actions: approve/dismiss multiple flags
- [ ] Filter flags by: type, status, reporter
- [ ] Flag resolution history
- [ ] User ban functionality
- [ ] Moderation queue metrics

---

**BACK-024: Automated Report Quality Checks**
- **As a** system administrator
- **I want** automated checks for report quality
- **So that** spam and low-quality reports are flagged

**Acceptance Criteria:**
- [ ] Cloud Function: analyze new reports
- [ ] Check: description length (min 10 chars)
- [ ] Check: location accuracy (not 0,0 or default)
- [ ] Check: duplicate detection (same location + type + 1h)
- [ ] Check: profanity filter on description
- [ ] Auto-flag suspicious reports for review

---

## 📊 Backlog Metrics

| Priority | Total Stories | Estimated Effort |
|----------|---------------|------------------|
| P0 (Critical) | 4 | 2-3 days |
| P1 (High) | 7 | 1-2 weeks |
| P2 (Medium) | 7 | 2-3 weeks |
| P3 (Low) | 6 | 4+ weeks |
| **TOTAL** | **24** | **8-10 weeks** |

---

## 🎯 Sprint Recommendations

### Sprint 1 (Week 1): Production Launch
- BACK-001: Deploy Firestore rules
- BACK-002: Create indexes
- BACK-003: Add App Check
- BACK-004: Cross-device testing

### Sprint 2 (Week 2): User Experience Polish
- BACK-005: User attribution in comments
- BACK-006: Comment moderation UI
- BACK-008: Floating report button

### Sprint 3 (Week 3): Backend Hardening
- BACK-009: Server-side rate limiting
- BACK-010: Real safety notifications
- BACK-012: Event tracking

### Sprint 4 (Week 4): Reliability & Analytics
- BACK-011: Offline support
- BACK-013: Error tracking
- BACK-014: Report lifecycle

---

## 📝 Definition of Done

A story is considered **DONE** when:
- [ ] Code reviewed and merged to main
- [ ] Unit tests written (if applicable)
- [ ] Manual testing completed on desktop + mobile
- [ ] Accessibility checked (keyboard nav, ARIA labels)
- [ ] Documentation updated (if user-facing)
- [ ] Deployed to staging and verified
- [ ] Product owner approval

---

**Last Updated:** January 2026  
**Next Review:** After Sprint 1 completion
