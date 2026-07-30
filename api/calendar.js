const { google } = require('googleapis');
const { authClient } = require('./_lib/google');
const { requireAuth } = require('./_lib/guard');

const DAY_ABBR = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

/**
 * The week strip always runs Monday→Sunday regardless of what day it is
 * today, so figure out how far back Monday is (0 if today is Monday, 6 if
 * today is Sunday) using a noon-UTC anchor — same trick as the old Nova
 * day-bounds helper, avoids DST landing on the wrong side of midnight.
 */
function mondayOffset(tz) {
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
  const [year, month, day] = dateStr.split('-').map(Number);
  const noonUTC = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dow = noonUTC.getUTCDay(); // 0=Sun..6=Sat
  return { year, month, day, daysSinceMonday: (dow + 6) % 7 };
}

/** UTC instant for local midnight on `year-month-(day+offsetDays)` in `tz`. */
function localMidnightUTC(tz, year, month, day, offsetDays) {
  const noonUTC = new Date(Date.UTC(year, month - 1, day + offsetDays, 12, 0, 0));
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(noonUTC);
  const tzName = parts.find(p => p.type === 'timeZoneName').value;
  const m = tzName.match(/GMT([+-])(\d+)(?::(\d+))?/);
  const sign = m && m[1] === '+' ? 1 : -1;
  const offsetMs = m ? sign * (parseInt(m[2]) * 60 + parseInt(m[3] || 0)) * 60000 : 0;
  return new Date(Date.UTC(year, month - 1, day + offsetDays, 0, 0, 0) - offsetMs);
}

function compactTime(dateObj, tz) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(dateObj);
  const hour = parts.find(p => p.type === 'hour').value;
  const minute = parts.find(p => p.type === 'minute').value;
  const dayPeriod = parts.find(p => p.type === 'dayPeriod').value[0].toLowerCase();
  return minute === '00' ? `${hour}${dayPeriod}` : `${hour}:${minute}${dayPeriod}`;
}

module.exports = requireAuth(async (req, res) => {
  try {
    const tz = process.env.TIMEZONE || 'America/Chicago';
    const auth = await authClient();
    const calendar = google.calendar({ version: 'v3', auth });
    const { year, month, day, daysSinceMonday } = mondayOffset(tz);

    const weekStart = localMidnightUTC(tz, year, month, day, -daysSinceMonday);
    const weekEnd = localMidnightUTC(tz, year, month, day, -daysSinceMonday + 7);

    const calListRes = await calendar.calendarList.list({ minAccessRole: 'reader' });
    const calendarIds = (calListRes.data.items || []).map(c => c.id);

    const allItems = (await Promise.all(calendarIds.map(async calId => {
      try {
        const r = await calendar.events.list({
          calendarId: calId,
          timeMin: weekStart.toISOString(),
          timeMax: weekEnd.toISOString(),
          singleEvents: true,
          maxResults: 100,
          timeZone: tz,
        });
        return r.data.items || [];
      } catch { return []; }
    }))).flat();

    // A day's cell in the design shows a short time + title, so build that
    // once per event and bucket it by the event's local calendar date.
    const seen = new Set();
    const byDate = {};
    for (const e of allItems) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);

      const startRaw = e.start.dateTime || e.start.date;
      const startDate = new Date(startRaw);
      const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(startDate);
      const t = e.start.dateTime ? compactTime(startDate, tz) : '•';

      (byDate[dateKey] = byDate[dateKey] || []).push({
        t, label: e.summary || '(No title)', _sortMs: startDate.getTime(),
      });
    }
    for (const key of Object.keys(byDate)) {
      byDate[key].sort((a, b) => a._sortMs - b._sortMs).forEach(ev => delete ev._sortMs);
    }

    const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
    const week = DAY_ABBR.map((abbr, i) => {
      const d = localMidnightUTC(tz, year, month, day, -daysSinceMonday + i);
      const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d);
      const dateNum = Number(dateKey.slice(-2));
      return { day: abbr, date: dateNum, today: dateKey === todayKey, events: byDate[dateKey] || [] };
    });

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ week, fetchedAt: new Date().toISOString() });
  } catch (err) {
    if (err.code === 'NOT_CONNECTED') {
      res.status(428).json({ error: 'not_connected', message: 'Google is not connected yet.' });
      return;
    }
    res.status(500).json({ error: 'calendar_read_failed', message: err.message });
  }
});
