const { exchangeCode, connectedUser } = require('../_lib/salesforce');

/**
 * Salesforce sends the browser here after consent. Not password-gated, because
 * the redirect comes from Salesforce rather than the dashboard — but a code
 * that wasn't issued for this client simply fails the exchange.
 */
module.exports = async (req, res) => {
  const code = req.query && req.query.code;
  const oauthError = req.query && req.query.error;

  const page = (title, detail) => `<!doctype html><meta charset="utf-8">
<title>${title}</title>
<body style="font-family:system-ui;background:#0D1117;color:#EAF4FF;display:grid;place-items:center;height:100vh;margin:0">
<div style="text-align:center;max-width:32rem;padding:2rem">
<h2 style="font-weight:600">${title}</h2>
<p style="color:#93a6b8;line-height:1.5">${detail}</p>
<p><a href="/dashboard.html" style="color:#00E5FF">Back to the dashboard</a></p>
</div>`;

  if (oauthError) {
    res.status(400).send(page('Connection cancelled', `Salesforce reported: ${oauthError}`));
    return;
  }
  if (!code) {
    res.status(400).send(page('Something went wrong', 'Salesforce did not send an authorisation code.'));
    return;
  }

  try {
    await exchangeCode(code);
    const user = await connectedUser();
    res.status(200).send(page('Connected', `The dashboard is now reading from Salesforce as <strong>${user}</strong>.`));
  } catch (err) {
    res.status(500).send(page('Could not finish connecting', err.message));
  }
};
