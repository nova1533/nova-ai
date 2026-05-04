require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });
const client = new Anthropic();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

async function loadTokens() {
  const { data } = await supabase
    .from('google_tokens')
    .select('*')
    .eq('user_id', 'boz')
    .single();
  return data;
}

async function saveTokens(tokens) {
  await supabase.from('google_tokens').upsert({
    user_id: 'boz',
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date
  });
}

async function getAuthClient() {
  const tokens = await loadTokens();
  if (!tokens) throw new Error('Nova is not connected to Google yet.');
  oauth2Client.setCredentials(tokens);
  if (tokens.expiry_date && Date.now() > tokens.expiry_date - 60000) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    await saveTokens(credentials);
    oauth2Client.setCredentials(credentials);
  }
  return oauth2Client;
}

async function getCalendarEvents(daysAhead = 7) {
  const auth = await getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  const now = new Date();
  const end = new Date();
  end.setDate(end.getDate() + daysAhead);
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 20
  });
  return response.data.items || [];
}

async function createCalendarEvent(summary, startDateTime, endDateTime, description = '') {
  const auth = await getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: {
      summary,
      description,
      start: { dateTime: startDateTime, timeZone: process.env.TIMEZONE || 'America/Chicago' },
      end: { dateTime: endDateTime, timeZone: process.env.TIMEZONE || 'America/Chicago' }
    }
  });
  return response.data;
}

async function getEmails(query = '', maxResults = 10) {
  const auth = await getAuthClient();
  const gmail = google.gmail({ version: 'v1', auth });
  const listResponse = await gmail.users.messages.list({ userId: 'me', q: query, maxResults });
  const messages = listResponse.data.messages || [];
  const emails = await Promise.all(messages.map(async (msg) => {
    const detail = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Date']
    });
    const headers = detail.data.payload.headers;
    const get = (name) => headers.find(h => h.name === name)?.value || '';
    return {
      id: msg.id,
      from: get('From'),
      subject: get('Subject'),
      date: get('Date'),
      snippet: detail.data.snippet
    };
  }));
  return emails;
}

async function sendEmail(to, subject, body) {
  const auth = await getAuthClient();
  const gmail = google.gmail({ version: 'v1', auth });
  const message = [`To: ${to}`, `Subject: ${subject}`, 'Content-Type: text/plain; charset=utf-8', '', body].join('\n');
  const encoded = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
  const response = await gmail.users.messages.send({ userId: 'me', resource: { raw: encoded } });
  return response.data;
}

const TOOLS = [
  {
    name: 'get_calendar_events',
    description: 'Get upcoming calendar events. Use when the user asks about their schedule, meetings, or what they have planned.',
    input_schema: {
      type: 'object',
      properties: {
        days_ahead: { type: 'number', description: 'How many days ahead to look. Default is 7.' }
      },
      required: []
    }
  },
  {
    name: 'create_calendar_event',
    description: 'Create a new calendar event. Only use this after the user has confirmed the details.',
    input_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Event title' },
        start_datetime: { type: 'string', description: 'Start time in ISO 8601 format, e.g. 2026-05-01T14:00:00' },
        end_datetime: { type: 'string', description: 'End time in ISO 8601 format' },
        description: { type: 'string', description: 'Optional event description' }
      },
      required: ['summary', 'start_datetime', 'end_datetime']
    }
  },
  {
    name: 'get_emails',
    description: 'Search and retrieve emails. Use when the user asks about emails or wants to find a specific message.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Gmail search query, e.g. "from:john@example.com" or "subject:deal"' },
        max_results: { type: 'number', description: 'Max emails to return. Default is 10.' }
      },
      required: []
    }
  },
  {
    name: 'send_email',
    description: 'Send an email. Only use this after explicitly confirming the recipient, subject, and full body with the user.',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject' },
        body: { type: 'string', description: 'Email body text' }
      },
      required: ['to', 'subject', 'body']
    }
  }
];

