/**
 * Turns the raw rows of the CFD deal tracker into the portfolio card's data.
 *
 * Everything here is computed from the DEAL-BY-DEAL SUMMARY table, never from
 * the sheet's own summary boxes — those don't reconcile with the deal rows
 * (see the sheet-audit task). Keeping the math here means the dashboard stays
 * internally consistent regardless of what the summary formulas say.
 */

/** "$86,000" -> 86000 · "($95,132)" -> -95132 · "-" / "" -> 0 */
function money(raw) {
  if (raw === null || raw === undefined) return 0;
  const s = String(raw).trim();
  if (!s || s === '-' || s === '—') return 0;
  const negative = /^\(.*\)$/.test(s);
  const n = parseFloat(s.replace(/[($),\s]/g, '').replace(/[^0-9.\-]/g, ''));
  if (!isFinite(n)) return 0;
  return negative ? -Math.abs(n) : n;
}

/** Boz owns partner deals 50/50; his own deals outright. */
function ownershipShare(owner) {
  return String(owner || '').trim().toLowerCase() === 'boz only' ? 1 : 0.5;
}

/** "Sold" in this sheet means the property is producing income, not exited. */
const PERFORMING = 'Sold';
const DISPLAY_STAGE = { [PERFORMING]: 'Performing' };

/** Stages that represent future income rather than current income. */
const PIPELINE_STAGES = ['Under Contract', 'Under Construction', 'Listed for Sale'];

const HEADERS = ['Address', 'Stage', 'Owner', 'Type', 'Cost Basis', 'Current Val', 'Equity', 'Mo. CF', 'Your Share'];

/**
 * Locates the deal table inside a whole-tab dump. The table's position shifts
 * as Boz edits the sheet above it, so we find it by its headers rather than
 * assuming a fixed range.
 */
function findHeaderRow(rows) {
  for (let i = 0; i < rows.length; i++) {
    const cells = (rows[i] || []).map(c => String(c || '').trim());
    if (cells.includes('Address') && cells.includes('Stage') && cells.includes('Owner')) {
      const index = {};
      for (const h of HEADERS) {
        const at = cells.indexOf(h);
        if (at !== -1) index[h] = at;
      }
      return { rowIndex: i, index };
    }
  }
  return null;
}

/** The table is padded with blank template rows; stop treating those as deals. */
function isRealDeal(address) {
  const s = String(address || '').trim();
  return s !== '' && s !== '0';
}

function usd(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

/**
 * @param {Array<Array<string>>} rows - values from the tab holding the deal table
 * @returns {{kpis: Array, properties: Array, meta: Object}}
 */
function buildPortfolio(rows) {
  const header = findHeaderRow(rows || []);
  if (!header) {
    throw new Error('Could not find the deal table — no row with Address / Stage / Owner headers.');
  }

  const { index } = header;
  const cell = (row, name) => (index[name] === undefined ? '' : row[index[name]]);

  const deals = [];
  for (let i = header.rowIndex + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const address = cell(row, 'Address');
    if (!isRealDeal(address)) continue;

    const stage = String(cell(row, 'Stage') || '').trim();
    const owner = String(cell(row, 'Owner') || '').trim();
    deals.push({
      address: String(address).trim(),
      stage,
      owner,
      type: String(cell(row, 'Type') || '').trim(),
      equity: money(cell(row, 'Equity')),
      monthlyTotal: money(cell(row, 'Mo. CF')),
      monthlyMine: money(cell(row, 'Your Share')),
      share: ownershipShare(owner),
    });
  }

  const performing = deals.filter(d => d.stage === PERFORMING);
  const pipeline = deals.filter(d => PIPELINE_STAGES.includes(d.stage));

  // "Your Share" is already Boz's half, so it's summed directly. "Equity" is the
  // full deal value, so it gets the ownership multiplier applied here.
  const myMonthly = performing.reduce((sum, d) => sum + d.monthlyMine, 0);
  const potentialMonthly = pipeline.reduce((sum, d) => sum + d.monthlyMine, 0);
  const myEquity = deals.reduce((sum, d) => sum + d.equity * d.share, 0);
  const myAnnual = myMonthly * 12;

  const properties = deals.map(d => ({
    addr: d.address,
    owner: d.owner,
    stage: DISPLAY_STAGE[d.stage] || d.stage,
    amount: d.monthlyMine > 0 ? usd(d.monthlyMine) + '/mo' : '—',
    due: d.stage === PERFORMING ? 'performing' : 'projected',
    late: 0, // no payment feed yet — reserved for when ACH is connected
  }));

  // Performing first, then the pipeline in the order it progresses.
  const order = ['Performing', 'Listed for Sale', 'Under Construction', 'Under Contract'];
  properties.sort((a, b) => {
    const rank = order.indexOf(a.stage) - order.indexOf(b.stage);
    if (rank !== 0) return rank;
    return money(b.amount) - money(a.amount);
  });

  return {
    kpis: [
      { label: 'My Monthly Cashflow', value: usd(myMonthly),   sub: `${performing.length} performing`,        accent: 'teal' },
      { label: 'Potential Monthly',   value: usd(potentialMonthly), sub: `${pipeline.length} in the pipeline`, accent: 'orange' },
      { label: 'My Equity',           value: usd(myEquity),    sub: `across ${deals.length} properties`,      accent: 'gold' },
      { label: 'My Annual Revenue',   value: usd(myAnnual),    sub: 'at current cashflow',                    accent: 'teal' },
    ],
    properties,
    meta: {
      dealCount: deals.length,
      performingCount: performing.length,
      pipelineCount: pipeline.length,
      myMonthly, potentialMonthly, myEquity, myAnnual,
    },
  };
}

module.exports = { buildPortfolio, money, ownershipShare, findHeaderRow };
