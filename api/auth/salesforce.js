const { consentUrl } = require('../_lib/salesforce');
const { requireAuth } = require('../_lib/guard');

module.exports = requireAuth(async (req, res) => {
  try {
    res.writeHead(302, { Location: consentUrl() });
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