const SYSTEM_PROMPT = `You are Nova, a witty and confident voice assistant. Your job is not just to complete tasks — it's to be genuinely useful, occasionally entertaining, and always honest.

## Tone & personality
- Your default tone is witty and playful, but you read the room. Match the energy of the conversation — a quick task gets a quick, punchy reply; a complex problem gets a thorough one.
- You are confident and encouraging. You believe in the person you're helping and you're not afraid to show it.
- Your humor is dry and understated. A well-placed observation beats a punchline every time. Never force it.
- You refer to yourself as "I" — not "Nova" in third person, not "your assistant." Just "I."

## Response length
- Calibrate length to the task. Short question = short answer. Complex request = thorough response. Never pad, never truncate something that needs room to breathe.

## Clarifying questions
- Before starting any significant task, gather what you need upfront. Ask all your clarifying questions at once — don't drip them out one by one. Make it feel like a smart intake, not an interrogation.
- For simple, obvious requests, use good judgment and just proceed.

## Pushback & honesty
- If you think the user is wrong, making a mistake, or heading in a bad direction — say so. Directly, but not harshly. Back it up with a reason.
- You are not a yes-machine. Confidence means being honest even when it's inconvenient.
- Once you've flagged a concern and the user decides to proceed anyway, support them fully. You speak up once, clearly — then move on.

## Proactive behavior
- You don't narrate everything or volunteer opinions constantly. But if you notice something genuinely important that the user hasn't asked about, flag it briefly. Use judgment — not every observation needs to be said out loud.

## Handling emotions
- If the user is frustrated, stressed, or venting, acknowledge it briefly and genuinely — one sentence is usually enough. Then pivot to solutions. Don't dwell, don't over-therapize, don't ignore it entirely.

## Hard rules
- Always confirm before taking any irreversible action. State what you're about to do and wait for a green light.
- Never be sycophantic. Don't open with "Great question!" or "Absolutely!" — just answer.
- Never pretend to know something you don't. A confident "I'm not sure, let me think through that" beats a confident wrong answer.

## Speech mode
- Always respond in natural spoken sentences. No markdown, no bullet points, no headers, no symbols like asterisks or dashes. Write exactly as you would speak it out loud.`;

app.get('/auth/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/tasks'
    ],
    prompt: 'consent'
  });
  res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await oauth2Client.getToken(code);
    await saveTokens(tokens);
    res.send('<h2>Nova is now connected to your Google account.</h2><p>You can close this tab.</p>');
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).send('Something went wrong connecting to Google.');
  }
});

app.get('/auth/status', async (req, res) => {
  const tokens = await loadTokens();
  res.json({ connected: !!tokens });
});

app.delete('/conversations/:session_id', async (req, res) => {
  try {
    await supabase.from('messages').delete().eq('session_id', req.params.session_id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/conversations', async (req, res) => {
  try {
    const offset = parseInt(req.query.offset) || 0;
    const limit  = parseInt(req.query.limit)  || 20;

    const { data } = await supabase
      .from('messages')
      .select('session_id, content, created_at')
      .eq('role', 'user')
      .order('created_at', { ascending: true });

    const sessionMap = {};
    for (const msg of data || []) {
      if (!sessionMap[msg.session_id]) {
        sessionMap[msg.session_id] = {
          session_id: msg.session_id,
          preview: msg.content.length > 60 ? msg.content.slice(0, 60) + '…' : msg.content,
          created_at: msg.created_at
        };
      }
    }

    const sessions = Object.values(sessionMap)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({
      sessions: sessions.slice(offset, offset + limit),
      hasMore: sessions.length > offset + limit
    });
  } catch (err) {
    console.error('conversations error:', err.message);
    res.json({ sessions: [], hasMore: false });
  }
});

app.get('/calendar/debug', async (req, res) => {
  try {
    const tz = process.env.TIMEZONE || 'America/Chicago';
    const auth = await getAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });
    const calListResponse = await calendar.calendarList.list({ showHidden: true });
    const calItems = calListResponse.data.items || [];

    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay   = new Date(); endOfDay.setHours(23, 59, 59, 999);

    const result = await Promise.all(calItems.map(async c => {
      try {
        const r = await calendar.events.list({
          calendarId: c.id,
          timeMin: startOfDay.toISOString(),
          timeMax: endOfDay.toISOString(),
          singleEvents: true,
          maxResults: 20,
          timeZone: tz
        });
        return {
          calendar: c.summary,
          eventCount: (r.data.items || []).length,
          events: (r.data.items || []).map(e => ({ title: e.summary, start: e.start.dateTime || e.start.date, status: e.status }))
        };
      } catch (err) {
        return { calendar: c.summary, error: err.message };
      }
    }));

    res.json(result);
  } catch (err) {
    res.json({ error: err.message });
  }
});

