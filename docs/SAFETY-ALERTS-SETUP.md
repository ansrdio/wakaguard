# Safety Alerts: Setup and Operations

How to configure, deploy and run the Safe Trip alerting: overdue alerts, SOS, trip location and SMS.

## What runs on the server

| Function | Trigger | Purpose |
|----------|---------|---------|
| `checkOverdueTrips` | Every minute | Warns the traveller at the expected arrival time, alerts trusted contacts by SMS 5 minutes later |
| `onTripUpdated` | Trip document updated | Tells contacts when an alerted traveller adds time or ends the trip |
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

## 3. Check it works

1. Add yourself as a trusted contact with a second phone.
2. Start a Safe Trip with the shortest duration and let it run past its time. Expect a push reminder at the deadline and an SMS 5 minutes later.
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

## 6. Tests

```bash
npm run test:functions   # message templates, providers, alert logic
npm run test:monitor     # server flows against the Firestore and Auth emulators
npm run test:smoke       # security rules
```
