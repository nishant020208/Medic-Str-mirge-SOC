import { Router, Request, Response } from 'express';
import { ORACLE_KNOWLEDGE } from '../data/oracleKnowledge.js';

export const oracleRouter = Router();

// System prompt for Gemini Pythia persona
const ORACLE_SYSTEM_INSTRUCTION = `You are Pythia, the venerated High Oracle of Asclepius, residing within the sacred Temple Sanctum.
Your wisdom bridges ancient Greco-Roman herbalism and sacred botanical medicine with modern pharmacological principles.
Tone: Solemn, mystical, compassionate, poetic yet scientifically grounded.
Sacred Dispensary Remedies:
- For winter coughs, respiratory discomfort, throat soothing: Prescribe Olympian Elderberry Elixir or Attic Thyme Lozenges.
- For headache or cephalic ache: Prescribe Pythian Willow Salicin or Epidaurus Paracetamol.
- For courier or delivery: Reference Hermes Courier within 2 to 3 celestial cycles.
Guidelines:
- Speak as a reverent temple seer and keeper of Asclepian lore.
- Remind seekers that the Chief Pharmacist oversees physical administration.
- Keep responses concise (under 100 words), evocative, and beautifully styled with ancient reverence.`;

function matchCodex(query: string): string | null {
  const q = query.toLowerCase();
  for (const entry of ORACLE_KNOWLEDGE) {
    if (
      entry.keywords.some((k) => q.includes(k.toLowerCase())) ||
      entry.question.toLowerCase().includes(q)
    ) {
      return entry.answer;
    }
  }
  return null;
}

// POST /api/oracle/chat
oracleRouter.post('/chat', async (req: Request, res: Response) => {
  const { message } = req.body || {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'The Oracle requires a written petition.' });
  }

  const userQuery = message.trim();

  // If query directly matches an established sanctum codex query (e.g. winter coughs, batch verification),
  // return the consecrated canonical answer immediately
  const codexAnswer = matchCodex(userQuery);
  if (codexAnswer) {
    return res.json({
      reply: codexAnswer,
      source: 'sanctum-codex',
      oracle: 'Pythia of Asclepius',
    });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.gemini_api_key;

  if (apiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: ORACLE_SYSTEM_INSTRUCTION }],
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: userQuery }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 300,
            },
          }),
        }
      );

      if (response.ok) {
        const data = (await response.json()) as any;
        const replyText =
          data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (replyText) {
          return res.json({
            reply: replyText,
            source: 'gemini',
            oracle: 'Pythia of Asclepius',
          });
        }
      }
    } catch (err) {
      // Fall through to local fallback
    }
  }

  // Graceful local wisdom fallback
  const fallbackReply =
    matchCodex(userQuery) ||
    'The sacred incense curls upward, seeker. The spirits whisper of patience and balance. Drink steeped mountain thyme, rest beneath the cypress shade, and consult the Chief Pharmacist for tailored salves.';

  return res.json({
    reply: fallbackReply,
    source: 'sanctum-codex',
    oracle: 'Pythia of Asclepius (Ancient Codex)',
  });
});

// GET /api/oracle/topics
oracleRouter.get('/topics', (_req: Request, res: Response) => {
  const topics = ORACLE_KNOWLEDGE.map((k) => ({
    question: k.question,
    keywords: k.keywords,
  }));
  return res.json({ topics });
});
