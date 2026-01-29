# RoadPulse User Personas

**Purpose:** Define core user types, their goals, pain points, and UX needs to drive product-grade UI/UX decisions.

**Date:** January 2026  
**Status:** Active - drives MVP feature prioritization

---

## Persona 1 — Report Creator (The Reporter)

### 👤 Profile
- **Name:** Chioma, 32, Small Business Owner
- **Tech Savviness:** Medium
- **Device:** Mobile-first (iPhone), occasionally desktop
- **Frequency:** Creates 1-2 reports per month when encountering issues
- **Location:** Lagos, commutes daily across city

### 🎯 Context
Chioma encounters road hazards during her daily commute—potholes, flooding, accidents. She wants to warn others but needs a **fast, frictionless process** because she's often in a rush or has poor connectivity.

### 🎯 Goals
1. **Report hazards quickly** (< 2 minutes from seeing issue to submission)
2. **Feel confident location is accurate** (GPS or map selection)
3. **Add photos easily** to show severity
4. **Get confirmation** that report was received
5. **See impact** (views, upvotes) to feel her effort mattered

### 😣 Pain Points
- Complex forms slow her down
- Unclear what to report (severity confusion)
- GPS inaccuracy creates wrong location
- Photo upload fails on slow network
- No feedback after submission ("did it work?")
- Multiple steps to find "Create Report" button

### 🔄 Primary Flows
1. **Quick Report:** See hazard → Open app → Report button → GPS location → Add photo → Describe → Submit
2. **Map Select:** GPS wrong → Switch to map → Pin location → Confirm → Proceed
3. **Check Status:** Return later → Find my report → See upvotes/comments

### 🎨 Key UI Needs
- **Persistent Report CTA** - Visible from anywhere (FAB on mobile)
- **Smart defaults** - Pre-fill severity, type from location/time
- **Photo guidance** - Show examples, max 5 photos, compress automatically
- **Progress indicator** - Show upload progress, "Submitting..."
- **Success feedback** - Toast + "View your report" link
- **Offline support** - Queue report when network returns

### 📊 Success Metrics
- Time to submit < 2 minutes (90th percentile)
- Report completion rate > 85%
- Photos uploaded per report > 1.5 avg
- Return within 7 days to check status > 40%

---

## Persona 2 — Report Consumer / Navigator (The Commuter)

### 👤 Profile
- **Name:** Tunde, 28, Software Engineer
- **Tech Savviness:** High
- **Device:** Mobile (Android), uses Google Maps daily
- **Frequency:** Checks app 3-4x per week before commute
- **Location:** Abuja, plans routes to avoid traffic

### 🎯 Context
Tunde checks RoadPulse **before leaving home** to see if his usual route has issues. He needs to **quickly assess** and **navigate around hazards**. Time is critical—he's deciding his route.

### 🎯 Goals
1. **See hazards on planned route** at a glance
2. **Navigate to alternate route** with one tap
3. **Filter noise** (only show severe issues, recent reports)
4. **Trust the data** (recent, verified reports prioritized)
5. **Quick in/out** (< 30 seconds to assess situation)

### 😣 Pain Points
- Too many minor reports clutter map
- Can't quickly open directions to avoid hazard
- Old reports still showing (not cleared)
- No "last updated" timestamp visible
- Map loads slowly or doesn't show his area
- Can't filter by "on my route"

### 🔄 Primary Flows
1. **Quick Check:** Open app → See map with markers → Identify route hazards → Navigate around
2. **Detail View:** Tap marker → See severity, photo, time → Decide if avoidable
3. **Navigate Action:** See hazard → Tap "Navigate" → Opens Google/Apple Maps → Get alternate route

### 🎨 Key UI Needs
- **Map-first default** on mobile (not list)
- **Navigate button** prominent in report details (deep link to maps)
- **Severity legend** visible on map (color coding obvious)
- **Recency cues** - "2h ago", "Just now", timestamp on markers
- **Filter shortcuts** - "Critical only", "Last 4 hours", "Near me"
- **Performance** - Map loads < 2s, markers cluster intelligently

