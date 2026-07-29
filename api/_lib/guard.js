/**
 * A single shared password for the dashboard.
 *
 * The dashboard shows revenue, equity and property addresses at a public URL,
 * so every data endpoint is gated. The check happens on the server — a password
 * checked in the browser would be trivially bypassed by viewing the page source.
 *
 * The cookie holds an HMAC rather than the password itself, so the password
 * never travels back and forth after the initial login.
 */
const crypto = require('crypto');

const COOKIE = 'bozdash';
const MAX_AGE_DAYS = 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET is not set.');
  return s;
}

function expectedToken() {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) throw new Error('DASHBOARD_PASSWORD is not set.');
  return crypto.createHmac('sha256', secret()).update(password).digest('hex');
}

/** Constant-time compare so the response time doesn't leak how much matched. */
function sameToken(a, b) {
  const bufA = Buffer.from(String(a || ''), 'utf8');
  const bufB = Buffer.from(String(b || ''), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function checkPassword(submitted) {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) throw new Error('DASHBOARD_PASSWORD is not set.');
  const a = crypto.createHash('sha256').update(String(submitted || '')).digest();
  const b = crypto.createHash('sha256').update(password).digest();
  return crypto.timingSafeEqual(a, b);
}

function sessionCookie() {
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
  return `${COOKIE}=${expectedToken()}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

function isAuthed(req) {
  try {
    return sameToken(readCookie(req, COOKIE), expectedToken());
  } catch {
    return false;
  }
}

/** Wraps a handler so it returns 401 unless the caller has a valid session. */
function requireAuth(handler) {
  return async (req, res) => {
    if (!isAuthed(req)) {
      res.status(401).json({ error: 'locked' });
      return;
    }
    return handler(req, res);
  };
}

module.exports = { requireAuth, isAuthed, checkPassword, sessionCookie, COOKIE };
