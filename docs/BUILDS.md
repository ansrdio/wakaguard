# WakaGuard build log

What went into each build of the phone apps, newest first, and everything
planned for the next one.

**Keeping it up to date:** every change to the app, the website or the server
is added here in the same commit as the change. An item for the next build is
written down the moment it is agreed, before any work on it starts, and is
ticked when it is done in the code. When a build is uploaded, its section moves
from "Next build" to "Released builds" with the date and where it went.

**How builds work:** the Android app and the iPhone app are built from the same
code and carry the same build number when they hold the same features. Changes
to the website and the server go live on their own, without a new app build,
and are listed separately.

## Live now (Monday 12 October 2026)

| | Build | Where |
|---|---|---|
| Android | 21 | Google Play closed test and internal test |
| iPhone | 20 | TestFlight, outside testers (builds 15 and 17 were retired on 12 October) |

Android 21 and iPhone 20 hold the same features.

## Next build: 22

Planned for Wednesday 14 October 2026, Android and iPhone on the same day.

### Required by the stores

- [ ] Report and block inside the phone app, for road reports and comments
      (today this exists only on the website's report page)
- [ ] Terms of Use page, agreed to when signing up. The owner approves the
      wording, then the lawyer reviews it
- [ ] A screen before the first trip that explains why location is shared
      while the screen is off

### From testers and the first days of use

- [ ] Android: Back goes back one screen everywhere. Today only the Trip map
      answers it; from the report form, report details, filters, the Profile
      pop-ups and the other tabs, Back puts the whole app in the background
- [ ] Location that cannot be read: say plainly what is wrong (permission off,
      the phone's location switched off, or no position yet) and keep it on
      screen with a button that opens the phone's settings. Today a message
      shows for six seconds and then only "No location sent yet"
- [ ] A "Check my location" screen that shows what the phone reports
      (permission, location switch, last position and how accurate), so a
      tester's location problem can be diagnosed from a screenshot
- [ ] Fall back to an approximate position when a precise one does not
      arrive, so a contact sees roughly where the traveller is
- [ ] "Have you arrived?" reminders: one shortly before a trip's time runs
      out, and again while the trip stays open after it. Today there is a
      single "Are you okay?" at the end time, and on the first day of testing
      trips were left open for hours or ended late (needs the server as well
      as the app)
- [x] Close buttons on the pop-ups can be seen in dark mode (Settings, Help,
      My Reports, Delete account)

### Tidying

- [ ] Hide the old Level and Points card on Profile, which contradicts the
      weekly ranking
- [ ] Keep the other pop-ups above the iPhone keyboard (sign-in, report,
      state picker, the safety screens), as was done for Delete account
- [ ] Show the build number beside the version on Profile, so a tester can
      say which build they have
- [ ] Android: stop asking for permission to change contacts, which the app
      does not use

### Held for a later build

Raised this week and not in build 22.

- [ ] Road report form: make placing the pin easier when the phone's location
      is not found (a tester gave up on a report because of this)
- [ ] Android: a proper icon on the trip notification (it is a plain square)

### Server and website, alongside build 22

These go live without an app update, each on the owner's word.

- [ ] Emails: stop mail apps turning the company number in the footer into a
      phone link
- [ ] Trips: accept a trip's first position even in its first ten seconds
      (today it can be dropped, and the next one is up to two minutes away)
- [ ] A second text-message provider (Africa's Talking), ready for the day a
      sender ID is approved
- [ ] The dark mode close-button fix on the website (already in the code)

## Later builds

The roadmap document was written before builds 19, 20 and 21 were used for
quick fixes, so its build numbers are three lower than these.

| Build | Planned | What |
|---|---|---|
| 23 | Wed 21 Oct | Sign in with Google and Apple; paid map provider |
| 24 | Wed 28 Oct | Sponsor slot; "please update" switch; service notice; "stop texting me" for contacts |
| 25 | Wed 4 Nov | Fixes, after text alerts are switched on |
| 26 | Wed 11 Nov | The launch version, frozen Friday 13 November |

## Released builds

### Build 21, Saturday 10 October 2026 (Android)

Google Play internal test and closed test, approved the same day.

- Nearby: the reports sheet stands on the bottom bar and no longer covers the
  legend or the map's credit line; a tap on it no longer counts as a swipe
- The Delete account password box stays above the iPhone keyboard

iPhone has both of these in its build 20.

### Build 20, Saturday 10 October 2026 (Android and iPhone)

Android: Play internal and closed test, replaced by 21 the same evening.
iPhone: uploaded 10 October, approved for outside testers 12 October.

- WakaGuard sends its own "confirm your email" and "reset your password"
  emails, with a link on wakaguard.com
- The link opens WakaGuard's own page, and "Open WakaGuard" brings the app
  back to the front, where it carries on by itself
- iPhone only: the app answers links to wakaguard.com and `wakaguard://`

### Build 19, Saturday 10 October 2026 (Android)

Play internal and closed test.

- "Continue" after an email link opens the phone app, not the website
- The app checks by itself whether the email has been confirmed when it comes
  back to the front

### Build 18, Friday 9 October 2026 (Android)

The first build on Google Play (internal test, then the closed test).

- Delete my account, from Profile and from the website's account menu
- Everything in build 17

### Build 17, Thursday 8 October 2026 (iPhone)

TestFlight; approved by Apple's beta review on 12 October and retired the same
day in favour of build 20.

- A new account goes straight to "Check your email"
- The unused Google sign-in plugin is removed (the cause of build 16's
  rejection)

### Build 16, Thursday 8 October 2026 (iPhone)

Rejected by Apple automatically (invalid binary); never reached testers.

- The add-time choices are on the trip card, with five minutes offered
- Android: the "Are you okay?" reminder shows over other apps

### Build 15, Thursday 8 October 2026 (iPhone)

TestFlight, inside testers only. Retired 12 October.

- Phones are registered for the "Are you okay?" reminder; push added to the
  iPhone app
- A refused Start goes to the unanswered question; Start shows the trip's
  length and arrival time
- "Report something on the road" on the trip card
- Shorter extra time in a test trip
- The username screen no longer calls a taken name available
- A crashed screen offers a way forward; the app reloads when the iPhone's
  on-phone database has stopped
- iPhone: says why it uses the camera

### Build 14, Wednesday 7 October 2026 (iPhone)

Version 1.2.0, the first build of WakaGuard as a travel safety app.

- The trip is the first screen; three tabs (Trip, Nearby, Profile); new look
- Start a trip with a destination, a length and who is told; add time, arrive
  or cancel; test trips
- The server watches the trip and alerts the chosen contacts if the traveller
  does not arrive; the app says what was actually sent
- Trip map for the traveller, and a map page for contacts with the path
  travelled
- SOS sends the position the phone already has
- Location is shared with the screen locked, from one phone only
- First-launch screens rewritten around safe trips

## Website and server releases

Changes that went live without an app build.

| Date | What |
|---|---|
| Sat 10 Oct | Our own account emails switched on (through Brevo); the email-link page; the "go back to the app" notice; the Nearby layout fix |
| Fri 9 Oct | Front page for first-time visitors; Privacy, Support and Guidelines carry their text in the page; Delete account page and server function; the website's account menu shows who is signed in; texts are addressed to the contact and signed with the company's name |
| By Thu 8 Oct | The travel safety version of the website and server: trips watched by the server, alerts, the trip map and the contacts' page; About page; Support, Privacy and Guidelines rewritten; the company's name and a contact email that can receive mail |

Not yet switched on: text alerts to contacts (waiting for a sender ID).
