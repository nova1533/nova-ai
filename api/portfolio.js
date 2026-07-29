const { google } = require('googleapis');
const { authClient } = require('./_lib/google');
const { requireAuth } = require('./_lib/guard');
const { buildPortfolio } = require('./_lib/portfolio');

/**
 * Reads the CFD deal tracker and returns the Real Estate Portfolio card's data.
 *
 * The deal table's position moves as the sheet is edited, so rather than
 * hardcoding a range we pull each tab whole and let buildPortfolio find the
 * table by its column headers.
 */
async function readDealRows(auth, spreadsheetId) {
  const sheets = google.sheets({ version: 'v4', auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties.title' });
  const tabs = (meta.data.sheets || []).map(s => s.properties.title);
  if (!tabs.length) throw new Error('That spreadsheet has no tabs.');

  const ranges = tabs.map(t => `'${t.replace(/'/g, "''")}'`);
  const batch = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges,
    valueRenderOption: 'FORMATTED_VALUE',
  });

  // Use the first tab that actually contains the deal table.
  for (const range of batch.data.valueRanges || []) {
    const rows = range.values || [];
    try {
      const portfolio = buildPortfolio(rows);
      if (portfolio.meta.dealCount > 0) return portfolio;
    } catch {
      // this tab doesn't hold the table — try the next
    }
  }
  throw new Error('Could not find the deal table in any tab of that spreadsheet.');
}

module.exports = requireAuth(async (req, res) => {
  const spreadsheetId = process.env.CFD_SHEET_ID;
  if (!spreadsheetId) {
    res.status(500).json({ error: 'CFD_SHEET_ID is not set.' });
    return;
  }

  try {
    const auth = await authClient();
    const portfolio = await readDealRows(auth, spreadsheetId);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ ...portfolio, fetchedAt: new Date().toISOString() });
  } catch (err) {
    if (err.code === 'NOT_CONNECTED') {
      res.status(428).json({ error: 'not_connected', message: 'Google is not connected yet.' });
      return;
    }
    res.status(500).json({ error: 'sheet_read_failed', message: err.message });
  }
});
