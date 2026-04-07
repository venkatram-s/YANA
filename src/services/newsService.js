/**
 * newsService.js
 * 
 * Centralized service logic for RSS retrieval and content normalization.
 * Strategically refactored to optimize performance and reduce App.jsx bloat.
 */

import { getApiUrl } from '../utils/config';

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
    
    // Tier 1: Localized Vercel Serverless Proxy
    try {
      const response = await fetch(getApiUrl(`/api/rss-proxy?url=${encodeURIComponent(url)}`));
      if (response.ok) {
         const text = await response.text();
         // Ensure it's not an HTML error page from Vercel
         if (text && text.trim().startsWith('<') && !text.toLowerCase().includes('<!doctype html>')) {
             xmlText = text;
         }
      }
    } catch (e) {
      console.warn(`Local proxy layer failed for [${url}]:`, e);
    }
    
    // Tier 2: RSS2JSON (Highly Reliable Direct Conversion)
    if (!xmlText) {
      try {
        const jsonResponse = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`);
        if (jsonResponse.ok) {
          const data = await jsonResponse.json();
          if (data.status === 'ok') {
            return data.items.map(item => {
              const snippetText = (item.description || item.content || '').replace(/<[^>]*>?/gm, '').substring(0, 250);
              return {
                id: `${item.link}-${Math.random().toString(36).substr(2, 9)}`,
                title: item.title || 'Untitled Dispatch',
                link: item.link || '#',
                pubDate: item.pubDate,
                snippet: snippetText + (snippetText ? '...' : ''),
                image: item.thumbnail || item.enclosure?.link || '',
                category: categorizeArticle(`${item.title} ${item.description}`),
                source: data.feed.title || 'Global News',
                aiRefined: false,
              };
            });
          }
        }
      } catch (e) {
        console.warn(`RSS2JSON tier failed for [${url}]:`, e);
      }
    }

    // Tier 3: allorigins.win (Last-resort community fallback)
    if (!xmlText) {
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
      if (response.ok) {
        const json = await response.json();
        if (json.contents && !json.contents.toLowerCase().includes('<!doctype html>')) {
           xmlText = json.contents;
        }
      }
    }

    if (!xmlText) {
       console.warn(`CRITICAL_NETWORK_FAILURE: All proxy layers exhausted for [${url}]`);
       return [];
    }

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    // Support both RSS <item> and Atom <entry> nodes
    const rawItems = Array.from(xmlDoc.querySelectorAll('item, entry'));
    
    return rawItems.slice(0, 20).map(node => {
      const getTagValue = (tagName) => node.querySelector(tagName)?.textContent || '';
      
      const title = getTagValue('title');
      let link = getTagValue('link') || (node.querySelector('link')?.getAttribute('href')) || '';
      
      // Sanitize link: strictly allow only http/https to prevent javascript: XSS
      if (link && !/^https?:\/\//i.test(link)) {
        link = '#';
      }

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

