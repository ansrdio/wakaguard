'use client';

/**
 * "Your points this week" on Profile (build 27): this week's points in the
 * beta ranking, what counted, and why the last trip that earned nothing did
 * not, with what to do next time. Hidden when the app config says so
 * (weeklyPoints: false), for when the ranking ends.
 */

import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { fetchMyWeek } from '@/lib/myWeek';
import { MyWeek, missedLine, weekEnds, weekLines } from '@/lib/myWeekWords';

export function WeeklyPointsCard() {
  const [week, setWeek] = useState<MyWeek | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    fetchMyWeek()
      .then((w) => { if (live) setWeek(w); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, []);

  // Offline or an older server: the rest of Profile is unaffected
  if (failed) return null;

  const missed = week ? missedLine(week) : null;
  return (
    <section className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" aria-busy={!week}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <Trophy className="w-5 h-5 text-brand-700" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-slate-900 dark:text-white font-medium">Your points this week</h2>
          {week ? (
            weekLines(week).map((line) => (
              <p key={line} className="text-xs text-slate-500 dark:text-slate-400">{line}</p>
            ))
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">Counting your week…</p>
          )}
        </div>
        {week && <p className="text-3xl font-bold text-slate-900 dark:text-white" aria-label={`${week.points} points`}>{week.points}</p>}
      </div>
      {missed && <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">{missed}</p>}
      {week && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          The week ends {weekEnds(week)}, Nigeria time. Problem reports you send are added then, and the full list goes in the group.
        </p>
      )}
    </section>
  );
}
