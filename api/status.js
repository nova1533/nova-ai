const { loadTokens, connectedEmail } = require('./_lib/google');
const { requireAuth } = require('./_lib/guard');

/** Health check: is Google connected, and to which account? */
module.exports = requireAuth(async (req, res) => {
  try {
    const tokens = await loadTokens();
    if (!tokens || !tokens.refresh_token) {
      res.status(200).json({ connected: false });
      return;
    }
    const email = await connectedEmail();
    res.status(200).json({
      connected: true,
      email,
      sheetConfigured: Boolean(process.env.CFD_SHEET_ID),
    });
  } catch (err) {
    res.status(200).json({ connected: false, error: err.message });
  }
});
