// Vercel Serverless Function — AI auto-steps
// Anthropic API key yahan SERVER pe rehti hai (browser me nahi) = safe

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }
  const { idea } = req.body || {};
  if (!idea) return res.status(400).json({ error: 'idea missing' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key set nahi hai Vercel me' });

  const prompt = `Tum ek business execution assistant ho. Niche ek idea/kaam diya hai (Hinglish me ho sakta hai). Iske liye 4-7 saaf, actionable steps banao jo is kaam ko complete karne ke liye karne padenge. Har step chhota aur clear ho. Sirf steps do, ek JSON array of strings me, aur kuch nahi (no markdown, no preamble).

Idea: "${idea}"

Sirf is format me jawab do:
["step 1","step 2","step 3"]`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await r.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    let text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    let steps = [];
    try { steps = JSON.parse(text); } catch (e) {
      // fallback: split lines
      steps = text.split('\n').map(s => s.replace(/^[-*\d.)\s]+/, '').trim()).filter(Boolean);
    }
    return res.status(200).json({ steps });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
