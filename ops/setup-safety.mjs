#!/usr/bin/env node
/**
 * The server's alarms, budget and daily backup in Google Cloud (docs/OPERATIONS.md).
 *
 *   node ops/setup-safety.mjs           shows what is there and what it would add
 *   node ops/setup-safety.mjs --apply   adds what is missing; running it again adds nothing twice
 *
 * Uses this Mac's Google Cloud sign-in (gcloud auth application-default login).
 * Agreed with the owner on 18 October 2026: alarms by email to info@inskriba.com,
 * a USD 20 monthly budget warning at 50, 90 and 100 per cent, a daily backup kept 7 days.
 */

import { execSync } from 'node:child_process';

const PROJECT = 'routepulse-5701f';
const ALARM_EMAIL = 'info@inskriba.com';
const BUDGET_USD = 20;
const BACKUP_KEEP_DAYS = 7;
const apply = process.argv.includes('--apply');

const token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf8' }).trim();

async function call(method, url, body) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      // Charges and quota go to the project, not to the person signed in
      'x-goog-user-project': PROJECT,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(`${method} ${url.split('?')[0]} answered ${response.status}: ${data.error?.message ?? text.slice(0, 200)}`);
  return data;
}

const say = (line) => console.log(line);
const MONITORING = `https://monitoring.googleapis.com/v3/projects/${PROJECT}`;

async function alarmChannel() {
  const { notificationChannels = [] } = await call('GET', `${MONITORING}/notificationChannels`);
  const found = notificationChannels.find((c) => c.type === 'email' && c.labels?.email_address === ALARM_EMAIL);
  if (found) { say(`Alarm email: there (${ALARM_EMAIL})`); return found.name; }
  if (!apply) { say(`Alarm email: would add ${ALARM_EMAIL}`); return 'CHANNEL'; }
  const made = await call('POST', `${MONITORING}/notificationChannels`, {
    type: 'email', displayName: `WakaGuard alarms (${ALARM_EMAIL})`, labels: { email_address: ALARM_EMAIL },
  });
  say(`Alarm email: added (${ALARM_EMAIL})`);
  return made.name;
}

const POLICIES = (channel) => [
  {
    displayName: 'WakaGuard: trip check stopped',
    documentation: {
      mimeType: 'text/markdown',
      content: 'The minute-by-minute trip check (checkOverdueTrips) has not run for 10 minutes, so overdue trips are not being noticed and nobody is being texted. See docs/OPERATIONS.md in the WakaGuard repository.',
    },
    combiner: 'OR',
    conditions: [{
      displayName: 'checkOverdueTrips has not run for 10 minutes',
      conditionAbsent: {
        filter: 'resource.type = "cloud_function" AND resource.labels.function_name = "checkOverdueTrips" AND metric.type = "cloudfunctions.googleapis.com/function/execution_count"',
        duration: '600s',
        aggregations: [{ alignmentPeriod: '300s', perSeriesAligner: 'ALIGN_SUM' }],
      },
    }],
    alertStrategy: { autoClose: '1800s' },
    notificationChannels: [channel],
  },
  {
    displayName: 'WakaGuard: server error or alarm',
    documentation: {
      mimeType: 'text/markdown',
      content: 'A WakaGuard server function crashed, or wrote a line beginning "ALARM:" to its log: texts that failed to send, the Termii wallet running low, far more texts than usual in an hour, no recent database backup, or old records that could not be deleted. See docs/OPERATIONS.md in the WakaGuard repository.',
    },
    combiner: 'OR',
    conditions: [{
      displayName: 'A crash or an ALARM line in the server functions\' log',
      // console.error lines carry no severity on these functions (found on 19
      // October 2026, when the first test alarm sent no email), so the ALARM
      // lines are matched by their words; crashes are marked ERROR by Google
      conditionMatchedLog: { filter: 'resource.type="cloud_function" AND (severity>=ERROR OR textPayload:"ALARM:" OR jsonPayload.message:"ALARM:")' },
    }],
    alertStrategy: { notificationRateLimit: { period: '1800s' }, autoClose: '3600s' },
    notificationChannels: [channel],
  },
];

