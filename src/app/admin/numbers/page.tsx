'use client';

/**
 * The owner's Numbers page: who uses WakaGuard, trips, distance and time
 * travelled, reports, texts, phones and database use. Counts only, worked out by the adminNumbers server function
 * each time the page is opened. Only accounts with the admin claim see them;
 * anyone else is told why and offered sign-in, rather than sent away.
 */

import { ReactNode, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { RefreshCw } from 'lucide-react';
import { AuthModal } from '@/components/AuthModal';
import { useAuthedUser } from '@/hooks/useAuthedUser';
import { auth } from '@/lib/firebase';
import { functions } from '@/lib/firebaseFunctions';
import { APP_BUILD } from '@/lib/appVersion';
import {
  amount, count, dayLabel, methodLabel, minutesLabel, momentLabel, Numbers, percent, platformLabel,
} from '@/lib/adminNumbers';

function Section({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {note && <p className="text-sm text-slate-600 mt-1">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Tiles({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{children}</div>;
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="text-3xl font-semibold text-slate-900 mt-1">{value}</p>
      {note && <p className="text-xs text-slate-500 mt-1">{note}</p>}
    </div>
  );
}

/**
 * A part against a whole, or against a limit. Only against a limit, where
 * more is worse, does the fill turn amber from 80% and red past 100%
 */
function Meter({ label, part, whole, detail, limit = false }: { label: string; part: number; whole: number; detail: string; limit?: boolean }) {
  const share = whole > 0 ? part / whole : 0;
  const fill = !limit ? 'bg-brand-500' : share > 1 ? 'bg-red-600' : share >= 0.8 ? 'bg-amber-500' : 'bg-brand-500';
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-slate-700">{label}</p>
        <p className="text-sm font-semibold text-slate-900 tabular-nums">{percent(part, whole)}</p>
      </div>
      <div className="mt-2 h-2 rounded-full bg-brand-100 overflow-hidden" role="img" aria-label={`${label}: ${detail}`}>
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${Math.min(share, 1) * 100}%` }} />
      </div>
      <p className="text-xs text-slate-500 mt-2">{detail}</p>
    </div>
  );
}

interface Column {
  key: string;
  label: string;
  value: number;
  /** What the readout says for this column */
  readout: string;
}

/**
 * One series as columns, newest on the right. Hovering or focusing a column
 * shows its readout; otherwise the newest one's shows. The table beside it
 * carries every value.
 */
function Columns({ title, columns }: { title: string; columns: Column[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...columns.map((c) => c.value));
  const shown = columns[active ?? columns.length - 1];
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <p className="text-sm text-slate-700">{title}</p>
      <p className="text-sm text-slate-900 font-semibold mt-1 min-h-5" aria-live="polite">{shown?.readout}</p>
      <div className="mt-3 flex items-end h-32 border-b border-slate-200" onPointerLeave={() => setActive(null)}>
        {columns.map((c, i) => (
          <button
            key={c.key}
            type="button"
            className="flex-1 h-full flex items-end justify-center focus:outline-none group"
            aria-label={c.readout}
            onPointerEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
          >
            <span
              className={`w-full max-w-6 mx-px rounded-t ${active === i ? 'bg-brand-700' : 'bg-brand-500'} group-focus-visible:ring-2 group-focus-visible:ring-brand-700`}
              style={{ height: c.value > 0 ? `${Math.max((c.value / max) * 100, 3)}%` : 0 }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-500">
        <span>{columns[0]?.label}</span>
        <span>{columns[columns.length - 1]?.label}</span>
      </div>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: Array<Array<string | number>> }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-600 border-b border-slate-200">
            {head.map((h, i) => (
              <th key={h} className={`px-3 py-2 font-medium whitespace-nowrap ${i > 0 ? 'text-right' : ''}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((row) => (
            <tr key={row.join('|')} className="border-b border-slate-100 last:border-0">
              {row.map((cell, i) => (
                <td key={i} className={`px-3 py-2 whitespace-nowrap ${i > 0 ? 'text-right text-slate-900' : 'text-slate-700'}`}>
                  {typeof cell === 'number' ? count(cell) : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${count(n)} ${n === 1 ? one : many}`;
}

function NumbersView({ n }: { n: Numbers }) {
  const { people, texts, travel, reports } = n;
  const newestDays = [...n.days].reverse();
  const phones = n.phones.reduce((total, p) => total + p.count, 0);
  const onLatest = n.phones.filter((p) => (p.build ?? 0) >= APP_BUILD).reduce((total, p) => total + p.count, 0);
  const busiest = n.database && {
    reads: Math.max(0, ...n.database.days.map((d) => d.reads)),
    writes: Math.max(0, ...n.database.days.map((d) => d.writes)),
  };

  return (
    <>
      <Section
        title="People"
        note={`Accounts that sign in with email, Google or Apple, from when each last used the app. Not counted: ${plural(n.oldAnonymous, 'anonymous sign-in')} left from the old RoutePulse app.`}
      >
        <Tiles>
          <Tile label="Accounts" value={count(people.accounts)} />
          <Tile label="Used it, last 24 hours" value={count(people.last24h)} />
          <Tile label="Used it, last 7 days" value={count(people.last7d)} />
          <Tile label="Used it, last 30 days" value={count(people.last30d)} />
        </Tiles>
        <Meter
          label="Came back after their first day"
          part={people.cameBack}
          whole={people.couldComeBack}
          detail={`${count(people.cameBack)} of the ${plural(people.couldComeBack, 'account')} older than a day used the app again a day or more after joining`}
        />
        <Columns
          title="New accounts each week"
          columns={people.joinedByWeek.map((w) => ({
            key: w.weekEnding,
            label: `to ${dayLabel(w.weekEnding)}`,
            value: w.count,
            readout: `Week to ${dayLabel(w.weekEnding)}: ${plural(w.count, 'new account')}`,
          }))}
        />
        <p className="text-sm text-slate-600">
          Sign in with: {Object.entries(people.methods).sort((a, b) => b[1] - a[1]).map(([m, c]) => `${methodLabel(m)} ${count(c)}`).join(' · ') || 'nobody yet'}
        </p>
      </Section>

      <Section title="Trips, last 14 days" note="Dates in Nigeria. People means anyone who started a trip that day, test or real.">
        <Columns
          title="People who started a trip"
          columns={n.days.map((d) => ({
            key: d.date,
            label: dayLabel(d.date),
            value: d.people,
            readout: `${dayLabel(d.date)}: ${plural(d.people, 'person', 'people')}, ${plural(d.realTrips, 'real trip')}, ${count(d.testTrips)} test`,
          }))}
        />
        <Table
          head={['Day', 'People', 'Real trips', 'Test trips', 'Overdue', 'Km', 'SOS', 'Checkpoint stops', 'Road reports', 'Texts']}
          rows={newestDays.map((d) => [
            dayLabel(d.date), d.people, d.realTrips, d.testTrips, d.overdue, amount(d.km), d.sos, d.checkpointStops, d.roadReports, d.texts,
          ])}
        />
      </Section>

      <Section
        title="Travel and reports"
        note={
          <>
            Real trips ended with &ldquo;I&apos;ve arrived&rdquo;, since the beta began. Distance is measured along the
            route for {plural(travel.measured, 'trip')}; the other {plural(travel.trips - travel.measured, 'trip')}, from
            before that was switched on, count only the straight line from start to end or the farthest point, so the real
            distance is higher. A trip left running past its arrival time counts only up to that time.
          </>
        }
      >
        <Tiles>
          <Tile label="Kilometres travelled" value={amount(travel.km)} note={`${amount(travel.recentKm)} in the last 14 days`} />
          <Tile label="Hours on the move" value={amount(travel.hours)} note={`${amount(travel.recentHours)} in the last 14 days`} />
          <Tile
            label="Hours a week, per traveller"
            value={amount(travel.hoursPerTravellerWeekly)}
            note={`last 14 days, ${plural(travel.recentTravellers, 'person', 'people')} travelled`}
          />
          <Tile
            label="Typical trip"
            value={travel.medianMinutes === null ? '–' : minutesLabel(travel.medianMinutes)}
            note={travel.recentTrips > 0 ? `${amount(travel.recentKm / travel.recentTrips)} km on average, last 14 days` : 'no trips in the last 14 days'}
          />
        </Tiles>
        <Meter
          label="Ended before contacts were alerted"
          part={travel.endedOnTime}
          whole={travel.recentTrips}
          detail={`${count(travel.endedOnTime)} of ${plural(travel.recentTrips, 'real trip')} in the last 14 days`}
        />
        <Tiles>
          <Tile label="Road reports" value={count(reports.roadReports)} note={`${count(reports.recentRoadReports)} in the last 14 days`} />
          <Tile label="With photos" value={count(reports.withPhotos)} />
          <Tile label="Voted up by another tester" value={count(reports.votedUp)} />
          <Tile label="Checkpoint stops" value={count(reports.checkpointStops)} note={`${count(reports.recentCheckpointStops)} in the last 14 days`} />
        </Tiles>
        <Meter
          label="Added at least one contact"
          part={reports.withContacts}
          whole={people.accounts}
          detail={`${count(reports.withContacts)} of ${plural(people.accounts, 'account')}`}
        />
      </Section>

      <Section
        title={`Texts to contacts, last ${n.textDays} days`}
        note={texts.viaAfricasTalking > 0
          ? "Whether a text reached the phone is only known for texts sent through Africa's Talking."
          : "Whether a text reached the phone will show once texts go through Africa's Talking; Termii does not tell us."}
      >
        <Tiles>
          <Tile label="Texts sent" value={count(texts.sent)} note={`${plural(texts.messages, 'alert or message', 'alerts and messages')}`} />
          <Tile label="Reached the phone" value={count(texts.delivered)} note={`of ${count(texts.viaAfricasTalking)} through Africa's Talking`} />
          <Tile label="Did not reach it" value={count(texts.notDelivered)} note={`${count(texts.noReportYet)} with no report yet`} />
          <Tile label="Sent again through Termii" value={count(texts.resent)} />
        </Tiles>
        <p className="text-sm text-slate-600">
          Through Africa&apos;s Talking {count(texts.viaAfricasTalking)} · through Termii {count(texts.viaTermii)} ·
          refused by every provider {count(texts.notSent)} · held back while texting was off {count(texts.heldBack)}
        </p>
      </Section>

      <Section title="Phones by app build" note="Phones that allowed notifications, so not every phone.">
        <Meter
          label={`On the newest build (${APP_BUILD})`}
          part={onLatest}
          whole={phones}
          detail={`${count(onLatest)} of ${plural(phones, 'phone')}`}
        />
        <Table
          head={['Phone', 'App build', 'Phones']}
          rows={n.phones.map((p) => [platformLabel(p.platform), p.build === null ? '22 or older' : String(p.build), p.count])}
        />
      </Section>

      <Section
        title="Database, last 7 days"
        note="Google lets a set number of reads and writes go free each day; past that it charges a little."
      >
        {n.database && busiest ? (
          <>
            <div className="grid md:grid-cols-2 gap-3">
              <Meter
                limit
                label="Reads on the busiest day"
                part={busiest.reads}
                whole={n.database.freeReadsPerDay}
                detail={`${count(busiest.reads)} of ${count(n.database.freeReadsPerDay)} free`}
              />
              <Meter
                limit
                label="Writes on the busiest day"
                part={busiest.writes}
                whole={n.database.freeWritesPerDay}
                detail={`${count(busiest.writes)} of ${count(n.database.freeWritesPerDay)} free`}
              />
            </div>
            <Table
              head={['24 hours to', 'Reads', 'Writes']}
              rows={[...n.database.days].reverse().map((d) => [momentLabel(d.endMs), d.reads, d.writes])}
            />
          </>
        ) : (
          <p className="text-sm text-slate-600">Google Cloud&apos;s figures could not be read just now. Refresh to try again.</p>
        )}
      </Section>
    </>
  );
}

type Access = 'checking' | 'signed-out' | 'not-admin' | 'admin';

/** Whether the signed-in account may see the numbers, read from its admin claim */
function useNumbersAccess(): { access: Access; email: string | null } {
  const { uid, ready, email, isAnonymous } = useAuthedUser();
  const [claim, setClaim] = useState<{ uid: string; admin: boolean } | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!ready || !uid || !user || user.uid !== uid) return;
    let live = true;
    // Asked fresh, so rights given since the last sign-in count straight away
    user.getIdTokenResult(true)
      .then((token) => { if (live) setClaim({ uid, admin: token.claims.admin === true }); })
      .catch(() => { if (live) setClaim({ uid, admin: false }); });
    return () => {
      live = false;
    };
  }, [ready, uid]);

  if (!ready) return { access: 'checking', email: null };
  if (!uid || isAnonymous) return { access: 'signed-out', email: null };
  if (claim?.uid !== uid) return { access: 'checking', email };
  return { access: claim.admin ? 'admin' : 'not-admin', email };
}

/** Shown instead of the numbers to anyone who cannot see them */
function NoAccess({ access, email }: { access: 'signed-out' | 'not-admin'; email: string | null }) {
  const [signingIn, setSigningIn] = useState(false);
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-lg border border-slate-200 p-6 text-center">
        <h1 className="text-xl font-semibold text-slate-900">
          {access === 'signed-out' ? 'Sign in to see the numbers' : 'This account cannot see the numbers'}
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          {access === 'signed-out'
            ? "This page is for WakaGuard's owner. Sign in with your admin account."
            : `You are signed in as ${email ?? 'an account'}, which is not an admin account. Sign out, then sign in with your admin account.`}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          {access === 'signed-out' ? (
            <button
              type="button"
              onClick={() => setSigningIn(true)}
              className="w-full px-4 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700"
            >
              Sign in
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void signOut(auth)}
              className="w-full px-4 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700"
            >
              Sign out
            </button>
          )}
          <Link href="/" className="w-full px-4 py-2.5 text-sm text-slate-700 rounded-lg hover:bg-slate-100">
            Go to the home page
          </Link>
        </div>
      </div>
      <AuthModal isOpen={signingIn} onClose={() => setSigningIn(false)} />
    </div>
  );
}

export default function AdminNumbersPage() {
  const { access, email } = useNumbersAccess();
  const isAdmin = access === 'admin';
  const [numbers, setNumbers] = useState<Numbers | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const answer = await httpsCallable<void, Numbers>(functions, 'adminNumbers', { timeout: 60000 })();
      setNumbers(answer.data);
    } catch (err) {
      console.error('Could not load the numbers:', err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const start = setTimeout(() => void load(), 0);
    return () => clearTimeout(start);
  }, [isAdmin, load]);

  if (access === 'signed-out' || access === 'not-admin') return <NoAccess access={access} email={email} />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Checking your account…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1 basis-64">
            <h1 className="text-2xl font-semibold text-slate-900">Numbers</h1>
            <p className="text-sm text-slate-600">
              Counts only.
              {numbers && numbers.leftOut > 0 && ` Your own ${plural(numbers.leftOut, 'account')} ${numbers.leftOut === 1 ? 'is' : 'are'} left out.`}
              {numbers && ` As of ${momentLabel(numbers.asOfMs)}, Nigeria time.`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/admin/mod" className="px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-100">Moderation</Link>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className={`mx-auto max-w-5xl px-4 py-6 space-y-10 ${loading && numbers ? 'opacity-60' : ''}`}>
        {failed && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            The numbers could not be loaded. Check your connection and press Refresh.
          </p>
        )}
        {numbers ? <NumbersView n={numbers} /> : !failed && <p className="text-slate-600">Working out the numbers…</p>}
      </main>
    </div>
  );
}
