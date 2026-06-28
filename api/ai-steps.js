// Vercel Serverless Function — AI auto-steps, tactics & daily categorize
// Anthropic API key yahan SERVER pe rehti hai (browser me nahi) = safe

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }
  const { idea, mode } = req.body || {};
  if (!idea) return res.status(400).json({ error: 'idea missing' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key set nahi hai Vercel me' });

  let prompt, expectJson = 'array';

  if (mode === 'daily') {
    expectJson = 'object';
    prompt = `Tum ek business assistant ho. Niche ek founder ne apna kaam bola/likha hai (Hinglish me). Tumhe 2 cheezein karni hain:
1. Iski CATEGORY pakdo. Sirf in me se ek chuno: Sales, Order, Accounts, Development, Expansion, Operations, Other
   - Sales = call/lead/enquiry/client meeting/quote
   - Order = naya order mila/dispatch/delivery
   - Accounts = payment/invoice/depreciation/balance sheet/CA/tax/finance
   - Development = app/software/Claude/tech/coding/automation banaya
   - Expansion = nayi machine/capacity/IML/growth/investor/JV
   - Operations = factory/production/MOS/IMS/machine/quality/staff
   - Other = jo upar fit na ho
2. Ek SAAF chhota summary banao (proper English, 1 line).

Kaam: "${idea}"

Sirf is JSON format me jawab do, kuch aur nahi (no markdown):
{"category":"Sales","clean":"Received order enquiry from Domino's for 500 containers"}`;
  } else if (mode === 'tactics') {
    prompt = `Tum ek business coach ho jo "12 Week Year" framework jaanta hai. Niche ek 12-week goal diya hai (Hinglish me ho sakta hai). Iske liye 4-6 TACTICS banao.

TACTIC kya hota hai: weekly repeat hone wala kaam jo aap CONTROL karte ho (lead indicator). Result nahi, ACTIVITY. Har tactic me ek number/frequency ho jab possible ho.

Achhe tactics ke example:
- "10 dealer ko har week call karo"
- "2 SEO blog post weekly publish karo"
- "Har Monday IMS data accuracy check karo"

Bure tactics (mat banao): "leads badhao" (ye result hai, activity nahi).

Goal: "${idea}"

Sirf is format me jawab do, kuch aur nahi (no markdown):
["tactic 1","tactic 2","tactic 3"]`;
  } else {
    prompt = `Tum ek business execution assistant ho. Niche ek idea/kaam diya hai (Hinglish me ho sakta hai). Iske liye 4-7 saaf, actionable steps banao jo is kaam ko complete karne ke liye karne padenge. Har step chhota aur clear ho. Sirf steps do, ek JSON array of strings me, aur kuch nahi (no markdown, no preamble).

Idea: "${idea}"

Sirf is format me jawab do:
["step 1","step 2","step 3"]`;
  }

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

    if (expectJson === 'object') {
      let obj = { category: 'Other', clean: idea };
      try { obj = JSON.parse(text); } catch (e) {}
      return res.status(200).json(obj);
    }

    let steps = [];
    try { steps = JSON.parse(text); } catch (e) {
      steps = text.split('\n').map(s => s.replace(/^[-*\d.)\s]+/, '').trim()).filter(Boolean);
    }
    return res.status(200).json({ steps });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
