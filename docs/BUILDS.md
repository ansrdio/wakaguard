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
| 24 | Wed 28 Oct | Sign in with Google and Apple; "please update" switch; service notice; "stop texting me"; vehicle details; far-away reports marked; Mapbox maps; destination pin with its place name (in place of search by address); "text them when I arrive"; louder reminders, "More time…", Undo; weather icon and morning weather. Sponsor card moved to a later build (no sponsor yet) | Sent Sun 18 Oct, ten days early: TestFlight passed Apple's beta review at once and is with the outside testers; Google Play closed test (Alpha) in review since 9:14 pm |
| 25 | Wed 4 Nov | Fixes after text alerts are switched on; directions on the trip (route, trip length from it, spoken directions), as a beta; repeat a usual trip; one-tap "keep running" permissions on the first trip | Planned |
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

## Live now (Tuesday 13 October 2026)

| | Build | Where |
|---|---|---|
| Android | 22 | Google Play closed test. The owner sent it for review on 12 October and Google published it the same day |
| iPhone | 22 | TestFlight, outside testers, since 12 October: the owner sent it for review and Apple passed it at once. Build 20 is still there beside it (builds 15 and 17 were retired on 12 October) |

The two builds 22 hold the same features, with one difference: the iPhone
one was built a little later and also has the iPhone keyboard fix, which
Android does not need. Testers still have to update; on the morning of 13
October a tester's trip showed it came from an older build (the time it was
given extra minutes was not recorded, which build 22 does).

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
| 25 | Wed 4 Nov | Fixes, after text alerts are switched on; directions on the trip, beta |
| 26 | Wed 11 Nov | The launch version, frozen Friday 13 November |

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
- [ ] Build 25 (moved back from after launch on 17 October, on the owner's
      word, after the tester survey: "I forgot to start a trip" was the most
      common reason for using WakaGuard less, 4 of 9). Repeat a usual trip:
      one tap to start a trip made before, with the time it usually takes
      filled in
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
- [ ] Build 25. Directions on the trip, marked Beta (the owner, 14 October):
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

- [ ] Build 25. Fewer trips to Settings for "Keep WakaGuard running" (a
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
- [ ] Mon 2 Nov. Text alerts switched on, then proven on MTN, Airtel, Glo and
      9mobile, including a do-not-disturb number
- [ ] Week of Mon 2 Nov. Security check of the server, and Firebase's app
      check for the phone apps
- [ ] By Fri 6 Nov. The go or no-go checklist for Fri 13 Nov
- [ ] Launch day. "Get WakaGuard" on the page contacts see, and store links
      on the website
- [ ] Guidelines page: an example of reporting a checkpoint without accusing
      anyone. "Checkpoint at Mokola, 20 minute delay" is fine; naming or
      picturing an officer is not (a tester's suggestion, 13 October; the
      owner said yes that day)
- [ ] For the lawyer, with the Terms review: personal data kept on servers
      outside Nigeria; what exactly gets an account's texting switched off;
      whether to rule out reporting security operations while they are
      happening (all three raised by a tester's review on 13 October)
- [ ] The unused "offline drafts" code uploads a photo as the camera made
      it, location details included. Nothing in the app uses it; remove it,
      or make it redraw photos like the report form does, before anything
      ever does

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

### Build 24, Sunday 18 October 2026 (iPhone uploaded; Android ready)

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
| Sun 18 Oct, late night in Arizona (Mon 19 Oct, 07:09 in Nigeria) | **The nightly deletion**, on the owner's word ("deploy the nightly deletion"), from `2e4c147`: `deleteOldRecords`, with the safeguard that it deletes nothing without a backup from the last 3 days. The new indexes were all ready. Firestore had made no backup yet (the schedule was 20 minutes old), so a run by hand deleted nothing and raised "ALARM: no database backup" as meant, which also tried the alarm email end to end; reading the list of backups worked as the function's service account. Its first real run is 03:00 Lagos time on Tue 20 Oct: with a backup by then it deletes the 40 or so January–March records counted earlier, without one it waits and raises the alarm again. The test alarm sent no email: on these functions an error line carries no severity, so the alarm's "severity>=ERROR" never matched. Fixed the same hour from `4a6a5a6`: the alarm also matches lines beginning "ALARM:" (brought up to date by `ops/setup-safety.mjs --apply`), and a kind the deletion cannot delete is an ALARM line too (`deleteOldRecords` redeployed); a second run's line at 06:15 UTC matched the new filter, and the owner received the alarm email in the info@inskriba.com inbox (11:16 pm Arizona, not in spam) |
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
