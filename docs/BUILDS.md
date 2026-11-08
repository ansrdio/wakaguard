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
| 22 | Wed 14 Oct | Store requirements (report and block, Terms of Use, location screen); Android Back; location fixes; arrival reminders | Out on both: iPhone and Android, Mon 12 Oct, two days early |
| 23 | Wed 21 Oct | Testers' corrections (checklist, exact trip length, delete my own post); "How are you travelling?" with matching tips; our own road report pictures; "keep WakaGuard running" help; weather (paid maps moved to build 24: Mapbox); reported posts hidden automatically | Uploaded Wed 14 Oct, a week early: Android internal test live; closed test and TestFlight sent for review by the owner |
| 24 | Wed 28 Oct | Sign in with Google and Apple; "please update" switch; service notice; "stop texting me"; vehicle details; far-away reports marked; Mapbox maps; destination pin with its place name (in place of search by address); "text them when I arrive"; louder reminders, "More time…", Undo; weather icon and morning weather. Sponsor card moved to a later build (no sponsor yet) | Out on both, ten days early: TestFlight passed Apple's beta review at once on Sun 18 Oct; Google approved the closed test (Alpha) by Mon 19 Oct (the owner) |
| 24.1 | at once | iPhone only: build 24 closes as soon as it opens on iOS 27. Fix only, nothing else (see "Build 24.1" below) | Out on iPhone: TestFlight Tue 20 Oct, beta review passed at once, both groups testing |
| 25 | Wed 4 Nov | Fixes after text alerts are switched on; one-tap "keep running" permissions on the first trip; 6, 8 and 12-hour trip choices; four fixes from problem reports (old Android WebView, notifications switch, full-screen pin map, "ending early is fine"); last of all, directions on the trip as a beta (the owner, 23 Oct: "It will be the last thing we add") | Out on both, Sun 25 Oct, ten days early; both stores approved it the same day |
| 26 | Wed 4 Nov | What is done by then: seven small fixes and the simplification pass (one colour plus red for emergencies, fewer boxes and icons, a short start form with extras under "More options", plain labels). Moved a week early on 2 November (the owner: "Yes, upload Wed 4 Nov"), so testers use the simpler screens for a week before the freeze | Out on both, Tue 3 Nov evening (Arizona), a day early. Built from branch `build-26` (`131b988`, from `44746cf`, so no build 27 work), tested on the owner's Galaxy and iPhone. Android published to the closed test; iPhone in TestFlight for both groups (beta review passed at once); website released from the same commit; testers told in the group at 21:30 |
| 27 | Wed 11 Nov | The launch version: the referral programme (see "Build 27" below) and the rest of the build 26 list: first trip on day one, checkpoint stops on the contacts' page, lock-screen SOS, App Check, place search, usual-time reminder, points card | Planned 2 November; started Thu 5 Nov (the owner: "let us start build 27"). The whole list is at the top of "Build 27" below. If time gets tight, the points card and usual-time reminder can move after launch (my suggestion, not yet agreed) |

| After the last build | Date |
|---|---|
| Launch version frozen; go or no-go | Fri 13 Nov |
| Sent to Apple and Google, held for release | Mon 16 Nov |
| Both stores approved | by Fri 27 Nov |
| Public launch | Tue 1 Dec (Monday evening in Arizona) |
| Nothing new for two weeks, fixes only | until Mon 14 Dec |

Other dates that decide the launch: Google's 14 days with 12 testers began on
Mon 12 Oct and end about Mon 26 Oct; text alerts are to be on by Mon 2 Nov.

