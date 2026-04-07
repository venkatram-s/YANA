/**
 * YANA Web Search Proxy (Server-Side)
 * 
 * Fetches DuckDuckGo HTML results and returns them as JSON.
 * Bypasses client-side CORS restrictions.
 */
export default async function handler(req, res) {
  const { q } = req.query;

  // Handle CORS preflight (OPTIONS) requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (!q) {
    return res.status(400).json({ error: 'MISSING_QUERY: Search query required.' });
  }

  try {
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo returned status ${response.status}`);
    }

    const html = await response.text();
    
    // Parse results server-side using regex (more reliable than DOMParser in Node)
    const results = [];
    const titleRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/g;
    const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>(.*?)<\/a>/g;
    
    let titleMatch;
    let snippetMatch;
    
    while ((titleMatch = titleRegex.exec(html)) !== null && results.length < 5) {
      const url = titleMatch[1];
      const title = titleMatch[2].replace(/<[^>]*>/g, '').trim();
      
      // Get corresponding snippet
      snippetMatch = snippetRegex.exec(html);
      const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, '').trim() : '';
      
      if (title && snippet) {
        results.push({ title, snippet, url });
      }
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ query: q, results });
  } catch (error) {
    console.error(`WEB_SEARCH_EXCEPTION for [${q}]:`, error);
    res.status(502).json({ error: 'SEARCH_UPSTREAM_FAILURE', detail: error.message });
  }
}
