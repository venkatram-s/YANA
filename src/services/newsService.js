/**
 * newsService.js
 * 
 * Centralized service logic for RSS retrieval and content normalization.
 * Optimized for mobile web with resilient fallback chain.
 */

import { getApiUrl } from '../utils/config';

// Categorization keywords
const CATEGORIES = {
  TECH: ['ai', 'google', 'apple', 'space', 'tesla', 'meta', 'nvidia', 'software', 'cloud'],
  FINANCE: ['finance', 'market', 'crypto', 'bitcoin', 'stock', 'investing', 'economy', 'fed'],
  SCIENCE: ['physics', 'nasa', 'biology', 'health', 'medicine', 'energy'],
};

export const categorizeArticle = (text) => {
  const normalizedText = (text || '').toLowerCase();
  if (CATEGORIES.TECH.some(k => normalizedText.includes(k))) return 'Tech';
  if (CATEGORIES.FINANCE.some(k => normalizedText.includes(k))) return 'Finance';
  if (CATEGORIES.SCIENCE.some(k => normalizedText.includes(k))) return 'Science';
  return 'General';
};

// Helper: safe fetch with timeout
const safeFetch = async (url, options = {}, timeout = 8000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
};

/**
 * Orchestrates cross-origin fetching with resilient fallback chain.
 * Priority: Local proxy → RSS2JSON → CORS proxies
 * 
 * @param {string|object} feedUrl - Either a raw URL string or { url: string }
 */
export const fetchRssContent = async (feedUrl) => {
  // Defensive: normalize input to string
  const url = typeof feedUrl === 'object' ? feedUrl?.url : feedUrl;
  if (!url || typeof url !== 'string') {
    console.warn('[NEWS] Invalid feed URL:', feedUrl);
    return [];
  }

  const errors = [];

  // ========== TIER 1: Local Serverless Proxy ==========
  try {
    const response = await safeFetch(getApiUrl(`/api/rss-proxy?url=${encodeURIComponent(url)}`));
    if (response.ok) {
      const text = await response.text();
      // Validate: must be XML, not HTML error
      if (text?.trim().startsWith('<') && !text.toLowerCase().includes('<!doctype html>')) {
        console.log('[NEWS] Tier 1 (serverless) success');
        return parseXmlFeed(text, url);
      }
    }
  } catch (e) {
    errors.push(`Tier 1 (serverless): ${e.message}`);
    console.warn(`[NEWS] Tier 1 failed:`, e.message);
  }

  // ========== TIER 2: RSS2JSON ==========
  try {
    const response = await safeFetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`, {}, 10000);
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'ok' && data.items?.length > 0) {
        console.log('[NEWS] Tier 2 (rss2json) success');
        return data.items.map(item => ({
          id: `${item.link}-${Math.random().toString(36).substr(2, 9)}`,
          title: item.title || 'Untitled',
          link: item.link || '#',
          pubDate: item.pubDate || new Date().toISOString(),
          snippet: (item.description || item.content || '').replace(/<[^>]*>?/gm, '').substring(0, 250) + '...',
          image: item.thumbnail || item.enclosure?.link || '',
          category: categorizeArticle(`${item.title} ${item.description}`),
          source: data.feed.title || 'RSS Feed',
          aiRefined: false,
        }));
      }
    }
  } catch (e) {
    errors.push(`Tier 2 (rss2json): ${e.message}`);
    console.warn(`[NEWS] Tier 2 failed:`, e.message);
  }

  // ========== TIER 3: DuckDuckGo HTML (Mobile-Friendly) ==========
  try {
    // Use DuckDuckGo's lite HTML version - more reliable on mobile
    const ddgUrl = `https://duckduckgo.com/html/?q=site:${new URL(url).hostname} ${encodeURIComponent(new URL(url).pathname)}`;
    const response = await safeFetch(getApiUrl(`/api/web-search?q=${encodeURIComponent(new URL(url).hostname + ' ' + url)}`), {}, 10000);
    // Fallback: try direct if proxy fails
    if (!response.ok) throw new Error('Proxy failed');
    const data = await response.json();
    if (data.results?.length > 0) {
      console.log('[NEWS] Tier 3 (web search) success');
      // Convert search results to article-like format
      return data.results.slice(0, 5).map((r, i) => ({
        id: `search-${i}-${Date.now()}`,
        title: r.title || 'Related News',
        link: r.url || '#',
        pubDate: new Date().toISOString(),
        snippet: (r.snippet || 'Click to read more...').substring(0, 250),
        image: '',
        category: categorizeArticle(r.title || ''),
        source: new URL(r.url || 'https://duckduckgo.com').hostname,
        aiRefined: false,
      }));
    }
  } catch (e) {
    errors.push(`Tier 3 (web search): ${e.message}`);
    console.warn(`[NEWS] Tier 3 failed:`, e.message);
  }

  // ========== TIER 4: CORS.sh (Last Resort) ==========
  try {
    const response = await safeFetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, {}, 10000);
    if (response.ok) {
      const text = await response.text();
      if (text?.trim().startsWith('<')) {
        console.log('[NEWS] Tier 4 (corsproxy.io) success');
        return parseXmlFeed(text, url);
      }
    }
  } catch (e) {
    errors.push(`Tier 4 (corsproxy): ${e.message}`);
    console.warn(`[NEWS] Tier 4 failed:`, e.message);
  }

  // ========== FAILURE ==========
  console.error(`[NEWS] ALL TIERS EXHAUSTED for ${url}. Errors:`, errors);
  return [];
};

/**
 * Parse XML feed (RSS/Atom) into standardized article objects
 */
const parseXmlFeed = (xmlText, sourceUrl) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  const rawItems = Array.from(xmlDoc.querySelectorAll('item, entry'));
  const feedTitle = xmlDoc.querySelector('title')?.textContent || 'RSS Feed';

  return rawItems.slice(0, 20).map(node => {
    const getTagValue = (tag) => node.querySelector(tag)?.textContent || '';
    
    let link = getTagValue('link') || node.querySelector('link')?.getAttribute('href') || '';
    // Security: sanitize to prevent XSS
    if (link && !/^https?:\/\//i.test(link)) link = '#';

    const pubDate = getTagValue('pubDate') || getTagValue('published') || getTagValue('updated') || new Date().toISOString();
    let description = getTagValue('description') || getTagValue('summary') || '';
    if (!description) {
      const encoded = node.getElementsByTagNameNS('*', 'encoded')[0];
      if (encoded) description = encoded.textContent || '';
    }

    // Image extraction
    let image = '';
    const mediaTags = ['thumbnail', 'content', 'image'];
    for (const tag of mediaTags) {
      const mediaNode = node.querySelector(tag) || node.getElementsByTagNameNS('*', tag)[0];
      if (mediaNode) {
        image = mediaNode.getAttribute('url') || mediaNode.getAttribute('href');
        if (image) break;
      }
    }
    if (!image && description.includes('<img')) {
      const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch) image = imgMatch[1];
    }

    return {
      id: `${link}-${Math.random().toString(36).substr(2, 9)}`,
      title: getTagValue('title') || 'Untitled Dispatch',
      link,
      pubDate,
      snippet: description.replace(/<[^>]*>?/gm, '').substring(0, 250) + '...',
      image,
      category: categorizeArticle(`${getTagValue('title')} ${description}`),
      source: feedTitle,
      aiRefined: false,
    };
  });
};