const { supabase } = require('../_lib/google');

/**
 * Supabase's free tier pauses a project after 7 days with no database
 * activity. Vercel calls this once a day (Hobby plan cap) so the project
 * never goes quiet long enough to trigger that — a real read against a real
 * table, not just a ping, since that's what actually resets the timer.
 *
 * Not behind requireAuth: Vercel's cron invocation doesn't carry the
 * dashboard's session cookie. CRON_SECRET is the gate instead.
 */
module.exports = async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  try {
    const db = supabase();
    const { error } = await db.from('important_dates').select('id').limit(1);
    if (error) throw error;
    res.status(200).json({ ok: true, pinged: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'keepalive_failed', message: err.message });
  }
};
