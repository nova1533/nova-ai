const { supabase } = require('./_lib/google');
const { requireAuth } = require('./_lib/guard');

const USER_ID = 'boz';
const ACCENTS = ['orange', 'teal', 'gold'];
const MONTH_DAY = { month: 'short', day: 'numeric', timeZone: 'UTC' };

function todayStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(new Date());
}

/** `date` is a plain DATE column (no time), so UTC math avoids timezone drift. */
function shapeRow(row, i) {
  const dueDate = new Date(row.date + 'T00:00:00Z');
  const days = Math.round((dueDate - new Date(todayStr() + 'T00:00:00Z')) / 86400000);
  return {
    id: row.id,
    label: row.label,
    rawDate: row.date,
    date: dueDate.toLocaleDateString('en-US', MONTH_DAY),
    plan: row.plan || '',
    days,
    accent: ACCENTS[i % ACCENTS.length],
  };
}

module.exports = requireAuth(async (req, res) => {
  const db = supabase();

  try {
    if (req.method === 'GET') {
      const { data, error } = await db
        .from('important_dates')
        .select('*')
        .eq('user_id', USER_ID)
        .gte('date', todayStr())
        .order('date', { ascending: true });
      if (error) throw error;
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ dates: data.map(shapeRow) });
      return;
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    if (req.method === 'POST') {
      const { label, date, plan } = body;
      if (!label || !date) { res.status(400).json({ error: 'label and date are required' }); return; }
      const { error } = await db.from('important_dates').insert({ user_id: USER_ID, label, date, plan: plan || null });
      if (error) throw error;
      res.status(200).json({ ok: true });
      return;
    }

    if (req.method === 'PATCH') {
      const { id, label, date, plan } = body;
      if (!id || !label || !date) { res.status(400).json({ error: 'id, label and date are required' }); return; }
      const { error } = await db.from('important_dates')
        .update({ label, date, plan: plan || null })
        .eq('id', id).eq('user_id', USER_ID);
      if (error) throw error;
      res.status(200).json({ ok: true });
      return;
    }

    if (req.method === 'DELETE') {
      const { id } = body;
      if (!id) { res.status(400).json({ error: 'id is required' }); return; }
      const { error } = await db.from('important_dates').delete().eq('id', id).eq('user_id', USER_ID);
      if (error) throw error;
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    res.status(500).json({ error: 'dates_failed', message: err.message });
  }
});
