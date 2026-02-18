export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ answer: 'No question provided.' });
  }

  // 1️⃣ DuckDuckGo search (no API key)
  const searchUrl =
    'https://duckduckgo.com/html/?q=' + encodeURIComponent(query);

  const searchRes = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
    },
  });

  const html = await searchRes.text();

  // Extract first result (simple + reliable)
  const match = html.match(
    /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/
  );

  let sourceUrl = '';
  let sourceTitle = '';

  if (match) {
    sourceUrl = match[1];
    sourceTitle = match[2].replace(/<[^>]+>/g, '');
  }

  // 2️⃣ Ask AI (Vercel AI Gateway or OpenAI)
  const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Answer clearly and simply.',
        },
        {
          role: 'user',
          content: query,
        },
      ],
    }),
  });

  const aiJson = await aiRes.json();
  const answer =
    aiJson.choices?.[0]?.message?.content ||
    'No answer available.';

  // 3️⃣ Return result to your HTML
  return res.json({
    answer,
    sources: sourceUrl
      ? [
          {
            title: sourceTitle,
            url: sourceUrl,
            snippet: '',
          },
        ]
      : [],
  });
}
