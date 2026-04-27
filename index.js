require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(cors());
app.use(express.json());

const client = new Anthropic();

app.post('/chat', async (req, res) => {
  const { message } = req.body;
  
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: 'You are Nova, an AI assistant for a real estate wholesaling business. You are helpful, professional, and knowledgeable about real estate investing. Always introduce yourself as Nova.',
    messages: [{ role: 'user', content: message }]
  });

  res.json({ reply: response.content[0].text });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Nova is running on port ${PORT}`);
});
