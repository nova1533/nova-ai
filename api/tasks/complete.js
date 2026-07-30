const { google } = require('googleapis');
const { authClient } = require('../_lib/google');
const { requireAuth } = require('../_lib/guard');

module.exports = requireAuth(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { listId, taskId } = body;
  if (!listId || !taskId) {
    res.status(400).json({ error: 'listId and taskId are required' });
    return;
  }

  try {
    const auth = await authClient();
    const tasksApi = google.tasks({ version: 'v1', auth });
    await tasksApi.tasks.patch({
      tasklist: listId,
      task: taskId,
      requestBody: { status: 'completed' },
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    if (err.code === 'NOT_CONNECTED') {
      res.status(428).json({ error: 'not_connected', message: 'Google is not connected yet.' });
      return;
    }
    res.status(500).json({ error: 'tasks_complete_failed', message: err.message });
  }
});
