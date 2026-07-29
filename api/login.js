const { checkPassword, sessionCookie, isAuthed } = require('./_lib/guard');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    res.status(200).json({ authed: isAuthed(req) });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

  try {
    if (!checkPassword(body.password)) {
      res.status(401).json({ error: 'wrong password' });
      return;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
    return;
  }

  res.setHeader('Set-Cookie', sessionCookie());
  res.status(200).json({ authed: true });
};
