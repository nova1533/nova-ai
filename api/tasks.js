const { google } = require('googleapis');
const { authClient } = require('./_lib/google');
const { requireAuth } = require('./_lib/guard');

/**
 * Buckets a due date the way the dashboard's task rows expect: a short label,
 * plus a sort weight so undated tasks fall to the end instead of the front.
 */
function dueInfo(due, tz) {
  if (!due) return { label: '—', weight: Infinity };
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dueDay - today) / 86400000);

  let label;
  if (diffDays < 0) label = 'Overdue';
  else if (diffDays === 0) label = 'Today';
  else if (diffDays === 1) label = 'Tomorrow';
  else label = dueDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: tz });

  return { label, weight: diffDays };
}

async function readList(tasksApi, listId, tz) {
  const res = await tasksApi.tasks.list({
    tasklist: listId,
    showCompleted: false,
    showHidden: false,
    maxResults: 100,
  });
  return (res.data.items || [])
    .filter(t => t.status !== 'completed')
    .map(t => {
      const { label, weight } = dueInfo(t.due, tz);
      return { id: t.id, listId, title: t.title, due: label, _weight: weight, done: false };
    })
    .sort((a, b) => a._weight - b._weight)
    .map(({ _weight, ...t }) => t);
}

module.exports = requireAuth(async (req, res) => {
  try {
    const auth = await authClient();
    const tasksApi = google.tasks({ version: 'v1', auth });
    const tz = process.env.TIMEZONE || 'America/Chicago';

    const listRes = await tasksApi.tasklists.list({ maxResults: 20 });
    const lists = listRes.data.items || [];
    const bizList = lists.find(l => l.title.trim().toLowerCase() === 'work');
    const personalList = lists.find(l => l.title.trim().toLowerCase() === 'personal');

    const [bizTasks, personalTasks] = await Promise.all([
      bizList ? readList(tasksApi, bizList.id, tz) : [],
      personalList ? readList(tasksApi, personalList.id, tz) : [],
    ]);

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ bizTasks, personalTasks, fetchedAt: new Date().toISOString() });
  } catch (err) {
    if (err.code === 'NOT_CONNECTED') {
      res.status(428).json({ error: 'not_connected', message: 'Google is not connected yet.' });
      return;
    }
    res.status(500).json({ error: 'tasks_read_failed', message: err.message });
  }
});
