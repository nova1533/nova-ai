const { authClient } = require('./_lib/salesforce');
const { supabase } = require('./_lib/google');
const { requireAuth } = require('./_lib/guard');

/**
 * Reads closed/projected wholesale profit from Salesforce.
 *
 * The real numbers live on Left_Main__Transactions__c, not the Opportunity
 * object — Opportunity's own money fields (Amount, Assignment_Fee__c,
 * Left_Main__Record_Value__c) are either unused or a flat placeholder.
 * Profit__c on the transaction holds the projected profit until a deal
 * closes, then gets manually updated to the actual profit from the
 * settlement statement — so the same field serves both purposes, and
 * Left_Main__Path__c/Left_Main__Dispo_Status__c = 'Closed/Won' is what
 * tells you which meaning currently applies.
 *
 * Also doubles as the daily Supabase keepalive ping (see the CRON_SECRET
 * branch below) — folded in here rather than its own route to stay under
 * Vercel Hobby's 12-serverless-function cap. Unrelated to Salesforce, but
 * cheap and harmless to share a file with.
 */

async function keepaliveSupabase(req, res) {
  try {
    const db = supabase();
    const { error } = await db.from('important_dates').select('id').limit(1);
    if (error) throw error;
    res.status(200).json({ ok: true, pinged: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'keepalive_failed', message: err.message });
  }
}

const MONTH_DAY = { month: 'short', day: 'numeric', timeZone: 'UTC' };

function usd(n) {
  return '$' + Math.round(n || 0).toLocaleString('en-US');
}

function todayStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(new Date());
}

function dealWord(n) {
  return n === 1 ? 'deal' : 'deals';
}

async function wholesalingHandler(req, res) {
  try {
    const conn = await authClient();

    const [closedYear, closedMonth, projected, upcoming] = await Promise.all([
      conn.query(`SELECT COUNT(Id) cnt, SUM(Profit__c) total FROM Left_Main__Transactions__c
        WHERE Left_Main__Path__c = 'Closed/Won' AND Left_Main__Dispo_Status__c = 'Closed/Won'
        AND Left_Main__Closing_Date__c = THIS_YEAR`),
      conn.query(`SELECT COUNT(Id) cnt, SUM(Profit__c) total FROM Left_Main__Transactions__c
        WHERE Left_Main__Path__c = 'Closed/Won' AND Left_Main__Dispo_Status__c = 'Closed/Won'
        AND Left_Main__Closing_Date__c = LAST_MONTH`),
      conn.query(`SELECT COUNT(Id) cnt, SUM(Profit__c) total FROM Left_Main__Transactions__c
        WHERE Left_Main__Path__c NOT IN ('Closed/Won','Contract Cancelled/Lost')
        AND Left_Main__Closing_Date__c = THIS_MONTH`),
      conn.query(`SELECT Id, Name, Left_Main__Closing_Date__c, Profit__c FROM Left_Main__Transactions__c
        WHERE Left_Main__Path__c NOT IN ('Closed/Won','Contract Cancelled/Lost')
        AND Left_Main__Closing_Date__c >= ${todayStr()}
        ORDER BY Left_Main__Closing_Date__c ASC LIMIT 5`),
    ]);

    const y = closedYear.records[0] || { cnt: 0, total: 0 };
    const m = closedMonth.records[0] || { cnt: 0, total: 0 };
    const p = projected.records[0] || { cnt: 0, total: 0 };

    const kpis = [
      { label: 'Closed This Year', value: usd(y.total), sub: `${y.cnt} ${dealWord(y.cnt)}`, accent: 'teal' },
      { label: 'Closed Last Month', value: usd(m.total), sub: `${m.cnt} ${dealWord(m.cnt)}`, accent: 'gold' },
      { label: 'Projected This Month', value: usd(p.total), sub: `${p.cnt} ${dealWord(p.cnt)}`, accent: 'orange' },
    ];

    const today = new Date(todayStr() + 'T00:00:00Z');
    const closings = upcoming.records.map(r => {
      const d = new Date(r.Left_Main__Closing_Date__c + 'T00:00:00Z');
      return {
        id: r.Id,
        address: r.Name,
        date: d.toLocaleDateString('en-US', MONTH_DAY),
        days: Math.round((d - today) / 86400000),
        profit: r.Profit__c != null ? usd(r.Profit__c) : 'TBD',
      };
    });

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ kpis, closings });
  } catch (err) {
    if (err.code === 'NOT_CONNECTED') {
      res.status(428).json({ error: 'not_connected', message: 'Salesforce is not connected yet.' });
      return;
    }
    res.status(500).json({ error: 'wholesaling_failed', message: err.message });
  }
}

const authedHandler = requireAuth(wholesalingHandler);

module.exports = async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return keepaliveSupabase(req, res);
  }
  return authedHandler(req, res);
};