function getDayBoundsInTZ(tz, offsetDays = 0) {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now);
  const [year, month, day] = dateStr.split('-').map(Number);
  const noonUTC = new Date(Date.UTC(year, month - 1, day + offsetDays, 12, 0, 0));
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(noonUTC);
  const tzName = parts.find(p => p.type === 'timeZoneName').value;
  const m = tzName.match(/GMT([+-])(\d+)(?::(\d+))?/);
  const sign = m && m[1] === '+' ? 1 : -1;
  const offsetMs = m ? sign * (parseInt(m[2]) * 60 + parseInt(m[3] || 0)) * 60000 : 0;
  return {
    startOfDay: new Date(Date.UTC(year, month - 1, day + offsetDays, 0, 0, 0) - offsetMs),
    endOfDay:   new Date(Date.UTC(year, month - 1, day + offsetDays, 23, 59, 59, 999) - offsetMs),
  };
}

app.get('/calendar/today', async (req, res) => {
  try {
    const tz = process.env.TIMEZONE || 'America/Chicago';
    const auth = await getAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });
    const { startOfDay, endOfDay } = getDayBoundsInTZ(tz, 0);

    const calListResponse = await calendar.calendarList.list({ minAccessRole: 'reader' });
    const calendarIds = (calListResponse.data.items || []).map(c => c.id);

    const allItems = (await Promise.all(calendarIds.map(async calId => {
      try {
        const r = await calendar.events.list({
          calendarId: calId,
          timeMin: startOfDay.toISOString(),
          timeMax: endOfDay.toISOString(),
          singleEvents: true,
          maxResults: 20,
          timeZone: tz
        });
        return r.data.items || [];
      } catch { return []; }
    }))).flat();

    const seen = new Set();
    const now = Date.now();

    const events = allItems
      .filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; })
      .map(e => {
        const startRaw = e.start.dateTime || e.start.date;
        const endRaw   = e.end.dateTime   || e.end.date;
        const startMs  = new Date(startRaw).getTime();
        const endMs    = new Date(endRaw).getTime();

        const timeStr = e.start.dateTime
          ? new Date(startRaw).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz })
          : 'All day';

        let status = '';
        if (endMs < now)         status = 'done';
        else if (startMs <= now) status = 'now';

        const durationMin = Math.round((endMs - startMs) / 60000);
        const durationStr = durationMin >= 60
          ? `${Math.floor(durationMin / 60)}h${durationMin % 60 ? ' ' + (durationMin % 60) + 'm' : ''}`
          : `${durationMin} min`;

        const sub = [durationStr, e.location].filter(Boolean).join(' · ');

        return {
          time: timeStr,
          title: e.summary || '(No title)',
          sub: sub || null,
          status,
          startMs,
          tag:     status === 'now' ? 'Live' : null,
          tagKind: status === 'now' ? 'live' : null
        };
      })
      .sort((a, b) => a.startMs - b.startMs)
      .map(({ startMs, ...e }) => e);

    res.json({ events });
  } catch (err) {
    console.error('calendar/today error:', err.message);
    res.json({ events: [] });
  }
});

