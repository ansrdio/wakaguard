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

## When each build is due

One build a week, finished on Wednesday night Arizona time so testers have it
before the weekend. Android and iPhone go out on the same day.

| Build | Due | Main contents | Status |
|---|---|---|---|
| 22 | Wed 14 Oct | Store requirements (report and block, Terms of Use, location screen); Android Back; location fixes; arrival reminders | Out on iPhone, with Google for review (Mon 12 Oct, two days early) |
| 23 | Wed 21 Oct | Sign in with Google and Apple; paid maps; weather; our own road report pictures; "How are you travelling?" with matching tips; reported posts hidden automatically | Planned |
| 24 | Wed 28 Oct | Sponsor card by state; "please update" switch; service notice; "stop texting me"; vehicle details | Planned |
| 25 | Wed 4 Nov | Fixes after text alerts are switched on; repeat a usual trip | Planned |
| 26 | Wed 11 Nov | The launch version | Planned |

| After the last build | Date |
|---|---|
| Launch version frozen; go or no-go | Fri 13 Nov |
| Sent to Apple and Google, held for release | Mon 16 Nov |
| Both stores approved | by Fri 27 Nov |
| Public launch | Tue 1 Dec (Monday evening in Arizona) |
| Nothing new for two weeks, fixes only | until Mon 14 Dec |

Other dates that decide the launch: Google's 14 days with 12 testers began on
Mon 12 Oct and end about Mon 26 Oct; text alerts are to be on by Mon 2 Nov.

## Live now (Monday 12 October 2026)

| | Build | Where |
|---|---|---|
| Android | 21 | Google Play closed test. Build 22 is on the internal test, and the owner sent it to Google for review for the closed test on 12 October; testers get it when Google passes it |
| iPhone | 22 | TestFlight, outside testers, since 12 October: the owner sent it for review and Apple passed it at once. Build 20 is still there beside it (builds 15 and 17 were retired on 12 October) |

Until Google passes Android 22, iPhone testers are one build ahead of Android
testers. The two builds 22 hold the same features, with one difference: the
iPhone one was built a little later and also has the iPhone keyboard fix,
which Android does not need.

## Next build: 22

Planned for Wednesday 14 October 2026, Android and iPhone on the same day.
Finished on Monday 12 October: on TestFlight for iPhone testers that day, and
with Google for review for Android testers.

### Required by the stores

- [x] Report and block inside the phone app, for road reports and comments:
      "Report" with a reason and "Block this person" on every report and
      comment, and a "Blocked people" list under Settings where a block can be
      undone (blocking used to be one-way, and only on the website)
- [x] Terms of Use page, agreed to when signing up (a box to tick on both
      sign-up forms). The owner approved the wording on 13 October; the
      lawyer's review is still to come. Agreement is not yet
      recorded on the server, and people who already have accounts are not
      asked; both need a change to the database rules, for a later build
- [x] A screen before the first trip that explains why location is shared
      while the screen is off

### From testers and the first days of use

- [x] Android: Back goes back one screen everywhere. Today only the Trip map
      answers it; from the report form, report details, filters, the Profile
      pop-ups and the other tabs, Back puts the whole app in the background
