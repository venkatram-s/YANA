/**
 * newsService.js
 * 
 * Centralized service logic for RSS retrieval and content normalization.
 * Strategically refactored to optimize performance and reduce App.jsx bloat.
 */

// Categorization keywords used to automatically tag incoming articles
const CATEGORIES = {
  TECH: ['ai', 'google', 'apple', 'space', 'tesla', 'meta', 'nvidia', 'software', 'cloud'],
  FINANCE: ['finance', 'market', 'crypto', 'bitcoin', 'stock', 'investing', 'economy', 'fed'],
  SCIENCE: ['physics', 'nasa', 'biology', 'health', 'medicine', 'energy'],
};

/**
 * Normalizes text and maps it against known keywords to provide a category tag.
 */
export const categorizeArticle = (text) => {
  const normalizedText = (text || '').toLowerCase();
  
  if (CATEGORIES.TECH.some(k => normalizedText.includes(k))) return 'Tech';
  if (CATEGORIES.FINANCE.some(k => normalizedText.includes(k))) return 'Finance';
  if (CATEGORIES.SCIENCE.some(k => normalizedText.includes(k))) return 'Science';
  
  return 'General';
};

/**
 * Orchestrates cross-origin fetching of RSS XML content through validated proxy layers.
 * Implementated with tiered fallbacks to ensure localized reliability.
 */
export const fetchRssContent = async (url) => {
  try {
    let xmlText = '';
    
    // Tier 1: Localized Vercel Serverless Proxy (Zero-CORS, Managed User-Agent)
    try {
      const response = await fetch(`/api/rss-proxy?url=${encodeURIComponent(url)}`);
      if (response.ok) xmlText = await response.text();
    } catch (e) {
      console.warn(`Local proxy layer failed for [${url}]:`, e);
    }
    
    // Tier 2: proxy.cors.sh (High-reputation secondary fallback)
    if (!xmlText) {
      try {
        const response = await fetch(`https://proxy.cors.sh/${url}`, {
           headers: { 'x-cors-gratis': 'true' }
        });
        if (response.ok) xmlText = await response.text();
      } catch (e) {
        console.warn(`CORS.SH tier failed for [${url}]:`, e);
      }
    }

    // Tier 3: allorigins.win (Last-resort community fallback)
    if (!xmlText) {
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
      if (response.ok) {
        const json = await response.json();
        xmlText = json.contents;
      }
    }

    if (!xmlText) throw new Error(`CRITICAL_NETWORK_FAILURE: All proxy layers exhausted for [${url}]`);

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    // Support both RSS <item> and Atom <entry> nodes
    const rawItems = Array.from(xmlDoc.querySelectorAll('item, entry'));
    
    return rawItems.slice(0, 20).map(node => {
      const getTagValue = (tagName) => node.querySelector(tagName)?.textContent || '';
      
      const title = getTagValue('title');
      const link = getTagValue('link') || (node.querySelector('link')?.getAttribute('href')) || '';
      const pubDate = getTagValue('pubDate') || getTagValue('published') || getTagValue('updated') || new Date().toISOString();
      
      let description = getTagValue('description') || getTagValue('summary') || '';
      if (!description) {
        const encoded = node.getElementsByTagNameNS('*', 'encoded')[0];
        if (encoded) description = encoded.textContent || '';
      }
      // Special handler for YouTube media:description
      const mediaDesc = node.getElementsByTagNameNS('*', 'description')[0]?.textContent;
      if (mediaDesc && (!description || mediaDesc.length > description.length)) {
        description = mediaDesc;
      }

      // Media extraction heuristics
      let image = '';
      const mediaTags = ['thumbnail', 'content', 'image'];
      for (const tag of mediaTags) {
        const mediaNode = node.querySelector(tag) || node.getElementsByTagNameNS('*', tag)[0];
        if (mediaNode) {
          image = mediaNode.getAttribute('url') || mediaNode.getAttribute('href');
          if (image) break;
        }
      }
      
      // Secondary image extraction via Regex if the XML tag is missing
      if (!image && description.includes('<img')) {
        const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch) image = imgMatch[1];
      }

      return {
        id: `${link}-${Math.random().toString(36).substr(2, 9)}`,
        title: title || 'Untitled Dispatch',
        link,
        pubDate,
        snippet: description.replace(/<[^>]*>?/gm, '').substring(0, 250) + '...',
        image,
        category: categorizeArticle(`${title} ${description}`),
        source: xmlDoc.querySelector('title')?.textContent || 'Global News',
        aiRefined: false,
      };
    });
  } catch (error) {
    console.error(`fetchRssContent Exception for [${url}]:`, error);
    return [];
  }
};
