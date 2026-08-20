const jsforce = require('jsforce');
const { supabase } = require('./google');

/**
 * Salesforce OAuth + token storage, mirroring the Google pattern in
 * `_lib/google.js`. A separate connection from the Claude/MCP Salesforce
 * access used during development — this is the credential the deployed
 * Vercel backend authenticates with on its own, so the dashboard works for
 * anyone who loads the page, not just an active Claude session.
 */

const USER_ID = 'boz';

function oauthClient() {
  const { SALESFORCE_CLIENT_ID, SALESFORCE_CLIENT_SECRET, SALESFORCE_REDIRECT_URI, SALESFORCE_LOGIN_URL } = process.env;
  if (!SALESFORCE_CLIENT_ID || !SALESFORCE_CLIENT_SECRET || !SALESFORCE_REDIRECT_URI) {
    throw new Error('Salesforce is not configured — set SALESFORCE_CLIENT_ID, SALESFORCE_CLIENT_SECRET and SALESFORCE_REDIRECT_URI.');
  }
  return new jsforce.OAuth2({
    loginUrl: SALESFORCE_LOGIN_URL || 'https://login.salesforce.com',
    clientId: SALESFORCE_CLIENT_ID,
    clientSecret: SALESFORCE_CLIENT_SECRET,
    redirectUri: SALESFORCE_REDIRECT_URI,
  });
}

function consentUrl() {
  return oauthClient().getAuthorizationUrl({ scope: 'api refresh_token', prompt: 'consent' });
}

async function saveTokens({ accessToken, refreshToken, instanceUrl }) {
  const db = supabase();
  const patch = { user_id: USER_ID, access_token: accessToken, instance_url: instanceUrl };
  if (refreshToken) patch.refresh_token = refreshToken;
  const { error } = await db.from('salesforce_tokens').upsert(patch, { onConflict: 'user_id' });
  if (error) throw new Error('Could not save Salesforce tokens: ' + error.message);
}

async function loadTokens() {
  const db = supabase();
  const { data, error } = await db.from('salesforce_tokens').select('*').eq('user_id', USER_ID).maybeSingle();
  if (error) throw new Error('Could not read Salesforce tokens: ' + error.message);
  return data;
}

async function exchangeCode(code) {
  const conn = new jsforce.Connection({ oauth2: oauthClient() });
  await conn.authorize(code);
  await saveTokens({ accessToken: conn.accessToken, refreshToken: conn.refreshToken, instanceUrl: conn.instanceUrl });
  return conn;
}

/** Returns an authorised connection. jsforce refreshes the access token itself on a 401 and emits 'refresh'. */
async function authClient() {
  const tokens = await loadTokens();
  if (!tokens || !tokens.refresh_token) {
    const err = new Error('Salesforce is not connected yet.');
    err.code = 'NOT_CONNECTED';
    throw err;
  }
  const conn = new jsforce.Connection({
    oauth2: oauthClient(),
    instanceUrl: tokens.instance_url,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
  });
  conn.on('refresh', (accessToken) => {
    saveTokens({ accessToken, refreshToken: tokens.refresh_token, instanceUrl: conn.instanceUrl }).catch(() => {});
  });
  return conn;
}

/** Which Salesforce user this is actually connected as. */
async function connectedUser() {
  const conn = await authClient();
  const identity = await conn.identity();
  return identity.display_name || identity.username;
}

module.exports = { consentUrl, exchangeCode, authClient, loadTokens, connectedUser };
