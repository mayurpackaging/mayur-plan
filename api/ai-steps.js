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
    prompt = `Tum ek assistant ho. Niche ek founder ne apna kaam bola/likha hai (Hinglish me). Do cheezein karo:

1. CATEGORY pakdo. Sirf in me se ek: Sales, Order, Accounts, Development, Expansion, JV, Operations, Other
   - Sales = call/lead/enquiry/client meeting/quote/sales
   - Order = naya order/dispatch/delivery
   - Accounts = payment/invoice/depreciation/balance sheet/CA/tax/finance/accounts
   - Development = app/software/Claude/tech/coding/system
   - Expansion = nayi machine/capacity/land/mould/plant
   - JV = investor/JV/equity/partner deal/agreement
   - Operations = factory/production/MOS/IMS/quality/staff
   - Other = baaki sab

2. "clean" me sirf chhoti grammar/spelling theek karo. Founder ne jo bola WAHI rakho — apni taraf se kuch mat jodo, matlab mat badlo, naya information mat banao. Bas thoda readable banao. Agar already theek hai to jaisa hai waisa rakho.

Kaam: "${idea}"

Sirf is JSON me jawab do (no markdown):
{"category":"Accounts","clean":"<founder ki baat, bas thodi saaf>"}`;
  } else if (mode === 'polish') {
    expectJson = 'object';
    prompt = `Tum ek business writer ho. Niche ek founder ne apna kaam ya meeting ka note bola/likha hai (Hinglish, kaccha). Isko 2 professional versions me likho — matlab same rakho, sirf saaf aur professional banao. Apni taraf se naya fact/info MAT jodo. Jo bola wahi, bas behtar shabdon me.

Founder ki baat: "${idea}"

Do versions banao:
1. "english" — professional English me (jaise kisi business report/email me likhte hain)
2. "hinglish" — professional Hinglish me (Hindi-English mix, par saaf aur business-like)

Example:
Input: "meeting hui, unhe samjhaya par unhone goodwill kam measure kiya, AI tool se nikala value bahut kam, term condition padh rahe hain"
Output:
{"english":"Meeting held with partners. Explained the valuation rationale; however, they assessed goodwill lower than expected. Their AI tool valued it significantly below our estimate. Currently reviewing terms & conditions.","hinglish":"Partners ke saath meeting hui. Valuation samjhaya, lekin unhone goodwill expected se kam measure kiya. Unke AI tool ne value humare estimate se kaafi kam nikali. Abhi terms & conditions review kar rahe hain."}

Sirf is JSON me jawab do (no markdown):
{"english":"...","hinglish":"..."}`;
  } else if (mode === 'email') {
    expectJson = 'object';
    prompt = `Tum ek business writer ho. Founder ka ek note/update hai. Isse ek professional EMAIL banao (English me) jo wo kisi partner, CA, vendor ya client ko bhej sake. Matlab wahi rakho jo note me hai — naya fact mat jodo. Email polite, clear aur short ho.

Founder ka note: "${idea}"

Sirf is JSON me jawab do (no markdown):
{"subject":"<short clear subject line>","body":"<email body - greeting, main point(s), polite closing. Sign off as 'Nitin Nagpal'>"}`;
  } else if (mode === 'whatsapp') {
    expectJson = 'object';
    prompt = `Tum ek business writer ho. Founder ka ek note/update hai. Isse ek professional WhatsApp message banao (Hinglish me — Hindi-English mix, business-like par friendly). Matlab wahi rakho — naya fact mat jodo. Message short ho (2-5 lines), greeting se shuru, point clear, polite end.

Founder ka note: "${idea}"

Sirf is JSON me jawab do (no markdown):
{"text":"<whatsapp message>"}`;
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