### 📊 Success Metrics
- Session duration < 1 minute (quick check users)
- Navigate button click-through rate > 30%
- Filter usage rate > 50%
- Return frequency > 3x per week
- Reports viewed per session > 3

---

## Persona 3 — General Browser (The Dashboard User)

### 👤 Profile
- **Name:** Amara, 45, State Transport Authority Analyst
- **Tech Savviness:** Medium
- **Device:** Desktop (Windows, Chrome)
- **Frequency:** Daily, monitors state-wide trends
- **Location:** Office-based, oversees multiple regions

### 🎯 Context
Amara uses RoadPulse as a **dashboard tool** to monitor road conditions across her state. She needs a clean, professional interface that feels like a work tool, not a consumer app. She analyzes patterns and identifies problem areas.

### 🎯 Goals
1. **Monitor state-wide situation** across all regions
2. **Filter and search effectively** (by type, location, severity)
3. **See trends** (hot spots, recurring issues)
4. **Export or share reports** with colleagues
5. **Professional appearance** (presents to management)

### 😣 Pain Points
- Interface feels cramped on large monitor (max-w-7xl too narrow)
- Too much whitespace or awkward scrolling
- Filter bar looks amateur, controls scattered
- Map + list don't feel cohesive
- No way to save filter presets
- Can't see report density/patterns easily

### 🔄 Primary Flows
1. **Daily Check:** Open desktop → See map overview → Scan for clusters → Filter by severe
2. **Deep Dive:** Select region → Apply filters → Review reports → Share findings
3. **Report Analysis:** Sort by upvotes → Identify community priorities → Flag to field teams

### 🎨 Key UI Needs
- **Wide desktop layout** - Use full screen, not constrained to 7xl
- **App shell design** - No page scroll, fixed panels, internal scroll only
- **Professional filter bar** - Grouped controls, collapsible, chips summary
- **Unified panel headers** - Consistent styling, typography, spacing
- **Data density** - Show more on desktop (compact mode)
- **Export actions** - Share link, screenshot, report list

### 📊 Success Metrics
- Desktop session duration > 10 minutes
- Filter changes per session > 5
- State switches per session > 2
- Desktop usage % > 35% of total
- Return frequency daily

---

## Persona 4 — Voter / Verifier (The Community Guardian)

### 👤 Profile
- **Name:** Emeka, 55, Retired Civil Engineer
- **Tech Savviness:** Medium-Low
- **Device:** Mobile (iPhone), occasionally tablet
- **Frequency:** Daily check, verifies 5-10 reports per week
- **Location:** Enugu, knows local roads intimately

### 🎯 Context
Emeka takes pride in keeping RoadPulse data **accurate and current**. He drives familiar routes daily and confirms whether reported issues are still there or resolved. He's motivated by **community service** and trust-building.

### 🎯 Goals
1. **Confirm report accuracy** ("Still there" or "Resolved")
2. **Build trust in the platform** through verification
3. **Simple interaction** (one-tap confirmation)
4. **See verification history** (badges, contributions)
5. **Feel appreciated** for helping community

### 😣 Pain Points
- No obvious way to mark "resolved" or "still there"
- Confirmations not visible to others (no trust cues)
- No feedback on verification impact
- Too many steps to verify
- Can't see who else verified
- No incentive or recognition

### 🔄 Primary Flows
1. **Verify on Route:** See familiar report → Drive by → Open report → Tap "Still there" or "Resolved"
2. **Check Impact:** Return to app → See verified badge → See confirmation count
3. **Browse Verifications:** View profile → See verification history → Earn badges

### 🎨 Key UI Needs
- **One-tap verification** - Prominent "Resolved" / "Still there" buttons
- **Trust indicators** - Show verification count, verified badge
- **Timestamp visibility** - "Verified 1h ago by 3 users"
- **Feedback loop** - Toast confirmation, "Thanks for verifying!"
- **Low friction** - No login required for view, required for verify
- **Recognition** - Badge system, leaderboard (future)