- [x] Location that cannot be read: say plainly what is wrong (permission off,
      the phone's location switched off, or no position yet) and keep it on
      screen with a button that opens the phone's settings. Today a message
      shows for six seconds and then only "No location sent yet"
- [x] A "Check my location" screen that shows what the phone reports
      (permission, location switch, last position and how accurate), so a
      tester's location problem can be diagnosed from a screenshot
- [x] Fall back to an approximate position when a precise one does not
      arrive, so a contact sees roughly where the traveller is
- [x] "Have you arrived?" reminders: one shortly before a trip's time runs
      out, and again while the trip stays open after it. Today there is a
      single "Are you okay?" at the end time, and on the first day of testing
      trips were left open for hours or ended late (needs the server as well
      as the app)
- [x] Close buttons on the pop-ups can be seen in dark mode (Settings, Help,
      My Reports, Delete account)

### Tidying

- [x] Hide the old Level and Points card on Profile, which contradicts the
      weekly ranking
- [x] Keep the other pop-ups above the iPhone keyboard (sign-in, report,
      state picker, the safety screens), as was done for Delete account
- [x] The keyboard handling now actually runs on iPhones. The owner found on
      12 October that tapping Description in the road report form sent the
      box too high. A simulated iPhone showed why: the app compared the
      keyboard against a height that shrinks along with it on an iPhone, so
      it never noticed the keyboard at all, and the earlier Delete account
      fix only looked right because the iPhone slid the page by itself.
      Checked on the simulated iPhone for the report form and sign-in, and
      by the owner on a real iPhone for the report form, the comment box and
      Delete account (all three worked, 12 October)
- [x] Show the build number beside the version on Profile, so a tester can
      say which build they have
- [x] iPhone only at launch: the app is no longer offered for iPad, which
      would need iPad screenshots and an iPad review (the owner said yes on
      12 October). An iPad can still install it and runs it phone-sized

### Held for a later build

Raised this week and not in build 22.

- [ ] Road report form: make placing the pin easier when the phone's location
      is not found (a tester gave up on a report because of this)
- [ ] Android: a proper icon on the trip notification (it is a plain square)
- [ ] Android: stop asking for permission to change contacts, which the app
      does not use. Taken out of build 22: the contacts plugin asks for
      reading and changing together, so removing one line would break
      "choose from your phone's contacts". The right fix is Android's own
      contact picker, which needs no contacts permission at all

### Server and website, alongside build 22

These go live without an app update, each on the owner's word. All of them
were released on Monday 12 October, except Africa's Talking, which is in the
code and stays switched off until it has an approved sender ID.

- [x] Emails: stop mail apps turning the company number in the footer into a
      phone link
- [x] Trips: accept a trip's first position even in its first ten seconds
      (today it can be dropped, and the next one is up to two minutes away)
- [x] A second text-message provider (Africa's Talking), ready for the day a
      sender ID is approved
- [x] The dark mode close-button fix on the website
- [x] Texts reworded to the format Termii requires: they open "Hi <name>,"
      (was "Dear") and close "Powered by Inskriba Limited" (was "Inskriba
      Ltd."), matching the sample Termii confirmed on 12 October and the
      letters to the networks. Live on the server and the website since the
      evening of 12 October, on the owner's word. Texting itself is still
      switched off. So that every text opens the same way, a test
      text's label now comes straight after the greeting, and a contact with
      no usable name is greeted with a plain "Hi," (the owner said yes to
      both on 12 October)

## Later builds

The roadmap document was written before builds 19, 20 and 21 were used for
quick fixes, so its build numbers are three lower than these.

| Build | Planned | What |
|---|---|---|
| 23 | Wed 21 Oct | Sign in with Google and Apple; paid map provider; weather on the Trip screen; our own road report pictures; "How are you travelling?" when starting a trip, with matching tips. If the week is tight, sign-in moves to build 24, since the stores do not require it |
| 24 | Wed 28 Oct | Sponsor slot, different by state; "please update" switch; service notice; "stop texting me" for contacts; vehicle details on a trip |
| 25 | Wed 4 Nov | Fixes, after text alerts are switched on; repeat a usual trip |
| 26 | Wed 11 Nov | The launch version, frozen Friday 13 November |

### Build 23, in more detail

- [ ] Weather: one line on the Trip screen, before starting and during a
      trip, saying what to expect where the traveller is ("heavy rain expected
      here in the next two hours, allow extra time"). No weather page and no
      forecasts for other places. Our server asks the weather service by rough
      area, so the service never sees where a person is. Before building:
      choose a weather service whose terms allow an app that carries sponsors,
      and add a line to the Privacy page
- [ ] Road report pictures of our own (pothole, go-slow, accident, roadwork,
      hazard, road closed, checkpoint, flood), replacing the emoji used today.
      From the first concept of 12 October; the owner's changes to the
      drawings come first
- [ ] "How are you travelling?" when starting a trip: bus or danfo, keke,
      okada, private car, taxi or ride-hailing, on foot, other. One tap,
      remembers the last answer, and can be skipped. Kept with the trip, so we
      learn how people travel, and shown to contacts if the traveller does not
      arrive. Needs a line on the Privacy page. Vehicle details (plate, bus
      company, driver) follow in build 24
- [ ] Safety tips that match the answer: one short tip on the start form once
      a way of travelling is chosen, and another on the trip card ("Okada: ask
      for a helmet and hold on with both hands"). They replace the general
      tips card on the Trip tab. Tips never hold up starting a trip. The
      owner approves the wording, checked by someone in Nigeria

      Draft tips, written on 12 October and not yet approved:

      | Travelling by | Draft tips |
      |---|---|
      | Bus or danfo | Board at a recognised park, not by the roadside. Note the plate number before you sit. If something feels wrong about the other passengers, wait for the next one. |
      | Keke | Agree the fare and the route before you get in. Keep your bag on your lap, away from the open side. |
      | Okada | Ask for a helmet and hold on with both hands. Avoid okada at night and in the rain. |
      | Private car | Check fuel, tyres and water before a long trip. Take a break every two hours. Avoid driving between cities at night. |
      | Taxi or ride-hailing | Check the plate and the driver match before you get in. Sit in the back. |
      | On foot | Stay on busy, well-lit roads. Keep your phone in your pocket when crossing. |

      With weather in the same build, a tip can follow the forecast ("Rain
      expected. Okada is risky on wet roads").
- [ ] Automatic hiding: once three different accounts report a road report
      or a comment, it is hidden from everyone at once and waits in a review
      list, where it can be removed for good or put back. Today nothing hides
      a post, however often it is reported, until someone removes it by hand
      on the moderation page. A server change, so it works on every build
      (the owner said yes on 12 October)
- [ ] Emergency numbers corrected: the list shows 199 for both Police and
      Fire, and a Lagos ambulance line for the whole country. Needs the right
      numbers confirmed in Nigeria
- [ ] Error reports from testers' phones, so a crash reaches us without the
      tester having to say so (nice to have)
- [ ] Road report form: when the form is scrolled, a strip of it shows above
      its title bar. Looks untidy, loses nothing (seen on 12 October)

### Builds 24 and 25, in more detail

- [ ] Build 24. Sponsor slot by state: the sponsor card can differ by the
      state the user has chosen, changed from the server without an app
      update. Marked "Sponsored"; never on the trip screen, the contacts' page
      or in texts
- [ ] Build 24. Vehicle details on a trip: the plate number, the bus company
      or the driver's name, added when starting. Contacts see them if the
      traveller does not arrive
- [ ] Build 25. Repeat a usual trip: one tap to start a trip made before, with
      the time it usually takes filled in
- [ ] Build 25. A "keep WakaGuard running" help screen, if trips on Tecno,
      Infinix and itel phones show those phones stopping the app in the
      background. On the first day of testing one long trip went quiet after
      two and a half hours; the cause is not yet known

## Server, website and store work before launch

From the roadmap, with its dates. None of these needs an app build.

- [ ] By Sun 18 Oct. Proof runs: a long Android trip on mobile data, and a
      long iPhone trip. (A fresh sign-up is proven: every tester who started
      one finished it)
- [ ] By Fri 23 Oct. The old server functions moved; they cannot be updated
      after Fri 30 Oct
- [ ] By Fri 23 Oct. Alarms when alerts break (the minute-by-minute check
      stops, texts fail, the text wallet runs low, spending jumps), and a
      daily backup
- [ ] By Fri 23 Oct. How long records are kept, with automatic deletion
- [ ] By Fri 30 Oct. Store listing drafts and a reviewer account; final by
      Fri 13 Nov. Wording check: never "emergency service"
- [ ] Mon 2 Nov. Text alerts switched on, then proven on MTN, Airtel, Glo and
      9mobile, including a do-not-disturb number
- [ ] Week of Mon 2 Nov. Security check of the server, and Firebase's app
      check for the phone apps
- [ ] By Fri 6 Nov. The go or no-go checklist for Fri 13 Nov
- [ ] Launch day. "Get WakaGuard" on the page contacts see, and store links
      on the website

Not builds, and tracked in the roadmap document: the D-U-N-S number and store
accounts in the company's name, the company's purposes at CAC, the data
regulator and advert approval, the bank account and sponsor agreement.

## After launch

Agreed as wanted, not yet given a build. Nothing here is started.

From the first week of testing (agreed 12 October):

- [ ] One-tap road reports: "Checkpoint", "Accident", "Bad road", "Flooding"
      as buttons that report where the traveller is
- [ ] Battery level in the alert, so contacts know when a phone was about to
      go off
- [ ] Check-ins on long trips: "Still okay?" every couple of hours
- [ ] Nigerian languages for the alert texts and the main screens: Pidgin,
      Yoruba, Hausa, Igbo

Places and adverts by location (the owner asked on 12 October where these
stand; neither exists yet):

- [ ] A directory of places (landmarks, businesses, bus parks), built from
      many people's trips combined, never from one person's. Today the app
      only keeps where each trip started and ended and the destination the
      traveller typed. Needs a line on the Privacy page before it starts
- [ ] Adverts by location, the way Waze does them (the owner's reference,
      12 October), in this order:
      1. Sponsored pins on the Nearby map: a business's branches shown with
         its logo; a tap opens its card with an offer and directions. Needs
         only the sponsor's own list of branches, not the directory
      2. An offer when a trip ends, the moment the traveller has stopped
      3. A sponsored place at the top when choosing a destination. Needs
         address lookup and the directory
      4. Sponsored stops on long trips. Needs the directory
      With all of them: marked "Sponsored", views and taps counted for the
      sponsor, chosen by the area the person is in and never by their past
      trips, and nothing shown while a trip is running

A look of our own, reflecting Nigerian culture (asked for by the owner on
12 October; a first concept was drawn that day and is waiting for the owner's
reaction; an illustrator or 3D artist may take it further). The road report
pictures are in build 23:

- [ ] The traveller's marker as a vehicle (danfo, keke, okada or car), moving
      along the map, chosen from the answer to "How are you travelling?"
- [ ] Colours and patterns drawn from Nigerian design alongside the green:
      danfo yellow, adire indigo, an adire-style pattern for headers and
      empty screens
- [ ] Turn signs and road graphics in the same style, when navigation comes
- [ ] Movement: the vehicle travelling, pins appearing, the moment of arrival

Navigation (asked for by the owner on 12 October, "at some point"):

- [ ] Step 1, the route without the voice: once a destination can be looked
      up, work out the route and how long it should take, fill in the trip's
      length from it, draw it on the trip map and the contacts' page, and
      notice when a traveller has left it or stopped for long. Needs address
      lookup and a routing service
- [ ] Step 2, turn-by-turn with spoken directions inside the app. A large
      piece of work with a running cost: it needs a navigation kit built into
      the Android and iPhone apps themselves. Until then the app hands over to
      Google Maps for directions
- [ ] Before either: when the paid map provider is chosen for build 23, prefer
      one that also offers routing and navigation, so the maps do not have to
      be changed twice

From the roadmap:

- [ ] "Who invited you?" and invite links (mid-December)
- [ ] The weekly ranking inside the app (January)
- [ ] Address lookup when choosing a destination
- [ ] Family circle, and a "request a trip" link
- [ ] USSD, for people without smartphones

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
| Mon 12 Oct, late evening | Server: the five functions that send texts now word them "Hi <name>, … Powered by Inskriba Limited", the format Termii requires (texting is still off). Website: the same wording in the examples and on the Privacy page; the corrected keyboard handling for iPhones; the final Back design from build 22 |
| Mon 12 Oct | Server: arrival reminders ("5 minutes left", "Is your trip finished?"), a trip's first position accepted at once, the registration number in emails no longer offered as a phone call. Website: everything in build 22's list that is not phone-only, with the Terms of Use page |
| Sun 11 Oct | The weekly ranking report, a tool run by hand that reads trips and road reports; no change to the app |
| Sat 10 Oct | Our own account emails switched on (through Brevo); the email-link page; the "go back to the app" notice; the Nearby layout fix |
| Fri 9 Oct | Front page for first-time visitors; Privacy, Support and Guidelines carry their text in the page; Delete account page and server function; the website's account menu shows who is signed in; texts are addressed to the contact and signed with the company's name |
| By Thu 8 Oct | The travel safety version of the website and server: trips watched by the server, alerts, the trip map and the contacts' page; About page; Support, Privacy and Guidelines rewritten; the company's name and a contact email that can receive mail |

Not yet switched on: text alerts to contacts (waiting for a sender ID).
