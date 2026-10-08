# Safety Alerts: Setup and Operations

How to configure, deploy and run the Safe Trip alerting: overdue alerts, SOS, trip location and SMS.

## What runs on the server

| Function | Trigger | Purpose |
|----------|---------|---------|
| `checkOverdueTrips` | Every minute | Warns the traveller at the expected arrival time, alerts trusted contacts by SMS 5 minutes later |
| `onTripUpdated` | Trip document updated | Keeps the path travelled and the traveller's name on the share document; tells contacts when an alerted traveller adds time or ends the trip |
| `onSafetyTimerUpdated` | Timer document updated | All-clear for standalone safety timers |
| `onSOSAlert` | SOS alert created | Sends the SOS SMS to trusted contacts, with retries |
| `tripLocation` | HTTPS | Receives location from the native app in the background |
| `sendSafetySms` | Callable | Check-in and trip-share SMS the traveller sends themselves |

The scheduled function needs the Blaze plan (Cloud Scheduler).

## 1. Configure SMS

Copy `functions/.env.example` to `functions/.env` and fill it in. That file is git-ignored.

### Termii

1. Create an account at termii.com and copy the **API key** and **base URL** from the dashboard. The example file assumes `https://v3.api.termii.com`; use the one your dashboard shows.
2. Request a **sender ID** (3 to 11 characters, for example `WakaGuard`). Termii has to approve it before messages are delivered.
3. Ask Termii support to activate the **DND route** on the account and keep `TERMII_CHANNEL=dnd`. This matters for a safety alert: per Termii's docs, the `generic` route does not reach numbers with Do-Not-Disturb on, and does not deliver to MTN numbers between 8pm and 8am.
4. Set `SMS_PROVIDER=termii`, `TERMII_API_KEY`, `TERMII_SENDER_ID` and `TERMII_BASE_URL`.

To keep Twilio as a backup, set `SMS_FALLBACK_PROVIDER=twilio` and the three `TWILIO_*` values. The fallback is tried for each recipient when the first provider fails.

`SMS_PROVIDER=mock` logs messages and sends nothing. `SMS_ENABLED=false` stops all SMS.

A message logged as `sent` was accepted by the provider. That is not proof it reached the phone; check the provider's delivery reports when testing.

### Settings that were in `functions.config()`

Older deployments set Twilio values with `firebase functions:config:set`. Those are still read as a fallback, but Firebase has deprecated that API and deploys that rely on it will fail after March 2027. Move the values into `functions/.env`.

## 2. Deploy

The app at wakaguard.com is served from Firebase Hosting. The new client needs the new rules and functions, so deploy in this order:

**The rules must go out before the functions.** The functions add two fields to each trip's share document (`path` and `name`). Under the old rules a share document with fields they do not know is rejected on its next update, so the app's own writes to it (add time, arrive, SOS) would start failing for every trip in progress.

```bash
# 1. Rules and indexes (indexes take a few minutes to build)
firebase deploy --only firestore:rules,firestore:indexes

# 2. Functions
cd functions && npm install && npm run build && cd ..
firebase deploy --only functions

# 3. Web app
npm install && npm run build
firebase deploy --only hosting
```

Use a test Firebase project first (`firebase use <project>`).

For the native apps, run `npx cap sync` after `npm run build`, then build in Android Studio and Xcode.

### The trip map and what it stores

The traveller's trip map and the page a contact opens from the trip link draw the same thing: the path the phone has reported and its latest position. There is no planned route.

- The path is built by `onTripUpdated` from the positions the trip already receives, as up to 240 points on `sharedTrips/{tripId}`. Movements under 40 m are skipped.
- It is removed when the trip ends. During an SOS or an overdue alert it stays until the trip is ended or the hourly clean-up cancels it.
- The private trip document does not keep the path, only its start and end points.
- The app cannot set or change `path` or `name`; the rules allow them only as written by the server.

### Test trips

"Try a 2-minute test trip instead" on the start form runs the real alert path with shorter waits, so the whole thing can be watched in a few minutes without alarming anyone.

- The trip is marked `isTest`. It lasts 2 minutes, and contacts are texted about a minute after that instead of five (`TEST_OVERDUE_GRACE_MS`).
- Every text about it (the trip link, "I'm okay", the overdue alert, the SOS and the follow-up) begins `WAKAGUARD TEST ALERT. NOT A REAL EMERGENCY.`
- The SOS dialog does not offer the call to 112 during a test trip, and the page a contact opens says it is a test and hides its own Call 112 button.
- Nothing else differs. A test trip uses the same monitor, the same triggers, the same limits and the same SMS provider as a real one, and its texts are charged like any others.