### 📊 Success Metrics
- Verifications per active user > 2 per week
- Verification accuracy > 85% (cross-check)
- Reports with >3 verifications marked resolved
- User retention among verifiers > 60%

---

## Persona 5 — Commenter (The Context Provider)

### 👤 Profile
- **Name:** Ngozi, 36, Nurse, Local Resident
- **Tech Savviness:** Medium
- **Device:** Mobile (Android)
- **Frequency:** Comments 2-3x per month
- **Location:** Port Harcourt, neighborhood advocate

### 🎯 Context
Ngozi adds **valuable local context** to reports: "This flooding happens every rainy season," "Alternate route via X street," "Contractor started repairs today." She wants to help **neighbors make informed decisions**.

### 🎯 Goals
1. **Add helpful context** quickly
2. **Correct misinformation** politely
3. **Update community** on changes
4. **See her impact** (replies, thanks)
5. **Avoid abuse** (no trolling, clean comments)

### 😣 Pain Points
- Comment box hidden or hard to find
- Character limit too short (can't explain)
- No way to edit typos
- Can't see who commented (anonymous feels unsafe)
- Inappropriate comments not removed fast enough
- No notifications when someone replies

### 🔄 Primary Flows
1. **Add Context:** See report → Open details → Scroll to comments → Type comment → Post
2. **Update Status:** Return to report → Add comment "Road fixed today!" → Post
3. **Check Replies:** Return → See comment count increased → Read replies

### 🎨 Key UI Needs
- **Visible comment section** - Toggle or always expanded
- **Simple form** - Textarea, char counter (500), clear CTA
- **User attribution** - Show name/initial, not fully anonymous
- **Moderation** - Flag button, admin removal
- **Real-time updates** - New comments appear without refresh
- **Notifications** - (Future) Notify on replies

### 📊 Success Metrics
- Comments per report > 1.5 avg
- Comment quality (manual review) > 80% helpful
- Comment flags < 5% of total
- Users who comment return rate > 70%

---

## Persona 6 — Safety User / Trip Sharer (The Protector)

### 👤 Profile
- **Name:** Fatima, 29, Marketing Manager, Safety-Conscious
- **Tech Savviness:** High
- **Device:** iPhone, Apple Watch
- **Frequency:** Uses trip share 2-3x per week (late meetings, trips)
- **Location:** Kano, travels alone frequently

### 🎯 Context
Fatima travels alone often for work. She wants **family to know where she is** without constant check-ins. She needs **clear privacy controls** and easy **start/stop sharing**. In emergencies, she needs **one-tap SOS**.

### 🎯 Goals
1. **Share trip with trusted contacts** easily
2. **Clear on who can see** (privacy boundaries)
3. **Know link expiry** (not shared forever)
4. **Stop sharing instantly** when safe
5. **Emergency SOS** accessible in panic

### 😣 Pain Points
- Privacy unclear ("who sees this?")
- Can't stop sharing mid-trip
- Link doesn't expire (security risk)
- SOS trigger unclear (accidental activation?)
- No confirmation contacts received link
- Too many steps to start trip share

### 🔄 Primary Flows
1. **Start Trip Share:** Open safety menu → Start trip share → Select contacts → Generate link → Send → "Sharing active"
2. **Monitor Trip:** Check status → See "Active, expires in 2h" → Update location shown on map
3. **Stop Sharing:** Arrive safely → Open safety → Stop sharing → Confirm "Sharing ended"
4. **Emergency:** Feel unsafe → Long-press SOS → Confirm → Alert sent to contacts

### 🎨 Key UI Needs
- **Safety icon always visible** - Header or FAB
- **Clear status display** - "Sharing active, 1h 23m remaining"
- **Privacy messaging** - "Only people with link can view"
- **Expiry controls** - 1h, 2h, 4h, Custom
- **Stop button prominent** - Red, clear, confirmed
- **SOS safeguards** - Long-press + confirm (prevent accidents)
- **Mobile responsive** - All controls accessible on small screens

### 📊 Success Metrics
- Trip shares started per active user > 1 per week
- Trip share completion (not abandoned) > 90%
- SOS false triggers < 2%
- Safety feature awareness > 60% of users
- NPS among safety users > 50

---

## Persona 7 — Moderator / Admin (The Gatekeeper)

### 👤 Profile
- **Name:** Oluwaseun, 41, Community Manager
- **Tech Savviness:** High
- **Device:** Desktop (MacBook, Chrome)
- **Frequency:** Daily, reviews flags queue
- **Location:** Remote, manages platform trust

### 🎯 Context
Oluwaseun reviews **flagged content** and maintains platform quality. She needs **efficient tools** to quickly approve/reject/remove content. She handles spam, abuse, and duplicate reports. Time is limited—she manages multiple platforms.

### 🎯 Goals
1. **Process flags quickly** (bulk actions)
2. **Distinguish legitimate vs spam** easily
3. **Remove abuse fast** (< 1 hour response time)
4. **Track moderation metrics** (flags resolved, accuracy)
5. **Prevent burnout** (tools that don't waste time)

### 😣 Pain Points
- TypeScript errors in admin panel (lines 211, 235)
- No bulk actions (one at a time)
- Can't filter flags by type/severity
- Flag content not showing properly
- No context (who reported, history)
- Alert() calls instead of proper UI
- No moderation analytics

### 🔄 Primary Flows
1. **Review Queue:** Open admin → See pending flags → Review content → Approve/Dismiss/Remove
2. **Bulk Action:** Select multiple flags → Dismiss all → Confirm
3. **User Ban:** See repeat offender → View profile → Ban user → Confirm

### 🎨 Key UI Needs
- **Fix TypeScript errors** - FlagWithContent interface
- **Toast notifications** - Replace alerts (already done)
- **Bulk actions** - Select multiple, single action
- **Filter flags** - By type, status, date, reporter
- **Content preview** - Show full report/comment in modal
- **User context** - History, warnings, previous flags
- **Analytics dashboard** - Flags per day, resolution time

### 📊 Success Metrics
- Time to resolve flag < 5 minutes avg
- Flag resolution rate > 95%
- Moderator accuracy > 90% (appeals)
- False positive flags < 10%
- Moderator session efficiency > 20 flags/hour

---

## Persona 8 — Anonymous Viewer / Public Trip Viewer (The Concerned Contact)

### 👤 Profile
- **Name:** Halima, 62, Mother, Low Tech Savviness
- **Tech Savviness:** Low
- **Device:** Android (budget phone), WhatsApp user
- **Frequency:** Views trip links when daughter travels
- **Location:** Kaduna, not app user (just views links)

### 🎯 Context
Halima receives trip share links from her daughter via WhatsApp. She clicks the link and needs to **immediately understand**: Where is she? When was last update? Is she safe? She's **not a tech user**—everything must be crystal clear.

### 🎯 Goals
1. **See daughter's location** on map
2. **Know last update time** ("Updated 2 min ago")
3. **Understand trip status** (Active, Ended, Expired)
4. **See expiry time** ("Expires in 45 min")
5. **No login required** (friction-free)

### 😣 Pain Points
- Technical jargon confusing
- Map doesn't load or shows wrong location
- "Last updated" not visible
- Doesn't know if trip ended or link broken
- Can't tell if location is current
- No explanation of what she's seeing

### 🔄 Primary Flows
1. **View Trip:** Click WhatsApp link → See map with location pin → Read "Last updated 3 min ago"
2. **Check Status:** See header "Trip Active - Expires in 1h 10m"
3. **Expired Link:** Click old link → See "This trip has ended or expired"

### 🎨 Key UI Needs
- **Clear messaging** - "You're viewing [Name]'s trip"
- **Prominent status** - Banner with active/ended/expired
- **Last update time** - Bold, clear, auto-refresh
- **Simple map** - Just location pin, no clutter
- **No authentication** - Public read-only view
- **Mobile optimized** - Most viewers on mobile
- **Privacy note** - "This link expires at [time]"

### 📊 Success Metrics
- Public trip views per share > 5 avg
- Session duration > 2 minutes (checking periodically)
- Bounce rate < 20% (link works)
- Mobile traffic > 85%
- No login friction (0% login prompts)

---

## 🎯 MVP-Critical UX Flows (Top 3 Per Persona)

### Persona 1 — Report Creator
1. **Quick Report Flow** - FAB → GPS → Photo → Submit (< 2 min)
2. **Location Confidence** - GPS accuracy indicator, map fallback
3. **Success Confirmation** - Toast + view report link

### Persona 2 — Navigator
1. **Quick Hazard Check** - Open app → Map view → See critical markers
2. **Navigate Action** - Tap report → "Navigate" button → Opens maps app
3. **Filter Relevance** - "Critical only" + "Last 4h" shortcuts

### Persona 3 — Dashboard User
1. **Desktop App Shell** - No page scroll, fixed panels, professional look
2. **Filter Efficiency** - Grouped controls, active chips, clear/reset
3. **Wide Layout** - Use desktop screen real estate effectively

### Persona 4 — Verifier
1. **One-Tap Verification** - "Resolved" / "Still there" buttons visible
2. **Trust Indicators** - Verification count, timestamps
3. **Feedback Loop** - Toast "Thanks for verifying!"

### Persona 5 — Commenter
1. **Add Comment** - Toggle comments → Type → Post (simple)
2. **See Context** - Read other comments, timestamps
3. **Moderation** - Flag inappropriate comments

### Persona 6 — Safety User
1. **Start Trip Share** - Safety menu → Contacts → Generate → Share link
2. **Monitor Status** - Clear "Active" indicator, time remaining
3. **Stop/SOS** - Stop sharing or trigger emergency

### Persona 7 — Admin
1. **Review Flags** - Queue view → Content preview → Approve/Remove
2. **Bulk Actions** - Select multiple → Single action
3. **User Context** - History, previous flags

### Persona 8 — Public Viewer
1. **View Trip** - Click link → See map → Last update time
2. **Status Clarity** - Active/Ended/Expired banner
3. **No Friction** - No login, simple interface

---

## 📋 Persona-Driven UI Priorities

### High Priority (MVP Must-Haves)
- ✅ Persistent Report CTA (Persona 1)
- ✅ Navigate button with deep links (Persona 2)
- 🔨 Desktop app shell, wide layout (Persona 3)
- ✅ Resolved/Still there buttons (Persona 4)
- ✅ Comments section integrated (Persona 5)
- ✅ Trip share with clear status (Persona 6)
- 🔨 Admin panel improvements (Persona 7)
- ✅ Public trip view optimized (Persona 8)

### Medium Priority (Post-MVP Polish)
- 🔲 FAB on mobile for Report (Persona 1)
- 🔲 Filter shortcuts: Critical, Recent, Near me (Persona 2)
- 🔨 Filter bar collapse, chips summary (Persona 3)
- 🔲 Verification badges, leaderboard (Persona 4)
- 🔲 User attribution in comments (Persona 5)
- 🔲 Notifications for safety events (Persona 6)
- 🔲 Bulk flag actions (Persona 7)
- 🔲 Auto-refresh for public trip view (Persona 8)

### Low Priority (Future Enhancements)
- 🔲 Offline report queue (Persona 1)
- 🔲 Route-based filtering (Persona 2)
- 🔲 Export/share dashboard (Persona 3)
- 🔲 Verification history, profile (Persona 4)
- 🔲 Comment notifications, editing (Persona 5)
- 🔲 Trusted circles, panic presets (Persona 6)
- 🔲 Moderation analytics dashboard (Persona 7)
- 🔲 Multi-language support (Persona 8)

---

**Legend:**
- ✅ Implemented
- 🔨 In Progress (Current Sprint)
- 🔲 Backlog

**Last Updated:** January 2026  
**Next Review:** After desktop polish completion