async function alarms(channel) {
  const { alertPolicies = [] } = await call('GET', `${MONITORING}/alertPolicies`);
  for (const policy of POLICIES(channel)) {
    const found = alertPolicies.find((p) => p.displayName === policy.displayName);
    if (found) {
      // Brought up to date when what it watches has changed
      const same = JSON.stringify(found.conditions?.map(({ displayName, conditionAbsent, conditionMatchedLog }) => ({ displayName, conditionAbsent, conditionMatchedLog })))
        === JSON.stringify(policy.conditions);
      if (same) { say(`Alarm "${policy.displayName}": there`); continue; }
      if (!apply) { say(`Alarm "${policy.displayName}": would bring up to date`); continue; }
      await call('PATCH', `https://monitoring.googleapis.com/v3/${found.name}?updateMask=conditions,documentation`, {
        conditions: policy.conditions, documentation: policy.documentation,
      });
      say(`Alarm "${policy.displayName}": brought up to date`);
      continue;
    }
    if (!apply) { say(`Alarm "${policy.displayName}": would add`); continue; }
    await call('POST', `${MONITORING}/alertPolicies`, policy);
    say(`Alarm "${policy.displayName}": added`);
  }
}

/** The budget needs Google's billing APIs switched on for the project */
async function billingApis() {
  for (const api of ['cloudbilling.googleapis.com', 'billingbudgets.googleapis.com']) {
    const url = `https://serviceusage.googleapis.com/v1/projects/${PROJECT}/services/${api}`;
    const { state } = await call('GET', url);
    if (state === 'ENABLED') continue;
    if (!apply) { say(`Budget: would switch on ${api} first`); return false; }
    await call('POST', `${url}:enable`, {});
    say(`Budget: switched on ${api}`);
    // A newly switched-on API takes a moment to answer
    await new Promise((resolve) => setTimeout(resolve, 30000));
  }
  return true;
}

async function budget(channel) {
  if (!(await billingApis())) { say(`Budget: would then add USD ${BUDGET_USD} a month, warnings at 50, 90 and 100 per cent`); return; }
  const { billingAccountName } = await call('GET', `https://cloudbilling.googleapis.com/v1/projects/${PROJECT}/billingInfo`);
  if (!billingAccountName) { say('Budget: the project has no billing account'); return; }
  const base = `https://billingbudgets.googleapis.com/v1/${billingAccountName}/budgets`;
  const { budgets = [] } = await call('GET', base);
  const name = 'WakaGuard monthly budget';
  if (budgets.some((b) => b.displayName === name)) { say(`Budget: there (${name})`); return; }
  if (!apply) { say(`Budget: would add USD ${BUDGET_USD} a month, warnings at 50, 90 and 100 per cent`); return; }
  await call('POST', base, {
    displayName: name,
    budgetFilter: { projects: [`projects/${PROJECT}`] },
    amount: { specifiedAmount: { currencyCode: 'USD', units: String(BUDGET_USD) } },
    thresholdRules: [0.5, 0.9, 1.0].map((thresholdPercent) => ({ thresholdPercent, spendBasis: 'CURRENT_SPEND' })),
    notificationsRule: { monitoringNotificationChannels: [channel], disableDefaultIamRecipients: false },
  });
  say(`Budget: added (USD ${BUDGET_USD} a month)`);
}

async function backup() {
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/backupSchedules`;
  const { backupSchedules = [] } = await call('GET', base);
  if (backupSchedules.some((s) => s.dailyRecurrence)) { say('Daily backup: there'); return; }
  if (!apply) { say(`Daily backup: would add, each kept ${BACKUP_KEEP_DAYS} days`); return; }
  await call('POST', base, { retention: `${BACKUP_KEEP_DAYS * 24 * 60 * 60}s`, dailyRecurrence: {} });
  say(`Daily backup: added, each kept ${BACKUP_KEEP_DAYS} days`);
}

say(apply ? 'Adding what is missing:' : 'Looking only (nothing is changed without --apply):');
const steps = [['alarms', async () => { const channel = await alarmChannel(); await alarms(channel); return channel; }]];
let channel = 'CHANNEL';
for (const [label, step] of steps) {
  try { channel = await step(); } catch (error) { say(`Could not set up the ${label}: ${error.message}`); process.exitCode = 1; }
}
for (const [label, step] of [['budget', () => budget(channel)], ['backup', backup]]) {
  try { await step(); } catch (error) { say(`Could not set up the ${label}: ${error.message}`); process.exitCode = 1; }
}
