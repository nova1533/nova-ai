const { supabase } = require('./_lib/google');
const { requireAuth } = require('./_lib/guard');

/**
 * Reads/writes daily habit completions and derives each habit's current
 * streak from the log history — there's no stored "streak" number, since a
 * stored counter would drift from reality the moment a day is missed.
 */

const USER_ID = 'boz';
const HABITS = [
  { id: 'breath', name: 'Breathwork',    accent: 'teal',   kind: 'check' },
  { id: 'steps',  name: 'Steps',         accent: 'orange', kind: 'count', goal: 10000 },
  { id: 'gym',    name: 'Gym Session',   accent: 'orange', kind: 'check' },
];
const LOOKBACK_DAYS = 400;

function todayStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(new Date());
}

function addDays(dateStr, delta) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + delta);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(d);
}

/** Consecutive done days ending today. Today not being logged yet doesn't break the streak. */
function computeStreak(logsByDate) {
  const today = todayStr();
  let cursor = logsByDate.get(today)?.done ? today : addDays(today, -1);
  let streak = 0;
  while (logsByDate.get(cursor)?.done) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function noteFor(habit, todayLog, logsByDate) {
  if (habit.kind === 'count') {
    return todayLog ? `${todayLog.value.toLocaleString()} logged today` : `Goal: ${habit.goal.toLocaleString()}/day`;
  }
  if (todayLog?.done) return 'Done today';
  let cursor = addDays(todayStr(), -1);
  for (let i = 0; i < LOOKBACK_DAYS; i++) {
    const log = logsByDate.get(cursor);
    if (log?.done) {
      const d = new Date(cursor + 'T00:00:00Z');
      return `Last: ${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
    }
    cursor = addDays(cursor, -1);
  }
  return 'Not logged yet';
}

module.exports = requireAuth(async (req, res) => {
  const db = supabase();

  try {
    if (req.method === 'GET') {
      const since = addDays(todayStr(), -LOOKBACK_DAYS);
      const { data, error } = await db
        .from('habit_logs')
        .select('*')
        .eq('user_id', USER_ID)
        .gte('date', since)
        .order('date', { ascending: false });
      if (error) throw error;

      const byHabit = new Map(HABITS.map(h => [h.id, new Map()]));
      for (const row of data) {
        const m = byHabit.get(row.habit_id);
        if (m) m.set(row.date, { done: row.done, value: row.value });
      }

      const today = todayStr();
      const habits = HABITS.map(h => {
        const logsByDate = byHabit.get(h.id);
        const todayLog = logsByDate.get(today);
        return {
          id: h.id,
          name: h.name,
          accent: h.accent,
          kind: h.kind,
          goal: h.goal || null,
          done: !!todayLog?.done,
          value: todayLog?.value ?? null,
          streak: computeStreak(logsByDate),
          note: noteFor(h, todayLog, logsByDate),
        };
      });

      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ habits });
      return;
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    if (req.method === 'POST') {
      const { habitId, done, value } = body;
      const habit = HABITS.find(h => h.id === habitId);
      if (!habit) { res.status(400).json({ error: 'unknown habitId' }); return; }

      const date = todayStr();
      let row;
      if (habit.kind === 'count') {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0) { res.status(400).json({ error: 'value must be a non-negative number' }); return; }
        row = { user_id: USER_ID, habit_id: habitId, date, value: n, done: n >= habit.goal };
      } else {
        row = { user_id: USER_ID, habit_id: habitId, date, done: !!done, value: null };
      }

      const { error } = await db.from('habit_logs').upsert(row, { onConflict: 'user_id,habit_id,date' });
      if (error) throw error;
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    res.status(500).json({ error: 'habits_failed', message: err.message });
  }
});
