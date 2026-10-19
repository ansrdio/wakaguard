# Keeping the server safe

The alarms, the daily backup and the deletion of old records, agreed with the
owner on 18 October 2026. Set up in Google Cloud by `node ops/setup-safety.mjs
--apply` (run without `--apply` it only shows what is there).

## Alarms

Every alarm is an email to **info@inskriba.com** from Google Cloud Monitoring.

| Alarm | Fires when | First thing to do |
|---|---|---|
| **WakaGuard: trip check stopped** | `checkOverdueTrips`, the minute-by-minute check, has not run for 10 minutes. Overdue trips are not being noticed and nobody is being texted | Firebase console, Functions: is `checkOverdueTrips` there and healthy? Google Cloud console, Cloud Scheduler: is its job paused or failing? Redeploy it by name if needed |
| **WakaGuard: server error or alarm** | A server function crashed, or wrote a line beginning "ALARM:" (at most one email every 30 minutes). Other error lines carry no severity on these functions and do not email | Read it in the Functions log. The ALARM lines below have their own meaning |
| … with **"ALARM: texts not sent"** | A safety text failed to send to one or more contacts | Termii's dashboard: wallet, sender ID "OE Alert", DND route. The trip's card in the app says who was not texted |
| … with **"ALARM: text wallet low"** | The hourly check found Termii's wallet under NGN 3,000 (about 200 texts) | Top up the Termii wallet |
| … with **"ALARM: no database backup"** | The nightly deletion found no backup from the last 3 days, so it deleted nothing | Google Cloud console, Firestore, Disaster recovery: is the daily backup schedule there, and are backups being made? `node ops/setup-safety.mjs` shows it |
| … with **"ALARM: texts jumped"** | More than 40 texts went out in the last hour; a normal day sends a handful | Look in `safetyMessageLogs` for who sent them. If it is a fault or misuse, switch texting off (`SMS_ENABLED=false` in `functions/.env`, then deploy the texting functions by name) |
| … with **"ALARM: the nightly deletion could not delete"** | One kind of old record could not be deleted (often an index still building); the others were | Read the error; it is tried again the next night |
| **Budget email** | Google Cloud spend reaches 50, 90 and 100 per cent of USD 20 in the month | Google Cloud console, Billing, Reports: which service grew |

The hourly check is `watchTexts` (`functions/src/serverWatch.ts`); the limits
are in `functions/src/retentionPlan.ts`.

## Daily backup

Firestore makes a backup of the whole database every day, kept for 7 days.
Photos are not in it; Cloud Storage keeps deleted files for 7 days on its own.

To restore (never over the live database; into a new one, then copy back what
was lost):

```
gcloud firestore backups list --project routepulse-5701f --location <the database's location>
gcloud firestore databases restore --project routepulse-5701f \
  --source-backup projects/routepulse-5701f/locations/<location>/backups/<backup id> \
  --destination-database restored-YYYYMMDD
```

The restored copy is a separate database (`restored-YYYYMMDD`); read what is
needed from it with the Admin SDK and write it back, then delete the copy.

## How long records are kept

Deleted every night at 03:00 Lagos time by `deleteOldRecords`
(`functions/src/recordRetention.ts`), counted in the log, never their contents.
It deletes nothing unless Firestore has a backup from the last 3 days, so a
mistake can always be undone from the backup.
The Privacy page quotes the same numbers (`src/lib/dataRetention.ts`).

| Record | Deleted |
|---|---|
| A trip in someone's account | 90 days after its link expired |
| The trip page contacts open | 7 days after its link expired |
| SOS alerts, checkpoint stops, old safety timers | 90 days after they were made |
| The log of texts sent | 90 days after sending |
| Expired or resolved road reports, with their photos, comments and votes | 90 days after they expired |
| Removed comments | 30 days after they were posted |
| Counters and caches (stop-text tries, place-name look-ups, weather forecasts) | after 2 days |
| Fault reports | 30 days (Firestore's own deletion, `deleteAfter`) |
| The rough weather area | 30 days without a look-up (`morningWeather`) |
| Accounts | when the person deletes theirs |

Reports hidden after other people reported them (`flagged`) are kept for review.
The old top-level `trips` copies from before the January data moved into
accounts are not touched.