The public share document carries `isTest`, so **deploy the Firestore rules before the app or the website** when releasing this for the first time. With the old rules a test trip cannot be started.

### What the app says about an alert

The app reports what the server recorded, not what it hopes happened. After an overdue alert the trip carries `overdueAlertState`, `overdueAlertSent` and `overdueAlertTotal`; after an SOS it carries `sosAlertState`, `sosAlertSent` and `sosAlertTotal`. The trip card turns these into sentences such as "A text saying you are overdue was sent to your 2 contacts" or "WakaGuard could not text your contacts. Call them yourself, or share the trip link."

"Sent" means the SMS provider accepted the text. The app never says "delivered": it has no way of knowing a text reached the handset. With `SMS_ENABLED` off or `SMS_PROVIDER=mock` set while SMS is switched off, the state is `blocked` and the card says the contacts could not be texted.

## 3. Check it works

1. Add yourself as a trusted contact with a second phone.
2. Start a test trip (or a Safe Trip with the shortest duration) and let it run past its time. Expect a push reminder at the deadline and an SMS about a minute later for a test trip, 5 minutes later for a real one.
3. Open the link in the SMS: it should show "Overdue" and the last location.
4. Tap **+30 min**: the contact gets an "extended" SMS and the page stops showing overdue.
5. End the trip after another alert: the contact gets an all-clear SMS.
6. Press SOS: the dialer opens at once and the contact gets an SOS SMS.
7. On a real phone, lock the screen during a trip and confirm the page keeps updating.

Every message is recorded in the `safetyMessageLogs` collection with the provider's response.

## 4. App Check (recommended before a public launch)

App Check stops scripts that are not the app from calling Firebase.

1. Firebase Console > App Check > register the web app with **reCAPTCHA v3** and add the site's domains.
2. Set `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` in `.env.local`, rebuild and deploy hosting.
3. Watch the App Check metrics until almost all requests are verified.
4. Turn on enforcement for Firestore and Storage in the console, and set `ENFORCE_APP_CHECK=true` in `functions/.env` and redeploy functions.

For local development set `NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN=true` and register the token printed in the browser console.

The web provider works while the native apps load the hosted site. If the apps are later bundled, they need the native providers (Play Integrity and App Attest) instead.

## 5. Abuse controls

- **Who can send:** only accounts with a verified email, phone or Google sign-in.
- **Limits per user:** 30 messages an hour, 15 of one type an hour, 50 a day, and at most 5 contacts per message. Change with the `SMS_MAX_*` settings.
- **Stop one user:** set `smsBlocked: true` on their `users/{uid}` document (clients cannot change it), or disable the account in Firebase Auth.
- **Message content:** names, destinations and notes are stripped of links and phone numbers before they go into a message.

## 6. Building the phone apps

The apps carry their own copy of the web build. They no longer load the website, so they open with no signal and count as real apps for store review. The other side of that: a change to the app now reaches users through an app-store release, not a website deploy.

```bash
# .env.local must hold the real Firebase settings
npm run build:android     # or: npm run build:ios
```

`build:android` and `build:ios` first run `scripts/app-env.mjs`, which refuses to build if the Firebase settings are missing, point at the emulators, or a development server is configured. Whatever is in `.env.local` at build time is baked into the app.

Both then run `npx cap sync`, which copies the web build into the native project and writes the list of native plugins the app loads. If you build by hand, use `sync` and not `copy`: with `copy` alone on a fresh checkout the Android app starts, but every native feature (background location, contacts, sharing) reports "plugin is not implemented".

Two files are needed that are deliberately not in the repository. Download both from Firebase Console > Project settings > Your apps:

| File | Goes in | For the app registered as |
| --- | --- | --- |
| `GoogleService-Info.plist` | `ios/App/App/` | `com.ansrdlabs.wakaguard` |
| `google-services.json` | `android/app/` | `com.wakaguard.app` |

The iPhone app does not build without its file. The Android app builds without its file but then has no push notifications. The two apps have different IDs and each matches what is registered in Firebase, so leave them as they are.

If `pod install` (run by `npx cap sync`) stops with a Ruby encoding error, run it as `LANG=en_US.UTF-8 npx cap sync ios`.

**Signing the Android release.** The keystore and its passwords are read from `android/key.properties`, which git ignores. Copy `android/key.properties.example` to that name and fill it in; without it, release builds come out unsigned. The passwords used to be written in `android/app/build.gradle`, and this repository is public, so treat those old passwords as known to anyone: change them on the keystore (`keytool -storepasswd` and `keytool -keypasswd`, which keep the same signing key) before the next release, and anywhere else they were reused.

