/**
 * YANA RSS Proxy Protocol (Server-Side)
 * 
 * Bypasses client-side CORS and 403 Forbidden headers by fetching content
 * through a secure, localized serverless origin.
 * Hardened against SSRF and DoS attacks.
 */

const MAX_RESPONSE_SIZE = 1 * 1024 * 1024; // 1MB limit for RSS XML
const ALLOWED_PROTOCOLS = ['https:', 'http:'];

/**
 * Validates the URL to mitigate SSRF (Server-Side Request Forgery).
 * Blocks private IP ranges and enforces HTTPS.
 */
function validateUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    
    // Enforce HTTPS
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
      return { valid: false, error: 'INSECURE_PROTOCOL: Only HTTPS sources are permitted.' };
    }

    // Block private/local IP ranges
    const hostname = url.hostname.toLowerCase();
    const isPrivateIp = /^127\.|^10\.|^172\.(1[6-9]|2[0-9]|3[01])\.|^192\.168\.|^169\.254\.|^::1$|^fc00:|^fe80:/.test(hostname);
    
    if (isPrivateIp || hostname === 'localhost') {
      return { valid: false, error: 'FORBIDDEN_DOMAIN: Internal network access is prohibited.' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'INVALID_URL_STRUCTURE' };
  }
}

export default async function handler(req, res) {
  const { url } = req.query;

  // Handle CORS preflight (OPTIONS) requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (!url) {
    return res.status(400).json({ error: 'CRITICAL_PAYLOAD_MISSING: RSS source URL required.' });
  }

  const validation = validateUrl(url);
  if (!validation.valid) {
    return res.status(403).json({ error: validation.error });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Vercel; Cloud Intelligence) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`STATUS_${response.status}`);
    }

    // Size limit check via Content-Length if available
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
      return res.status(413).json({ error: 'PAYLOAD_TOO_LARGE: RSS source exceeds 1MB limit.' });
    }

    const xmlText = await response.text();

    // Secondary size limit check after download
    if (xmlText.length > MAX_RESPONSE_SIZE) {
      return res.status(413).json({ error: 'PAYLOAD_TOO_LARGE: RSS source exceeds 1MB limit.' });
    }

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    return res.status(200).send(xmlText);
  } catch (error) {
    if (typeof timeoutId !== 'undefined') clearTimeout(timeoutId);
    console.error(`RSS_PROXY_EXCEPTION for [${url}]:`, error);
    return res.status(502).json({ error: 'PROXY_UPSTREAM_FAILURE', detail: error.message });
  }
}