app.get('/calendar/tomorrow', async (req, res) => {
  try {
    const tz = process.env.TIMEZONE || 'America/Chicago';
    const auth = await getAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });
    const { startOfDay, endOfDay } = getDayBoundsInTZ(tz, 1);

    const calListResponse = await calendar.calendarList.list({ minAccessRole: 'reader' });
    const calendarIds = (calListResponse.data.items || []).map(c => c.id);

    const allItems = (await Promise.all(calendarIds.map(async calId => {
      try {
        const r = await calendar.events.list({
          calendarId: calId,
          timeMin: startOfDay.toISOString(),
          timeMax: endOfDay.toISOString(),
          singleEvents: true,
          maxResults: 20,
          timeZone: tz
        });
        return r.data.items || [];
      } catch { return []; }
    }))).flat();

    const seen = new Set();
    const events = allItems
      .filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; })
      .map(e => {
        const startRaw = e.start.dateTime || e.start.date;
        const endRaw   = e.end.dateTime   || e.end.date;
        const startMs  = new Date(startRaw).getTime();
        const endMs    = new Date(endRaw).getTime();
        const timeStr  = e.start.dateTime
          ? new Date(startRaw).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz })
          : 'All day';
        const durationMin = Math.round((endMs - startMs) / 60000);
        const durationStr = durationMin >= 60
          ? `${Math.floor(durationMin / 60)}h${durationMin % 60 ? ' ' + (durationMin % 60) + 'm' : ''}`
          : `${durationMin} min`;
        return { time: timeStr, title: e.summary || '(No title)', sub: [durationStr, e.location].filter(Boolean).join(' · ') || null, startMs };
      })
      .sort((a, b) => a.startMs - b.startMs)
      .map(({ startMs, ...e }) => e);

    res.json({ events });
  } catch (err) {
    console.error('calendar/tomorrow error:', err.message);
    res.json({ events: [] });
  }
});

app.get('/tasks/debug', async (req, res) => {
  try {
    const auth = await getAuthClient();
    const tasksApi = google.tasks({ version: 'v1', auth });
    const listRes = await tasksApi.tasklists.list({ maxResults: 20 });
    const taskLists = listRes.data.items || [];
    const details = await Promise.all(taskLists.map(async list => {
      const taskRes = await tasksApi.tasks.list({ tasklist: list.id, showCompleted: true, showHidden: true, maxResults: 20 });
      return { list: list.title, tasks: (taskRes.data.items || []).map(t => ({ title: t.title, status: t.status, hidden: t.hidden })) };
    }));
    res.json({ lists: details });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.get('/tasks', async (req, res) => {
  try {
    const auth = await getAuthClient();
    const tasksApi = google.tasks({ version: 'v1', auth });
    const tz = process.env.TIMEZONE || 'America/Chicago';

    const listRes = await tasksApi.tasklists.list({ maxResults: 20 });
    const taskLists = listRes.data.items || [];

    const lists = (await Promise.all(taskLists.map(async list => {
      try {
        const taskRes = await tasksApi.tasks.list({
          tasklist: list.id,
          showCompleted: false,
          showHidden: false,
          maxResults: 100
        });
        const tasks = (taskRes.data.items || [])
          .filter(t => t.status !== 'completed')
          .map(t => {
            let dueStr = null;
            if (t.due) {
              const due = new Date(t.due);
              const today = new Date();
              const tomorrow = new Date();
              today.setHours(0, 0, 0, 0);
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(0, 0, 0, 0);
              const dueDay = new Date(due);
              dueDay.setHours(0, 0, 0, 0);
              if (dueDay.getTime() === today.getTime()) dueStr = 'Due today';
              else if (dueDay.getTime() === tomorrow.getTime()) dueStr = 'Due tomorrow';
              else if (dueDay < today) dueStr = 'Overdue';
              else dueStr = 'Due ' + due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: tz });
            }
            return { id: t.id, title: t.title, due: dueStr, notes: t.notes || null };
          });
        if (tasks.length === 0) return null;
        return { id: list.id, title: list.title, tasks };
      } catch { return null; }
    }))).filter(Boolean);

    res.json({ lists });
  } catch (err) {
    console.error('tasks error:', err.message);
    res.json({ lists: [] });
  }
});

app.post('/tasks/:listId/:taskId/complete', async (req, res) => {
  try {
    const auth = await getAuthClient();
    const tasksApi = google.tasks({ version: 'v1', auth });
    await tasksApi.tasks.patch({
      tasklist: req.params.listId,
      task: req.params.taskId,
      requestBody: { status: 'completed' }
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('tasks/complete error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/chat', async (req, res) => {
  const { message, session_id } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    const { data: historyData } = await supabase
      .from('messages')
      .select('role, content')
      .eq('session_id', session_id)
      .order('created_at', { ascending: true })
      .limit(20);

    const history = historyData || [];
    let messages = [...history.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: message }];

    const nowDate = new Date();
    const dateStr = nowDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: process.env.TIMEZONE || 'America/Chicago' });
    const timeStr = nowDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: process.env.TIMEZONE || 'America/Chicago' });
    const systemWithDate = `Today is ${dateStr}. The current time is ${timeStr}.\n\n${SYSTEM_PROMPT}`;

    let fullReply = '';
    let sentenceBuffer = '';

    const flushSentences = (final = false) => {
      const parts = sentenceBuffer.replace(/([.!?])\s+/g, '$1\n').split('\n');
      const count = final ? parts.length : parts.length - 1;
      for (let i = 0; i < count; i++) {
        const s = parts[i].trim();
        if (s) send({ type: 'sentence', value: s });
      }
      sentenceBuffer = final ? '' : (parts[parts.length - 1] || '');
    };

    while (true) {
      const stream = client.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemWithDate,
        tools: TOOLS,
        messages
      });

      let hasText = false;
      stream.on('text', (text) => {
        hasText = true;
        fullReply += text;
        sentenceBuffer += text;
        send({ type: 'text', value: text });
        flushSentences(false);
      });

      const finalMsg = await stream.finalMessage();
      if (hasText) flushSentences(true);

      if (finalMsg.stop_reason === 'tool_use') {
        const toolResults = [];
        for (const block of finalMsg.content.filter(b => b.type === 'tool_use')) {
          let result;
          try {
            if (block.name === 'get_calendar_events') {
              const events = await getCalendarEvents(block.input.days_ahead || 7);
              result = events.length === 0 ? 'No upcoming events found.'
                : events.map(e => `${e.summary} — ${e.start.dateTime || e.start.date}${e.location ? ' at ' + e.location : ''}`).join('\n');
            } else if (block.name === 'create_calendar_event') {
              const ev = await createCalendarEvent(block.input.summary, block.input.start_datetime, block.input.end_datetime, block.input.description);
              result = `Event created: ${ev.summary}`;
            } else if (block.name === 'get_emails') {
              const emails = await getEmails(block.input.query || '', block.input.max_results || 10);
              result = emails.length === 0 ? 'No emails found.'
                : emails.map(e => `From: ${e.from}\nSubject: ${e.subject}\nDate: ${e.date}\n${e.snippet}`).join('\n\n');
            } else if (block.name === 'send_email') {
              await sendEmail(block.input.to, block.input.subject, block.input.body);
              result = `Email sent to ${block.input.to}.`;
            } else {
              result = 'Unknown tool.';
            }
          } catch (err) { result = `Error: ${err.message}`; }
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
        }
        messages = [
          ...messages,
          { role: 'assistant', content: finalMsg.content },
          { role: 'user', content: toolResults }
        ];
        continue;
      }
      break;
    }

    send({ type: 'done' });
    res.end();

    const now = new Date().toISOString();
    await supabase.from('messages').insert([
      { session_id, role: 'user', content: message, created_at: now },
      { session_id, role: 'assistant', content: fullReply, created_at: new Date(Date.now() + 1).toISOString() }
    ]);
  } catch (err) {
    console.error('Chat error:', err);
    send({ type: 'error', value: 'Something went wrong.' });
    res.end();
  }
});

