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
| 23 | Wed 21 Oct | Testers' corrections (checklist, exact trip length, delete my own post); "How are you travelling?" with matching tips; our own road report pictures; "keep WakaGuard running" help; paid maps; weather; reported posts hidden automatically | Being built |
| 24 | Wed 28 Oct | Sign in with Google and Apple; sponsor card by state; "please update" switch; service notice; "stop texting me"; vehicle details; far-away reports marked | Planned |
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
| 23 | Wed 21 Oct | Testers' corrections; "How are you travelling?" when starting a trip, with matching tips; our own road report pictures; "keep WakaGuard running" help; paid map provider; weather on the Trip screen |
| 24 | Wed 28 Oct | Sign in with Google and Apple (moved from build 23 on 13 October: the stores do not require it, and it is the item most likely to eat a week); sponsor slot, different by state; "please update" switch; service notice; "stop texting me" for contacts; vehicle details on a trip |
| 25 | Wed 4 Nov | Fixes, after text alerts are switched on; repeat a usual trip |
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

### Builds 24 and 25, in more detail

- [ ] Build 24. Sponsor slot by state: the sponsor card can differ by the
      state the user has chosen, changed from the server without an app
      update. Marked "Sponsored"; never on the trip screen, the contacts' page
      or in texts
- [ ] Build 24. Add your own amount of time (the owner, 14 October; a couple
      of testers asked for it in the feedback form too). Nobody can know in
      advance how much more time a trip needs. In the app, "Running late? Add
      time" gets "Other", with the start form's hours-and-minutes picker in
      5-minute steps. On the reminders, a third button "More time…" opens the
      app straight onto that picker; "+15 min" stays as the one-tap choice
      (Android shows up to three buttons, an iPhone up to four)
- [ ] Build 24. A morning weather notification, to bring people back to the
      app (the owner, 14 October). Proposed: about 6:30 am Nigeria time, only
      on days with something worth knowing (rain, a storm, great heat), since
      people tired of a daily message may switch WakaGuard's notifications
      off and lose the trip reminders with them (one switch on an iPhone).
      Tapping it opens the start form. It needs a rough area (about 10 km)
      kept from the last weather look-up, a line on the Privacy page, and its
      own switch in Profile. Open: every morning or only notable days; its
      language is decided with the languages below
- [ ] Build 25, closer to the freeze. Nigerian languages, Pidgin first, then
      perhaps Yoruba, Hausa and Igbo (the owner, 14 October, moving the Pidgin
      weather lines out of build 23). A large piece of work: the app's words
      are written into each screen, not kept in one place to translate, and
      each language needs a native speaker to write and check it. A Pidgin
      draft of the weather lines exists (the review page of 14 October)
- [ ] Build 24. Vehicle details on a trip: the plate number, the bus company
      or the driver's name, added when starting. Contacts see them if the
      traveller does not arrive
- [ ] Build 24. Reports posted from far away are marked, not blocked.
      Nothing checks where the reporter is today, so a road report can be
      posted for a place hundreds of kilometres off. People do report things
      they passed earlier, so the report still goes up, but it shows as not
      seen first-hand and does not count for the ranking (raised by a tester
      on 13 October; the owner said yes that day)
- [ ] Build 25. Repeat a usual trip: one tap to start a trip made before, with
      the time it usually takes filled in

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

Not yet switched on: text alerts to contacts (waiting for a sender ID).