**Decided by the owner on 14 October:**
- Maps: **Mapbox**, for the map pictures, address lookup, routes and
  navigation. The map pictures change in build 24 (build 23 still uses
  OpenStreetMap's). How well Mapbox finds Nigerian addresses is still to be
  tested before we rely on it
- The week of 19 October, left free because build 23 went out a week early,
  goes to the server safety work due Fri 23 Oct (alarms, backup, record
  deletion, the last old function), not to bringing build 24 forward
- The morning weather notification goes only on days with something worth
  knowing, not every day
- Pidgin covers the main screens only
- Turn-by-turn navigation at launch, as a reason for people to come back
  to the app, in a lighter form than the full native kit (which does not
  fit before Fri 13 Nov): Mapbox maps and destination search in build 24;
  directions on the trip in build 25, marked Beta, behind a server switch
  so it can be hidden without a new build; full native navigation from
  January to April 2027. To make room, Pidgin moves to January and "repeat
  a usual trip" to after launch. Two checks this week decide whether the
  spoken part goes ahead: Mapbox's written answer on whether its terms
  allow it without their native kit, and a test of how well Mapbox finds
  Nigerian places. If either fails, the launch gets the route and its time,
  and directions still open Google Maps

## Live now (Friday 6 November 2026)

| | Build | Where |
|---|---|---|
| Android | 26 | Google Play closed test (Alpha), published Tue 3 Nov. Play can take a day or two to offer it on each phone; clearing the Play Store's cache helps |
| iPhone | 26 | TestFlight, both groups, since Tue 3 Nov (beta review passed at once) |
| Website | 27 | wakaguard.com, released Sat 7 Nov from `d467a4a`: Google's maps everywhere, the place search, the Terms of 7 November (invites from 1 December), "You're offline" on the sign-in screens, and the rest of build 27. iPhone 27.1 is with TestFlight testers; Android 27 is with Closed testing (Alpha) testers since 7 Nov |
| Server | `main` | Live up to build 27's functions (Fri 6 Nov, from `e887365`), `placeName` on Google (Fri 6 Nov) and the trip rules (Thu 5 Nov) |

## Next build: 22

Planned for Wednesday 14 October 2026, Android and iPhone on the same day.
Finished on Monday 12 October and with testers on both phones that day:
TestFlight for iPhone, Google Play's closed test for Android.

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

- [x] Road report form: make placing the pin easier when the phone's location
      is not found (a tester gave up on a report because of this). Done in
      build 23
- [x] Android: a proper icon on the trip notification (it is a plain square).
      Done in build 23: a white shield with a tick, in WakaGuard green, on
      the "Safe Trip active" notification and on the reminders the server
      sends. Seen on the owner's Galaxy on 13 October: the running trip's
      notification carried the new icon and colour
- [x] Android: stop asking for permission to change contacts, which the app
      does not use. Taken out of build 22: the contacts plugin asks for
      reading and changing together, so removing one line would break
      "choose from your phone's contacts". The right fix is Android's own
      contact picker, which needs no contacts permission at all. Done in
      build 23: "From phone" opens the phone's own contacts screen, and the
      one entry chosen is all the app receives. The Android app now asks for
      no contacts permission, to read or to change. Tried on the owner's
      Galaxy on 13 October: the contacts screen opened with no permission
      question and the chosen name and number arrived in the form. (The
      iPhone app still lists contacts inside the app, with permission; it
      could use the iPhone's own picker the same way, in a later build.)
      When build 23 goes to Google, check the Data safety answers in Play
      Console: the app no longer reads the address book, but a contact the
      person chooses is still saved

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
| 23 | Wed 21 Oct | Testers' corrections; "How are you travelling?" when starting a trip, with matching tips; our own road report pictures; "keep WakaGuard running" help; weather on the Trip screen (the paid map provider moved to build 24: Mapbox) |
| 24 | Wed 28 Oct | Sign in with Google and Apple (moved from build 23 on 13 October: the stores do not require it, and it is the item most likely to eat a week); sponsor slot, different by state; "please update" switch; service notice; "stop texting me" for contacts; vehicle details on a trip; Mapbox maps; destination search by address |
| 25 | Wed 4 Nov | Fixes, after text alerts are switched on; directions on the trip, beta, built last |
| 26 | Wed 4 Nov | The simplification pass, a week early (decided 2 November) |
| 27 | Wed 11 Nov | The launch version with the referral programme, frozen Friday 13 November |

### Build 23, in more detail

Built in the code on 13 October, and tried in a browser against the local
test copy, are the items ticked below. A build numbered 23 was put on the
owner's Galaxy by cable that day to try the two Android items. Later that
day a second build 23, with every item ticked below, went on the owner's
iPhone and Galaxy by cable (testers stay on build 22 until the owner says
otherwise). On the Galaxy, reading the screen's words only, these passed: the
build number; the travel question's tip, which clears on a second tap;
minutes in 5s; the car checklist showing all ten and counting the tenth;
Checkpoint in the filters; "Show in Maps" opening Google Maps at one of the
three live reports with no route asked for; the keep-running steps and their
settings button; and "Check my location" wording (136 m indoors, so green).
Colours, drawings and the map are for the owner's eyes. Nothing is released.

- [x] A "keep WakaGuard running" help screen, for phones that stop the app
      in the background (Tecno, Infinix, itel and some Samsungs do). Brought
      forward from build 25 on 13 October: on the second morning of testing
      two more testers' phones stopped sending their position partway through
      long trips, one after 17 minutes of a four-hour trip. It is the biggest
      gap in what contacts would see. The cause on each phone is still to be
      confirmed from "Check my location" screenshots. On Profile and linked
      from "Check my location", with different steps for Android, iPhone and
      the website. The wording is a draft for the owner to check with someone
      who has a Tecno, Infinix or itel phone. On those three makes the app
      also shows a card at the top of the Trip screen, once, without being
      asked ("Your phone may stop WakaGuard when you leave the app"), until
      the person says they have done the steps
- [x] A nudge when a phone stops sharing. A tester on an Infinix Hot 11 Play
      said on 13 October that sharing stops whenever the app is minimised,
      that the app only says so when it is opened again, and that nobody can
      keep the app open for a whole trip. The server now checks running
      trips every two minutes, and after ten minutes with no position sends
      the traveller a notification: "Your location has stopped sharing".
      Again every twenty minutes while the silence lasts, three times at
      most; not on a test trip, and not close to the trip's time, when the
      arrival reminders take over. A server change, so it works on every
      build. Kept apart from the check that alerts contacts, so that nothing
      here can slow that down. It goes live with build 23 and not before (the
      owner said so on 13 October), when the server is updated on the owner's
      word
- [ ] Find out why the Infinix stops sharing. The tester saw no "Safe Trip
      active" notification, which is what keeps the app running in the
      background, although their other notifications arrive. Either the
      phone removes it at once or it never starts. They have been sent the
      keep-running steps to try
- [x] Proof that the app itself keeps sharing with the phone locked. On 13
      October a one-hour trip was run on the owner's Galaxy A15 (build 22),
      unplugged and locked. In the first 19 minutes locked the server
      received 12 positions, never more than 139 seconds apart, accurate to
      between 3 and 21 metres. So on a phone that lets the app run, sharing
      in the background works, and the Infinix fault lies in that phone
      stopping the app. Still to prove: a trip of two hours or more with the
      phone lying still, when Android's deeper battery saving starts (one
      tester's trip went quiet after two and a half hours). The
      same trip also showed the new location explanation before a first
      trip on a real phone. Left locked for the rest of the hour, the Galaxy
      went on sharing until the trip was ended at 61 minutes (28 positions
      in the 51 minutes it was locked, the longest wait still 139 seconds),
      and the "5 minutes left" reminder reached it while
      locked, five minutes before the time. The owner saw it at the top of
      the screen but nearly missed it: the phone was on silent, so it made
      no sound. The reminder is already set as loud as Android allows an
      ordinary notification to be (high importance, with vibration); a phone
      on silent stays silent. What covers a missed reminder is what comes
      after it: "Are you okay?" at the time, "Is your trip finished?" every
      fifteen minutes, and the alert to contacts
- [x] Weather: one line on the Trip screen, at the top of the start form and
      on the running trip's card, saying what to expect where the traveller
      is ("Heavy rain expected here in about 2 hours. Allow extra time; low
      roads may flood."). Storm, heavy rain, rain, fog and great heat are
      shown in amber; otherwise a quiet "No rain expected here in the next 3
      hours". On an okada, wet roads get a sentence of their own. It looks
      as far ahead as the trip is planned to take (one to six hours). The
      owner said yes on 14 October and saw it with sample forecasts the same
      day. The forecast is MET Norway's (the Norwegian Meteorological
      Institute): free, and its licence (CC BY 4.0) allows an app with
      sponsors, on condition that it is credited ("Data from MET Norway",
      under the line). The app sends our server a rough area, rounded to
      about 10 km, and only if location is already allowed: the weather is
      never a reason to ask. Our server (`weatherAhead`) asks MET Norway for
      that area, naming the app as their terms require, and keeps the answer
      until it expires (`weatherForecasts`, read by the server only), so MET
      Norway is never told who asked. Not asked for while the app is out of
      sight. The Privacy page says all this. The owner approved the English wording on 14 October (a Pidgin draft moved to build 25). Before that it was a draft for the
      owner to review with someone in Nigeria, like the tips. On a running
      okada trip with rain, the weather line and the okada tip ("Avoid okada
      at night and in the rain") say much the same; one may need to go.
      Needs the server updated before it shows anything
- [x] Road report pictures of our own (pothole, go-slow, accident, roadwork,
      hazard, road closed, checkpoint, and a pin for anything else),
      replacing the emoji. On the map pins (with a ring in the severity
      colour), the report form, the report details and the list. From the
      first concept of 12 October; the owner's changes to the drawings are
      still to come. Also in the filter list, where a kind is now chosen by
      its picture, and in the map legend. No flood picture is used, because
      the app has no flood report yet. Two faults were found and corrected
      on the way: the filter list had no Checkpoint, and the legend showed
      Low as blue although its ring on the map is green
- [x] "How are you travelling?" when starting a trip: bus or danfo, keke,
      okada, private car, taxi or ride-hailing, on foot, other. One tap,
      remembers the last answer, and can be skipped. Kept with the trip, so we
      learn how people travel, and shown to contacts if the traveller does not
      arrive. Needs a line on the Privacy page. Vehicle details (plate, bus
      company, driver) follow in build 24. Built with our own drawings of
      each. Contacts see it on the page they open only once they have been
      alerted (overdue, or an SOS); until then it stays with the private
      trip. The Privacy page says so. When this goes live the database rules
      must be updated BEFORE the server: the rules allow the extra word on
      that page, and without them the app's own later changes to a trip
      (add time, arrive) would be refused once the server had written it
- [x] Safety tips that match the answer: one short tip on the start form once
      a way of travelling is chosen, and another on the trip card ("Okada: ask
      for a helmet and hold on with both hands"). They replace the general
      tips card on the Trip tab. Tips never hold up starting a trip. The
      owner approves the wording, checked by someone in Nigeria, before it
      goes live (the owner said so again on 13 October). The ten-item
      checklist now shows for a private car only, since every item is about
      a car

      Tips, written on 12 October and approved by the owner on 14 October:

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
- [x] Automatic hiding: once three different accounts report a road report
      or a comment, it is hidden from everyone at once and waits in a review
      list, where it can be removed for good or put back. Today nothing hides
      a post, however often it is reported, until someone removes it by hand
      on the moderation page. A server change, so it works on every build
      (the owner said yes on 12 October). One person reporting many times
      counts once, and the author does not count. The moderation page has a
      "Put back" button, and putting a post back means three new people are
      needed to hide it again. Needs the server and the database rules
      updated, each on the owner's word
- [ ] Emergency numbers corrected: the list shows 199 for both Police and
      Fire, and a Lagos ambulance line for the whole country. Needs the right
      numbers confirmed in Nigeria
- [x] Error reports from testers' phones, so a crash reaches us without the
      tester having to say so (the owner said yes on 14 October). Our own
      log, not an outside service: when a screen crashes, or code fails with
      nothing to catch it, the app saves what failed, where in the app, the
      build, and the phone's model (for example "Android 11 · Infinix
      X688B"). No account, no position, nothing typed: email addresses, and
      numbers that could be a phone number or a position, are blanked out
      first. At most five a session, each fault once. The database rules let
      any signed-in app add one and nobody read one from the app; the
      database deletes each after 30 days. `scripts/error-reports.mjs` lists
      them for us. Needs the database rules and the expiry setting deployed.
      Play's Data safety form must then say the app collects crash logs
      (not linked to the person), and App Store Connect's privacy answers
      the same, at submission
- [x] A crash found while showing the weather: the map behind the Nearby
      tab, told to glide to a new place while hidden, worked out a position
      of NaN and brought down the whole screen ("WakaGuard hit a problem").
      Seen in the local test copy on 14 October; it could happen on a phone
      whenever the map moves while another tab is open. A hidden map is now
      set in place instead, no failed move can crash a screen, and the map
      resizes itself when its tab is shown again
- [x] Road report form: when the form is scrolled, a strip of it shows above
      its title bar. Looks untidy, loses nothing (seen on 12 October)
- [x] Road report form: easier to place the pin (held over from build 22,
      where a tester gave up on a report). The pin now stays in the middle and
      the map is moved under it. "Use my location" falls back to a rough
      position, and if the phone gives none the form says so and keeps saying
      so. With no location the map opens far enough out to find the right
      town
- [x] Delete my own report and my own comment. There was no button for it,
      so a person who wanted a post gone had to delete their whole account. A
      tester's review of the Privacy page raised it on 13 October (the owner
      said yes that day). The database rules already allowed it. "Delete" is
      on a person's own post and comment, and on each report in My Reports.
      A new server function removes what other people attached to a deleted
      report (their comments and votes) and its photos; it needs the server
      updated, on the owner's word
- [x] A report's "Comments" number is wrong (found on 13 October while
      building Delete). It is kept by two live functions written before this
      code was on GitHub, `onCommentCreate` and `onCommentDelete` (Node 20):
      one adds one, the other takes one away. Comments older than those
      functions were never added, so taking them away left one live report
      at -1, another with two comments says 0, and a comment hidden or
      removed by moderation still counts. New functions under the same two
      names and triggers, plus `onCommentUpdate`, count the report's shown
      comments afresh after every change, so the number heals itself. A
      deploy replaces the old two (and moves them off Node 20, which Google
      stops supporting on 31 October); it needs the owner's word. The live
      `createReport` function (also Node 20, source not in GitHub) is not
      touched
- [x] "Medium" is cut short on the report form's severity buttons on narrow
      phones (seen on 13 October; the owner saw it off centre on an iPhone
      16 the same evening). The buttons had more padding than a quarter of
      the row allows. Now centred with room to spare at 393 and 360 points
      wide
- [x] The report form now covers the tab bar. The tab bar was drawn in front
      of it, so a tap on a tab while writing a report changed the screen
      behind the form (the owner, 13 October). Its error messages are moved
      in front of it too. Checking this found an older fault: a guest who
      tapped "Create Report" was asked to sign in by a window drawn behind
      the form, so the tap seemed to do nothing. That window is now in front
- [x] Drawings, the owner's review (13 October): "Heavy Traffic" looked
      wrong (three boxes, read as a battery or a signal). Of three new
      options the owner chose a queue of cars seen from the car behind, brake
      lights on. The rest of the drawings are on the same review page for the
      owner's comments
- [x] Choosing a contact on iPhone the way Android now does: the iPhone's
      own contact picker, which hands over only the one person chosen and
      needs no permission to read contacts (the owner asked on 13 October why
      the iPhone did not get the same change, and said yes). Someone with one
      number is chosen with one tap; someone with several shows them to pick
      one. The old contacts plugin, its list of every contact inside
      WakaGuard, and the iPhone's "access to your contacts" question are
      gone. Built and opened on the owner's iPhone the same evening, and the
      owner chose contacts with it: it works. On the Galaxy, Android's picker
      still opens with no contacts permission after the change. App
      Store Connect's privacy answers should be checked at submission in
      case they say the app reads contacts
- [x] Trip length in 5-minute steps. Under "Other" the minutes can only be
      0, 15, 30 or 45, so a trip of 2 hours 10 minutes cannot be entered. A
      tester asked on 13 October to be able to set it exactly. Nothing else
      depends on quarter-hours: a trip may be any length from 5 minutes to 20
      hours
- [x] Safety checklist can never be finished: the Trip screen shows five of
      the ten items but counts all ten, so it stops at "5 of 10 checked". A
      tester reported it on 13 October. All ten now show and are counted,
      under the tips for a private car
- [x] Dark mode: the words in boxes could not be seen. With Dark Mode on in
      Profile, a box takes its text colour (near white) from the page, while
      most boxes sit on white sheets. A tester sent a screenshot of the
      filters on 13 October. Boxes now keep dark text unless styled for dark
      mode. Every screen was then checked in dark mode in the browser with a
      script that finds words too close in colour to what is behind them. It
      also found the Status and Expiry lines of the shared report page
      invisible in dark mode, now corrected. The running-trip card could not
      be checked in the browser (starting a trip there needs location), but
      it has no boxes. Dark mode is still only partly dark: sheets stay white
- [x] "Navigate" on a road report is now "Show in Maps". It asked Google Maps
      for directions without saying by car, so Google Maps used whatever was
      last chosen in it, and a walking or bus route is often not found in
      Nigeria: a tester could not get directions to any of three reports on
      13 October. Someone looking at a pothole wants to see where it is, so
      the maps app now opens at the spot with no route. The same on the
      report window, the shared report page and the website
- [x] "Check my location" no longer gives a green tick to a position that is
      found but rough. A tester's phone found itself only to within 2,900 m
      on 13 October (masts, not GPS) and showed all ticks. Past 200 m the
      line is amber ("but only to within 2,900 m") with a tip to go outside
      and check again, and on Android to turn on "Improve location accuracy"
      and turn off battery saver. Also "1 second", not "1 seconds"
- [x] The chosen severity on the report form, and the severity on the shared
      report page, were white on yellow for Medium and hard to read in any
      mode (found by the dark-mode check). Medium is now dark on yellow, and
      the other three a shade darker under white

- [x] Nigerian (British) spelling everywhere people read it (the owner, 14
      October): "tyre", "Driver's licence and vehicle papers", "number
      plates" (Privacy and the guidelines), "recognised", and Support's
      "What you expected, and what happened instead". Names inside the code
      are unchanged. All of build 23's new wording went to the owner for
      review as one file, "WakaGuard build 23 wording.md", in the session
      folder's `wording/`

**False alarms: trips left open after arriving (owner's yes to all four, 14
October).** Of 41 real tester trips over four days, 13 ran past the wait
before contacts are texted: a false alarm to someone's family each time, once
texting is on. Five ended 6 to 16 minutes late (nearly there); seven ended 42
minutes to 17 hours late, nearly all after the "5 minutes left" reminder and up
to four "Is your trip finished?" reminders. Ending a trip by itself when the
phone stops moving was ruled out: a phone that has stopped may belong to
someone in trouble.

- [x] Contacts are texted 15 minutes after the arrival time, not 5. "Are you
      okay?" still comes at the time, and a last warning at 10 minutes says
      "Your contacts will be texted in 5 minutes". The 5 trips that ended 6 to
      13 minutes late would not have alerted anyone. A test trip keeps its
      one-minute wait. The app's own words (start form, Support, Guidelines,
      Privacy) follow one setting, now 15. A server change that reaches every
      build at once, so it should go live WITH build 23: build 22 says "5
      minutes after that"
- [x] "I've arrived" and "+15 min" buttons on the reminders themselves ("5
      minutes left", "Are you okay?", the last warning, "Is your trip
      finished?"), so they can be answered from the lock screen. A press opens
      WakaGuard (after the phone's unlock, so a pocket cannot end a trip) and
      does exactly what the same button on the Trip screen does. iPhone: the
      app declares the buttons when it starts, and the server puts reminders in
      that category. Android: Firebase's notifications cannot carry buttons,
      so from build 23 the app draws these reminders itself
      (`TripReminderMessagingService`) from a message the server sends without
      a notification part; the app now tells the server its build when it
      registers, and older Android builds keep the plain notification, so
      build 22 loses nothing. "Your location has stopped sharing" has no
      buttons: opening the app is its point. Tried on the owner's Galaxy on
      14 October (build 23 by cable, the owner's test account, a trip with
      texting to contacts off): two test reminders were sent from this
      computer through the live project, with the owner's yes. Each was
      drawn by the app with both buttons; "+15 min" opened WakaGuard and moved
      the trip from 17:05 to 17:20 UTC, "I've arrived" ended it, and each
      reminder left the screen once pressed. On the owner's iPhone the same
      evening, the buttons showed and "I've arrived" ended a trip, but after
      the phone had been locked a while a press did nothing. A test build that
      reported its steps showed why: iPhone stops the app's on-phone database
      in the background, the app reloads itself when it comes back (its
      existing cure, lib/localStore.ts), and a press held only in memory was
      wiped by that reload. A press is now kept on the phone until it has
      worked, picked up again after a reload, dropped after two minutes, and
      never adds time twice (the trip's due time is noted as it begins). Tried
      again after a minute locked: the app reloaded, picked the press up and
      moved the trip from 17:51 to 18:06 UTC, once. Build 23 with this fix is
      on the owner's iPhone; the Galaxy's copy is built and waits for a cable
- [x] For the beta: from midnight starting Thursday 15 October (Nigeria time),
      a trip that runs past the wait before contacts are texted earns no
      points ("ended after contacts would have been texted" in the weekly
      report). Added time clears it. Testers to be told in the group
- [ ] The contacts' text could add "They may just have forgotten to end the
      trip." Held: with a long name, place and link it makes the text three
      messages instead of two (half as much again per contact), and Termii
      approved the text's wording in writing for the sender ID. It already
      ends "Please call them", which is right either way. For the owner to
      raise with Termii if wanted

- [x] Round trips in the ranking. The practice run of week 1's table (14
      October) marked 11 trips "did not move" (6 of one tester's 7, 5 of
      another's 7): the rule compared only where a trip started with where it
      ended, so a trip to the market and home again looked like no movement.
      The route is deleted when a trip ends, so this week's trips cannot be
      checked again. The server now records the farthest a running trip goes
      from its start (`farthestFromStartM`, in `onTripUpdated`, which sees
      positions however the phone sends them), and the ranking counts a trip
      that went 500 m or more either way. `onTripUpdated` alone was deployed
      on the owner's word on 14 October, so it counts for the rest of week 1,
      and the first live trip recorded its farthest point the same day

- [x] An "I've arrived" that took 17 minutes to reach the server. A tester's
      problem report (iPhone 11, build 22, Wednesday 14 October about 7:20 am
      Nigeria time) said the trip "refused to end". The trip record shows it:
      time added at 07:13 reached the server at once; the phone's positions
      stopped at 07:19, when the tester says they ended it; the server, not
      knowing, warned at 07:22 and marked the trip overdue at 07:27 (no text,
      texting is off); the end arrived at 07:37. The phone had ended the trip
      on its own side while the save sat in the queue, with signal. Today the
      connection is restarted only when the app comes back from the
      background. Now: a save that has not reached the server in 5 seconds
      restarts the connection and waits 7 seconds more (every save that waits
      on the server: start, end, add time, contacts, checkpoint); and an
      arrival or extra time still not received stays on the Trip screen ("Your
      arrival has not reached WakaGuard yet", with "Try again now") until it
      lands, then says so. The SOS is not changed: restarting the connection
      just before the phone's dialler opens could delay it on an iPhone. The
      fuller fix, sending an arrival and extra time by the same route as the
      positions as well, is for the week of 19 October, before texting is on.
      6 new unit tests. Tried on the owner's Galaxy the same afternoon with a
      2-minute test trip and Wi-Fi switched off: "I've arrived" emptied the
      Trip screen at once (as the tester saw), the notice came up after about
      12 seconds, and two seconds after Wi-Fi came back it read "WakaGuard has
      your arrival now. Trip ended." (shown only once the server has it).
      A second run: "+5 min" offline gave the extra-time notice, "Try again
      now" while still offline kept it up, and Wi-Fi back on gave "WakaGuard
      has your extra time now." with the arrival moved 5 minutes; then the
      arrival offline and back on, as before

**A second reviewer read the newest code (14 October), and what it found is
corrected:**
- A press of "I've arrived" on a reminder that opened the Trip screen could
  be answered "That trip has already ended" before the trip had loaded, and
  then lost: the contacts would have been texted anyway. The press now waits
  for the trip, and only the trip itself, read from the database, can say it
  has ended. A reminder's button never ends an SOS
- Android could hand an old press over again when it rebuilt the app from the
  same start (common on Tecno and Infinix), adding 15 minutes twice. The press
  is dropped on a rebuild, and the app remembers presses it has carried out
- An older Android app signed in to the same account on another phone could
  inherit "build 23" and get reminders it cannot draw. The build is now saved
  with the token it was reported with, and believed only for that token
- Switching notifications off in Profile removed every notification listener,
  the buttons' one too; only the registration ones go now
- Weather is only given for Nigeria and its borders, and MET Norway is waited
  for 8 seconds at most
- The comment count is counted and written in one step
- Fault reports: the expiry date may be 1 to 60 days ahead (a phone's date can
  be wrong); shorter ids, such as a trip's share code, and positions to two
  decimals are blanked out too
- The last warning for a standalone safety timer no longer mentions "I've
  arrived"; "Is your trip finished?" starts 15 minutes after contacts are
  texted, not in the same minute
- Found by the owner on an iPhone the same evening: the notifications switch in
  Profile, once turned off, could not be turned back on. It asked the phone for
  its notification token before listening for the answer, and a phone that
  already had one answered at once, unheard. It now listens first. (Build 23's
  own sign-up at launch could not help either until build 23's database rules
  are live, because it saves the build number with the token)
- Checked and found right: the presses reach the app on both phones, also
  from a closed app; the alert at 15 minutes can never be delayed or skipped
  by the warnings; the database rules; the weather cache

**Release order for build 23, each on the owner's word:** (1) database rules
(travel mode on the contacts' page, comment status, fault reports, and the app
build on push subscriptions: without that last one, build 23 could not save a
phone's push details and would get no reminders at all); (2) the database's
indexes and the fault reports' 30-day expiry; (3) the server functions
(`checkOverdueTrips` and the reminders with the 15-minute wait and the
buttons, `checkQuietTrips`, `onFlagCreated`, `onReportDeleted`,
`onCommentCreate`, `onCommentDelete`, `onCommentUpdate`, `weatherAhead`, and
the others changed in `tripMonitor`); (4) the website; (5) the phone builds to
the stores. The server and the phone builds should follow each other closely,
for the 15-minute wait.

**Final builds, Wednesday 14 October (afternoon in Arizona):** made with the
live settings from `257314e`, then made again with the stuck-save fix above. Android `WakaGuard-1.2.0-23.aab`, version
code 23, signed with the upload key; the same code installed on the owner's
Galaxy by cable and checked there: the app opens in the app, not the
website; the start form gives the 15-minute wording and "How are you
travelling?"; Profile reads "Version 1.2.0 (build 23)"; Nearby loads; no
errors in the phone's log. The weather line stays empty until `weatherAhead`
is live, and the app says nothing when it fails. iPhone
`WakaGuard-1.2.0-23.xcarchive`, 1.2.0 (23). The server needs 26 functions
from the code, by name: five new (`checkQuietTrips`, `onCommentUpdate`,
`onFlagCreated`, `onReportDeleted`, `weatherAhead`), two replacing old ones
whose code was never in this repository (`onCommentCreate`,
`onCommentDelete`, on Node 20 until now), and the rest brought up to date.
`createReport` is left alone

### Build 27: the launch version, with the referral programme (decided 2 November)

**The whole list, written Thu 5 November before starting** (the owner: "let us start build 27"). Due Wed 11 Nov,
frozen Fri 13 Nov. In the order I plan to work; each item's details are below, or in the build 26 section where it
was first agreed.
1. [x] **The referral programme** (done 2 November, below). The App Review note was drafted on 5 November (kept with
       the store wording outside this repository) and approved by the owner the same day ("the App Review note is
       approved"). It goes in at upload.
2. [x] **Server checks on trips and on the referral counting,** from the security review of 4 November. Must be done
       before build 27's server functions go live. The details are kept privately, as this repository is public.
       Done 5 November:
       - the database rules take from the app only the trip details it writes, stamped with the server's clock
         (checked against what builds 22 to 27 write, so no phone needs updating);
       - a friend earns their inviter a reward only from a confirmed account: an email address they confirmed, or
         sign-in with Google or Apple, as for sending texts. The inviter sees "4 trips done. Waiting for them to
         confirm their email". Added to Terms section 12;
       - "Get WakaGuard" on a contact's page names the traveller only for 7 days after the trip.
       - Tests: 406 unit, 135 emulator, 145 rules checks.
       - **Live:** the rules went live on Thu 5 November, evening in Arizona (the owner: "deploy the trip rules,
         then commit and push"), for phones on any build. The referral part goes with build 27's functions
         (item 13).
       - Not planned before launch: checking each invited friend's phone number by text. The confirmed account, App
         Check (item 9) and the owner's check before each weekly payout cover it until there is abuse to answer.
3. [x] **Say what is under "More options"** (below). Done 5 November.
4. [x] **A sanity check on the route** (below). Done 5 November.
5. [x] **"Stopped at a checkpoint?" shown on the contacts' trip page,** with the time and a map pin (build 26
       section, 28 October). Done 5 November:
       - the button asks once ("Stopped at a checkpoint?", "Your contacts will see the time and where you are on your
         trip page. Nobody is texted.", "Yes, log it" or "Not now"), then says "Logged. Your contacts can see it on
         your trip page." Without a trip it is logged as before;
       - a new server function, `onCheckpointStop`, adds each stop on a running trip to its page: the time, and the
         phone's position or else the trip's latest. Two presses within 2 minutes are one stop, at most 20 a page,
         and only the traveller's own page;
       - the page lists "Stopped at a checkpoint, 2:14 pm" under Checkpoints, with a dark dot on the map for each;
       - the rules let the page hold the list and keep it server-only. **The rules must go live before
         `onCheckpointStop`,** or the app's own changes to a page with stops would be refused.
       - Tests: 410 unit, 138 emulator, 148 rules checks. Seen on the page with test data in the emulator.
6. [x] **SOS from the lock screen:** an SOS button on the "Safe Trip active" notification that asks once more
       before sending (build 26 section, 29 October). Done 5 November, **Android only**:
       - once a trip's location sharing starts, the "Safe Trip active" notification gets an "SOS" button, shown in
         full on the lock screen (`TripSosPlugin.java`, `lib/tripSos.ts`);
       - "SOS" opens a screen over the lock screen without unlocking: "Send SOS to your contacts?", "They get a text
         with where you are now and a link to follow you.", a red "Send SOS" and "Cancel"
         (`SosConfirmActivity.java`). A test trip says the text says TEST;
       - "Send SOS" posts to the server with the trip's own key, tried 3 times, with the phone's position from the
         last 5 minutes if it has one. The server (`tripAction`, action `sos`) saves the same SOS alert the app's
         button saves, so the contacts get the same text; one alert per press. Then "SOS sent. Your contacts are
         being texted with where you are." If it could not be sent, it says so and offers "Call 112" (which only
         opens the dialer);
       - unlike the app's SOS button, it does not call 112 by itself: the point is a quiet alert when the phone
         cannot be taken out and used.
       - **iPhone: not in build 27.** iPhones show no trip notification to put a button on; a notification action
         would open the app behind Face ID, and a Live Activity is a bigger piece of work. The phone's own Emergency
         SOS stays the route there. My suggestion: a Live Activity after launch.
       - Tests: unit and emulator for the server part. Compiles; to be tried on the Galaxy with the build, with a
         test trip, so only a TEST text goes out.
7. [x] **Two Android hardening changes** from the security review (kept privately). Done 5 November: only the
       app's own trip notifications can press their buttons, and nothing of the app's goes into phone backups or
       onto a new phone (people sign in again there). Compiles; to be checked on the Galaxy with the build.
8. [x] **A first trip on day one:** after sign-up, add one contact, then a 2-minute test trip, every step skippable
       (build 26 section, 28 October). Done 5 November (`FirstTripGuide.tsx`, `lib/firstTrip.ts`):
       - offered once per account on each phone, on the Trip screen, to an account that has never started a trip
         (so also to testers who never did);
       - "Step 1 of 2: Who should know you got there safe?", with "Pick from my contacts" or name and number, "Add
         and continue" and "Skip for now". Left out when there is a contact already;
       - "Try it: a 2-minute test trip. Nothing real happens. In 2 minutes WakaGuard asks if you're okay. Tap "I've
         arrived" to end it. If you don't, Mum gets a text marked TEST, so they know what one looks like." with
         "Start the test trip" and "Not now";
       - the trip screen then shows "That's how it works": every trip runs like this one, WakaGuard asks if you're
         okay when time is up and texts your contacts only if you don't answer, with "Got it".
       - Gone through in the emulator on a phone-sized screen, from sign-in to the running test trip.
9. [x] **App Check** on Android, iPhone and the website, watched before anything is enforced (build 26 section,
       28 October). Needs the owner for a few clicks in the Firebase, Play and Apple consoles.
       - Code done 5 November: the native App Check plugin (`@capacitor-firebase/app-check` 8.5.2, the same family as
         the sign-in plugin) gives Play Integrity tokens on Android and App Attest tokens on iPhone to the web Firebase
         SDK (`lib/nativeAppCheck.ts`). A token slower than 3 seconds is skipped, so a trip or SOS is never held up.
         iPhone: the provider is named before Firebase starts (`AppDelegate.swift`), and the App Attest entitlement is
         set to production. Both apps compile.
       - Console steps done Thu 5 November, evening in Arizona, in the owner's Chrome (the owner: "click through the
         App Check steps in my Chrome", and yes to agreeing to the Google APIs and Play Integrity API terms):
         - Play Console, Protected with Play, Play Integrity API: the WakaGuard Cloud project linked (daily limit
           10,000 checks). The app signing key's SHA-256 was already on the Firebase Android app.
         - Firebase App Check: WakaGuard Android registered with Play Integrity (token life 1 hour). WakaGuard iPhone
           was already registered with App Attest.
         - Nothing enforced: Firestore, Storage, Authentication and Google Identity for iOS all show "Unenforced",
           and no function enforces it in code.
       - Still to do: once build 27 is on phones, watch the App Check numbers in Firebase for a week. Enforcing waits
         until phones on build 26 and older are gone. The website is not registered; it keeps reCAPTCHA v3, which
         needs its own key (optional before launch).
10. [x] **Search for where you are going** (Google place search), with a Privacy line (build 26 section,
       28 October). Live on the server and the website on 6 November, and in the build 27 apps. Done in Google Cloud on 5 November in the owner's Chrome:
       - **The key:** "WakaGuard place search (server)". It works only for Places API (New), which was already on, and
         has no app restriction because only our server uses it. It is kept in Secret Manager as `PLACES_API_KEY`;
         the owner pasted it into a hidden prompt.
       - **Daily limits:** 1,000 suggestions and 300 place look-ups.
       - **The catch:** Google's terms do not allow place results, or their spots, on a map that is not Google's
         (Maps Platform Terms 3.2.3(e); Service Specific Terms 14.2). A spot may be kept for 30 days at most (14.3),
         while trips are kept for 90.
       - **So:** the search comes after item 15 and uses only Google maps. The spot of a trip's destination found by
         search is deleted 30 days after the trip.
       - **How it works:** suggestions appear under "Where are you going?" as the traveller types, sent through our
         server. Choosing one fills in the name and moves the pin there. "Google Maps" is shown under the suggestions,
         as Google's terms ask.
       - **Built 6 November (not committed; the function is not live):**
         - `functions/src/placeSearch.ts` (callable `placeSearch`) and `placeSearchPlan.ts`.
           - It uses Autocomplete (New), then Place Details asking only for id, address and spot (Google's cheapest
             tier), both in one session so Google charges them as one search.
           - The key is read from Secret Manager (`runWith({ secrets: ['PLACES_API_KEY'] })`).
           - Only for signed-up people, with hourly limits of 60 suggestions and 20 look-ups each
             (`placeSearchTries`, server only and deleted after 2 days).
           - Google is sent what was typed, a made-up session id, and the chosen state's middle rounded to about
             1 km. It is never told who is asking, and nothing from Google is logged.
         - In the app: `lib/placeSearch.ts`, `lib/placeSearchRules.ts` and `PlaceSuggestions.tsx` under "Where are
           you going?". They show only with Google's maps, after a 0.4 s pause in typing, at most 5 suggestions,
           with "Google Maps" underneath and "Name from Google Maps" once one is chosen.
         - Every trip's destination spot, pinned or searched, is taken off the trip 30 days after its link expired
           (`CLEARINGS` in `recordRetention.ts`, `KEEP_DAYS.destinationSpot`). The rest of the trip keeps its 90
           days.
         - Tried 6 November against the emulators, with the real key in an untracked `functions/.secret.local`,
           removed afterwards. "Ojota bus" gave Ojota Bus Stop, Ojota Bus Park and three more; choosing the Park
           filled in the name and put the pin on it in Ojota. Mapbox had found none of these in October.
         - Privacy page: a "Place search" line, and the 30-day spot in the trip record line. Wording approved by
           the owner on 6 November ("wording approved, commit and push").
         - Tests: 437 unit (9 new), 142 emulator (1 new).
         - Open for the lawyer review: a "usual trip" button copies a past trip's spot into a new trip, so a searched
           spot can live on past 30 days through daily repeats.
15. [x] **Google Maps everywhere in place of OpenStreetMap and Mapbox** (live on the website 6 November, and in the
       build 27 apps; directions stay Mapbox) (the owner, 5 November: "switching to
       google maps will tremendously elevate the app let us build it"). The three maps are the trip map, also used by
       the pin picker and the contacts' page; the road-reports map; and the report pin picker.
       - **The test, 5 November:** a page served as the iPhone app serves it (`capacitor://localhost`, through
         WebKit's custom-scheme handler, run on the Mac) loaded Google's map with the key, with no refusal in 40 s.
         The same page from an address the key does not allow was refused at once (`RefererNotAllowedMapError`),
         so the key's limit is real. So the maps can stay in the web code (Maps JavaScript API), shared by the
         website, the apps and the contacts' page. Android's `https://localhost` is to be checked on the Galaxy with
         the real build.
       - **The key:** "WakaGuard maps (website and apps)", made 5 November in the owner's Chrome. It works only for
         Maps JavaScript API, which was turned on that day, and only from wakaguard.com, www.wakaguard.com, the two
         Firebase addresses, `https://localhost/*` (Android app), `capacitor://localhost/*` (iPhone app) and
         `http://localhost:3000/*` (testing). Daily limits: 1,000 map openings, 3D maps 0. The owner pasted it into
         a hidden prompt, which saved it to the untracked `.env.googlemaps.local` as `NEXT_PUBLIC_GOOGLE_MAPS_KEY`.
         It ships inside the app and the website, as a map key must.
       - **Cost:** Google allows 10,000 map openings a month free, then about $7 per 1,000.
       - **Written 5 November (not yet seen in a browser or on a phone; not committed):**
         - `src/lib/googleMaps.ts` loads Google's script once, in English as seen from Nigeria (`region=NG`). It
           says when the script cannot load or Google refuses the key, and the map then shows a notice instead of a
           grey box, with "Try again" when it may help.
         - Google versions of the three maps: `GoogleTripMap`, `GoogleLocationPicker` and `GoogleMapView`. Each is
           chosen only when `NEXT_PUBLIC_GOOGLE_MAPS_KEY` is set; the old maps stay for tests against the emulators.
         - Pins are plain HTML on Google's OverlayView (`components/google/htmlMarker.ts`), so they look as before
           and need no map ID. Nearby reports are grouped by `lib/mapGroups.ts`, as the Leaflet add-on did.
         - Google's logo must stay in view. The reports map stops above the sheet's rounded corners instead of
           running under them, and the legend and buttons sit above the logo and Google's terms line.
         - A release build stops without the key (`scripts/app-env.mjs`).
         - Terms of Use section 2 and the Privacy page's "Maps" line now name Google Maps, as Google's terms ask
           (Maps Platform Terms 3.2.2(a)(i)). Wording approved by the owner on 6 November ("the wording is approved").
         - Tests: 428 unit (5 new).
       - **Checked 5 November, Mapbox's Product Terms (20 October 2026):** directions (Beta) may stay on Mapbox and be
           drawn on Google's map. Section 2.10.1 only says navigation results must not be exported, cached or stored.
           That last point touches the planned route kept for the contacts' page (`readRouteOutline`). This predates
           build 27 and is for the lawyer review.
       - **Seen 6 November:**
         - In a phone-sized browser against the emulators: the pin picker, the road-reports map (grouping, a tapped
           group zooms in, a tapped report opens), the trip map (route, start, latest position, destination,
           "Show the whole trip") and the contacts' page.
         - In Chrome on the owner's Galaxy: the road-reports map, moving with one finger.
         - Google's logo and terms line show on every map. No console errors.
         - Screenshots are in `screenshots/build27/google-maps/` in the session folder.
       - **Phones:** the owner chose, 6 November, to check inside the apps with build 27 itself (Play internal
         testing and TestFlight), not with test copies. The Galaxy's build 26 is signed by Play, so a test copy
         would have meant uninstalling it.
       - **Still to do:** release settings with the map key (from `.env.googlemaps.local`), and without Mapbox's
         map pictures (the token stays for directions). The website's build needs the key too, for the contacts'
         page.
       - **Everything Google, 6 November** (the owner: "switch all of them to Google, everything should be google"):
         - In the owner's Chrome: the Geocoding API was turned on, added to the server key "WakaGuard place search
           (server)" (now Places API (New) and Geocoding API), and capped at 1,000 look-ups a day ("v3 requests per
           day").
         - `placeName` now asks Google's reverse geocoding instead of OpenStreetMap's Nominatim, with the secret
           `PLACES_API_KEY`. It returns the name, the state and the country, keeps nothing in memory (Google's
           Service Specific Terms 6.3.2 allow keeping an answer only for the person who asked), and allows 60
           look-ups an hour per person. The Nominatim turn-taking is gone.
         - Pin names say "Name from Google Maps". "Use my location" for the state asks `placeName`; the phone no
           longer calls Nominatim.
         - **Road reports, by the owner's choice** ("Reporter's own words"): while placing the pin, the reporter
           sees Google's address for it, only to check the spot, and never saved. A new optional "Where is it?"
           box takes their own words, which are saved as `location.address` and shown with the report. A report
           left blank shows its state (`reportPlace` in `lib/reportWords.ts`). Older reports keep their
           OpenStreetMap address until they are deleted.
         - **Directions stay on Mapbox.** Google's terms forbid building real-time navigation on its Directions
           and Routes services and turning its directions into speech (Maps Platform Terms 3.2.3(c)(vi) and
           (d)(iv)); only Google's separate Navigation SDK allows it, which needs a contract and a native rebuild.
         - The old OpenStreetMap maps stay in the code only for keyless local tests. To remove after launch.
         - Privacy page: the "Use my location" line, the road report line and "Place names" now say Google.
           Wording approved by the owner on 6 November ("approved, go").
         - Also found by the tests: `src/lib/appVersion.ts` still said build 25, so the first build 27 files told
           the server they were build 25, which keeps the "Heading out?" reminder away. Now 27.
11. [x] **"Your points this week"** on Profile (build 26 section, 28 October). Done 5 November:
       - the ranking's rules moved out of `scripts/weekly-numbers.mjs` into `functions/src/weeklyRules.ts`, unchanged,
         and both the Sunday script and the card use them, so they cannot count differently. The script now runs
         with `npx tsx scripts/weekly-numbers.mjs …` (or `npm run numbers:weekly -- …`);
       - while there, two fields the script read but never asked the database for: when a trip's first and last
         positions came (used for "the phone went quiet") and whether a report was posted far away (so far-away
         reports were never left out). Both are read now, and both rules apply **from week five** (Sunday
         8 November, 18:00 in Nigeria; the owner, 5 November: "apply the ranking fixes from week 5"), so weeks one
         to four stay as they were scored. From then, a far-away report earns nothing, and a trip that did not move
         counts when its phone went quiet after the start or before the end, as well as between two positions;
       - a new server function, `myWeek`, scores only the signed-in person's own week;
       - the card, at the top of Profile: "Your points this week", the number, "3 trips counted · 1 road report",
         the everyday bonus and first test trip when earned, and for the last trip that earned nothing, why and what
         to do, such as "Your trip on Tue didn't count. It ran past its time, so your contacts would have been
         texted. Next time, tap "More time…" before your time is up." Then "The week ends Sunday 6 pm, Nigeria time.
         Problem reports you send are added then, and the full list goes in the group.";
       - it can be hidden without a build (`weeklyPoints: false` in the app config), for when the ranking ends.
       - Tests: 418 unit, 140 emulator.
12. [x] **A reminder at each person's usual travel time,** with its own Settings switch and a Privacy line (build 26
       section, 28 October). Done 5 November (`functions/src/usualTimes.ts`):
       - each night at 2:30 am Nigeria time, `planUsualTimes` finds each person's usual start times: real trips
         ended with "I've arrived", started within 30 minutes of each other on at least 3 of the last 14 days. It
         keeps the middle time, the usual destination and length, filed under the quarter hour the reminder is due
         (10 to 25 minutes before);
       - every quarter hour, `usualTimeReminders` sends "Heading out?" / "You usually set off around 7:30 am for
         Work. Start your trip so your people know you got there." At most once a day, never while a trip is
         running, only to phones on build 27 or later, and not when switched off;
       - tapping it opens the start form with that usual trip filled in, as if its button had been tapped;
       - Profile, next to Morning weather: "Reminder at my usual times", on unless switched off
         (`usualTimeReminder` on the user, allowed by the rules);
       - a Privacy line under Notifications. Deleting an account deletes its reminder record.
       - Tests: unit and emulator. Watch afterwards on the Numbers page whether more trips start near those times.
13. [x] **The server functions for this build,** on the owner's word: `referrals`, `onTripUpdated` and
       `onTrustedContactWrite`, plus whatever items 2 to 12 add. Live Fri 6 Nov: see "Website and server releases".
14. [x] **Terms and Privacy dates** changed on the day the website goes out. Done 6 November (owner: "ok do all"):
       both pages say "Last updated: 6 November 2026", the day the Google wording went live on wakaguard.com (the
       Terms had said 13 October, the Privacy page October 28).
16. [x] **Safety fixes** (the owner, 6 November, from my review of what is missing: "Safety fixes"). Done 6 November;
       numbers confirmed by the owner ("keep 199"):
       - The list is now: Emergency (police, fire, ambulance) 112; Police 199; FRSC (road crashes) 122; NEMA (floods
         and disasters) 0800 2255 6362, "0800 CALL NEMA". Fire Service 199 and the Lagos ambulance are gone, as 112
         covers fire and ambulance everywhere. Sources: NCC (112 free on every network); the Federal Government's
         adoption of 112 as the national number (April 2026); FRSC's own services page (122); NEMA on Channels TV.
         199 is widely listed but was not found on the Police's own site; the owner chose to keep it.
       - Each number now dials digits (`dial`): "0800CALLNEMA" in letters never dialled on a phone.
       - The contact box says "Their phone number", and the "number not complete" message describes the format in
         words (11 digits starting with 0, or + and the country code).
       - **Emergency numbers:** the screen showed 199 for Fire as well as Police, and a Lagos ambulance line for the
         whole country (open since October, line "Emergency numbers corrected" above). Use numbers from official
         Nigerian sources, for the owner to confirm before they ship.
       - **No realistic example phone number** in the contact boxes: the grey example looked like a real Nigerian
         number (a copied example got a real person a test text on 15 October). Words instead.
       - Not chosen for build 27 (6 November): "Navigate with Google Maps", battery level on the contacts' page,
         and the launch tasks (Africa's Talking switch, store updates and Data safety answers, go/no-go checklist).
17. [x] **Fixes from the Moto g 5G test** (the owner, 6 November: "Yes fix 1 and 2", then "go" for the state list).
       Done 6 November and in the fourth set of release files:
       - **The start form kept across tabs.** Going to Nearby or Profile and back emptied "Where are you going?", the
         pin and its name, as the Trip screen was rebuilt each time. It now stays in place, hidden while another tab
         shows (`MobileHome.tsx`), so everything typed or chosen is still there. Checked in the browser at the Moto's
         size against the emulators: the destination and "1 hr" survived Nearby and Profile.
       - **"Looking for places…"** under the box while a place search waits (`PlaceSuggestions.tsx`). The first
         search after a quiet spell took 6 to 10 seconds on the Moto with nothing on screen, while the server
         function woke up. Keeping one copy of the function always awake (a few dollars a month) would remove the
         wait; not chosen.
       - **The state was "Adamawa" after the owner signed in on the Moto**, which the owner did not choose. Looked
         into the same day: the phone's own log shows no location request until the Trip screen opened, so "Use
         my location" did not set it, and nothing in the app picks a state by itself (the phone is in Arizona, and
         Google's answer there gives no Nigerian state). It was set by a touch in the "Choose your state" list,
         where Adamawa is the top right tile. Which touch could not be found from the log.
       - **The state lists start with the most used states**: Lagos, Abuja (FCT), Rivers, Oyo and Kano under "Most
         used", then "All states" A to Z, in the first question, the Nearby state sheet and the computer's state menu
         (`MOST_USED_STATES` in `nigerianStates.ts`). Most people now find their state without scrolling, the likeliest
         moment for a stray touch. FCT shows as "Abuja (FCT)", so searching "Abuja" finds it.
18. [x] **"You're offline" on the sign-in screens** (the owner, 6 November: "yes do the offline message"). Offline,
       the Google and Apple buttons never appeared, as they wait for the server's switch (config/app), and nothing
       said why (the Moto test: "How come gmail sign is no longer there"). Now a notice says the phone is offline,
       to connect to Wi-Fi or mobile data, and that "Continue with Google" (on iPhone, Apple and Google) shows
       once connected. The buttons come back by themselves when the connection does. In `SocialSignIn.tsx`
       (`OfflineNotice`), `useOnline.ts` and `offlineSignInText` in `socialSignIn.ts`, on the first-run sign-in
       and the sign-in box. Done 6 November, after build 27 was uploaded to App Store Connect, so the iPhone needs
       a new upload (1.2.0 (27.1)) to carry it; the Android bundle was not in Play yet.
19. [x] **Invites start on 1 December** (the owner, 7 November: "it will be confusing to start the referral now because
       they will have to be added to the sign up; we can avoid that step altogether if we just use the in-system
       referral that will automatically record the referrer"). Until the apps are public, an Android friend could
       not install from an invite link without first being added as a tester. So only accounts made from midnight
       starting 1 December 2026 in Nigeria can be invited (`ACCOUNTS_FROM_MS` in `referralPlan.ts`, was 11
       November), and the Terms (section 12, "Last updated: 7 November 2026") and the app's "too early" message say
       so; a test holds the three equal. Phones on build 27 still show "from 11 November 2026" in that message until
       the next app build. Cash out still opens 15 December.
- Optional, if there is time: an 8-character minimum password.
- Testing: on the owner's Galaxy and iPhone before upload, as with build 26.
- **Release files made Fri 6 Nov** on the owner's word ("build the website and both apps for build 27"), from
  `fc098bf` plus the version numbers (Android `versionCode` 27, iPhone `CURRENT_PROJECT_VERSION` 27, both 1.2.0),
  with the live settings: the web config as for build 26, `NEXT_PUBLIC_APP_URL`, the Mapbox token (directions
  only) and the Google map key. All in the session folder's `builds/`:
  - `WakaGuard-1.2.0-27.aab` for Play, and `WakaGuard-1.2.0-27-cable-install.apk`, both version code 27 and signed
    with the upload key (SHA-256 67:D3:78:CE…), the same key as the build 26 on the owner's Galaxy, so it installs
    over it by cable;
  - `WakaGuard-1.2.0-27.xcarchive`: `com.ansrdlabs.wakaguard` 1.2.0 (27), App Attest production;
  - the website in `out/`: the live project, no test settings, Google's maps with the key, the place search, invite
    friends, and the approved Terms and Privacy wording. The pages still say "Last updated: October 28, 2026"
    (item 14).
  - Nothing uploaded or released yet. `.env.local` stays until the website is released, because Hosting's predeploy
    (`build-sw.mjs`) needs it.
  - The cable copy was installed over build 26 on the owner's Galaxy the same day, on the owner's word ("install it
    on the Galaxy and commit and push, I will like to test"); the sign-in was kept. The owner is testing it.
  - **Made again the same day** after the switch to Google's address look-up and the build number fix (item 15,
    "Everything Google"), from this commit's code. The first set is kept as `…-27-superseded…`. Checked inside each:
    "(build 27)", the "Where is it?" box, no Nominatim, the live project, no test settings. Android version code 27
    with the upload key; iPhone 1.2.0 (27). The new cable copy was installed on the Galaxy at 11:22 (Arizona), and
    the archive's app on the owner's iPhone 16 by cable over its TestFlight build 26 (owner: "install it on the
    iPhone too"). That copy is signed for development, so it uses Apple's sandbox for notifications, which Firebase
    has the current key for; TestFlight's build 27 replaces it once uploaded.
  - **Made a third time the same day** with the safety fixes (item 16), from this commit's code; the second set is
    kept as `…-27-superseded2…`. Checked inside each: NEMA dialled as digits, no example number, build 27, no test
    settings. Installed on the owner's iPhone by cable; the Galaxy was unplugged, so its copy waits. Also installed,
    fresh, on the owner's Moto g 5G (2024), Android 15 (owner: "I plugged in a Moto phone"): a second Android that is
    not a Samsung.
  - **Made a fourth time the same day** with item 17 (the start form kept across tabs, "Looking for places…", the
    most used states first), on the owner's word ("go"); the third set is kept as `…-27-superseded3…`. Checked
    inside each: the three changes, build 27, the live project, no test settings. Installed by cable on the Galaxy
    and the Moto (sign-ins kept) and the iPhone, at 16:38 (Arizona).
  - **Made a fifth time the same day** with the Terms and Privacy date (item 14), on the owner's "ok do all"; the
    fourth set is kept as `…-27-superseded4…`. Checked inside each: the date, build 27, the live project, no test
    settings. Installed on the Moto and the iPhone at 16:59, and on the Galaxy at 17:40. The owner then switched
    the Galaxy's Fake GPS off (mock location denied), so it uses its real location again.
    These are the files for the stores.
  - **Uploads, on the owner's "ok do all":** the iPhone archive was sent to App Store Connect at 17:01 (Arizona)
    ("Upload succeeded"). Play: a new Internal testing release was started in the owner's Chrome, but sending the
    6.6 MB bundle through the browser connection failed twice, so the owner drags it in. Internal testing uses the
    "WakaGuard Testers" list (61 people, as the closed test), so it is not rolled out until the owner decides who gets
    it. App Store Connect asked the owner to sign in before the approved review note can go in.
  - **Release notes drafted** for the owner's approval (`wording/build-27-release-notes.txt` in the session folder,
    499 characters, the TestFlight copy without the Android-only SOS line). Not used anywhere yet.
  - **The website released again** the same evening on the owner's "do every other thing", from the same code, so
    the Terms and Privacy pages say "Last updated: 6 November 2026" (checked live).
  - **Made a sixth time the same day** with item 18 ("You're offline"), on the owner's "yes commit, push and
    rebuild everything"; the fifth set is kept as `…-27-superseded5…`. Android stays version code 27, as it is not
    in Play yet. The iPhone is 1.2.0 (27.1), because App Store Connect already has 27 and will not take the same
    number twice (as with 24.1); `appVersion.test.ts` now accepts a point build for the iPhone. Checked inside
    each: the offline wording, the live project, no test settings; the Android files signed with the upload key.
    Installed by cable on the Galaxy and the Moto, and on the iPhone (sign-ins kept). The website in `out/` has it
    too, but is not released. **These are now the files for the stores:** the 27.1 archive replaces the 27 sent
    to App Store Connect (not yet uploaded), and the new `WakaGuard-1.2.0-27.aab` is the one to drag into Play.
  - **On the owner's "upload 27.1 and release the website":** the website was released at 21:20 (Arizona) from
    `1113b4f`, and the offline wording was checked in the live files. The iPhone upload was refused ("App Store
    Connect access for the team is required"): Xcode's sign-in to the Apple Account had lapsed since the 17:01
    upload. It goes once the owner signs in again in Xcode, Settings, Accounts.
  - **iPhone 1.2.0 (27.1) uploaded to App Store Connect** on Sat 7 Nov at 14:08 (Arizona), on the owner's "signed in,
    upload it" ("Upload succeeded"). Xcode had updated itself to 27.2 overnight, which cleared its accounts and
    offered a 16.64 GB iPhone simulator download (skipped: not needed for uploads). The 27.1 archive was made
    before the update and was sent unchanged. TestFlight now has 27 and 27.1; 27.1 is the one for testers.
  - **Review note in TestFlight** (owner: "sign in to app store connect, add the note", 7 Nov): the approved note
    replaced the old one in Test Information, Beta App Review Information, Review Notes (2,493 characters, saved
    and checked after reloading). Kept from the old note, as still true: "Please sign in with the account
    provided" and the request not to place a 112 call. Dropped: the line that texts are off while the sender ID is
    approved. 27.1 is in the internal group (2 testers, status Testing). External testers get it only after a
    Beta App Review submission, which needs the owner's separate yes.
  - **Release notes approved and both stores submitted** (owner, 7 Nov: "yes submit 27.1 for beta review", then,
    on the notes, "yes submit it for both stores"). The approved notes are kept with the store wording outside this
    repository.
    - **TestFlight:** 27.1 added to the external group (9 testers) with the notes as "What to Test" and "notify
      testers" on. Apple passed it at once (status Testing), so internal and external testers have it.
    - **Play:** a new Closed testing (Alpha) release, 27 (1.2.0), the track build 26 went out on; this time the
      bundle uploaded through the browser. Notes as approved, with "a clear offline message at sign-in" so they fit
      Play's 500 characters. Only Play's usual two warnings (no deobfuscation or debug symbol files). Sent for
      review at about 14:35 (Arizona); managed publishing is off, so it rolls out to Alpha testers once Google
      passes it. **Google passed it the same afternoon: "Available to selected testers", released Sat 7 Nov
      16:12 (Arizona).** So build 27 is with testers on both phones. The empty Internal testing draft started on 6 November was discarded on the owner's word ("discard
      the internal testing draft"); Internal testing still shows build 23.


The owner on 2 November: "we need to add a referral program too where people can earn from getting people on
and using the app", then, choosing from options: "We will build it in build 27 so it goes out with the freeze".
I read that as build 27 being the launch version that is frozen on Fri 13 Nov. The rules agreed on 18 October
stay, with the owner's choices of 2 November added:
- **The reward:** ₦500 to the person who invited, paid 7 days after the friend makes 4 real trips on 4
  different days within 30 days and adds a contact. A real trip is not a test, lasts 15 minutes or more, moves
  about 1 km and ends with "I've arrived". The owner kept this over "after 1 real trip" (2 November).
- **Limits:** at most 10 paid referrals a month per person; one payout per phone number; the friend on a
  different phone from the inviter's.
- **Budget:** ₦200,000 a month in all, which is 400 rewards (the owner, 2 November). Past that, my suggestion is
  that invites still count and are paid the next month.
- **Cash or airtime:** earnings build up in the app and can be taken as airtime or cash (the owner: "users can
  convert to cash"). Cash out from ₦1,000. The owner pays by hand each week, as with the weekly prizes, and a
  payout service (Paystack or Flutterwave) comes once there are more people (the owner chose "By hand at first").
- **What the inviter sees:** each friend's progress (for example "2 of 4 trips"), never the friend's trips.
- **Who counts as invited:** a friend who signs up through the inviter's link or names them in "Who invited
  you?", and a contact who installs the app from a trip link (agreed 18 October).
- **When it pays:** rewards from Tue 15 Dec, as agreed on 18 October, so the counting is checked before money
  goes out. Not changed on 2 November.
- [x] Each person's invite link and code, with Share; "Who invited you?" at sign-up, filled in from the link.
      Done 2 November: the invite name is the person's username (no second code to remember), the link is
      `wakaguard.com/join?u=<username>`, and "Who invited you?" sits under the username box on the screen every
      new account passes through (email, Google and Apple sign-up alike). On the website the link fills it in;
      in the phone apps the friend types it, as there is no way to carry it through a store install
- [x] The invite link carried through the install (the owner on 2 November: "Can there be a refer link that can
      be called back", then "yes build it"). Done 2 November:
      - **Android:** the invite page's Google Play button carries the name as Play's install "referrer"
        (`invited_by=<username>&via=link|trip`). On the username screen the app asks Google Play for it
        (`InstallReferrerPlugin.java`, Google's Install Referrer library 2.2) and fills in "Who invited you?",
        with "Filled in from your invite link. Change it if that is wrong." No permission, nothing else read
      - **iPhone:** Apple passes nothing through the App Store, so the invite page's iPhone button also copies the
        name, and the app shows a Paste button by the empty "Who invited you?" box. The app reads what was copied
        only when Paste is tapped
      - Not chosen: paid link services (Branch, AppsFlyer) that match a phone before and after the install. They
        cost money, Apple's rules are against that kind of matching, and Privacy would need more. Firebase Dynamic
        Links, the free one, closed in August 2025
      - **Proven only once build 27 is on Play:** uninstall, open an invite link on the phone, install from Play,
        sign up; the name should be there. On iPhone, the Paste button is proven only on a real phone too
- [x] The count on the server, with the rules above, so it cannot be changed from a phone. Done 2 November:
      `functions/src/referrals.ts` (one callable function, `referrals`) and the rules in `referralPlan.ts`.
      Trips are written by the phone, so a trip is judged by what the server saw: when the trip was made and when
      it ended, at least 3 positions received, about 1 km from the start. The database rules refuse every phone
- [x] "Invite friends" in Profile: the link, each friend's progress, the balance, and Cash out (airtime or bank
      transfer). Bank details are asked for only at cash out, and only the last 4 digits are kept once paid
- [x] A tool for the owner listing who is owed what, and a way to mark it paid:
      `node scripts/referral-payouts.mjs --live` (read-only; the full payment details go to a file in `ranking/`
      on this computer, never on screen), then `--paid <id>,<id>`
- [x] "Get WakaGuard" on the contacts' page, only after a trip ended with "I've arrived" (never while someone is
      late, after an SOS, or for a test); the contact is then counted as invited by the traveller
- [x] **Before building:** both stores' rules on cash rewards for inviting, read 2 November. Neither forbids it.
      Apple's guideline 3.2.2(x) allows rewarding people for actions inside the app, and forbids rewards for
      ratings, reviews or downloading other apps; 5.1.2(i) says no reward may require turning on location or
      notifications (the person rewarded is the inviter, who turns on nothing). Google forbids incentivised
      ratings, reviews and installs that manipulate the store; our reward needs 4 real trips, not an install,
      and never asks for a rating. Worth saying in the App Review notes; ask the lawyer about Nigerian rules
      on promotions and paying cash
- [x] **Words added:** the rules as section 12 of the Terms (`/terms#invite-friends`), an "Invite Friends" part
      in Privacy (what is collected, and what is kept), and a line on the Delete account page, all for the
      lawyer to see. The Terms and Privacy dates are to change on the day the website goes out

Choices made while building (2 November), for the owner to see:
- Only accounts made from Wed 11 Nov 2026 count as invited, and a friend has 7 days after signing up to say who
  invited them. Testers from before cannot name each other
- "One payout per phone" uses the code each copy of the app already has (the one that stops two phones sending
  one trip): a friend whose trips came from the inviter's phone, or from a phone that already earned anyone a
  reward, is refused, and the inviter sees why
- Cash out takes everything that is ready, one request at a time; Cash out opens Tue 15 Dec
- The App Review note: approved by the owner on 5 November; it goes in at upload

**Also for build 27 (the owner, 3 November, testing build 26 on the iPhone):** asked "where the modes of transport
go again" and whether they are visible enough, then "yes add it to build 27".
- [x] **Say what is under "More options".** The row reads like "Bus, keke, okada · plate number" instead of only
      "More options", still showing the remembered choice and any vehicle beside it. Wording only: the start form
      stays short. Why: the plate is what the research found most useful on city trips (the vehicle record against
      one-chance), and it goes into the alert text, but today it is out of sight until the trip card's "Add".
      - Done 5 November (`moreOptionsLabel` in `travelMode.ts`). Nothing chosen: "Bus, keke, okada · plate number".
        Chosen: "Keke · add plate number", then "Keke · Plate KJA 123 AB" once a plate is in. On foot: "On foot".
        Screen readers still hear that these are more options.
- [ ] **A sanity check on the route (directions Beta).** The owner's iPhone on build 26 showed "By road: about 22 h,
      2358 km" and offered "Use 28 h 45 min" for a usual trip of 15 minutes in Mesa. Moving the pin then gave the right
      route (8 min, 3.7 km), so the most likely cause is a bad starting point, such as an old location reading. Read
      through `useRoutePreview` and `whereThePhoneIs`: the route is asked again whenever the pin or the way of
      travelling changes, and an older answer is never shown for a new pin. The owner said "add the route check to
      build 27" (3 November). Hide the "By road" line and its "Use …" button when the route is far longer than the
      straight line (more than about 3 times, plus a margin for short trips), or when a usual trip's own time is far
      shorter. Never fill in a trip length from such a route. This also covers a bad GPS fix on a real trip in Nigeria.
      - Done 5 November (`routeCannotBeRight` in `usualTrips.ts`). A route is not shown, does not offer "Use …" and is
        not followed when it is more than 3 times the straight line from where the phone was plus 2 km, when it
        would make a trip longer than the 20 hours allowed, or when a usual trip to the same place (within 300 m)
        takes far less (a third of the time, or an hour less). The same check applies to the route found once the
        trip has started and to a new route when the traveller leaves it. Nothing else changes: a start form with
        no route looks as it does with directions off.

**Server fixes from the weather and notification check (3 November).** The owner asked "how has the weather and
notifications been going". The live logs (read only) showed:
- the morning weather reaching 22 phones a day;
- one phone failing every morning with "NotRegistered";
- Fri 31 Oct sent twice, because two runs started at the same second (18 and 13 sent);
- 12 weather look-ups refused out of 205. I first said the app was asking without a position. Wrong: the app never
  does, and these were the server's "Weather is only given for Nigeria", from phones in Arizona;
- no failed trip reminder pushes.

The owner then said "yes delete the heat notice and add the fixes":
- [x] **The one-off heat notice is gone.** `heatSeasonNotice` was deleted from the live project on 3 November, its
      job done on 2 November (2 sent; 22 already had the morning weather). It was also removed from the code.
- [x] **The morning weather goes to each person at most once a day,** even when two runs start together: each
      person's day is claimed in a transaction before sending (`morningWeather.ts`).
- [x] **Dead notification links are not tried again.** A send that fails because the phone's link is dead notes it
      in `deadPushTokens/{uid}` (server only, `pushTokens.ts`), and the morning weather and the trip reminders
      skip that link from then on. A new link saved by the app starts sending again by itself. The note is
      deleted with the account.
- Tests: 402 unit and 132 emulator, with 5 new. **Live:** `morningWeather` on Tue 3 November; the trip reminder
  side (`checkOverdueTrips`, `checkQuietTrips`) and `deleteMyAccount` on Wed 4 November, with the security fixes.

**Security fixes, server and rules (4 November).** The owner asked for "a full security review as we wait", then
"start the fixes now". The findings are kept privately, outside this public repository. Fixed here, with tests:
- [x] the overdue and quiet-trip checks read every due trip, a page at a time, and handle each person fairly;
- [x] "stop texting me" needs a text WakaGuard really sent to that number with that link;
- [x] the server writes a trip's contact page only for the traveller who owns it, and a trip may not take the id
      of someone else's page;
- [x] a road report's state must be a real state; the nearby notification uses known words only, comes only from
      verified accounts, never goes to the reporter, and is limited on the server as in the app;
- [x] `.gitignore` covers payout files and more kinds of key files.
- Tests: 406 unit, 134 emulator, 137 rules checks. **Live Wed 4 November** (the owner: "deploy the security
  fixes, then commit and push"), before the push: the rules, then `checkOverdueTrips`, `checkQuietTrips`, `onSOSAlert`, `tripLocation`, `tripAction`, `stopTexts`,
  `onReportCreate`, `cleanupExpiredTrips`, `deleteMyAccount`. `onTripUpdated` (page checks only, as the rules
  already stop the cause) goes with build 27, as it holds the referral counting.

### Build 26: simplify before launch, redesign after (agreed 21 October)

The owner agreed on 21 October ("Yes I agree") after two testers' feedback.
- **The first,** the tester whose iPhone crashed on build 24, asked for a better UI and a brand identity in version 2.
- **The second,** a tester's message the owner pasted, said the app "is trying to do too much": too many colours,
  highlights and icons "that scream AI", and too much information. They also asked who "Blocked people" blocks,
  and why a Bolt ride must be entered again by hand.
- **The poll the same day:** most testers would use WakaGuard on short trips for the daily trip to work or school
  (6 votes), then coming home late (4), then an unknown bus, keke or taxi (3). Nobody chose "only long trips".

What was agreed:
- **Build 26, the launch version, gets a simplification pass, not a redesign.** Removing and moving things is low
  risk before the 13 November freeze:
  - one colour (the green brand) plus red only for SOS;
  - fewer boxes, highlights and icons;
  - a short start form (where to, how long, who is told, Start), with the transport question, vehicle details and
    the rest under "More options";
  - plain labels: "Blocked people" becomes the people hidden from your road reports, explained in a line, and
    hidden when nobody is blocked.
- **Correction (24 October):** an earlier line here said "January, version 2: a designer and a brand kit, as
  planned". That was only my suggestion; the owner has no designer. The design to follow is the outside
  "WakaGuard complete design v2" PDF the owner shared on 24 October (its colours, text sizes and button sizes);
  where and when it is applied is the owner's call.
- **Bolt rides:** WakaGuard cannot read them, and Bolt has its own ride sharing. WakaGuard's place is keke, danfo,
  okada, unknown taxis and long road trips; the answer to "extra work" is a quicker start.
- **First step:** a keep / move / remove list for every screen, made from the app at phone size against the
  emulators, for the owner to approve.
- **The owner's choices, 1 November** (all 31 answered on the Build 26 page). What is to be done:
  - [x] **Start form:** the time buttons cut from 9 to 5 (15 min, 30 min, 1 hr, 2 hr, Other); the paragraph under them
    cut to one line; the test trip note cut to one line; "How are you travelling?" and "Add plate number or driver"
    moved under "More options"; the "Safety tips" row removed. The two text checkboxes stay on the form (their
    choice). The destination box takes an address or the name of a place, not only a city: this joins "Search for
    where you are going" below. Done 1 November:
    - The 4, 6, 8 and 12 hour choices are one tap away inside Other, above the hours and minutes.
    - A typed destination can now be 80 characters, as a full address is longer than a town. Texts still carry the
      first 40 (`sanitizePlace`), and a pin's name stays at 40.
    - "More options" shows the remembered way of travelling beside it, and any vehicle, so nothing is hidden unseen.
    - With the "Safety tips" row went the private car checklist inside it (`SAFETY_CHECKLIST`). Testers' saved ticks
      stay on their profile, unused.
  - [x] **During a trip:** "Text I'm okay", "Share link" and "Report something on the road" become one row of three
    small buttons; under the trip, only "Stopped at a checkpoint?" and Emergency numbers; amber becomes green; the
    yellow test box becomes grey. Done 1 November:
    - The small button reads "Report road", and screen readers still say "Report something on the road".
    - The row has a border, as without one it almost vanished into the page. "I'm okay" never breaks across two lines.
    - **One exception, for the owner to see:** Trusted contacts stays under the trip when there are none, or one
      cannot be texted. Messages say to open that row, and it is the only way to the contacts during a trip.
    - Amber stays where it is a real warning: weather, no location, no connection, another phone sending the trip.
      Overdue stays red, with the add-time buttons green.
    - The "Add time" button in the directions panel (Beta) went green with the others; its warning line stays amber.
    - **Found by testing a real trip:** a long address shrank to about 15 letters on the trip card. The card and the
      trip map now show two lines. This came from allowing addresses on the Start form.
  - [x] **Nearby:** the place pictures come off the map; the computer talk comes off the report form; Filters keep
    Search, Type and how recent; one set of report type names; severity cut to "Serious" or not, with a red ring
    (their choice, against my suggestion to leave it). Done 1 November:
    - `src/lib/reportWords.ts` holds the names and `isSerious`. What is stored did not change: a serious report is
      saved as `high`, a normal one as `medium`, and older reports read correctly.
    - `src/lib/landmarks.ts` is removed; it is in git for when places come back after launch.
    - **A fault found on the way:** on phones the tab bar covered Apply Filters, so filters could not be applied.
      The sheet now sits above the bar.
    - **Left for later:** the Privacy page still says "Roadwork", changed at its next release. The server's push
      to people nearby still reads "A high hazard was reported" (`functions/src/index.ts`), which needs a functions
      deploy.
  - [x] **Profile:** the three number boxes removed; one plain icon style, Sign out no longer red; Delete account
    moved to the bottom of Settings; "Blocked people" only when someone is blocked, as "People hidden from your
    reports". Done 1 November:
    - The delete-account, Support and Privacy pages now say "open Profile, then Settings". Terms still reads true
      ("from Profile in the app"). These go live with the next website release, which should go with the app.
    - **At that release:** change "Last Updated" on the Privacy page, as the policy promises.
    - The Support page said blocking "cannot be undone through the app", which has been wrong since Unblock was
      added. It now says where to undo it, as the row is hidden until someone is blocked.
  - [x] **Whole app:** green everywhere, red only for SOS and serious road reports. Done 2 November:
    - Amber is pointed at the green in `src/app/globals.css`, as orange and yellow already pointed at amber, so
      weather, tips, the checkpoint row and the report tiles all went green in one place. Admin pages went with them.
    - **For the owner to see:** a real problem is dark grey with dark words, not green, as green would read as all
      well: no location, no connection, a contact who cannot be texted, form and sign-in errors, failed toasts.
    - **One exception, for the owner to see:** overdue stays red on the trip card, the trip map and the page contacts
      open, as that is when contacts are being told. So do Emergency numbers and the emergency box on Support.
    - Delete, Report and Block keep working as they did and are no longer red. Only the colour changed, so the store
      rules on reporting and blocking are still met.
    - The line browsers draw around a focused box is green, as it was orange in some.
    - All 20 simplification changes are done, and none is on a phone yet.
  - **The test trip stays** (the owner, 1 November: "keep the test trip"), with its note cut to one line. They had
    thought of removing it; "A first trip on day one" is built on it and it is the only way to try alerts safely.
- **Decided 23 October:** the directions beta stays in build 25 and is built last, after every other build 25
  item (the owner first said to drop it, then the same day: "No put it back, It will be the last thing we add").
- **App Check, added 28 October** ("add app check to build 26"). It lets Firebase tell our apps from scripts
  calling the server. The phones run the app bundled inside them, not wakaguard.com, so the reCAPTCHA provider
  already in `src/lib/firebase.ts` is not enough there. The work:
  - **Android:** Play Integrity, registered in Firebase App Check with the app signing certificate from Play
    Console (App integrity).
  - **iPhone:** App Attest, which needs the capability added in Xcode.
  - **Website:** reCAPTCHA v3 for wakaguard.com.
  - **In the app:** a Capacitor App Check plugin supplies the phones' tokens to the Firebase web SDK.
  - **Then:** watch the App Check numbers with nothing enforced. Enforce Firestore, Storage and the functions
    (`ENFORCE_APP_CHECK=true`) only once phones on build 25 are gone, or they would stop working.
  - **Estimate:** about a day of code plus testing on both phones. The owner does a few clicks in the Firebase,
    Play and Apple consoles, with guidance.
  - **Optional, same build:** an 8-character minimum password, with the app's "at least 6 characters"
    messages changed to match.
- **A first trip on day one, added 28 October** ("add item 3"). Of the 41 testers' accounts (28 October):
  - **Came back after day one (22):** 20 had started a trip.
  - **Never came back (19):** only 10 had ever started one, and 11 had added a contact.
  - **So:** a first trip is what keeps people.
  - **The change:** right after sign-up, lead straight into adding one contact and then a 2-minute test trip,
    instead of leaving people on the home screen. It ends on the trip screen with a plain "That's how it works",
    and every step can be skipped.
  - **Fits with:** the short start form of the simplification pass, and the existing "first test trip" points.
  - **Afterwards:** the Numbers page shows whether more people come back.
- **From a regular tester's feedback (28 October; the owner: "yes add all three"):**
  - **Search for where you are going,** instead of only the pin. Use Google's place search, as Mapbox
    found no Nigerian landmarks on 18 October. It should stay within Google's free monthly allowance at our
    size. It needs a Privacy page line: what is typed is sent to Google.
  - **"Stopped at a checkpoint?" that does something.** Today one tap saves an alert (`checkpoint_stop`) and
    shows "Checkpoint stop logged", but no one is told and it is not on the contacts' trip page. Testers have
    pressed it 20 times. The change: a short confirmation, then the stop shows on the contacts' trip page
    ("Stopped at a checkpoint, 2:14 pm", with a map pin).
  - [x] **"Trip ended. Your location is no longer shared."** shown after "I've arrived". The tester thought
    their location was still shared after ending a trip and closed the app to be sure. The server log
    shows only one refused position for an ended trip in 7 days, so nothing is sent. What they saw is
    likely the iPhone's location arrow, from the weather line or the map reading location while the app is
    open. Also check on the owner's iPhone that the arrow goes away when the app is minimised after a trip.
    - Done 1 November: every ending says it, for 6 seconds, in place of "Glad you made it". When the share
      sheet opens after "I've arrived" it covers the message, so the message shows again once the sheet closes.
    - Still to do: the location arrow check on the owner's iPhone.
- **"Your points this week", added 28 October** (another regular tester: "if it's possible for us to see our
  points", and the same people win every Sunday; the owner: "yes approve both").
  - **Today** points exist only in the Sunday script, so nobody can see theirs or why a trip did not count.
    That tester used the app on 8 days, yet in week 2 none of their 6 real trips counted: 3 ran past their
    time (contacts would have been texted) and 3 were judged "did not move" while the phone sent nothing
    for 18 and 168 minutes.
  - **The change:** a small card with this week's points and counted trips, and, for the last trip that did
    not count, why, with the fix: "More time…" before the time runs out, or "Keep WakaGuard running".
  - **Needs:** a callable function that scores only the signed-in person's week with the same rules as
    `scripts/weekly-numbers.mjs`. Move the rules into one shared module so the two cannot drift apart.
  - **Already done, no build needed:** the full points list goes in the group each Sunday; last week's
    winners sit out the prize places (`--last-winners`), and everyone else with 3 or more counted real
    trips goes into a draw (`--draw`).
- [x] **Redmi, Xiaomi and POCO phones in "Keep WakaGuard running", added 28 October** (a tester on a Redmi:
  "The app close a few times", "after I returned"; the owner: "approve both").
  - His two trips on 22 October went silent for 52 and 31 minutes, and no phone has sent a fault report
    in 30 days. So the phone closed WakaGuard in the background; the app did not crash.
  - `src/lib/keepRunning.ts` has a step for Tecno, Infinix and itel (Phone Master) but none for Xiaomi's
    phones, which are common in Nigeria too. Add one: Autostart on for WakaGuard, "No restrictions"
    under Battery saver, and WakaGuard locked in recent apps.
  - Check the menu names on a Redmi first: the cheaper Redmi A phones run a plainer Android that may
    have no Autostart.
  - Done 1 November. The step says "if you see it" for Autostart, since we have no Redmi to check on: the names
    come from published guides for these phones. Testers on a Redmi can confirm them.
  - Phones that give their name as Redmi, Xiaomi or POCO now also get the steps offered unasked, as Tecno, Infinix
    and itel do. Many give only a model code, and those still find the steps on Profile.
- [x] **Any number of minutes under "Other", added 28 October** (a regular tester: "my trip could be 7 mins
  but there's no option for that so I have to either choose 5 or 10"; the owner: "add to build 26").
  - The start form's own time picks minutes in fives (`CUSTOM_MINUTES` in `StartTripForm.tsx`, from the
    13 October request to say "2 hours 10 minutes" exactly). Make it every minute, 0 to 59.
  - Trips under 10 minutes still earn no ranking points; this is about the alert coming at the right time.
  - "More time…" too (`AddTimeSheet.tsx`, `EXTRA_TIME_STEP` in `tripPlanning.ts`): a second regular tester
    asked on 28 October ("one should be able to type the particular time or minutes the want, not just in
    5s"; the owner: "add more time"). The server's check on added time must accept any whole minute.
  - Done 1 November, both pickers, 1 to 59 minutes. The server's check already took any whole minute, so
    nothing changed there. The shortest trip stays 5 minutes.
- [x] **Ignore wild positions, added 28 October** (our most active tester sent a screenshot: the path on a short
  trip in Calabar shot several kilometres north to the airport and back; "I didn't went to anywhere close
  to airport"; the owner: "add to build 26").
  - That trip (Wed 28 October, 06:02) reached 3,638 m from its start against about 2,000 m on his other 16
    trips that week, so one rough fix, likely before the phone had GPS, was taken as real.
  - Today the app sends each position's accuracy and `tripLocation` stores it, but nothing uses it: every
    position moves the contacts' map, the trip path and `farthestFromStartM` (which the weekly ranking reads).
  - The change: on the server, a position much less accurate than recent ones, or one that would mean an
    impossible speed from the last good one, is kept for the record but does not move the map, the path or
    the farthest distance. Test it with a still phone indoors, where rough fixes are common.
  - Done 1 November in `tripLocation`, as `isWildPosition` in `functions/src/tripPath.ts`. A position is left out
    when reaching it would have taken over about 200 km/h, or when it is 500 m rough or worse and at least 3 times
    rougher than the last good one.
  - Safeguards: at most 2 in a row are left out, so if the last good position was the wrong one the map still
    moves on the third; nothing is left out during an SOS; a position left out still counts as the phone being
    heard, so it cannot cause "No location received" or an alert. The latest one left out, and how many, stay on
    the private trip only.
  - **Live Sun 1 November** (`tripLocation`; see "Website and server releases"), for phones on any build.
  - **Not covered:** trips run in a website browser, which write their positions straight to the database.
  - Still to do: the still phone indoors test.
- [x] **No false "No location received" after coming back to the app, added 28 October** (the same tester:
  "if I minimize for a long while say 10-15 mins, an error message will flash on the app saying, my
  location stopped sharing… I should check my Internet connection"; the owner: "add to build 26").
  - His 17 trips in the 10 days to 29 October had a position every 30 to 60 seconds, never more than
    2 minutes apart, on build 25 (Infinix). So sharing never stopped; the warning was wrong.
  - Cause: `describeLocationStatus` (`src/lib/tripPlanning.ts`) reads `lastUpdate` from the app's own copy
    of the trip. Background positions go to the server straight from the native plugin, and the copy is
    not refreshed while the app is minimised, so on return it looks 10 or more minutes old until the
    listener catches up.
  - The change: on returning to the front, re-read the trip from the server (or hold the stale warning
    for a few seconds until a fresh copy arrives) before saying sharing stopped. Testers who see a false
    alarm stop trusting the real one.
  - Done 1 November: the warning is held for 20 seconds after returning (and on opening the app), showing
    "Checking your location sharing…". A silence that is real shows the warning once the 20 seconds are up.
- [x] **The Nearby tab's location button, added 31 October** (a regular tester's problem report of 26 October:
  "The location button on the nearby tab doesn't work. It supposed to auto pinpoint your location when you
  tap on it."; the owner: "yes add the fix and count it").
  - **Corrected 1 November.** The cause first written here, a 2-second timer in `handleLocateClick`, applied only to
    the map's own button on a computer. On a phone that button is not drawn: the one people tap is in the top bar
    (`MobileTopBar.tsx`). It got a position and drew the dot, but nothing told the map to go there, so on a phone
    it never moved at all, however quick the fix. A failed request showed nothing either: the message existed
    only on the computer layout.
  - Done 1 November: the map moves when a position comes back from a request, whichever button started it and
    however long it took, even with a report open. A failed request leaves the map alone and says why, in plain
    words, on phones too. Test on a phone with location only just turned on.
- [x] **Cancel trip, added 29 October** (a regular tester: "an option to abort a trip if someone changes his or her
  mind on travelling after already setting up the trip… due to an emergency I have to discontinue the trip";
  it has happened to him twice, and both times he "let it run till the stipulated time and clicked I have
  arrived"; the owner: "add to lists").
  - Today "I've arrived" is the only way to end a trip, so someone who never set off either waits it out (and
    risks an overdue alert to their contacts) or ends it as arrived, which sends "has arrived safely" when
    "Text them when I arrive" was ticked.
  - The change: a "Cancel trip" action on the trip card and the trip screen, asking once ("Cancel this trip?
    Your contacts won't be told you arrived."), that ends the trip as `cancelled` with no arrival text. The
    server already treats a cancelled trip as ended by the traveller (`tripMonitor.ts`), so an alert already
    sent still gets its all-clear.
  - A cancelled trip earns no ranking points, like any trip that is not a real journey.
  - Done 1 November, on the trip card and the trip map, not during an SOS. It has "Keep trip" as the way out, and
    says so when contacts already alerted will get the all-clear. No share sheet follows, unlike "I've arrived".
  - The backup route takes it too (`tripAction`, action `cancel`), so a slow connection cannot turn a cancelled
    trip into an arrival.
  - **Server side live Sun 1 November** (`tripAction`; see "Website and server releases"). The button itself comes
    with build 26.
- **SOS from the lock screen, added 29 October** (a regular tester's voice note: in an ambush "there will be
  no time for me to pick up my phone", and Google's Personal Safety calls 112 on five presses of the power
  button; the owner: "add to build 26").
  - Android and iOS let no app use the power button, film in the background with the screen off, or dial
    112 by itself; only the phone's own Emergency SOS can. Testers are pointed to that (Settings, "Emergency
    SOS", with location shared to emergency contacts) alongside WakaGuard.
  - The change: an "SOS" button on the "Safe Trip active" notification, which shows on the lock screen, next
    to the existing actions (`TripReminderMessagingService.java`, `tripNotificationActions.ts`). A press asks
    once more ("Send SOS to your contacts?") so a pocket press cannot set it off, then sends it as the app's
    SOS button does, with the latest position. iPhone: a notification action too, or a Live Activity later.
  - The overdue alert stays the backstop for someone who cannot touch their phone at all.
- **A reminder at each person's usual travel times, added 28 October** (a regular tester: "most times I
  forget to use it while going out"; the owner: "add the reminder to build 26"). "I forgot to start a trip"
  was the top reason for using WakaGuard less in the 17 October survey (4 of 9).
  - The server already knows when each person's real trips start. Where someone has started one at about
    the same time of day (within 30 minutes, Nigeria time) on at least 3 of the last 14 days, send a push a
    few minutes before that time, "Heading out? Start your trip", opening the start form with their usual
    trip filled in, and only when no trip of theirs is running. At most once a day.
  - Its own switch in Settings, on by default for build 26 and later, so nobody turns off all notifications
    (and with them trip reminders) to stop it. Older builds get none: they would have no switch.
  - Needs a Privacy page line: the times of their past trips are used to time the reminder.
  - Watch afterwards on the Numbers page whether more trips start near those times.
- **Morning heads-up with nearby road reports, proposed 28 October** (the owner: "a push notification
  based on the location and give them value information").
  - The 6:30am notification would also mention road reports within about 10 km of the person's rough
    area since the night before. It still goes only when there is something worth saying, at most once
    a day.
  - It needs the Settings switch renamed "Morning heads-up" with its line changed (an app change), and a
    Privacy page line on using the rough area for road reports.
  - The heat warnings above went first, server-only.

### Build 24.1, iPhone only: the iOS 27 launch crash

Found on Tue 20 Oct 2026 from the first crash report on build 24 in TestFlight. An anonymous tester's iPhone 15 Pro
on iOS 27.0.1 (MTN, Lagos time) closed the app 0.3 seconds after it opened. The report reads
`_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`.
- Build 24 was made with Xcode 27, against the iOS 27 SDK. iOS 27 refuses to run an app linked against that SDK
  unless it uses the UIScene life cycle.
- Our app still uses the old one: no `UIApplicationSceneManifest` in `ios/App/App/Info.plist`, and the window is
  set up in `AppDelegate`.
- So every iPhone on iOS 27 fails to open build 24, and App Review, which tests on the newest iOS, would fail it
  too. iPhones on iOS 26 and every Android phone are not affected.
- The app sent no fault report of its own, as expected for a crash before the page loads.

The owner said "go ahead with the fix" the same day. It is a build of its own, numbered 24.1 so that build 25
keeps its plan, with nothing else in it:
- [x] Capacitor from 8.0.2 to 8.5.3 (done 20 Oct). 8.5.0 (31 July 2026) added UIScene support and a migrator in its
      command-line tool. Core, CLI, iOS and Android are kept on the same version, so Android picks it up with
      build 25. `pod install` moved the Capacitor pods to 8.5.3
- [x] The iPhone app moved to the UIScene life cycle (done 20 Oct). Only the UIScene part of Capacitor's migrator
      was run, then corrected by hand:
      - **The scene section.** It went into `Info.plist` with the file's own layout kept; the migrator had
        rewritten the whole file.
      - **The Xcode project file.** `SceneDelegate.swift` was added next to `AppDelegate.swift`; the migrator had
        written `explicitFileType = undefined` and put the file in another group.
      - **`SceneDelegate.swift`** no longer makes its own window. Capacitor's template makes a plain
        `CAPBridgeViewController`, which would have dropped `MainViewController` and the contact picker it
        registers. Main.storyboard, named for the scene in `Info.plist`, makes the window, as before, and the
        scene delegate only passes links on to Capacitor.
      - **`AppDelegate.swift`** gained `configurationForConnecting`.
      - **Checks.** No plugin uses what 8.5 removed (`tmpWindow`, `TmpViewController`). The splash screen finds
        its window through the scene. Build number 24.1. A Debug build for iPhone compiles, and the built app
        carries the scene manifest, `App.SceneDelegate` and version 24.1
      - **Checked on iOS 27 in the simulator (20 Oct).** The iOS 27.0 simulator (24A434) was installed on the
        owner's yes. On an iPhone 17 simulator:
        - 24.1 opened to the first welcome screen and was still running 10 seconds later (screenshot in the
          session folder's `screenshots/build-24.1-ios27.png`).
        - The same code with build 24's three start-up files put back died at once, as on the tester's phone.
        - With the fix restored, it ran again.
        - A first control, which only took the scene section out of the built app, did not crash, because
          `configurationForConnecting` in AppDelegate is enough on its own for iOS to use scenes.
      - **On the owner's iPhone 16 (iOS 26.5, 20 Oct).** A Debug build with the live settings and the same Mapbox
        token as build 24 was installed by cable over build 24; it opens and stays running
- [x] Checked on a real iPhone on iOS 27 (21 Oct, about 23:30 Arizona). The owner then updated that iPhone 16 to
      iOS 27.0.1 (24A446), the same version as the crash report, and 24.1 opened.
      - They signed in with Google, which made a new account, `sneakyjiii` (left out of the rankings), and
        started a test trip.
      - The server received positions about 30 seconds apart, 4 m accuracy, with no quiet warnings.
      - The owner tried "everything" and said it works: sign-in, the trip, the reminder buttons, the contact
        picker and the share sheet
- [x] Uploaded to TestFlight as 1.2.0 (24.1) on the owner's word ("upload 24.1"), Tue 20 Oct 23:36 Arizona

### Builds 24 and 25, in more detail

**On the owner's phones (Sun 18 Oct, evening in Arizona):** build 24 from `1e12be0`, built with the live
settings and the Mapbox token. iPhone 16: a Debug build installed by cable over the earlier one. Galaxy
(SM-S156V): signed with the release key, because build 23 there was, and a test-key build is refused over
it; installed over build 23, sign-in kept. Neither went to a store. Testers stay on build 23 until the
store uploads.

- [ ] Build 24. Sponsor slot by state: the sponsor card can differ by the
      state the user has chosen, changed from the server without an app
      update. Marked "Sponsored"; never on the trip screen, the contacts' page
      or in texts
- [x] Build 24 (done in code 18 October; not yet on a phone). Add your own
      amount of time (the owner, 14 October; a couple of testers asked for it
      in the feedback form too). Nobody can know in advance how much more
      time a trip needs. On the trip card, under "Running late? Add time", an
      "Other amount" button opens "Add more time": hours and minutes in
      5-minute steps, up to 12 hours at once (the limit the backup route
      takes, checked by a test), starting at 20 minutes, with the new arrival
      time shown. On the reminders, a third button "More time…" (Android's
      own drawing and the iPhone's TRIP_REMINDER category) opens the app on
      that picker; nothing is added until an amount is chosen. "+15 min"
      stays the one-tap choice. The "Added …" message now reads "Added 1 h 35
      min" rather than "Added 95 minutes". Checked in a phone-sized browser
      against the emulators (picker opened from the card, 1 h 35 min moved the
      arrival time from 12:20 to 1:55 PM). The reminder button needs a phone:
      older builds keep two buttons, and no server change is needed
- [x] Build 24 (done in code 18 October; not yet on a phone). Undo for
      "I've arrived" (the owner, 18 October, from lordelijah's problem report
      of 16 October: he ended a trip by mistake when he meant to add time,
      and an ended trip is not watched). The card's and the trip map's "I've
      arrived" now wait 5 seconds with "Ending your trip in 5… Undo" above the
      tab bar, the card's buttons paused meanwhile, then end the trip. The
      wait can never leave a trip running that was meant to end: if the app
      is put away or the phone locked during it, the trip ends at once. The
      reminder's "I've arrived" button still ends at once (that press already
      needs opening the notification and unlocking). `src/lib/arriveUndo.ts`.
      Checked in a phone-sized browser against the emulators: Undo kept the
      trip running past 8 seconds; left alone it ended after 5 seconds; with
      the page told it was hidden it ended 0.1 seconds later. Needs a phone
      check that locking the phone during the wait ends the trip
- [x] Build 24 (done in code 18 October; not yet on a phone). The morning
      weather notification, to bring people back to the app (the owner, 14
      October): `morningWeather`, at 6:30 am Nigeria time, only on days with
      a storm, heavy rain, rain, fog or great heat between then and 9 pm in
      the person's rough area ("Heavy rain expected today. From about 3 pm
      where you are. Allow extra time; low roads may flood."), in the same
      style as the approved Trip screen line, English for now. Tapping it
      opens the start form. The rough area (about 10 km, never the position)
      is kept in `weatherAreas` (server only) by each weather look-up from a
      signed-in person, unless "Morning weather" is off in Settings (on
      unless switched off); forgotten after 30 days without a look-up, when
      switched off, or with the account. Sent only to build 24 or later (the
      ones with the switch), at most once a day, as an ordinary notification
      on its own Android channel "Morning weather", never like a trip alert.
      Checked: unit and emulator tests (a rainy area told once, a dry one
      not, switched off, old build, forgotten area), the Settings switch in a
      phone-sized browser. Privacy lines approved by the owner on 18 October
      (the old line said the area "is not saved with your account", which
      would no longer be true; now it says what is kept, why and when it is
      deleted, and the notification is under Notifications). Release: rules (users.morningWeather, weatherAreas), then
      the functions (weatherAhead, morningWeather, deleteMyAccount), then the
      website and build 24
- [x] Build 24 (done in code 18 October; not yet on a phone). The weather
      icon in the top bar, on every tab (the owner chose it on 18 October over
      weather notifications through the day, which would get WakaGuard's
      notifications switched off, the trip reminders with them): a picture of
      the hour under way and its temperature, from the same look-up as the
      Trip screen's line, asked for again every 30 minutes while the app is
      on screen, and only if location is already allowed. Tapping it shows
      "Weather here": now, the warning line if any, the next six hours with
      pictures, and "Data from MET Norway". The server's `weatherAhead` now
      also answers with the next hours; older apps ignore them, and an older
      server leaves the icon out. Checked with sample forecasts on a page made
      for the purpose and then deleted. Privacy: the look-up line now says
      "while the app is open on your screen" instead of "open the Trip screen,
      or have a trip running" (approved by the owner on 18 October). Release with
      `weatherAhead` and build 24. Live server and website since 18 October.
      Outside Nigeria the server gives no weather, so the owner, in Arizona,
      sees no icon; seen with a Lagos position on this Mac against the
      emulators (27°, partly cloudy; the sheet with rain in about 3 hours).
      Fixed the same day: the icon, there before anyone signs in, asked once,
      was refused, and waited 30 minutes before asking again, so a person who
      had just signed in saw none. It now asks the moment someone signs in
      (checked: signed out, no icon; signed in, the icon at once). On the
      live website the same evening
- [x] Build 24 (done in code 18 October; waits on the owner's console steps
      and a phone). Sign in with Google (Android and iPhone) and with Apple
      (iPhone, which Apple requires of an app offering Google), through
      `@capacitor-firebase/authentication` 8.5.2: the phone signs in with the
      provider natively and the web layer signs in to Firebase with its token
      (`skipNativeAuth`), so everything after sign-in is as for email. Not on
      the website yet: Google's pop-up did not complete in a browser without
      pop-up windows, as in WhatsApp's own browser; to try in a real browser
      later. Buttons "Continue with Apple" / "Continue with Google" at the top
      of the sign-in box and the first-run screen, under the "18 or older"
      tick, which they need too (they can create an account in one tap); the
      email form below as before. Hidden until switched on in `config/app`
      (`signInWith: { google, apple }`), so build 24 can go out before the
      consoles are done. Google and Apple accounts skip "Check your email"
      (the provider confirms it) and count as verified for texting. Deleting
      such an account is confirmed by signing in with the provider again
      instead of a password. Native: Android `rgcfaIncludeGoogle`; iPhone the
      Google pod, Google's return scheme from GoogleService-Info.plist, and the
      Sign in with Apple entitlement. Checked: Android compiles; iPhone pods
      install (the iPhone build itself is made at release); against the
      emulators, a Google token makes a new account with the email confirmed
      and is recognised the second time; the buttons and the tick in a
      phone-sized browser. Owner's steps: enable Google and Apple in Firebase
      Authentication; add the upload key's SHA-1 (and check Play's app-signing
      SHA-1 is there) to the Android app in Firebase, then send the new
      google-services.json; say yes when the iPhone build adds Sign in with
      Apple to the app's identifier. Privacy line (what Google and Apple
      share with us, Apple's hidden email) approved by the owner on 18 October.
      Same evening: the owner added the upload key's and Play's app-signing
      SHA-1 (A0:85:F6:…:6A:A9) to the Android app in Firebase and sent the new
      google-services.json (in the project, off GitHub; the app's own values
      did not change, so no new Android build was needed). The owner thought
      of Google only, then kept Apple too ("A"): Apple's rule 4.8 asks an
      iPhone app offering Google to offer an equally private sign-in, and
      email with a password does not hide the address. Next: Google and Apple
      enabled in Firebase by the owner, then `signInWith` switched on in
      `config/app` on the owner's word, then tried on both phones. Switched
      on that night; the owner confirmed Google sign-in works on both the
      iPhone (Debug build) and the Galaxy (release-signed build), and Apple
      sign-in on the iPhone. Sign-in for build 24 is done
- [x] Build 24 (done in code 18 October). "Safety tips" no longer reads "For
      other" or "For on foot": each way of travelling has its own heading
      ("On an okada", "In a private car", "On foot"), and "Other" reads "For
      the way you travel" (`tipsHeading` in `src/lib/travelMode.ts`)
- [x] Build 24 and the website (done in code and live on the website 18 October). The destination pin names its spot (the owner,
      18 October: the pin did not fill "Where are you going?"). Until NIPOST's
      postcodes can be used, OpenStreetMap's free look-up (Nominatim) gives the
      street and area, tried on five landmarks: Ojota bus park "Ikorodu Road,
      Ojota, Ikeja", Wuse Market "Blantyre Street, Wuse II, Abuja". Asked
      through our server (new `placeName`), so OpenStreetMap is sent the spot
      and never who asked; at most one look-up a second for the whole app, as
      its rules ask, and a limit per person. The name fills the box only when
      it is empty (or still holds the last pin's name), stays editable, and
      shows "© OpenStreetMap". Privacy line approved by the owner on 18
      October: "When you set your destination on the map, our server looks up
      the name of that spot using OpenStreetMap's Nominatim service, so it can
      fill in 'Where are you going?'. Only the spot is sent, never who you
      are." For launch volumes: NIPOST or a paid look-up. Checked at phone size
      against the emulators with the real look-up: a pin near Bariga gave
      "Finding its name…", then "Igbobi, Bariga" with the credit; a typed
      "My aunt's house" stayed when the pin was moved. 12 new tests (the name
      from Nominatim's answer, plain letters for texts, the 40-letter box, the
      spot in Nigeria, the turn and the hourly limit) and 3 rules checks. The
      count per person is deleted with the account. Release: rules, then
      `placeName` (with `deleteMyAccount`), then the website and build 24.
      The same evening, on the owner's word: any spot is named, not only in
      Nigeria (the owner's pins in Arizona were refused; a trip may also end across a
      border). Server only. The owner confirmed it fills the box on both
      their phones the same night
- [x] The website on a computer (done in code and live 18 October; the owner: "replace
      the computer Safety Center"). The computer layout's button, now "Safe
      Trip", opens the same Safe Trip screen as the phones, in a phone-sized
      window with the weather icon and a close button (`DesktopSafeTrip`), in
      place of the January Safety Center, whose trip share, safety timer,
      check-in and own SOS are gone (`SafetyModal` deleted). The Trip screen's
      own windows, messages and Undo bar stay inside it, as on a phone's
      screen. The computer layout now also sends a running trip's position
      while the page is open, window closed or not, as the phone layout does,
      and the button shows an amber dot while a trip runs. Checked at
      computer size against the emulators, with a Lagos position: signed in
      inside the window, a 2-minute test trip started, the window closed (dot
      shown, the position sent again 2 minutes later), reopened, "I've
      arrived" with its Undo bar in the window, the trip ended; the SOS
      window opens inside it (nothing pressed)
- [x] Build 24 and the website (fixed in code 18 October). Sign-in opened
      underneath the window it was opened from (the owner, 18 October, on the
      website on a computer: Safety, then "Sign In to Continue", and the sign-in
      window sat behind the Safety Center's, so nobody could sign in). The
      sign-in window is now drawn on the page itself, above every other window
      (the same can happen from a report's window on a computer). On phones it
      now also dims the top bar and the tabs. Checked against the emulators:
      on a computer, Safety, "Sign In to Continue", signed in, the Safety
      Center opened; on a phone-sized screen, sign-in from the Trip tab.
      Seen at the same time: the computer layout's Safety Center is still the
      January one (trip share, safety timer, check-in, its own SOS), not the
      Safe Trip the phones have. For the owner to decide
- [x] Build 24 (fixed in code 18 October). Contacts missing after a fresh
      install: on the owner's iPhone, the trusted contacts did not show on the
      Trip screen at first and adding one seemed to fail; they appeared later.
      The screen read the contacts once when it opened, and a read that failed
      (nothing kept on a freshly installed phone, a slow first connection) left
      the list empty with no second try until the Trip tab was opened again.
      The screen now listens to the contacts instead, so the list fills in
      when the connection comes and shows the server's changes at once.
      Checked in a phone-sized browser against the emulators (a contact
      written straight to the database appeared on the open screen)
- [x] Build 24 (done in code 18 October; on the owner's iPhone the same
      day). "Set it on the map" for a trip's destination, in place of an address search (the owner
      chose it on 18 October after Mapbox found almost no Nigerian landmarks;
      the Mapbox search trial was taken out again). Under "Where are you
      going?", optional: a map with the pin fixed in the middle, opening on the
      phone's rough place or the chosen state; "Pin set on the map · Change ·
      Remove". Typing the destination is unchanged and still required. The
      point is saved with the trip and on the contacts' page
      (`destinationPoint`, rules check it is a real point), drawn as an orange
      "Going here" dot on the trip map and the contacts' page, and included in
      "show the whole trip". Gives build 25's directions an exact point.
      Checked in a phone-sized browser against the emulators. Also on all
      maps: Leaflet's own credit dropped (not required) so Mapbox's fits on
      one line, with the wordmark above it. Privacy lines (the point stored
      with the trip, the pin on the trip page) approved by the owner on 18
      October. Next for addresses: NIPOST's digital postcodes (live 1 October
      2026; developer access needs KYB and NIPOST's testing), to name the
      pinned spot and to say where someone was last seen in alert texts; the
      owner to apply. An unofficial write-up (oliha.dev, read 18 October)
      says there is no keyless access (its own mock returns made-up data),
      only the "valid or not" level is free, the address level costs
      credits, a building's position is restricted, and the nearby search is
      not published yet: useful later, not a replacement for the pin
- [ ] January 2027 (moved from build 25 on 14 October, to make room for
      directions). Nigerian languages, Pidgin first, then
      perhaps Yoruba, Hausa and Igbo (the owner, 14 October, moving the Pidgin
      weather lines out of build 23). A large piece of work: the app's words
      are written into each screen, not kept in one place to translate, and
      each language needs a native speaker to write and check it. A Pidgin
      draft of the weather lines exists (the review page of 14 October).
      Pidgin covers the main screens only (the owner, 14 October)
- [x] Build 24 (done in code 18 October; not yet on a phone). Vehicle
      details on a trip: a plate number and one box for the bus company,
      driver or colour, both optional and never for a trip on foot. On the
      start form under "How are you travelling?" behind "Add plate number or
      driver (optional)", and on the trip card ("Add"/"Change") at any time,
      since the plate is usually only seen on boarding. Kept with the private
      trip as `vehicle`. Contacts see it only once alerted: the server copies
      it to their page with the overdue alert or the SOS (and later changes
      after that), and the alert text gets " Vehicle plate: ..." (the plate
      only; left out of an overdue text it would push onto a third SMS page,
      which only happens with the longest name, destination and plate).
      Plates are tidied to capitals, not checked against a format. Rules:
      `vehicle` allowed on sharedTrips, written only by the server (the app
      can neither set nor change it). Checked in a phone-sized browser against
      the emulators (start form, card, change sheet, contacts' page after an
      alert written as the server does). Privacy lines (what is stored, what
      the trip page shows, the plate in alerts) approved by the owner on 18
      October.
      Release order: database rules first (or the app's writes to an alerted
      trip's page would be refused once the server adds `vehicle`), then the
      functions (checkOverdueTrips, onSOSAlert, onTripUpdated), then the
      website and build 24
- [x] Build 24 (done in code 18 October; not yet on a phone). Reports posted
      from far away are marked, not blocked (raised by a tester on 13
      October; the owner said yes that day). When a road report is posted, a
      fresh rough position of the phone (only if location is already allowed;
      never asked for) is compared with the report's pin; more than 30 km
      apart and the report gets `postedFarAway: true`. It still goes up; its
      details say "Posted from far away, not on the spot. The person may have
      passed here earlier."; and the weekly ranking leaves it out ("posted from
      far away"). Unknown position: no mark. The author cannot remove the mark
      (rules). `src/lib/reportDistance.ts`
- [x] Build 25 (done in code 25 October; not yet on a phone; moved back from
      after launch on 17 October, on the owner's word, after the tester
      survey: "I forgot to start a trip" was the most common reason for using
      WakaGuard less, 4 of 9). Repeat a usual trip: one tap to start a trip
      made before, with the time it usually takes filled in. The start form
      shows "Your usual trips", up to three places from the traveller's own
      last 40 trips (read only, nothing new stored): trips ended with "I've
      arrived" in the last 60 days, not tests; trips cancelled or closed by the
      server are left out. The same pin within 300 m, or without pins the same
      typed name, is one place, named as on its latest trip ("Pin on the map"
      for a pin with no name). Most trips first, then most recent. The length
      is the middle of what the latest five took, a third more and 5 minutes
      (the directions' margin, so it errs long rather than alert contacts
      early), rounded up to 5 minutes, 15 minutes to 20 hours; with no end
      time, the length they chose. A tap fills in where (and the pin), how long
      and how they travel, then scrolls to Start with its arrival time; it
      never starts the trip itself. Not shown while signed out or on a trip.
      `src/lib/usualTrips.ts`, `src/hooks/useUsualTrips.ts`. Checked in a
      phone-sized browser against the emulators with 12 past trips: the list
      was Office (4 trips, 1 h 5 min, Okada), Home (1 h 30 min, Bus), Church
      (35 min, Car); the test, cancelled, forgotten and 70-day-old trips and a
      fourth place were left out; each tap filled the right place, pin, length
      and travel mode (a place with no pin cleared the last one's), and the
      highlight went off when the place was edited
- [x] Build 24 (done in code 18 October; not yet on a phone). "Stop texting
      me" for contacts, proved by the trip link (the owner chose this on 18
      October over a code sent by text, which our sender is not approved for).
      The trip page a text links to, open or ended, has "Stop WakaGuard texts
      to my number": the contact types the number the text came to, and the
      new `stopTexts` function checks it is one of that trip's contacts, then
      lists it in `smsOptOuts` (server only). Every text is checked against
      that list before sending (`getTrustedContacts`); if the list cannot be
      read, texts go out anyway. Every traveller's copy of that contact is
      marked `smsOptedOut`, and the app shows "asked WakaGuard not to text
      their number" and leaves them out of trips. A contact saved later is
      marked by the new `onTrustedContactWrite` trigger. Texts can be turned
      back on the same way. Ten tries an hour per link, so numbers cannot be
      guessed. Checked in a phone-sized browser against the emulators: a
      number not on the trip refused, the right one stopped (both travellers'
      copies marked), turned back on. Not seen yet: the form on an ended
      trip's page and the mark in the traveller's app (both covered by tests
      only). The mark shows at once: the Trip screen listens to the contacts
      (see the contacts fix below). Release order: rules and the new index, then `stopTexts`,
      `onTrustedContactWrite` and the changed texting functions, then the
      website. Also: `tripAction` now answers the website's browser check,
      so the backup route works on the website too. Privacy page wording
      approved by the owner on 18 October (in the working copy): what we
      store for a contact now includes whether they asked for no texts;
      "Opting Out" gains the trip-page stop as its first way, and a paragraph
      on what we keep (number, when, which trip link) and that travellers see
      the mark and that contact is not told about their trips, SOS included.
      Change "Last Updated" on the day the website is released
- [x] Build 24 (done in code 18 October; not yet on a phone). The "please
      update" switch and a notice for everyone, both from one database
      document, `config/app`, that anyone can read and nobody can write from
      the app (we change it in the Firebase console). `minBuild`: a phone app
      older than this shows a red "Please update WakaGuard now" card that
      cannot be hidden; the app is not locked, because someone mid-trip must
      still be able to tap "I've arrived". `latestBuild`: an older app shows a
      blue "A new version is ready" card that can be hidden. `notice` (`id`,
      `text` up to 280 characters, `level` info or warning): shown to
      everyone, phones and website, until dismissed; a new `id` shows again.
      Update links default to Play and the TestFlight invite and may only be
      changed to the stores or wakaguard.com. The cards sit at the top of the
      Trip and Profile screens, not on the Nearby map, and change while the
      app is open. Checked in a phone-sized browser against the emulators
      (notice shown, dismissed, stays dismissed after reload, a new one
      appears live); the update cards only show in the phone apps, so they
      need a phone test. Release order: deploy the database rules before or
      with build 24 (until then the read is refused and nothing shows)
- [x] Build 24 (done in code 18 October; not yet on a phone). A backup route
      for "I've arrived" and extra time, the fuller fix for the tester whose
      arrival reached the server 17 minutes late (14 October). When the
      database save has not arrived in 5 seconds, the app also posts the
      press, with the trip's own key, to a new server function `tripAction`
      by the native route the positions take; whichever lands first wins and
      the other changes nothing (an ended trip stays ended; extra time carries
      the press's id, `lastExtendRequestId`, so it is never added twice; the
      counts of extensions can be one too many if both land). The server's
      usual follow-ups (all-clear text, overdue reset) run as for any ended or
      extended trip. No change to the database rules. Release order: deploy
      `tripAction` before build 24 reaches anyone; older builds never call it.
      SOS is not changed
- [x] Build 24 (done in code 18 October; not yet on a phone). Reminders that cannot be missed (the owner, 18 October, after
      the first live test: the "Are you okay?" on the Galaxy did not buzz or
      light the screen). The Galaxy's "Trip reminders" channel was already high
      importance with sound and vibration and Do Not Disturb was off, so
      nothing on our side was muted; Android does not light the screen for an
      ordinary notification. So: on Android a new reminders channel with a
      distinctive WakaGuard sound and a long vibration pattern (a new channel,
      because Android keeps a channel's old settings); on iPhone "Time
      Sensitive" reminders (the app's entitlement and interruption-level
      time-sensitive from the server), which break through Focus and stay on
      the lock screen, and the same distinctive sound. Check how the
      repeat reminders behave with Android's newer notification cooldown.
      Built: WakaGuard's own sound, an agogo bell (the two-tone bell of
      highlife and Afrobeat) playing a 12/8 pattern twice, 2.4 s, made for us,
      so no licence (the owner chose it on 18 October over a plain chime and
      over a version ending on a talking drum), in res/raw and in the iPhone
      app; on
      Android a new "Trip alerts" channel (high importance, that sound, a
      buzz-pause pattern of 0.7 s three times, alarm category) made when the
      app starts; on iPhone the Time Sensitive entitlement, and from the server
      `interruption-level: time-sensitive` with that sound for builds 24 and
      later (`LOUD_FROM_BUILD`), older builds unchanged. A second live test the
      same night on the Galaxy (build 23) showed Android did buzz and sound
      for "Are you okay?" (its log: buzz 1, beep 1), so the first miss was most
      likely the phone in hand or many WakaGuard notifications close together.
      The Time Sensitive capability is switched on for the app's identifier
      when the iPhone build is made (an Apple account change, on the owner's
      word)
- [x] Build 24 (done in code 18 October; not yet on a phone). "Text them
      when I arrive" (the owner, 17 October, after the tester survey: "my
      chosen person gets a text when I arrive safely" was picked by 5 of 9).
      A tick box on the start form under the trip-link one, unticked on every
      trip ("One text to each of them when you tap I've arrived"), saved on
      the trip as `textOnArrival`. When the trip ends with "I've arrived"
      (not a cancel), `onTripUpdated` texts the trip's contacts once: "Ada has
      arrived safely and ended their trip to Ibadan." (logged and limited as
      type `arrival`; a test trip's says it is a test). A trip whose contacts
      were already alerted gets the usual follow-up instead, never both. The
      trip card says "will be told when you arrive, or if you don't", and
      ending says "Your contacts are being told you arrived" and skips the
      share sheet. Checked in a phone-sized browser against the emulators
      end to end (one `arrival` log for both contacts). The website's example
      texts, How it works and Support page say so; the Privacy page lines
      ("Arrival" in when texts are sent, "arrival" in the log's types) were
      approved by the owner on 18 October. Release: deploy `onTripUpdated`
      before or with build 24 (older apps never set the field)
- [x] Build 24 (done in code 18 October; on the owner's iPhone the same
      day). Mapbox map pictures in place of OpenStreetMap's, on the phone apps and the website
      (the owner chose Mapbox on 14 October; a personal Mapbox account until
      Mapbox support fixes the business one, 18 October). Mapbox's Static
      Tiles (streets-v12, 512-pixel tiles in Leaflet, about the same data as
      before; 200,000 free a month, roughly 10,000 to 20,000 map openings),
      with Mapbox's wordmark and "Improve this map" as its terms ask, on the
      Nearby map (above Legend), the trip map, the contacts' page and the
      report pin picker. Used when NEXT_PUBLIC_MAPBOX_TOKEN is set (public
      token, kept in wakaguard/.env.mapbox.local, off GitHub; to add to the
      live website's settings and the app builds at release); OpenStreetMap
      otherwise. Privacy line updated (approved by the owner on 18 October). Restrict the
      token to our addresses before launch
- [ ] Build 24. Destination search by address when starting a trip, with
      Mapbox. Typing a destination freely still works. A search result is
      only kept for the trip unless Mapbox's paid "permanent" option is
      bought; check the terms before saving anything. Tried on 18 October with the
      owner's token: Mapbox found no Nigerian landmark (UCH Ibadan, Shoprite
      Ikeja, Ojota bus park, Wuse Market; both its address search and its
      place search, which offered streets of similar names instead) and 7 of
      10 towns and areas (not Yaba, Mokola, Ojodu Berger). Decision for the
      owner. The owner wanted to try it on a real phone, so a trial is in
      code (`src/lib/placeSearch.ts`: Mapbox's Search Box, Nigeria only,
      nearest first, suggestions under "Where are you going?", choosing one
      fills the box, nothing from Mapbox stored), switched on only by
      NEXT_PUBLIC_ADDRESS_SEARCH=1. A Debug build 24 with it, the Mapbox maps
      and live settings went on the owner's iPhone 16 by cable on 18 October
      (Xcode added Sign in with Apple and Time Sensitive to the app's Apple
      identifier on the owner's yes). Replaced the same day by a build
      without the search (with the destination pin and the contacts fix),
      also from live settings; `out/` holds that one
- [x] Build 24 (done in code 18 October). A switch on the server that hides
      directions without a new build, alongside the "please update" switch:
      `config/app` `directions`, off unless set true, read with the other
      switches (`src/lib/appConfig.ts`). Build 25's directions use it
- [ ] Build 25, built last, after every other build 25 item (the owner, 23 October: "It will be the last thing we
      add"). Directions on the trip, marked Beta (the owner, 14 October):
      the route drawn on the trip map and on the contacts' page; the trip's
      length filled in from the route's time; the next turn shown and spoken
      ("In 200 metres, turn left") while the screen is on; a new route when
      the traveller leaves it. The route is kept only while the trip runs,
      like the path, and the Privacy page says so. Asking "Are you okay?"
      when someone leaves the route stays after launch: it needs real trips
      to set without false alarms. Depends on Mapbox confirming in writing
      that its terms allow spoken directions without its native kit (the
      owner asked Mapbox on 14 October; the account sign-up failed that day
      and is to be tried again)
      - **Plan (23 October), in five pieces:**
        1. The directions logic.
        2. The start form: "By road: about 25 min, 16 km · Use 40 min".
        3. During the trip: the next turn on the trip card and the route on the trip map, marked Beta, with a new
           route when the traveller leaves it.
        4. The contacts' page: the planned route, kept only while the trip runs (rules and server).
        5. The voice, behind a second switch `directionsVoice` until Mapbox answers. Android needs a small native
           speech piece, because its WebView has no speech.
      - **Piece 1 done 23 October:**
        - `src/lib/directions.ts`: reads Mapbox's answer; follows a position along the route; gives the next turn
          and the distance to it; notices leaving the route (over 60 m, two positions running) and arriving
          (within 30 m); decides which spoken line is due, each once; suggests a trip length of Mapbox's minutes
          × 1.3 + 5, rounded up to 5, at least 15.
        - `src/lib/directionsFetch.ts`: asks Mapbox from the phone with the public key, and keeps the running
          trip's route on the phone.
        - `config/app` `directionsVoice`, which counts only with `directions` on.
        - **Tests:** `functions/test/directions.test.ts` uses a real Mapbox answer (Yaba to Ikeja, 16 km,
          25 minutes) as its fixture; `appConfig.test.ts` covers the new switch. 332 of 332 unit tests pass
      - **Piece 2 done 23 October:** the start form, once a pin is set and the switch is on.
        - **What it shows:** "By road: about 11 min, 5.1 km · Beta · Use 20 min, with time for traffic" ("On foot"
          and "with time to spare" for a walk). A tap sets the trip length; then it reads "Using 20 min, …".
        - **How:** `src/hooks/useRoutePreview.ts` asks again only when the pin moves or the trip changes between on
          foot and on the road. The route goes with the start request (`StartTripRequest.route`) and is kept on the
          phone for the running trip (`keepTripRoute`).
        - **Checked** in a phone-sized browser against the emulators with the real Mapbox key, from a pretend Yaba
          position to a pin on Ikorodu Road: the suggestion set the length to 20 minutes and moved the arrival
          time; "On foot" gave a 3.1 km walk; switching `directions` off in the emulator hid the line at once
      - **Piece 3 done 23 October:** directions during the trip.
        - **The hook:** `src/hooks/useTripDirections.ts` uses the route kept from the start form, or asks Mapbox from
          where the phone is if the app was reopened. It watches the position closely only while the screen is on
          (the trip's own location sharing is unchanged). It gets a new route after two positions off it, at most
          every 30 seconds, and forgets the route when the trip ends. It runs only on the phone sending the trip's
          location.
        - **The panel:** `DirectionsLine.tsx`, on the trip card and the trip map's top card: an arrow, "In 280 m",
          the turn, "3.7 km to go · look only when it is safe · Beta". It also shows "Off the route", "You left the
          route. Finding a new one…", and "You are at your destination. Tap "I've arrived" to end the trip."
        - **The map:** `TripMap` draws the planned route as a grey dotted line under the green path.
        - **Checked** in a phone-sized browser against the emulators, with the real Mapbox key and a pretend
          position moved by hand:
          - At the start: "In 80 m, turn left onto Murtula Muhammed…".
          - At 35% along: "In 1.2 km, turn right…, 3.3 km to go".
          - About 300 m off the route: "Off the route", then a new 3.7 km route from Harvey Road with "In 280 m,
            turn right onto F266/Herbert Macaulay…".
          - At the destination: "You are at your destination".
          - After "I've arrived" the kept route was gone.
      - **Piece 4 done 23 October:** the planned route on the page contacts open, kept only while the trip runs.
        - **The app** saves the route's outline, length, time and kind (by road or on foot) on the trip
          (`users/{uid}/trips/{id}.route`, `routeToStore` in `src/lib/directions.ts`) whenever it gets a new one.
          Only the phone sending the trip's location does this, and only while the trip is open.
        - **The server** (`recordRoute` in `functions/src/tripMonitor.ts`, checks in `functions/src/tripRoute.ts`)
          copies it to `sharedTrips/{id}.route` after checking it (only those four keys, outline characters
          Mapbox uses, at most 20,000 characters, sensible length and time). It never creates the page. When the
          trip ends it deletes the route from both, including one the app wrote just as the trip ended.
        - **Rules:** `sharedTrips` allows `route` with the same shape; the app may not add, change or remove it
          (`serverFieldsUntouched`), nor create a page with one. **Deploy `firestore.rules` before build 25
          reaches anyone.**
        - **The contacts' page** (`src/app/s/page.tsx`) draws it as the grey dotted line and adds a row:
          "Planned route · Beta · The grey dotted line on the map. They may go another way."
          `readRouteOutline` drops any point off the map, so a bad outline draws nothing.
        - **Privacy page (approved by the owner on 24 October; goes live with the next website release, when its
          "Last Updated" date changes):** four lines in `src/app/privacy/page.tsx`:
          the route stored with the trip; the dotted line on the trip page; deleted when the trip ends; Mapbox
          sees the two points and the IP address. The "Last Updated" date changes when it is published.
        - **Tests:** `functions/test/tripRoute.test.ts` (5: the app's stored route passes the server's check;
          bad routes refused; the page's reader); 3 emulator tests in `tripMonitor.test.ts` (copied while open,
          replaced, removed when bad or when the trip ends; removed if written after the end; no page created);
          5 rule checks in `tests/smoke.test.ts`. 337 unit, 109 server and 134 rule checks pass.
        - **Checked** against the emulators with the real Mapbox key: a trip from a pretend Yaba position to a
          pin in Ikeja (16 km, about 27 min). The app saved the route, the server copied the same outline to
          the page, and the page showed the dotted line and the "Planned route" row on a phone-sized screen.
          After "I've arrived" the route was gone from the trip and the page, and the link said the trip is no
          longer shared.
      - **Piece 5 done in code 24 October:** spoken directions, behind the second switch `directionsVoice`.
        - **What is said:**
          - Mapbox's own lines as each mark is reached ("In 400 meters, Turn left onto Hughes Avenue.").
          - "You left the route. Finding a new one." when a new route is fetched.
          - "You are at your destination. Tap I've arrived to end the trip." once on arrival.
          - Only while the screen is on, like the directions, and never while off the route.
        - **Mute:** a speaker button on the directions panel (trip card and trip map), 48 × 48. The choice is
          kept on the phone. Turning it back on says the next turn with its distance ("In 13 kilometers, Make a
          left U-turn onto E1, Lagos-Ibadan Expressway, if permitted."), unless a line is due anyway.
        - **How it speaks:**
          - `src/lib/speech.ts`.
          - iPhone and browsers: the Web Speech API, Nigerian English voice if the phone has one, else British.
            The tap that starts a trip (and the speaker button) "primes" speech, because an iPhone only lets a
            page speak after a tap.
          - Android: the WebView's speech says nothing, so the new `SpeakPlugin.java` uses the phone's own
            text-to-speech (en-NG, else UK). It lowers music while speaking (navigation audio, transient duck).
            The manifest now names the text-to-speech service (`<queries>`, needed from Android 11). Compiles.
          - `src/hooks/useDirectionsVoice.ts` decides what to say.
        - **Two fixes to piece 1's `linesDue`:**
          - A line skipped because a later one was due could have been read out after it. Lines up to the last
            one said now count as said.
          - After a gap in positions, "In 400 meters" could be said 120 m from the turn. A line whose mark was
            passed by more than 100 m, or by more than half its distance, is now skipped.
        - **Tests:** `speech.test.ts` (3), `directions.test.ts` (3 new). 343 unit tests pass.
        - **Checked** in a phone-sized browser against the emulators with the real Mapbox key, the browser's
          speech replaced by a recorder (nothing played aloud), on a pretend trip from Yaba (70 km route):
          - the first line at the start ("Drive southeast. Then Turn left onto Murtula Muhammed Way.");
          - each turn's lines in order, none repeated, out-of-date ones skipped;
          - leaving the route, then the new route's first line;
          - mute: nothing said, the choice kept; unmute: one line;
          - arrival: said once;
          - with `directionsVoice` off: silent and no button, the written directions unchanged.
        - **Still to check on real phones (build 25):**
          - Android: the plugin speaks and lowers music.
      - **Two extras from the design PDF, done in code 24 October** (the owner: "yes add both extras to build 25"):
        - **The check-in time under the directions.** Both screens with the panel already show the arrival time
          just above it, so the panel adds what they lack:
          - when contacts are told: "Check in by 11:18 PM. Your contacts are told from 11:33 PM.";
          - in amber, when the rest of the route will not fit: "At this pace you will arrive after 8:58 PM. Add
            time, or your contacts are told from 9:13 PM." The estimate is Mapbox's time for the distance left,
            plus a third for traffic (`minutesToGo` in `src/lib/directions.ts`);
          - "You are past your … check-in" between the check-in time and the alert;
          - nothing once contacts are being told, which the trip card already shows.
          - "Add time" opens the any-amount sheet, which is now drawn above the full-screen trip map
            (`AddTimeSheet` in a portal; it used to open underneath).
          - The trip map's card measures its own height, so the map keeps the position clear of it.
        - **"Stop directions"** hides the directions while the trip, its location sharing and its alerts carry
          on. The panel then reads "Directions stopped. Your trip carries on." with "Show directions". It stays
          stopped if the app is reopened, and is forgotten when the trip ends. The voice stops with it.
        - **Checked** in a phone-sized browser against the emulators, on a 30-minute trip with a 67 km route:
          - the amber warning, then the normal line after adding 2 h 20 min from the trip map's sheet;
          - stopping: no more spoken lines, the trip still running;
          - still stopped after a reload, and back with "Show directions";
          - both kept values cleared after "I've arrived".
          - 344 unit tests pass (one new, for `minutesToGo`).
      - **Checked on the owner's Galaxy (24 October, a build with the live settings, installed by cable):**
        - **The new look:**
          - the pin-and-shield icon in the app drawer;
          - the opening screen, the logo on dark green (Android 12's own splash);
          - the colours, the titles at 28 and the phone's own font.
        - **Found and fixed:** on Android 15 the strip behind the status and navigation bars was still the old
          slate blue (#1e293b): `BARS_BACKGROUND` in `MainActivity.java` had been missed. Now #10231D, checked.
        - **Directions:** the owner turned on both live switches for the test (only this phone had build 25). Then:
          - the start form found routes in Mesa ("By road: about 6 min, 3.2 km");
          - the trip card showed the next turn and the check-in line;
          - the place name filled itself in.
        - **"No voice" was the media volume at 0.** The plugin did speak: the phone's audio log shows WakaGuard
          asking for navigation audio and Google's voice playing for about 4 seconds, silently. Volume buttons
          pressed with nothing playing change the ringer, not media. With the volume up, the owner heard it.
        - **Added for that, done in code and checked on the Galaxy:**
          - `SpeakPlugin.volume()` reads the media volume;
          - `mediaVolumeOff` in `src/lib/speech.ts`;
          - `useDirectionsVoice` looks every 10 seconds while the voice is on;
          - the panel says "Your media volume is off. Turn it up to hear the directions." It showed within 10
            seconds of the owner sliding media to 0, and went when it was turned up.
          - Android only: iPhones do not let an app read the volume.
        - **Both live switches were turned off again afterwards** (the fields removed, as before the test).
      - **Checked on the owner's iPhone 16 (25 October)**, development builds installed by cable, both switches on
        for the test and removed again afterwards:
        - **First build** (the web view's speech): the first line spoke, but nothing in silent mode, and mute then
          unmute said nothing.
        - **Fix: `ios/App/App/SpeakPlugin.swift`**, registered in `MainViewController`.
          - The iPhone's own voice (`AVSpeechSynthesizer`, en-NG else en-GB) as a spoken prompt: `.playback`,
            mode `.voicePrompt`, ducking other audio. So it is heard in silent mode, like Apple Maps, and avoids
            WebKit dropping a line started straight after another.
          - `src/lib/speech.ts` now uses the native voice on both phones when present; browsers keep the Web
            Speech API.
          - `volume()` reads the output volume. iOS only updates it while the app's sound is on, so between lines
            the sound is switched on briefly, mixed with other audio, to read it.
          - Log lines (no street names) go to the app's output for `devicectl ... --console`.
        - **Result:**
          - the voice at the start;
          - mute then unmute speaks;
          - heard with silent mode on and the volume low.
          - The volume warning did not show. The volume buttons changed the ringer, which never reaches 0; media
            volume (Control Center's slider) was not taken to 0, so this is not yet seen on an iPhone.
        - **Also:** the Trip tab's title is "Trip", matching its tab (the owner: "change title to Trip").
          - iPhone: the WebView speaks after the priming tap, and whether the silent switch mutes it.
          - Both: the voice stops when the screen goes off.

- [x] Build 25 (done in code 23 October; checked on the owner's Galaxy the same evening). Fewer trips to Settings for "Keep WakaGuard running" (a
      tester's problem report, 18 October: could the steps be permissions
      people simply accept?). Asked on the first trip, not when the account is
      made, so the reason is plain. Android: Android's own "Allow WakaGuard to
      always run in the background?" box (battery optimisation exemption,
      REQUEST_IGNORE_BATTERY_OPTIMIZATIONS) in place of Apps → WakaGuard →
      Battery → Unrestricted; Play allows it only where the app's main job
      needs it, so it is declared in Play Console with the reason (a trip
      watched for the traveller's safety). iPhone: check that build 24 asks for
      "Always" location with Apple's own prompt ("Change to Always Allow") and
      add it if not. Unchanged, as no app can set them: Tecno/Infinix/itel
      Phone Master auto-start, battery saver and Low Power Mode, not swiping
      the app away; the help keeps those. Also from that report: screenshots
      with problem reports. For now the owner can add an optional File upload
      question to the problem form (Google then asks everyone to sign in to
      open the form); an in-app "Report a problem" with a screenshot is the
      later option
      - **Android:** `KeepRunningPlugin.java` (registered in `MainActivity`; `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` in
        the manifest) asks Android's own question, falling back to the battery list on phones without it.
        `src/lib/keepRunningPermission.ts` calls it, answering null on an iPhone, the website and older builds.
        - **When it is asked:** once, after the first trip starts on any Android phone (`KeepRunningAsk.tsx`: why,
          then "Continue" or "Not now"), never before the trip, so the trip is not held up.
        - **Always reachable:** "Keep WakaGuard running" now shows "Allow WakaGuard to run in the background", or a
          tick once allowed. The steps stay for Phone Master and battery saver, as does the amber card for
          Infinix, Tecno and itel.
      - **iPhone: nothing to add.** The trip's location watcher passes a background message, so the
        background-geolocation plugin calls `requestAlwaysAuthorization` (and asks to upgrade from "While Using").
        iOS shows its own "Change to Always Allow" later.
      - **On the owner's Galaxy (SM-S156V, Android 16, 23 October):**
        - A release-signed test build was installed over build 24, after checking no trip was running.
        - The owner started a test trip: "Keep your trip running", then Android's question, then Allow.
        - Afterwards Android's list showed `user,com.wakaguard.app` (allowed by the person), and the trip had
          ended.
      - **Still to do:** declare the permission in Play Console with the reason before build 25 goes to the
        closed test.
- [x] Build 25 (found and fixed 23 October on the owner's Galaxy). Typing squeezed the app into a strip above a dark gap.
      - **Seen:** tapping "Where are you going?" brought up the keyboard, and the page shrank to a strip at the top with
        dark space down to the keyboard.
      - **Cause:** Capacitor 8.5's SystemBars plugin (`SystemBars.java`, "use native safe area insets on Android")
        now pads the whole window by the system bars and the keyboard. `MainActivity.keepWebViewClearOfSystemBars`
        already pads the page by both on Android 15 and later, so the keyboard's height was taken off twice. It
        came in with the move from 8.0.2 to 8.5.3 for the iOS 27 fix, and only affects Android; iPhone 24.1 is not
        touched.
      - **Fix:** `SystemBars.insetsHandling: 'disable'` in `capacitor.config.ts`, leaving it to `MainActivity` as in
        build 24.
      - **Checked:** the owner typed a destination on the Galaxy and the page stayed whole
- [x] Build 25 started 23 October: build numbers set to 25 (`src/lib/appVersion.ts`, `android/app/build.gradle`
      versionCode, the Xcode project). This also fixed `functions/test/appVersion.test.ts`. That test had failed
      since the 24.1 commit (`537ec16`) because the Xcode project said 24.1; I had not run the unit tests before
      that commit. Unit tests 321 of 321, rules checks 129 of 129
- [x] Build 25 (done in code 23 October; checked in a phone-sized browser against the emulators: the nine
      buttons sit in three rows of three). Quick choices for long road trips: 6 hr, 8 hr and 12 hr, after 15 min to 4 hr
      (the owner, 21 October). The idea came from the tester whose crash led to 24.1, who said WakaGuard is most
      useful for long journeys by road, for example NYSC members travelling to camp in another state, set up
      before the trip to keep the family informed.
      - **Today:** `ARRIVAL_PRESETS` in `src/lib/tripPlanning.ts` stops at 4 hr, so a 7-hour journey means "Other
        amount". 12 hr is already the longest trip allowed.
      - **Unchanged:** these trips text contacts at the start by default, as every trip of 2 hr or more already
        does.
      - **To check:** eight buttons still fit on a small phone (a second row, or the row scrolling sideways)
- [x] Build 25 (done in code 23 October, except `minWebViewVersion`; not yet on a phone). Phones with an old
      Android System WebView: tell the person, and count them (the owner, 21 October,
      from efaevalele's report of 19 October on an Itel A56: the switches in Settings change colour but do not
      slide).
      - **The cause:** Android phones run the app inside Android System WebView. Our styling (Tailwind 4) needs a
        recent one: cascade layers need Chrome 99, the switches' `translate` needs 104, and colours with
        transparency need 111. Older ones fall back to solid colours.
      - **What it explains:** the switches not sliding, and very likely the same tester's report of 13 October
        that buttons were illegible in dark mode.
      - **Why it matters here:** cheap Android Go phones often never update WebView, because people save data by
        not updating apps. Today we cannot see how many testers are affected: fault reports keep the Android
        version and the model, not the WebView version.
      - **The plan:**
        - Read the WebView's Chrome version from the user agent, and keep it with the phone's notification
          record and in fault reports, so the weekly numbers can count old ones.
        - Below 111, show a one-time notice with a button to Android System WebView and Chrome in the Play Store.
        - Make the switches move with `transform`, which works on every WebView.
        - Consider Capacitor's `android.minWebViewVersion` with an error page, for WebViews too old to lay the
          app out at all. Not done: wait to see how many testers have one.
      - **Done:**
        - `src/lib/webView.ts` reads the version and calls anything below 111 old (`functions/test/webView.test.ts`).
        - Fault reports now say "· WebView 120" after the phone.
        - The notification record keeps `webView`, allowed by `firestore.rules` and proven by two new rules checks
          (129 of 129 pass).
        - A card at the top of the Trip and Profile screens asks to update WebView and Chrome, with a button to
          each in the Play Store. Closing it hides it until the version changes.
        - `globals.css` makes `translate-x-1` and `translate-x-6` use `transform` where `translate` is not understood.
      - **Release order:** `firestore.rules` must be deployed before build 25 reaches anyone. The rules reject an
        unknown field, so a build 25 phone would fail to save its notification token.
      - **Now:** ask efaevalele to update Android System WebView and Chrome from the Play Store
- [x] Build 25 (done in code 23 October; not yet on a phone). The push notifications switch in Profile stays off
      (efaevalele, 19 October).
      - **The cause:** `subscribe()` in `src/hooks/usePushNotifications.ts` saves the notification token, then
        demands location permission and a fresh GPS position, and only then shows the switch as on. If location
        is refused, or slow indoors on a cheap phone, the switch stays off although notifications are set up.
      - **The fix:** show it on once the token is saved, and save the rough location afterwards as a separate,
        optional step (it only serves nearby report alerts).
      - **Also:** the "Blocked - enable in browser settings" line is browser wording inside the phone app;
        replace it with the phone's own settings
- [x] Build 25 (done in code 23 October; checked in a phone-sized browser against the emulators, not yet on a phone).
      A full-screen map for placing the destination pin (BrightEkpe, Redmi 11 Pro, 19 October: "The map
      is too tiny for maneuvers and point selection"). An "expand" button on the pin map opens it full screen
      with the same pin; Done brings it back to the start form, with the place name looked up as now.
      - **What changed from the plan:** the pin screen itself is now full screen, so no expand button is needed
        (one tap fewer). It is laid out like the trip map: a back arrow, a one-line hint, the map filling the
        screen, and "Use this spot" at the bottom (`DestinationPinSheet.tsx`, with a `fill` option on
        `LocationPicker.tsx`).
      - **Checked:**
        - The pin sits on the middle of the map.
        - "Use this spot" sets it, and the name filled in ("Yaba Flyover Bridge, Ojuelegba, ...").
        - The back arrow closes it and keeps the pin.
      - **Also fixed:** the pin in the middle of both pickers (this one and the road report form) was placed with
        Tailwind's translate classes, which old Android WebViews ignore, so on those phones the pin would sit
        away from the spot being chosen. It now uses `transform`
- [x] Build 25 (done in code 23 October). Say on the start form that ending early is fine (modesola, Infinix Hot 40i,
      21 October, asked for
      2 to 3 minute trips). No shorter choices: a 15-minute trip ended with "I've arrived" after 3 minutes alerts
      nobody. One short line under the time choices; the owner approves the wording. Added to the end of the
      arrival line: 'Arrived sooner? Tap "I've arrived" and no alert is sent.' ("no alert", not "nobody is texted":
      the arrival text still goes when it was chosen). Waiting for the owner's approval
- [ ] Build 25 (the owner, 24 October: "Yes do that"). The colours and text sizes of the outside design PDF
      ("WakaGuard complete design v2", 23 October, shared 24 October). Before the directions voice (piece 5).
      - **Colours:**
        - Light: warm paper background #F6F5F0, white cards, main text #142B25, secondary text #52635B.
        - Main green #176B4F, a quiet green #E5F2E8 for selected things.
        - Amber #8A4B0F on #FFF3D8 for warnings; red #B42318 only for SOS and failures.
        - Dark: #10231D background, #192D25 cards, #EFF5EF text, green #76D4AC.
        - The blue buttons and links become green.
      - **Text and touch:** the phone's own font; titles 28, body and boxes 16, secondary text 14; main buttons at
        least 52 high, other tap targets at least 48.
      - **How:** remap the colour scales in `src/app/globals.css`, so screens keep their classes and only the
        colours change. Store approval is not affected, but the store screenshots must be taken after this.
      - **Not included:** the PDF's new screens and features (polling units, services, business dashboard); those
        are the 31 October decision sheet or after launch.
      - **Done in code 24 October; checked in a phone-sized browser against the emulators, light and dark:**
        - **Colours:** `globals.css` sets four scales in plain hex (green, grey, amber, red). Tailwind's other
          families point at them: gray to the greys; blue, sky, indigo, purple, green and emerald to the green;
          yellow and orange to amber; rose to red. The undefined `dark-bg`, `dark-card` and `dark-border` now
          have colours too.
        - **Fixed colour codes:** the trip map, the page shown when the app fails, the browser bar and manifest,
          the phone's status bar and loading colour, and the Android notification colour.
        - **Map:** groups of reports on the Nearby map are green at every size; they were blue, orange and red.
          The blue "you are here" dot stays blue.
        - **Font:** the phone's own, so Inter is no longer downloaded.
        - **Sizes:** the screen titles in the top bar are 28. Undersized tap targets on the start form, the trip
          card, the location line and the Nearby map were raised to 48: time choices, add-time choices, "Other
          amount", "Add another person", the two tick-box rows, "Set it on the map", "Add plate number", "Check
          my location", "Search and filters", "List", "Legend", the hint's close button and the map zoom
          buttons. Small links inside a row ("Manage", "Change", "Remove", the trip card's "Add", the state chip)
          get a larger invisible tap area, so the row keeps its height.
        - **Left for build 26:** the 216 landmark icons on the Nearby map (28 wide); the darker box borders the
          PDF asks for (#7A8C81); the remaining coloured icons (Profile's amber "Upvotes", the red emergency
          numbers icon).
        - **Phone-only parts** (status bar, loading colour, notification colour) show only in a new build.
- [ ] Build 25, before launch (the owner, 24 October: "let us also add matching logos before launch"). A new logo
      and app icon in the same green, replacing the blue W.
      - **First step:** drafts for the owner to pick from. Three were drawn on 24 October (shield and tick; pin with
        a shield; the W as a road). **The owner picked B, the pin with a shield ("go with B", 24 October):** a
        white map pin carrying a green shield on the green #176B4F.
      - **Then the picked one everywhere:**
        - the iPhone and Android app icons (Android's adaptive icon and the white notification icon);
        - the opening screen;
        - the website's logo, its tab icon and the icons saved to a home screen;
        - the picture shown when a trip link is shared;
        - the Play Store icon (512) and feature graphic (1024 × 500).
      - Into build 25 if picked by Friday 30 October, otherwise build 26.
      - **Done in code 24 October (build 25).** Every file was made from one drawing by a script in the session
        folder (`tools/make-logo-assets.py`; Chrome draws the SVG, Pillow shrinks it):
        - **iPhone:** the 1024 icon, square and without transparency (iOS rounds it); the six opening-screen
          pictures (2732 square), the icon on the dark green #10231D.
        - **Android:**
          - launcher icons for every density: square-ish, round and the adaptive foreground, with the pin kept
            inside the middle Android shows. The adaptive icon's background colour is #176B4F.
          - the white notification icon (`ic_stat_wakaguard.xml`), now the pin with the shield cut out;
          - the ten opening-screen pictures;
          - the dark green behind the icon on Android 12 and later's own opening screen
            (`windowSplashScreenBackground`).
          - The resources compile (`processDebugResources`).
        - **Website:** every size in `public/icons` (the 180 Apple icon and the 512 "maskable" icon square, the
          rest rounded), `public/icon.svg`, `favicon.ico`. The pages that show the logo (front page, welcome,
          contacts' page, About, delete-account) use those files, so they changed with them.
        - **Link preview:** new `public/og-image.png` (1200 × 630: the logo, "WakaGuard", "If you don't arrive,
          the people you chose are told."), named in `layout.tsx` with `metadataBase` from `APP_URL`, so a trip
          link shared in WhatsApp or a text shows the card.
        - **Play Store** (not in the repo): `play-store/listing-2026-10-24/icon-512.png` and
          `feature-graphic-1024x500.png` in the session folder, for the owner to upload to the store listing.
        - **Master drawings:** `documents/logo/` in the session folder (rounded, square, circle, foreground SVGs
          and a 1024 PNG).
        - **Checked** in a phone-sized browser: the front page, the welcome screen and the contacts' page show
          the new logo; the page carries `og:image`. The phone icons and opening screens show only in the new
          builds.

## Server, website and store work before launch

From the roadmap, with its dates. None of these needs an app build.

- [ ] By Sun 18 Oct. Proof runs: a long Android trip on mobile data, and a
      long iPhone trip. (A fresh sign-up is proven: every tester who started
      one finished it)
- [x] By Fri 23 Oct (done 18 October). The old server functions moved; they cannot be updated
      after Fri 30 Oct. Only `createReport` is left on Node 20; the app never
      calls it and the live log shows no calls. The owner said on 18 October to
      delete it (a live deletion, done on the owner's word at release)
- [x] By Fri 23 Oct (live 18 October). Alarms when alerts break (the minute-by-minute check
      stops, texts fail, the text wallet runs low, spending jumps), and a
      daily backup. Agreed with the owner on 18 October, by email to
      info@inskriba.com: Google Cloud Monitoring warns if `checkOverdueTrips`
      has not run for 10 minutes, and on any error from the server functions
      (a failed text among them); a new hourly check warns when Termii's
      wallet is under NGN 3,000 or more than 40 texts went in an hour; a
      billing budget of USD 20 a month warns at 50, 90 and 100 per cent.
      Firestore's own daily backup, kept 7 days, with the restore steps in
      the docs. Done in code on 18 October, not yet live: `watchTexts`
      (hourly; `serverWatch.ts`, the Termii balance read in `termii.ts`), a
      failed or partly failed text now logged as an error ("ALARM: texts not
      sent"), and `ops/setup-safety.mjs` for the email, the two Monitoring
      alarms, the budget (switching on Google's two billing APIs first) and the
      backup schedule; looked at live without changing anything: all five can
      be added. `docs/OPERATIONS.md` says what each alarm means and how to
      restore. Release order: the backup first, and a first backup made,
      before the daily deletion below can run
- [x] By Fri 23 Oct (live 18 October). How long records are kept, with automatic deletion.
      Agreed with the owner on 18 October: an ended trip in the account 90
      days after it ends; the contacts' trip page 7 days after the trip
      ends; SOS and checkpoint logs 90 days; the log of texts sent 90 days
      after sending; expired road reports (with photos, comments and votes)
      90 days after they expire; removed comments 30 days after removal;
      small working records a day or two; fault reports and the rough weather
      area unchanged (30 days); accounts until deleted. Firestore's own
      automatic deletion (a `deleteAfter` date on each record), with a one-off
      date on the records already kept. The Privacy page's Data Retention
      lines to be redrafted for the owner's approval. Done in code on 18
      October, not yet live, more simply than planned: no date is stamped on
      records; `deleteOldRecords` (03:00 Lagos time, `recordRetention.ts`)
      finds each kind by a date it already carries (a trip's `expiresAt`,
      `createdAt`, a counter's `startMs`), so records already kept are
      covered with nothing to stamp, and the rules are unchanged. Only
      records inside accounts; flagged reports and the January top-level
      trips are left. New indexes: `alerts`, `checkIns`, `safetyTimers` by
      `createdAt` across accounts, and `comments` by status and date. The
      numbers in `retentionPlan.ts` and `src/lib/dataRetention.ts`, held equal
      by a test. 4 new unit tests and 3 against the emulator (every kind, just
      past and just inside its time; a second run deletes nothing more; the
      text check's two alarms). Privacy page lines approved by the owner on
      18 October (the trip page 7 days; trip records, SOS and checkpoints,
      text logs and old reports 90 days; removed comments 30 days; photos go
      with their report; daily backups kept 7 days), quoted from
      `src/lib/dataRetention.ts`. Counted read-only on the live database the
      same night, the first run would delete only records from the old
      January–March version: 5 ended trips (of 118), 5 trip pages (of 120),
      5 old safety timers, 1 text log (of 85), 10 expired or resolved road
      reports (of 19, 7 January to 7 March) and 9 weather caches. Before it
      went live (the first backup had not been made yet), a safeguard on the
      owner's "deploy the nightly deletion": nothing is deleted unless
      Firestore has a backup from the last 3 days, read from Firestore's own
      list as the function's service account; otherwise it deletes nothing
      and raises "ALARM: no database backup". 1 more unit test and 1 against
      the emulator
- [ ] By Fri 30 Oct. Store listing drafts and a reviewer account; final by
      Fri 13 Nov. Wording check: never "emergency service"
- [ ] Before Mon 2 Nov. Texts from "WakaGuard" through Africa's Talking, with
      Termii ("OE Alert") as the backup (agreed 28 October). Africa's Talking
      registered the sender ID with all four networks on 28 October; its key
      is saved and its wallet topped up. Africa's Talking reports a refusal for
      a do-not-disturb number only later, in its delivery report, so the
      ordinary backup would miss it. Built 28 October, not live: `smsReport`
      takes those reports and sends a text reported Failed, Rejected or
      Expired again through Termii, once, within 30 minutes. It also stops
      texts to anyone who opts out with Africa's Talking. Log entries now
      carry `sids`, `reports` and `resends`. The Privacy page wording naming
      Africa's Talking, with its opt-out and delivery-report lines, was
      approved on 28 October. To go live, each on the owner's word:
      1. Deploy `smsReport` and put its address in the Africa's Talking
         dashboard.
      2. Send a test text.
      3. Switch providers and deploy the texting functions.
      4. Release the website.
- [ ] The owner's Numbers page (agreed 28 October: "yes build the numbers page"), at
      wakaguard.com/admin/numbers, for admin accounts only. Built 28 October, not live.
      - **Server:** `adminNumbers`, a callable function that checks the admin claim and returns
        counts only. It covers people from sign-in activity (active in the last 24 hours, 7
        days and 30 days; came back after day one; new accounts per week), each of the last 14
        days (people, real and test trips, overdue, SOS, road reports, texts), texts over 30
        days (with Africa's Talking's delivered and failed counts and Termii resends), phones by
        app build, and Firestore reads and writes against the free allowance, from Cloud
        Monitoring.
      - **Left out:** the owner's usernames in `NUMBERS_LEAVE_OUT` (functions/.env), and the 314
        anonymous RoutePulse sign-ins.
      - **Checks:** previewed against the emulators with made-up data, at computer and phone
        size; dry run against live data, read-only.
      - **To go live, on the owner's word:**
        1. Deploy `adminNumbers`.
        2. Give the owner's chosen account the admin claim.
        3. Release the website. The Privacy page changes wait for the switch to Africa's
           Talking, so the site is either built with the current live Privacy page or
           released together with the switch.
- [ ] Heat warnings by how hot it feels (the owner, 28 October: "especially with the El Niño
      heatwave"). Built 28 October, not live.
      - **What changes:** the morning notification and the app's weather line now also warn when
        the heat index ("feels like", from temperature and humidity, US National Weather Service
        formula) reaches 41°C, as well as at 38°C air temperature. In the humid south, 33°C at 70%
        humidity feels like about 43°C.
      - **The 6:30am message:** for example, "It will feel like 43°C where you are around 2 pm. Carry
        water, wait in the shade, and travel before 11 am or after 4 pm if you can." The title becomes
        "Dangerously hot today" from 46°C.
      - **The forecast store:** cached forecasts now keep humidity.
      - **Checked against MET Norway's forecast on 28 October** for Lagos, Uyo, Calabar, Abuja and
        Kano: no day in the coming week reaches 41°C feels-like (highest 39°C, Calabar), so it will not
        fire daily. It fires when a real heatwave comes.
      - **Privacy page:** no change needed; it already says "great heat".
      - **Live 28 October** (see "Website and server releases").
- [ ] Mon 2 Nov. Text alerts switched on, then proven on MTN, Airtel, Glo and
      9mobile, including a do-not-disturb number
- [ ] Week of Mon 2 Nov. Security check of the server, and Firebase's app
      check for the phone apps (App Check itself moved into build 26 on
      28 October; the settings check of 28 October is in "Website and server
      releases")
- [ ] By Fri 6 Nov. The go or no-go checklist for Fri 13 Nov
- [ ] **Play: public release ("production").** Sat 7 Nov, 16:20 Arizona, on the owner's "ok apply": the
      application for production access was sent (all three closed-test conditions were met: a closed release,
      12 or more testers opted in, for 14 days or more). The answers are kept with the store wording outside this
      repository. Google: "usually takes 7 days or less". Then, each on the owner's word: turn on managed
      publishing so nothing goes public before 1 December; a Production release of build 27 for Nigeria; check
      the store listing; update the Data safety answers for build 27 (place search, Google maps, the referral
      reward); send for review; publish on launch day. The same day the account's trader status was declared
      (non-trader; the account has only WakaGuard, in Nigeria only).
- [ ] **App Store: public release.** Sat 7 Nov evening, on the owner's "start filling the App Store page",
      saved as a draft, nothing sent: name "WakaGuard: Travel Safety" (as on Play), subtitle "Alerts if you
      don't arrive", categories Travel and Navigation; version 1.2.0 with the Play description (corrected: contacts
      are texted 15 minutes after the arrival time, not 5; "search for where you are going"; a battery line),
      promotional text, keywords, support and marketing links, copyright Inskriba Limited, build 27.1, manual
      release; the TestFlight review note plus one line on invites starting 1 December, and the same review
      contact; five iPhone screenshots (1179 x 2556) made on the local emulators with test data, phone numbers
      left out. Later the same evening, on the owner's "yes to 2–4, keep the points ranking": free; Nigeria
      only ("Available on App Release"); content rights "yes, with the necessary rights" (Google Maps); age
      rating answers (user content and social: yes, as road reports are shared with everyone in a state;
      contests: frequent, for the weekly points ranking; everything else none), calculated 13+ and set to
      18+ because the Terms and sign-up require 18 or older, which Apple says the rating must match. Sun 8 Nov,
      on the owner's "yes untick both and check app privacy": the app is no longer offered on Apple silicon Macs
      or Apple Vision Pro (saved, checked after a reload). App Privacy (published 14 October, 11 data types)
      checked against build 27: place search, Google maps, checkpoint stops and App Check fall under what is
      listed (precise and coarse location, device ID); the cash out in "Invite friends" is not covered: a bank
      name, account number and account name (Payment Info) or a phone number for airtime (Phone Number). The
      points and the trip days counted for invites are app activity (Product Interaction). The same day, on
      the owner's "yes add the three and publish": Phone Number, Payment Info and Product Interaction added, each
      for app functionality, linked to the person, not for tracking; published, 14 data types in all (checked
      after a reload). Play's Data safety needs the same three at the Play production step. The same morning
      the owner typed the reviewer account into App Review Information, and on the owner's "add for review"
      version 1.2.0 (build 27.1) was added for review and submitted at 9:32 am Arizona time: "Waiting for
      Review", release still manual, so nothing goes public until the owner presses "Release This Version"
      (planned for 1 December). Apple says up to 48 hours. Also 8 Nov, on the owner's word: a product page
      header (3840 x 1646, "If you don't arrive, they'll know." over two phones made from screenshots 2 and 4,
      kept with the store wording outside this repository) uploaded to the Asset Library, where Apple took it as
      a 21:9 product page header. Not sent for review. Apple's device preview only shows a header that is on a
      product page, and the 1.2.0 page is locked while it waits for review.
- [ ] Launch day. "Get WakaGuard" on the page contacts see, and store links
      on the website
- [x] Guidelines page (done in code 19 October): an example of reporting a checkpoint without accusing
      anyone. "Checkpoint at Mokola, 20 minute delay" is fine; naming or
      picturing an officer is not (a tester's suggestion, 13 October; the
      owner said yes that day). Live 19 October. A green box under "What to Report":
      describe the stop, not the people; do not name, describe or
      photograph officers or anyone else there, or accuse anyone; post only
      when safe, as a passenger or once stopped. Last Updated 19 October
- [ ] For the lawyer, with the Terms review: personal data kept on servers
      outside Nigeria; what exactly gets an account's texting switched off;
      whether to rule out reporting security operations while they are
      happening (all three raised by a tester's review on 13 October)
- [x] Server only (live 19 October; the owner: "count positions"). Each
      running trip counts the positions it receives: `positionCount`, the
      first and last (`firstPositionAtMs`, `lastPositionAtMs`) and the longest
      silence between two (`longestPositionGapMs`), on the private trip, in
      `onTripUpdated` beside `farthestFromStartM`. Repeated and late events are
      not counted twice. Why: blessingdera's real 60-minute keke trip on 19
      October stayed within 7 m of its start and alerted a contact, and
      nothing showed whether the phone had kept reporting from one spot or had
      gone quiet. The same day, every trip of 19 October was checked: 7 of 9
      real trips moved (up to 5.2 km); blessingdera's morning trip and
      Dazzling_Ivory's 10-minute walk did not. 1 unit test, 1 against the
      emulator. Release: `onTripUpdated` by name. The weekly ranking tool
      uses them too (the owner, 19 October): a real trip that did not move
      is listed in the cheating check with its positions and longest
      silence, "stayed put" or "the phone went quiet for N min" (over 10
      minutes; a still iPhone can report rarely, so a question, not a
      verdict), and the health table counts them. Scoring is unchanged
- [x] The unused "offline drafts" code uploads a photo as the camera made
      it, location details included. Nothing in the app uses it; remove it,
      or make it redraw photos like the report form does, before anything
      ever does. Removed 23 October on the owner's word ("remove the unused
      photo upload code"): `src/hooks/useOfflineDrafts.ts` deleted (nothing
      imported it, so no phone ever saved a draft). The Privacy page no
      longer mentions "unsent report drafts" on the device, and its date
      becomes 23 October. The app part goes out with build 25; the Privacy
      line with the next website release
- [ ] **Preliminary polling unit page, agreed 1 November** (the owner: "yes start the data check and I mean
      preliminary version"). A small website page, no app build, so it stays out of build 26's freeze. The
      election is close: presidential and National Assembly on Sat 16 January 2027, governorship and state
      assembly on Sat 6 February 2027. The tester poll: 19 of 20 wanted both finding their unit and safety alerts,
      but only 20 of 83 voted.
  - **Data check, 1 November:**
    - INEC's own lookup (`cvr.inecnigeria.org/pu`): state, local government, ward, then the unit, one at a
      time. No API or download is offered, and it refused a plain automated read (403), which we leave alone.
    - CredibleVoteNG (free, reported to cover all 176,846 units): no website, API address or public code could be
      found, so its fields and licence are unknown. Its builders would have to be asked.
    - `kcemenike/find-my-polling-unit` on GitHub: all 176,846 units with GPS positions, but copied from INEC's portal
      by a script, with no licence. Not to be used without the lawyer and INEC's position.
    - `ngpu` on PyPI: names only, with an empty licence file.
  - **So the preliminary version holds no polling unit data of ours:** it explains the steps, links to INEC's own
    lookup, then helps the person start a WakaGuard trip there by setting the pin. It says we are not connected to
    INEC or any party, and to confirm with INEC. No election-day alerts.
  - **Timing:** build after the 13 November freeze, testers by about 20 November, usage read before the 30 November
    decision. If people use it, an app version goes in the first update after 14 December. The lawyer sees the
    wording before it goes live.

Not builds, and tracked in the roadmap document: the D-U-N-S number and store
accounts in the company's name, the company's purposes at CAC, the data
regulator and advert approval, the bank account and sponsor agreement.

## After launch

Agreed as wanted, not yet given a build unless it says so. Nothing here is started.

### Build 28, the first after launch (the owner, 6 November: "yes do the offline message and add them")

In this order, from my suggestions after build 27 was complete (no new features before the 13 November freeze):

1. [ ] **"Navigate with Google Maps"**: a button on the trip that opens Google Maps (the app, or the website)
       with the destination already set. Cheap, allowed by Google's terms (handing off to Google Maps is not
       building navigation on its content), and people want directions. Our own directions stay as they are.
2. [ ] **Battery level on the contacts' page** (and in the alert text, the item "Battery level in the alert"
       below): a dead battery is the commonest reason a phone goes quiet, and "battery 4%" helps a contact judge
       whether to worry. Sent with each location update; a Privacy line is needed.
3. [ ] **"Ask them to start a trip"**: someone (a parent, say) sends a link, and the person who opens it starts a
       trip with the sender already added as a contact. The "request a trip" link from the deferred list of
       5 October; it brings new users through the people who care about them. Needs its own Privacy and Terms
       lines and thought about misuse (nobody can be made to share a trip; the traveller always starts it).

After those: checking in by text message when there is no data (USSD or SMS).

**First after launch: WakaGuard Pioneers** (the owner, 29 October: "that will be one of the first todos after
launch… this will be especially good when we start adding places"). A founding group for the beta testers who
travelled with WakaGuard, sent feedback that changed it and kept the tester group going. The one-page plan is a
private claude.ai artifact (https://claude.ai/artifact/3H9iHvPoWyKNY77H7GMMvR); names and the candidate list are
kept out of this public file.

- [ ] Choose the first intake (10 to 12) before 1 December; invitations and a one-paragraph volunteer note
      (voluntary, no payment or shares promised, Inskriba may use ideas and work, names only with consent)
- [ ] Turn the beta group into a WhatsApp Community: announcements, city groups, a private Pioneers group
- [ ] "Pioneer" badge on the profile (a small app change; the claim lives on the user document, set by the
      server only, never by the app)
- [ ] "Built with" page on wakaguard.com, for Pioneers who agree, with a Privacy page line
- [ ] Roles as people want them: community lead, city captains, road report leads, language champions
- [ ] Places: Pioneers suggest and check landmarks, bus parks and junctions in their cities before they go
      public (ties in with the directory of places below)

From the first week of testing (agreed 12 October):

- [ ] One-tap road reports: "Checkpoint", "Accident", "Bad road", "Flooding"
      as buttons that report where the traveller is
- [ ] Battery level in the alert, so contacts know when a phone was about to
      go off
- [ ] Check-ins on long trips: "Still okay?" every couple of hours
- [ ] Nigerian languages for the alert texts and the main screens: Pidgin,
      Yoruba, Hausa, Igbo
- [ ] Spoken warnings for road reports on your route (a regular tester who
      rides, 29 October: "I don't usually use my phone while riding. So the
      audio will be very helpful"). While directions run, warn once when a
      route is planned that reports lie along it, and again by voice when
      close to one (pothole, roadworks, holdup). Needs voice directions,
      still waiting on Mapbox's terms
- [ ] Voice directions in Yoruba, Hausa and Igbo (the same tester, 29
      October: people without formal education "can understand their
      language to also use the app and get directions"). Needs a speech
      service that speaks them well; do it alongside the alert texts in
      Nigerian languages above
- [ ] Notice movement and ask "Are you on a trip?" (a regular tester, 28
      October, like Sweatcoin). Needs the physical activity permission on
      Android and motion on iPhone, a Privacy page line and store-form changes,
      and costs battery, so not before launch; build 26's usual-time reminder
      covers the same problem without a new permission

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

Reasons to come back (the owner's idea on 13 October, from a post about
hiding prizes around Lagos for people to find; agreed that day). The hunting
itself is left out: nothing is collected while a person is moving.

- [ ] The weekly ranking with sponsor prizes, by state: points for a road
      report that others confirm and for being first to confirm someone
      else's, never for the number of reports alone. A sponsor can fund one
      bigger prize for a week ("top reporter in Lagos"). Run by hand, as in
      the beta, until it is built into the app (see "From the roadmap")
- [ ] Sponsored safe stops: a partner filling station, motor park or
      restaurant is marked on the map, and ending a trip there earns a
      reward. Goes with the sponsor card of build 24 and the adverts by
      location above
- [ ] Before any prize is announced: the lawyer to say what approval a
      promotion with prizes needs in Nigeria

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
- [x] Before either: choose a map provider that also offers routing and
      navigation, so the maps do not have to be changed twice. Mapbox,
      chosen by the owner on 14 October
- [ ] At launch, a lighter form (the owner, 14 October): see builds 24 and
      25 above. Step 2 proper, with the native kit, January to April 2027

From the roadmap:

- [ ] "Who invited you?" and invite links (mid-December)
- [ ] The weekly ranking inside the app (January)
- [ ] Address lookup when choosing a destination
- [ ] Family circle, and a "request a trip" link
- [ ] USSD, for people without smartphones

## Released builds

### Build 26, Tuesday 3 November 2026 (Android and iPhone)

Made from branch `build-26` (`131b988`, from `44746cf`, so none of build 27's work), a day before it was due, so
testers use the simpler screens for a week before the freeze. Details of what went in: "Build 26" above.
- **Tested first** on the owner's Galaxy (the release build installed by cable) and iPhone, on the owner's word.
- **Android:** `WakaGuard-1.2.0-26.aab`, version code 26, published to Closed testing - Alpha the same evening.
- **iPhone:** 1.2.0 (26), uploaded on the owner's "ok upload the iphone" once the owner accepted Apple's updated
  agreement, then sent to both TestFlight groups on "yes, submit Apple". Beta review passed at once.
- **Website:** released from the same commit (see below). Testers told in the group at 21:30 with both store links
  and the issues form. On 5 November a tester could not see 26 on Play yet; the group was told how to refresh.
- **Found while testing, moved to build 27:** what is under "More options", and a route of 2,358 km offered for a
  15-minute trip.

### Build 25, Sunday 25 October 2026 (Android and iPhone)

Made from `13dfd40` on the owner's word ("build 25"), nine days before it was due, so testers have it for week 3
(real everyday trips). Live settings with the **business** Mapbox token (account `wakaguard`); checked in the built
files: business token present, personal token absent, live project, no test project.
- **iPhone:** `WakaGuard-1.2.0-25.xcarchive`, 1.2.0 (25), uploaded to App Store Connect on the owner's "upload
  both" (the first try, before that word, was blocked by the safety check). On the owner's "prepare the apple
  one", in the owner's Chrome: "What to Test" saved (the store notes without the Android-only line) and the
  external group waka added, up to the last box; the owner pressed "Submit for Review". **Approved the same day:**
  "Testing" in both groups (10 invites).
- **Android:** `WakaGuard-1.2.0-25.aab`, version code 25, signed with the upload key (FC:87:11:4B:42…, as build
  24). Added in the owner's Chrome to Closed testing - Alpha with the release notes below (build 24 left out; no
  devices lost, 12,259 phones; the same two warnings as build 24, no crash-decoding files), saved to Publishing
  overview. The owner pressed "Submit 1 change for review" the same afternoon. **Approved the same day.**
- **Release notes** (both stores, 478 characters; `wording/build-25-release-notes.txt` in the session folder):
  new look and logo, usual trips, directions (Beta), the background question on Android, the full-screen pin
  map, 6/8/12 hour choices, two fixes, and a request to use it for real everyday trips ending with "I've arrived".
- **Directions:** on for testers (the owner, "directions on"); the voice stays off until Mapbox answers in writing.
- **Not in it:** nothing held back. The website was released from the same code the same afternoon (see below).

### Build 24.1, Tuesday 20 October 2026 (iPhone only)

The fix for build 24 closing as soon as it opened on iOS 27 ("Build 24.1" above), and nothing else. It also
carries the newer Privacy and Guidelines text already live on the website.
- **Built from:** the working copy at `e8a1775` plus the fix, with the live settings and the same Mapbox token as
  build 24 (the personal one).
- **Archive:** `WakaGuard-1.2.0-24.1.xcarchive`, 1.2.0 (24.1), in the session folder's `builds/`.
- **Upload:** to App Store Connect on the owner's "upload 24.1" (23:36 Arizona).
- **Beta review:** the "What to Test" note was added and the outside waka group selected in the owner's Chrome;
  the owner pressed Submit for Review. Apple's beta review passed at once, and both groups show "Testing" with
  10 invites.
- **Confirmed:** the tester whose iPhone crashed on build 24 updated to 24.1 and it opened with no crash
  (reported by the owner on 21 Oct).
- **Android:** stays on build 24, which never had this problem. It gets Capacitor 8.5.3 with build 25.
- **Store forms:** no change.

### Build 24, Sunday 18 October 2026 (Android and iPhone)

Made from `7bcc7c9` (the app's code as at `1e12be0`) with the live settings and the Mapbox token, ten days
before it was due, on the owner's word ("build 24 for the stores") after the owner tried everything on both
phones except receiving the arrival text, which their Nigerian line could not get in Arizona; the server log
shows that text sent and accepted by Termii for the number ending 3147. iPhone `WakaGuard-1.2.0-24.xcarchive`,
1.2.0 (24), with Sign in with Apple and Time Sensitive, uploaded to App Store Connect on the owner's "yes, upload
to TestFlight" (about 21:07 Arizona); the owner adds it to the outside testers and sends it for beta review.
Android `WakaGuard-1.2.0-24.aab`, version code 24, signed with the upload key (FC:87:11:4B:42…), for the owner to
upload to the closed test in Play Console. Both in the session folder's `builds/`. No change to the stores'
privacy forms. Not in it: the sponsor card and the corrected emergency numbers.
Then, on the owner's "just login and upload both", in the owner's own Chrome (already signed in; the owner
typed the Apple password): the bundle added to Closed testing - Alpha with the release notes (build 23 left
out; no devices lost, 12,159 phones; two warnings only, no crash-decoding files), saved, and sent for review at
9:14 pm Arizona; in TestFlight the "What to Test" notes and the external group waka added, and the owner
submitted it. A few minutes later build 24 showed "Testing" for both groups (5 invites): Apple's beta review
passed at once. App Store Connect also shows that the updated Apple Developer Program License Agreement waits
for the Account Holder; it did not stop TestFlight, but must be accepted before an App Store release. Checked
the same hour: no server errors or warnings since the release, both texts sent, Termii wallet NGN 9,090

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
| Sat 7 Nov (evening in Arizona) | **Invites start on 1 December**, on the owner's word ("deploy referrals and release the website"), from `d467a4a`: `referrals` by name ("Successful update"; no `REFERRALS_ACCOUNTS_FROM_MS` setting, so the new 1 December start applies), then the website (Hosting only). Checked live: the Terms say "Only accounts created from 1 December 2026 can be invited" and are dated 7 November 2026, and the website's "too early" message says 1 December. Testers were told the same day in the WhatsApp group |
| Fri 6 Nov (afternoon in Arizona) | **The website at build 27**, on the owner's word ("go", after signing the Firebase tool back in), from `ac38076`: Hosting only, 207 files, with the live settings (the web config, `NEXT_PUBLIC_APP_URL`, the Mapbox token for directions only, the Google map key). Every map on wakaguard.com is now Google's (the owner had seen Mapbox and OpenStreetMap still there), with the place search, the start form kept across tabs, "Looking for places…" and the most used states first. Checked after: the live home page is the same file as the build, and its code has Google's map loader and the new wording. A browser that had the old site may need one more reload before its saved copy is replaced |
| Fri 6 Nov (late morning in Arizona) | **`placeName` on Google**, on the owner's word ("approved, go"), by name: names a pin and finds the state with Google's reverse geocoding (Geocoding API, turned on and capped at 1,000 a day that morning) instead of OpenStreetMap's Nominatim. Phones on build 26 keep working: they read only the name, which now comes from Google, still with their old "© OpenStreetMap contributors" line under it until they update. The CLI again could not clean up the build images; the 1-day clean-up rule covers them |
| Fri 6 Nov (morning in Arizona) | **Build 27's functions**, on the owner's word ("deploy the build 27 functions"), from `e887365`, each by name. New: `placeSearch` (with the `PLACES_API_KEY` secret; Google granted the server's account access to it), `referrals`, `myWeek`, `onCheckpointStop`, `planUsualTimes`, `usualTimeReminders`. Updated: `tripAction`, `onTripUpdated`, `onTrustedContactWrite`, `deleteMyAccount`, `deleteOldRecords` (now also clears destination spots 30 days after a trip's link expired). Not redeployed: the text-sending functions, whose only change was the same account check moved into `confirmedAccount.ts`. All finished; `usualTimeReminders` ran at 17:00 UTC with status ok and no errors were logged. The CLI could not clean up the build images ("a small monthly bill if not corrected"). Phones on build 26 see no change: the reminder goes only to build 27 and later, and the search, points card and invite screen are in build 27 |
| Thu 5 Nov (evening in Arizona) | **Build 27's trip rules**, on the owner's word ("deploy the trip rules, then commit and push"): the Firestore rules only, no functions, "released rules firestore.rules". Deployed before build 27's commits (`79196a6` to `b49c330`) were pushed, since this repository is public. The app may now write only the trip details it needs, with the server's clock; trip pages accept checkpoint stops from the server only; the "Reminder at my usual times" switch is allowed on a person's own profile. Checked beforehand against what builds 22 to 27 write, so no phone needs updating. Not deployed: build 27's functions (item 13) |
| Wed 4 Nov (afternoon in Arizona) | **Security fixes**, on the owner's word ("deploy the security fixes, then commit and push"), deployed before `95c1fa5` was pushed, since this repository is public: the Firestore rules, then `checkOverdueTrips`, `checkQuietTrips`, `onSOSAlert`, `tripLocation`, `tripAction`, `stopTexts`, `onReportCreate`, `cleanupExpiredTrips` and `deleteMyAccount`, each by name, all "Successful update". What changed is in build 27's section ("Security fixes, server and rules"). The next runs of the overdue and quiet-trip checks were read in the logs and were fine. Not deployed: `onTripUpdated` and the other referral functions, which wait for build 27 |
| Tue 3 Nov (late evening in Arizona) | **Morning weather fixes**, on the owner's word ("commit, push and deploy morningWeather"), from `acf4b95`: `morningWeather` by name. Each person's day is claimed before sending, so two runs at once send once, and a dead notification link is noted and skipped. Earlier the same day `heatSeasonNotice` was deleted from the live project ("yes delete the heat notice") |
| Tue 3 Nov (evening in Arizona) | **Website from build 26**, on the owner's word ("deploy the website from build 26"), from `131b988` on branch `build-26`: the simpler screens, Privacy "Last Updated: November 4, 2026". Checked live on wakaguard.com |
| Sun 1 Nov (evening in Arizona) | **Wild positions and the Cancel trip backup route**, on the owner's word ("commit and push, then deploy both"), from `27bc66c`: `tripLocation` and `tripAction` deployed by name. `tripLocation` now leaves wild positions off the contacts' map, the path and the farthest distance, for phones on any build. `tripAction` takes `cancel`, ready for build 26's Cancel trip button; nothing sends it yet. The website and the apps do not have the rest of `27bc66c` yet. Checked live with made-up ids, so no trip was touched: a cancel request is refused at the trip check (403), an unknown action as a bad request (400), and `tripLocation` answers 403, 400 and 405 as before. No server errors in the last 60 log lines of either function |
| Wed 28 Oct (just before midnight in Arizona) | **Website caching**, on the owner's word ("make the change and release the website"), from `45dc7f7`: pages are now `no-cache` (browsers check for a newer one each time, and reuse their copy when nothing changed), the build's code files under `/_next/static/` are kept a year (`immutable`), and `sw.js` stays never-stored. Before, Firebase Hosting let browsers keep a page an hour, so the owner did not see the Numbers page's new section after its release. Checked on the hosting emulator first, then live: each of the three answers as meant, Privacy still dated October 24, 2026, home 200 |
| Wed 28 Oct (near midnight in Arizona) | **Numbers page: travel and reports**, on the owner's word ("release the numbers"), from `bc3d894`. (1) `adminNumbers` and `onTripUpdated` deployed by name; `onTripUpdated` now keeps each trip's distance (`distanceM`) along its path when it ends, before dropping the path, leaving out fixes faster than about 200 km/h. (2) The website, with the Privacy page held at its 24 October version again. Checked live: the new section's code is served and Privacy still has no "Africa"; the function's sums, run once read-only against live data, gave 187 real trips since the beta began, at least 940 km and 137 hours, about 2 hours a week per traveller over the last 14 days, a typical trip of 30 minutes, 130 of 140 recent trips ended before contacts were alerted, 11 road reports, 20 checkpoint stops and 32 people with a contact. Distance is measured from trips ended after this release; older trips count as at least their straight line or farthest point |
| Wed 28 Oct (late night in Arizona) | **One-off heat-season notice scheduled**, on the owner's word ("schedule it"), from `cb73825`: `heatSeasonNotice` created, with Cloud Scheduler job `firebase-schedule-heatSeasonNotice-us-central1` at `0 9 2 11 *` Africa/Lagos, ENABLED. It sends "Heat season is here" once on **Mon 2 Nov, 9 am Nigeria time**, to morning-weather users. A dry run against live data counted 21 phones (2 left out for builds before 24). **Delete the function after 2 November** (`firebase functions:delete heatSeasonNotice`, on the owner's word); until then it does nothing on any other date |
| Wed 28 Oct (night in Arizona) | **Heat warnings by how hot it feels**, on the owner's word ("deploy heat warnings"), from `b4fa76c`: `weatherAhead` and `morningWeather` deployed by name. Both reported "Successful update operation"; a Firebase CLI sign-in warning in the same log did not stop it. First live morning run: 6:30 am Nigeria time on Thu 29 Oct. Later that night, on the owner's word, `morningWeather` was redeployed from `f77dfbe` so the advice says "before 11 am or after 4 pm", matching NEMA. Background the owner raised: NiMet confirmed a strong El Niño in August 2026 and warned of heat on 23 October; NEMA advised on 26 October to limit outdoor activity between 11 am and 4 pm |
| Wed 28 Oct (late evening in Arizona) | **Website**, on the owner's word ("release the website"), from `4afef2c`: the Numbers page now explains instead of sending people away (signed out: "Sign in to see the numbers" with the sign-in window; another account: says which, with Sign out). The Privacy page was held at its 24 October version again. Checked live: the page matches the build, Privacy has no "Africa", home 200 |
| Wed 28 Oct (evening in Arizona) | **The Numbers page**, on the owner's word ("deploy numbers"), from `0693679`. (1) `adminNumbers` deployed on its own. (2) The website released with the live settings and business Mapbox key, with the **Privacy page held at its live version** (from `6d7529c`, dated October 24, 2026), so the approved Africa's Talking wording waits for the switch. The repo keeps that wording. Hosting's predeploy (`build-sw.mjs`) needs `.env.local`, so remove it only after the hosting deploy. Checked live: `/admin/numbers` serves the built page byte for byte; Privacy has no "Africa"; home 200; the function answers PERMISSION_DENIED to a caller who is not signed in. (3) **Admin rights:** the session's safety check refused my granting the claim, so the owner ran the script (`tools/make-admin.mjs`, session folder) and gave the account hii (info@inskriba.com) the admin claim the same evening |
| Wed 28 Oct (later) | **Firebase settings**, on the owner's word ("yes do the four"), after a read-only check of the project. The check found backups, TTL deletion, indexes, Node 22, both alarms, the USD 20 budget and email enumeration protection all in place, and the live Firestore and Storage rules identical to the repo. The four changes: (1) database delete protection on; (2) point-in-time recovery on (7 days, minute by minute); (3) the old preview domain `routepulse-5701f--map-fix-xlby2axy.web.app` removed from Auth's authorized domains, leaving localhost, the two Firebase domains and wakaguard.com; (4) the console labels "RoutePulse Web" renamed "WakaGuard Web", and the unnamed iOS app named "WakaGuard iPhone". All checked afterwards. The old-build-image cleanup (1 day) was already on. Usage numbers come from `tools/firebase-numbers.mjs` (session folder, read-only, counts only) |
| Wed 28 Oct | **`smsReport` deployed** on its own, on the owner's word ("deploy smsReport"), from the working copy, committed afterwards as `63c2a27`. It is the address for Africa's Talking's delivery reports and opt-outs (`https://us-central1-routepulse-5701f.cloudfunctions.net/smsReport/<SMS_REPORT_KEY>`, the key only in `functions/.env`). Nothing else changed: texts still go through Termii and `SMS_FALLBACK_PROVIDER` is unset, so nothing can be sent again yet. Checked live: GET 405, a wrong or missing key 403, the right key with a made-up report "not_ours", a malformed one 400. The Firebase CLI sign-in had expired again and was renewed the same way |
| Sun 25 Oct, afternoon in Arizona (later) | **Website**, on the owner's word ("release the website"), from `59a3a0e` (build 25's app code, `13dfd40`), built with the live settings and the **business** Mapbox key: the website's copy of the app gains usual trips and the iPhone voice code (unused on the web). Hosting only. The Firebase CLI sign-in had expired: renewed with `npx firebase login --reauth --no-localhost` (copy and paste the code). Checked live: home and Privacy answer 200, Privacy still dated October 24, 2026, and the live file holding "Your usual trips" is served |
| Sun 25 Oct, afternoon in Arizona | **Directions switched on** for testers, on the owner's word ("directions on"), with build 25 uploaded to both stores: `config/app` `directions: true` (was absent). `directionsVoice` stays absent (off) until Mapbox answers in writing. Phones on builds 24 and 24.1 have no directions and are unaffected; the website's copy of the app (`c6800cb`) shows them from now on. The database sign-in on this Mac had expired: renewed with `gcloud auth application-default login --no-launch-browser` (copy and paste the code), because the usual sign-in kept failing on its localhost page |
| Sat 24 Oct, night in Arizona (later) | **Server piece and website**, on the owner's word ("release the server piece and the website"). First `onTripUpdated` only, from `4f4aabd` (the only server change since its last release on 19 October: `recordRoute` and `tripRoute.ts`, copying a trip's planned route to the contacts' page and deleting it when the trip ends); "Successful update". Then the website from `c6800cb`, built with the live settings and the **business** Mapbox key (account `wakaguard`): build 25's look and logo, the contacts' page's planned-route row, the link-preview picture, and the Privacy page with the four approved directions lines, dated 24 October. Directions stay hidden on the website while `config/app` `directions` is off. Checked live: the Privacy page's date and lines, `/og-image.png`, the new icons (green) and the contacts' page naming the preview picture |
| Sat 24 Oct, night in Arizona | **Database rules only**, on the owner's word ("release the database rules"), from `4f4aabd` (unchanged since). Released ahead of build 25, as planned: `sharedTrips` may carry the planned `route` (written by the server only); `pushSubscriptions` may carry `webView`. Both are new optional fields, so phones on builds 24 and 24.1 are unaffected. Checked before release: 134 of 134 rule checks pass. **Not yet released:** `onTripUpdated` with `recordRoute` (the route on the contacts' page), a separate deploy on the owner's word; until then build 25 saves the route on the trip and the contacts' page simply shows none. Earlier the same evening, for the Galaxy test only: `config/app` `directions` and `directionsVoice` switched on, then removed again after the test |
| Fri 23 Oct | Website only, on the owner's word ("commit, push and deploy the website"), from `afc70e2`: the Privacy page no longer mentions unsent report drafts kept on the device, and is dated 23 October. Checked live the same minute |
| Mon 19 Oct | Website, on the owner's word, from `0d860e9`: map pictures now come from **Mapbox's business account** (`wakaguard`, made by the owner on Mapbox's invite), with its own public token, in place of the owner's personal account. Checked: the token is refused nowhere (the website, the iPhone and Android apps' addresses all get map pictures), the live site's code carries the business account, and the Nearby map draws. Phones on builds 23 and 24 keep the personal account's token until build 25, so it stays active there until then |
| Mon 19 Oct, evening in Nigeria | Server: `onTripUpdated` only, on the owner's word, from `fa23071`: each running trip counts the positions it receives, with the first, the last and the longest silence between two. Checked live minutes later: the two trips then running (BrightEkpe, adex) each had their first position counted |
| Mon 19 Oct | Website, on the owner's word, from `ed1d043`: the Guidelines page shows how to report a checkpoint without accusing anyone ("Checkpoint at Mokola, 20 minute delay"; no naming, describing or photographing officers; post only when safe), Last Updated 19 October. Checked live on wakaguard.com |
| Sun 18 Oct, late night in Arizona (Mon 19 Oct, 07:09 in Nigeria) | **The nightly deletion**, on the owner's word ("deploy the nightly deletion"), from `2e4c147`: `deleteOldRecords`, with the safeguard that it deletes nothing without a backup from the last 3 days. The new indexes were all ready. Firestore had made no backup yet (the schedule was 20 minutes old), so a run by hand deleted nothing and raised "ALARM: no database backup" as meant, which also tried the alarm email end to end; reading the list of backups worked as the function's service account. Its first real run is 03:00 Lagos time on Tue 20 Oct: with a backup by then it deletes the 40 or so January–March records counted earlier, without one it waits and raises the alarm again. The test alarm sent no email: on these functions an error line carries no severity, so the alarm's "severity>=ERROR" never matched. Fixed the same hour from `4a6a5a6`: the alarm also matches lines beginning "ALARM:" (brought up to date by `ops/setup-safety.mjs --apply`), and a kind the deletion cannot delete is an ALARM line too (`deleteOldRecords` redeployed); a second run's line at 06:15 UTC matched the new filter, and the owner received the alarm email in the info@inskriba.com inbox (11:16 pm Arizona, not in spam). Then, on the owner's yes, severity levels so the subject says how urgent: "trip check stopped" Critical, "server error or alarm" Error; a test ALARM line written by hand at 06:47 UTC brought an email marked "Error" (the owner) |
| Sun 18 Oct, late night in Arizona (Mon 19 Oct, morning in Nigeria) | **Server safety**, on the owner's word ("go live"), from `88538e3`: the new indexes; `ops/setup-safety.mjs --apply` added the alarm email (info@inskriba.com), the alarms "WakaGuard: trip check stopped" and "WakaGuard: server error or alarm", switched on Google's two billing APIs and added the USD 20 monthly budget, and the daily backup kept 7 days (a second look found all five there); `createReport`, the last function on Node 20 and unused, deleted; `watchTexts` (new) and the texting functions (`sendSafetySms`, `checkOverdueTrips`, `checkQuietTrips`, `onTripUpdated`, `onSafetyTimerUpdated`, `onSOSAlert`) deployed by name; then the website with the approved retention lines. Checked live: the lines are on the Privacy page, and `watchTexts`, run once by hand, counted 4 texts in the last hour and read the Termii wallet (NGN 9,043). 31 functions now, all from the code on Node 22. Waiting: `deleteOldRecords`, to be deployed once Firestore shows its first backup |
| Sun 18 Oct, night in Arizona | **Google and Apple sign-in switched on**, on the owner's word ("switch on sign-in"), after the owner enabled both in Firebase Authentication and added the signing fingerprints: `config/app` `signInWith: { google: true, apple: true }`, merged by hand with the owner's Google Cloud sign-in. `config/app` did not exist before, so it holds only this; the other switches keep their defaults. Build 24 phones show the buttons (iPhone Apple and Google, Android Google); build 23 and the website do not. To switch off: set both to false |
| Sun 18 Oct, night in Arizona | Server: `placeName` only, on the owner's word ("allow anywhere and deploy it"), from `4927199`: a destination pin is named anywhere, not only in Nigeria. The owner's pins in Arizona had been refused, so the box never filled on their phones. No app change |
| Sun 18 Oct, night in Arizona | **The destination pin names its spot**, on the owner's word ("commit, push and deploy it"), from `1381d73`: the database rules (the look-up turn and each person's count, server only), then `placeName` (new) and `deleteMyAccount` by name, then the website with the Privacy page's "Place names" line. Checked live: the line is on the Privacy page, the new code is served, and `placeName` refuses anyone not signed in. On phones it comes with build 24 |
| Sun 18 Oct, evening in Arizona | Website, on the owner's word, from `7f36d87`: on a computer, the button is now "Safe Trip" and opens the phones' own Safe Trip screen in a phone-sized window, in place of the January Safety Center (its trip share, safety timer, check-in and own SOS are gone). The computer layout also sends a running trip's position while the page is open and shows a dot on the button while a trip runs. Checked on wakaguard.com at computer size: the window opens with the phones' screen (signed out: "Sign in to continue" and the emergency numbers) |
| Sun 18 Oct, evening in Arizona | Website, on the owner's word, from `690539d`: sign-in opens above the window it was opened from. On a computer, Safety then "Sign In to Continue" had opened the sign-in window behind the Safety Center's, so nobody could sign in there (found by the owner). Checked on wakaguard.com at computer size: the sign-in window now opens on top |
| Sun 18 Oct, evening in Arizona | Website, on the owner's word, from `eaaa50c`: the weather icon asks as soon as someone signs in (before, a person who had just signed in saw no icon for up to 30 minutes). Nothing else changes from the release an hour earlier |
| Sun 18 Oct, afternoon in Arizona (around midnight in Nigeria) | **Build 24's website**, on the owner's word ("deploy the website"), straight after the server, from `5afe7b9` with the Privacy page's "Last Updated" set to 18 October: Mapbox maps (the token in the build settings), the "please update" and notice cards, "Stop WakaGuard texts to my number" on the trip page (checked live: the page and its form are served, and `stopTexts` answers wakaguard.com), the weather icon, the vehicle details and the destination pin, "Other amount", Undo, "Text them when I arrive", far-away reports and the Privacy page's build 24 lines. Google and Apple sign-in stay hidden on the website. The stores' privacy forms need no change for build 24: its new data (vehicle details, the rough area for the weather, the pin, sign-in with Google or Apple) falls under what Play's Data safety and Apple's App Privacy already list |
| Sun 18 Oct, afternoon in Arizona (late evening in Nigeria) | **Build 24's server**, on the owner's word ("deploy the server part so I can see the weather"), from `5afe7b9`: the database rules (the switches in `config/app`, stopped numbers, the morning weather choice and its rough areas, the vehicle and the destination pin on the contacts' page, far-away reports) and the new index for finding a contact by number; then all 30 functions in the code, by name. Four are new (`tripAction`, `stopTexts`, `onTrustedContactWrite`, `morningWeather`, which first runs at 6:30 am Lagos time on Monday 19 October); the rest brought up to date: texts in parts from `f460c1c`, the arrival text, the plate in alerts, stopped numbers left out, the hours ahead for the weather icon. `createReport` alone stays on Node 20. Build 24 phones now get everything their server side needs; older builds are unchanged. Not yet: the website, so the Privacy page's new lines (among them the rough area kept for the morning weather, which the server now keeps) go live with it. The CLI could not clean up the build images (a possible small monthly charge; can be deleted in the Cloud console) |
| Sat 17 Oct, night in Arizona (Sun 18 Oct, morning in Nigeria) | **Text alerts switched on**, on the owner's word, after Termii approved its assigned sender ID **OE Alert** with the DND route (15 October) and test texts from it arrived on a Nigerian phone. From `f168b90`: texts end "Powered by WakaGuard" as Termii's approved sample does, and trip links use `s?t=` because the test text arrived with "s?token=" rewritten to "s?code=". Website released first (the contacts' page reads t, token and code), then the five functions that send texts (`sendSafetySms`, `checkOverdueTrips`, `onTripUpdated`, `onSafetyTimerUpdated`, `onSOSAlert`) with `SMS_PROVIDER=termii`, `SMS_ENABLED=true`, `TERMII_SENDER_ID="OE Alert"`, `TERMII_CHANNEL=dnd`. Trips already overdue while texting was off are not texted: a held-back alert is final |
| Wed 14 Oct, evening in Arizona | Website, on the owner's word, from `b19b2eb`: the Privacy page now says what a fault report holds (what failed, where, the build, the kind of phone), that it is not linked to the account, and that it is deleted after 30 days. The same hour, the stores' privacy forms: Play's Data safety gained Crash logs and Diagnostics (collected, not shared, required, for analytics); Apple's App Privacy, never filled before, now lists 11 data types, all for app functionality and none for tracking, diagnostics not linked to the person, and the Privacy Policy address. The owner sends Play's change for review and presses Publish at Apple |
| Wed 14 Oct, afternoon in Arizona | Build 23's server and website, on the owner's word, from `fc175d7`: the fault reports' expiry rule (indexes); all 26 functions in the code, by name: five new (`checkQuietTrips`, `onCommentUpdate`, `onFlagCreated`, `onReportDeleted`, `weatherAhead`), the two comment counters replaced (now on Node 22) and the rest brought up to date, so every tester now gets the 15-minute wait, the last warning and the location nudge, and phones on build 23 the reminder buttons; `createReport` alone stays on Node 20. Then the website. Phone builds 23 uploaded the same hour |
| Wed 14 Oct, evening | Database rules: build 23's, on the owner's word, first in build 23's release order. Additions only (the travel mode on the contacts' page, the app build with a phone's notification token, fault reports), plus one limit build 22 never meets: a comment's author may only remove it, not change its status otherwise. Needed at once because build 23 on the owner's phones could not save their notification token without it |
| Wed 14 Oct, evening | Server: `onTripUpdated` only, which now records the farthest a running trip goes from its start, for the ranking's round trips. Nothing testers see changes |
| Wed 14 Oct, later | Website: every browser now gets the website first at wakaguard.com. A browser that had been through the first-run screens used to go straight into the app, so a Termii reviewer who had tried the old site might never see the page about the product and the company. The phone apps, the site added to a home screen, "Open the app" links (?app) and a tab where "Open the app" was pressed still go straight in. Testers who use WakaGuard in a browser now tap "Open the app" once per visit. From commit `32bc855` alone, in the clean copy |
| Wed 14 Oct | Website: the contact email is now info@inskriba.com everywhere (it was info@ansrd.io). Termii asked for a website that links WakaGuard to Inskriba Limited; the page already named the company, its RC number and its address. Built from commit `ffc8513` alone, in a separate clean copy, so nothing from build 23 went live |
| Tue 13 Oct | Website: the Privacy page now says what really happens to a photo's camera details. The app redraws every photo before upload, which leaves them out; the page had said they "are not reliably removed", and a tester's review read that as the biggest risk |
| Mon 12 Oct, late evening | Server: the five functions that send texts now word them "Hi <name>, … Powered by Inskriba Limited", the format Termii requires (texting is still off). Website: the same wording in the examples and on the Privacy page; the corrected keyboard handling for iPhones; the final Back design from build 22 |
| Mon 12 Oct | Server: arrival reminders ("5 minutes left", "Is your trip finished?"), a trip's first position accepted at once, the registration number in emails no longer offered as a phone call. Website: everything in build 22's list that is not phone-only, with the Terms of Use page |
| Sun 11 Oct | The weekly ranking report, a tool run by hand that reads trips and road reports; no change to the app |
| Sat 10 Oct | Our own account emails switched on (through Brevo); the email-link page; the "go back to the app" notice; the Nearby layout fix |
| Fri 9 Oct | Front page for first-time visitors; Privacy, Support and Guidelines carry their text in the page; Delete account page and server function; the website's account menu shows who is signed in; texts are addressed to the contact and signed with the company's name |
| By Thu 8 Oct | The travel safety version of the website and server: trips watched by the server, alerts, the trip map and the contacts' page; About page; Support, Privacy and Guidelines rewritten; the company's name and a contact email that can receive mail |

Text alerts to contacts: on since 18 October 2026 (sender ID OE Alert through Termii).
