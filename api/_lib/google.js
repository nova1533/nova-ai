/**
 * Google OAuth + token storage, adapted from Nova's index.js.
 *
 * Differences from the original: adds the Sheets scope (read-only) so the
 * dashboard can read the deal tracker, and uses Supabase's secret key so it
 * still works once Row Level Security is switched on.
 */
const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');

const USER_ID = 'boz';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/userinfo.email',
];

function supabase() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_KEY;
  if (!process.env.SUPABASE_URL || !key) {
    throw new Error('Supabase is not configured — set SUPABASE_URL and SUPABASE_SECRET_KEY.');
  }
  return createClient(process.env.SUPABASE_URL, key, { auth: { persistSession: false } });
}

function oauthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error('Google is not configured — set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI.');
  }
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

function consentUrl() {
  return oauthClient().generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',          // forces a refresh token on every reconnect
    include_granted_scopes: true,
  });
}

async function saveTokens(tokens) {
  const db = supabase();
  // A re-consent may omit the refresh token; never overwrite a good one with null.
  const patch = {
    user_id: USER_ID,
    access_token: tokens.access_token,
    expiry_date: tokens.expiry_date,
  };
  if (tokens.refresh_token) patch.refresh_token = tokens.refresh_token;
  const { error } = await db.from('google_tokens').upsert(patch, { onConflict: 'user_id' });
  if (error) throw new Error('Could not save Google tokens: ' + error.message);
}

async function loadTokens() {
  const db = supabase();
  const { data, error } = await db.from('google_tokens').select('*').eq('user_id', USER_ID).maybeSingle();
  if (error) throw new Error('Could not read Google tokens: ' + error.message);
  return data;
}

async function exchangeCode(code) {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  await saveTokens(tokens);
  return tokens;
}

/** Returns an authorised client, refreshing the access token when it's close to expiring. */
async function authClient() {
  const tokens = await loadTokens();
  if (!tokens || !tokens.refresh_token) {
    const err = new Error('Google is not connected yet.');
    err.code = 'NOT_CONNECTED';
    throw err;
  }
  const client = oauthClient();
  client.setCredentials(tokens);

  if (!tokens.expiry_date || Date.now() > tokens.expiry_date - 60_000) {
    const { credentials } = await client.refreshAccessToken();
    await saveTokens(credentials);
    client.setCredentials(credentials);
  }
  return client;
}

/** Which Google account this is actually connected to. */
async function connectedEmail() {
  const auth = await authClient();
  const { data } = await google.oauth2({ version: 'v2', auth }).userinfo.get();
  return data.email;
}

module.exports = { SCOPES, consentUrl, exchangeCode, authClient, loadTokens, connectedEmail, supabase };
