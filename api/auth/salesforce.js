const { consentUrl, exchangeCode, connectedUser } = require('../_lib/salesforce');
const { requireAuth } = require('../_lib/guard');

/**
 * One file handles both ends of the Salesforce OAuth round trip — merged to
 * stay under Vercel Hobby's 12-serverless-function cap, since Salesforce's
 * redirect URI isn't locked in yet (no Connected App exists), so we're free
 * to point it at this same path instead of a separate /callback route.
 *
 * A request carrying `code` or `error` is Salesforce completing consent, so
 * it skips the auth gate (the dashboard password cookie isn't present on a
 * redirect that originates from Salesforce, not the browser tab).
 */

function page(title, detail) {
  return `<!doctype html><meta charset="utf-8">
<title>${title}</title>
<body style="font-family:system-ui;background:#0D1117;color:#EAF4FF;display:grid;place-items:center;height:100vh;margin:0">
<div style="text-align:center;max-width:32rem;padding:2rem">
<h2 style="font-weight:600">${title}</h2>
<p style="color:#93a6b8;line-height:1.5">${detail}</p>
<p><a href="/dashboard.html" style="color:#00E5FF">Back to the dashboard</a></p>
</div>`;
}

async function handleCallback(req, res) {
  const code = req.query && req.query.code;
  const oauthError = req.query && req.query.error;

  if (oauthError) {
    res.status(400).send(page('Connection cancelled', `Salesforce reported: ${oauthError}`));
    return;
  }
  try {
    await exchangeCode(code);
    const user = await connectedUser();
    res.status(200).send(page('Connected', `The dashboard is now reading from Salesforce as <strong>${user}</strong>.`));
  } catch (err) {
    res.status(500).send(page('Could not finish connecting', err.message));
  }
}

const startConsent = requireAuth(async (req, res) => {
  try {
    res.writeHead(302, { Location: consentUrl() });
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = async (req, res) => {
  const isCallback = (req.query && (req.query.code || req.query.error));
  if (isCallback) return handleCallback(req, res);
  return startConsent(req, res);
};