**Unencrypted connections.** Release builds of both apps accept HTTPS only. The exceptions are for testing against the local emulators, which speak plain HTTP: the iPhone app allows addresses on the local network, and Android debug builds allow this machine only (`android/app/src/debug`). On an Android phone or virtual device, forward the emulator ports first:

```bash
for port in 9099 8080 9199 5001; do adb reverse tcp:$port tcp:$port; done
```

**Notifications.** The apps ask for permission to show notifications the first time a trip is started, and from the "Enable Notifications" button on first launch. Without it, Android 13 and later hide the "Safe Trip active" notification and the warning sent before contacts are alerted.

Before the first release:

1. **API key restrictions.** Inside the app, pages come from `capacitor://localhost` (iOS) and `https://localhost` (Android), not from wakaguard.com. If the browser API key in Google Cloud Console is restricted to your web domains, add those two addresses or sign-in and data will fail inside the app.
2. **Map tiles.** Set `NEXT_PUBLIC_MAP_TILE_URL` to a provider with an API key. OpenStreetMap's own servers may refuse traffic from apps.
3. **Existing installs.** Anyone who has the earlier app is signed out once after updating, because their sign-in was stored under the website's address.
4. **App Check**, if you turn it on, needs the native providers (Play Integrity and App Attest) rather than reCAPTCHA.

What has been run so far, all against the local emulators:

- **iPhone simulator:** first launch, sign-in, staying signed in, adding a contact, a full trip, location updates with the app in the background, force-closing mid-trip and reopening.
- **Android virtual phone (Android 16, plain image):** first launch, sign-in, the location prompt, adding a contact, starting and ending a trip, ending a trip with no connection and having it sent once the connection returned, the SOS (dialer opens on 112, contacts are texted), the map, the Back button and the keyboard.
- **Real Android phone (Galaxy A15, Android 16), over USB with `adb reverse`:** everything above, plus location updates during a trip. An update reached the server about every two minutes with the app open, in the background, with the screen locked, with the phone made to behave as if on battery (`adb shell dumpsys battery unplug`), and in forced deep Doze (`adb shell dumpsys deviceidle force-idle deep`). Sharing resumed within seconds of reopening after a force-close. The phone was stationary on Wi-Fi for about half an hour, so a long journey on mobile data is still to be seen.
- **Location does not work on a plain Android virtual device.** The location plugin needs Google Play services; use a "Google APIs" or "Google Play" image, or a real phone.
- **SOS and location.** The app keeps the phone's latest position and sends it with the alert, as long as it is no more than five minutes old, and asks for a new one as the SOS dialog opens. Before this, an SOS sent with "Call 112 Now" on the virtual phone carried no location: the dialer took over the screen before a position arrived. The change was checked in a browser with a simulated position and by the server tests. "Call 112 Now" has still not been run on a real phone, and if the phone has never produced a position the text goes out without one.

A simulator cannot show what a locked phone, a weak signal or battery saving do, so check on a real phone, on both platforms:

- sign up, sign in, close and reopen the app, and confirm you are still signed in
- start a trip, lock the screen and confirm the contact's page keeps updating
- force-close the app mid-trip: location stops until it is reopened, and the overdue alert still goes out on time
- switch on flight mode, start a trip, and confirm the "Waiting for a connection" warning appears and clears when signal returns
- open Privacy Policy, Guidelines and Support from the Profile tab and come back
- add a contact from the phone book, and take a photo for a road report

For development with live reload, point the app at your dev server instead of its own files:

```bash
CAP_SERVER_URL=http://192.168.1.20:3000 npx cap sync
```

## 7. Try it on your own machine

The whole flow can be run locally against the Firebase emulators. Nothing real is touched and no SMS is sent: messages are printed in the emulator's log.

1. Copy the "local development" block from `.env.local.example` into `.env.local`, and create `functions/.env.local` containing `SMS_PROVIDER=mock`.
2. In one terminal: `npm run emulators:all`
3. In a second: `npm run seed:emulator` (add `-- --with-contacts` for two ready-made contacts), then `npm run dev`
4. Open http://localhost:3000 in a phone-sized browser window and sign in with the test account in `scripts/seed-emulator.mjs`.

Starting a trip, adding time, the "I'm okay" text, SOS and ending a trip all work this way. The every-minute overdue check does not run in the emulator; `npm run test:monitor` covers it.

Remove `.env.local` again before building the real site, or the build will point at the demo project.

## 8. Tests

```bash
npm run test:functions   # message templates, providers, alert logic
npm run test:monitor     # server flows against the Firestore and Auth emulators
npm run test:smoke       # security rules
```
