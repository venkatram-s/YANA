/**
 * YANA RSS Proxy Protocol (Server-Side)
 * 
 * Bypasses client-side CORS and 403 Forbidden headers by fetching content
 * through a secure, localized serverless origin.
 */

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'CRITICAL_PAYLOAD_MISSING: RSS source URL required.' });
  }

  try {
    // Implementing a high-reputation User-Agent to satisfy The Verge / TechCrunch
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Vercel; Cloud Intelligence) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    });

    if (!response.ok) {
      throw new Error(`STATUS_${response.status}`);
    }

    const xmlText = await response.text();

    // Enforce high-level caching to avoid rate-limiting the aggregator origin
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Maintain parity with PWA access
    
    return res.status(200).send(xmlText);
  } catch (error) {
    console.error(`RSS_PROXY_EXCEPTION for [${url}]:`, error);
    return res.status(502).json({ error: 'PROXY_UPSTREAM_FAILURE', detail: error.message });
  }
}