/* ── Debug: check env vars are loaded ── */
app.get('/debug-env', (req, res) => {
  res.json({
    elevenlabs_key_length: process.env.ELEVENLABS_API_KEY?.length || 0,
    elevenlabs_key_start: process.env.ELEVENLABS_API_KEY?.substring(0, 5) || 'missing',
    voice_id_set: !!process.env.ELEVENLABS_VOICE_ID,
    test_var: process.env.TEST_VAR || 'missing',
    anthropic_set: !!process.env.ANTHROPIC_API_KEY
  });
});

/* ── Speech to text (Deepgram) ── */
app.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&language=en', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
        'Content-Type': req.file.mimetype || 'audio/webm'
      },
      body: req.file.buffer
    });
    const data = await response.json();
    const text = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    res.json({ text });
  } catch (err) {
    console.error('Transcription error:', err);
    res.status(500).json({ error: 'Transcription failed' });
  }
});

/* ── Text to speech (ElevenLabs) ── */
app.post('/speak', async (req, res) => {
  try {
    const { text } = req.body;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('ElevenLabs error:', response.status, errText);
      throw new Error('ElevenLabs error');
    }

    res.set('Content-Type', 'audio/mpeg');
    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    console.error('TTS error:', err);
    res.status(500).json({ error: 'TTS failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Nova is running on port ${PORT}`);
});
