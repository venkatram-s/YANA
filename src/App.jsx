import { useState, useEffect, useRef, useCallback } from 'react';
import { Pause, Play } from 'lucide-react';

import { DatabaseBroker } from './utils/databaseBroker';
import { CryptoHarden } from './utils/cryptoHarden';
import { fetchRssContent } from './services/newsService';

import { Header } from './components/Header';
import { IntelligentArticleCard } from './components/IntelligentArticleCard';
import { SkeletonLoader } from './components/SkeletonLoader';
import { NotesVault } from './components/NotesVault';
import { SettingsModal } from './components/SettingsModal';
import { PanicOverlay } from './components/PanicOverlay';

const dbBroker = new DatabaseBroker();
const cryptoTool = new CryptoHarden();

function calcStreak() {
  const today = new Date().toDateString();
  const last = localStorage.getItem('yana_last_visit');
  const streak = parseInt(localStorage.getItem('yana_streak') || '0', 10);
  if (last === today) return streak;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const next = last === yesterday.toDateString() ? streak + 1 : 1;
  localStorage.setItem('yana_streak', String(next));
  localStorage.setItem('yana_last_visit', today);
  return next;
}

function exportOPML(feeds) {
  const items = feeds.map(url => `    <outline type="rss" text="${url}" xmlUrl="${url}" />`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n  <head><title>YANA Feed Export</title></head>\n  <body>\n    <outline text="Feeds" title="Feeds">\n${items}\n    </outline>\n  </body>\n</opml>`;
  const blob = new Blob([xml], { type: 'text/xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'yana_feeds.opml';
  a.click();
  URL.revokeObjectURL(a.href);
}

function parseOPML(text) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/xml');
  return Array.from(doc.querySelectorAll('outline[xmlUrl]')).map(o => o.getAttribute('xmlUrl')).filter(Boolean);
}

function App() {
  const [theme, setTheme] = useState('black');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedMode, setFeedMode] = useState('doomscroll');
  const [isGlitching, setIsGlitching] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panicMode, setPanicMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [streak] = useState(calcStreak);
  const [rssFeeds, setRssFeeds] = useState([]);
  const [newRssUrl, setNewRssUrl] = useState('');
  const [groqKey, setGroqKey] = useState(localStorage.getItem('groq_api_key') || '');
  const [ttsActiveId, setTtsActiveId] = useState(null);
  const [focusedArticleId, setFocusedArticleId] = useState(null);
  const [xrayActiveId, setXrayActiveId] = useState(null);
  const [isDictating, setIsDictating] = useState(false);
  const [cryptoPassword, setCryptoPassword] = useState('');
  const [vaultLocked, setVaultLocked] = useState(true);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [notes, setNotes] = useState([]);

  const [doomscrollIntervalMs, setDoomscrollIntervalMs] = useState(() => {
    const v = localStorage.getItem('yana_doomscroll_interval_ms');
    const parsed = v ? parseInt(v, 10) : 5000;
    return Number.isFinite(parsed) ? parsed : 5000;
  });

  const onDoomscrollIntervalChange = (seconds) => {
    const s = Number(seconds);
    const clamped = Number.isFinite(s) ? Math.max(1, Math.min(600, s)) : 5;
    const ms = clamped * 1000;
    setDoomscrollIntervalMs(ms);
    localStorage.setItem('yana_doomscroll_interval_ms', String(ms));
  };

  const scrollIntervalRef = useRef(null);
  const observerRef = useRef(null);
  const pressTimerRef = useRef(null);
  const recognitionRef = useRef(null);
  const isHoveringRef = useRef(false);
  const feedContainerRef = useRef(null);
  const filteredRef = useRef([]);

  useEffect(() => {
    localStorage.setItem('groq_api_key', groqKey);
  }, [groqKey]);

  // --- AUTO-SCROLL: clean, single source of truth via isAutoScrolling ---
  useEffect(() => {
    if (!isAutoScrolling) {
      clearInterval(scrollIntervalRef.current);
      return;
    }
    scrollIntervalRef.current = setInterval(() => {
      if (isHoveringRef.current) return;
      const c = feedContainerRef.current;
      if (!c) return;
      const currentScroll = c.scrollTop;
      const maxScroll = c.scrollHeight - c.clientHeight;
      if (currentScroll >= maxScroll - 10) {
        setIsAutoScrolling(false);
        return;
      }
      c.scrollBy({ top: c.clientHeight, behavior: 'auto' });
    }, doomscrollIntervalMs);
    return () => clearInterval(scrollIntervalRef.current);
  }, [isAutoScrolling, doomscrollIntervalMs]);

  // Auto-start doomscroll when content is ready
  useEffect(() => {
    if (feedMode === 'doomscroll' && articles.length > 0) {
      const t = setTimeout(() => setIsAutoScrolling(true), 300);
      return () => clearTimeout(t);
    } else {
      setIsAutoScrolling(false);
      feedContainerRef.current?.scrollTo({ top: 0 });
    }
  }, [feedMode, articles.length]);

  const toggleAutoScroll = () => {
    setIsAutoScrolling(prev => !prev);
  };

  useEffect(() => {
    const boot = async () => {
      const storedFeeds = await dbBroker.getItem('rssFeeds');
      if (storedFeeds) setRssFeeds(storedFeeds);
      const hasVault = await dbBroker.getItem('encryptedNotes');
      if (!hasVault) setVaultLocked(false);
      const cached = await dbBroker.getItem('cachedArticles');
      if (cached?.length) {
        setArticles(cached);
        setLoading(false);
      }
      const lastTheme = localStorage.getItem('yana_theme') || 'black';
      setTheme(lastTheme);
      document.documentElement.setAttribute('data-theme', lastTheme);

      // Load notes
      const storedNotes = await dbBroker.getItem('markdownNotes');
      if (storedNotes?.length) setNotes(storedNotes);
    };
    boot();

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const r = new SR();
      r.continuous = false;
      r.interimResults = false;
      r.lang = 'en-US';
      r.onresult = (e) => { setNotes(p => [...p, { id: Date.now().toString(), title: 'Voice Transcript', date: new Date().toISOString(), content: e.results[0][0].transcript, sourceUrl: '' }]); setIsDictating(false); };
      r.onerror = () => setIsDictating(false);
      r.onend = () => setIsDictating(false);
      recognitionRef.current = r;
    }
  }, []);

  useEffect(() => {
    const sync = async () => {
      await dbBroker.setItem('rssFeeds', rssFeeds);
      refreshFeeds();
    };
    sync();
  }, [rssFeeds]);

  // Persist notes to IndexedDB
  useEffect(() => {
    if (notes.length > 0) dbBroker.setItem('markdownNotes', notes);
  }, [notes]);

  useEffect(() => {
    const container = feedContainerRef.current;
    if (!container || feedMode !== 'doomscroll') return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (feedMode !== 'doomscroll') return;
      let best = null;
      let bestRatio = 0;
      entries.forEach(e => {
        if (e.intersectionRatio > bestRatio) {
          bestRatio = e.intersectionRatio;
          best = e.target;
        }
      });
      if (best && bestRatio > 0.7) setFocusedArticleId(best.getAttribute('data-id'));
    }, { root: container, threshold: [0.3, 0.5, 0.7, 1] });
    container.querySelectorAll('.article-card').forEach(el => observerRef.current.observe(el));
    return () => observerRef.current?.disconnect();
  }, [articles, feedMode]);

  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (e.key === 'Escape') {
        if (panicMode) { setPanicMode(false); return; }
        if (settingsOpen) { setSettingsOpen(false); return; }
        if (notesOpen) { setNotesOpen(false); return; }
        setPanicMode(true);
        return;
      }
      const k = e.key.toLowerCase();
      if (k === 'j') { e.preventDefault(); navigateArticle(1); }
      if (k === 'k') { e.preventDefault(); navigateArticle(-1); }
      if (k === 's') setNotesOpen(true);
      if (k === 'r') {
        if (focusedArticleId) handleRefineWithAI(focusedArticleId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panicMode, settingsOpen, notesOpen, focusedArticleId]);

  const navigateArticle = (dir) => {
    const list = filteredRef.current;
    if (!list.length) return;
    const idx = list.findIndex(a => a.id === focusedArticleId);
    const nextIdx = Math.max(0, Math.min(list.length - 1, idx + dir));
    const nextId = list[nextIdx]?.id;
    if (!nextId) return;
    setFocusedArticleId(nextId);
    const el = feedContainerRef.current?.querySelector(`[data-id="${nextId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const triggerGlitch = () => {
    setIsGlitching(true);
    setTimeout(() => setIsGlitching(false), 120);
  };

  const refreshFeeds = async () => {
    if (articles.length === 0) setLoading(true);
    const agg = [];
    for (const url of rssFeeds) {
      const batch = await fetchRssContent(url);
      agg.push(...batch);
    }
    agg.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    setArticles(agg);
    dbBroker.setItem('cachedArticles', agg);
    setLoading(false);
    if (agg.length > 0) triggerGlitch();
  };

  const handleUnlockVault = async () => {
    try {
      const enc = await dbBroker.getItem('encryptedNotes');
      if (!enc) { setVaultLocked(false); return; }
      const plain = await cryptoTool.decryptData(enc, cryptoPassword);
      setVaultLocked(false);
      setFailedAttempts(0);
    } catch {
      const f = failedAttempts + 1;
      setFailedAttempts(f);
      if (f >= 3) {
        await dbBroker.purgeDatabase();
        localStorage.clear();
        alert('FATAL: Vault wiped after 3 failed attempts.');
        window.location.reload();
      } else {
        alert(`Wrong password. ${3 - f} attempt(s) remaining.`);
      }
    }
  };

  const handleRefineWithAI = async (articleId) => {
    if (!groqKey) { alert('Add a Groq API key in Settings first.'); setSettingsOpen(true); return; }
    setArticles(p => p.map(a => a.id === articleId ? { ...a, loading: true } : a));
    try {
      const art = articles.find(a => a.id === articleId);
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{
            role: 'user',
            content: `Anchor to the linked RSS article: ${art.title} (${art.link}). Based on that content, perform a concise web search to gather up-to-date information about this topic. Prioritize findings related to the linked article. Provide 2-4 information bullets with sources (URLs) summarizing findings, followed by 1-2 sentence conclusion and 2-3 follow-up questions. If sources are unavailable, cite credible references. Present results as plain text, no extraneous formatting.`
          }]
        }),
      });
      const data = await res.json();
      const refined = data.choices[0].message.content;
      setArticles(p => p.map(a => a.id === articleId ? { ...a, snippet: refined, aiRefined: true, loading: false } : a));
    } catch {
      setArticles(p => p.map(a => a.id === articleId ? { ...a, loading: false } : a));
      alert('AI request failed.');
    }
  };

  const handleToggleTTS = (article) => {
    if (!('speechSynthesis' in window)) return;
    if (ttsActiveId === article.id) { window.speechSynthesis.cancel(); setTtsActiveId(null); return; }
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(`${article.title}. ${article.snippet}`);
    msg.onend = () => setTtsActiveId(null);
    window.speechSynthesis.speak(msg);
    setTtsActiveId(article.id);
  };

  const handleImportOPML = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const urls = parseOPML(e.target.result);
      if (!urls.length) { alert('No feeds found in OPML file.'); return; }
      setRssFeeds(prev => [...new Set([...prev, ...urls])]);
    };
    reader.readAsText(file);
  };

  const handleSaveToNotes = (article) => {
    const mdContent = `# ${article.title}\n\n> **Source:** ${article.source || 'Feed'}  \n> **Date:** ${new Date(article.pubDate).toLocaleDateString()}  \n> **Link:** ${article.link || ''}\n\n---\n\n${article.snippet}\n`;
    const newNote = {
      id: Date.now().toString(),
      title: article.title,
      date: new Date().toISOString(),
      content: mdContent,
      sourceUrl: article.link || '',
    };
    setNotes(prev => [...prev, newNote]);
    setNotesOpen(true);
  };

  const handleHardReset = () => {
    if (confirm('Reset all data? This cannot be undone.')) {
      dbBroker.purgeDatabase();
      localStorage.clear();
      window.location.reload();
    }
  };

  const filtered = articles.filter(a =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.snippet.toLowerCase().includes(searchQuery.toLowerCase())
  );
  filteredRef.current = filtered;

  const isDoomscroll = feedMode === 'doomscroll';

  return (
    <>
      {panicMode && <PanicOverlay onDismiss={() => setPanicMode(false)} />}

      <Header
        theme={theme}
        feedMode={feedMode}
        isLocked={vaultLocked}
        searchQuery={searchQuery}
        streak={streak}
        onSearchChange={setSearchQuery}
        onSetFeedMode={setFeedMode}
        onToggleTheme={() => {
          const nt = theme === 'black' ? 'charcoal' : 'black';
          setTheme(nt);
          document.documentElement.setAttribute('data-theme', nt);
          localStorage.setItem('yana_theme', nt);
        }}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenNotes={() => setNotesOpen(true)}
      />

      <main
        ref={feedContainerRef}
        className={`feed-container ${isDoomscroll ? 'doomscroll-mode' : 'news-mode'} ${isGlitching ? 'glitching' : ''}`}
      >
        {loading && articles.length === 0 ? [1, 2, 3, 4, 5].map(i => <SkeletonLoader key={i} />) : articles.length === 0 ? (
          <div className="empty-state">
            <h2 style={{ color: 'var(--accent-color)', marginBottom: '15px' }}>ZERO_INTELLIGENCE_SOURCES</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Add RSS feeds in Settings to begin.</p>
            <button className="btn-primary" onClick={() => setSettingsOpen(true)}>INITIALIZE SOURCES</button>
          </div>
        ) : (
          filtered.map(ia => (
            <IntelligentArticleCard
              key={ia.id}
              article={ia}
              isDoomscroll={isDoomscroll}
              isFocused={focusedArticleId === ia.id}
              ttsActiveId={ttsActiveId}
              xrayActiveId={xrayActiveId}
              onHover={(id) => { isHoveringRef.current = true; setFocusedArticleId(id); }}
              onLeave={() => { isHoveringRef.current = false; }}
              onPointerDown={(a) => { pressTimerRef.current = setTimeout(() => setXrayActiveId(a.id), 600); }}
              onPointerUp={() => { clearTimeout(pressTimerRef.current); setXrayActiveId(null); }}
              onToggleTTS={handleToggleTTS}
              onRefineWithAI={handleRefineWithAI}
              onSaveToNotes={() => handleSaveToNotes(ia)}
            />
          ))
        )}
      </main>

      {isDoomscroll && (
        <button className="floating-auto-scroll" onClick={toggleAutoScroll}>
          <div className={`scroll-indicator ${isAutoScrolling ? 'active' : ''}`}></div>
          <span>{isAutoScrolling ? 'Pause' : 'Resume'}</span>
          {isAutoScrolling ? <Pause size={18} /> : <Play size={18} />}
        </button>
      )}

      <NotesVault
        isOpen={notesOpen}
        isLocked={vaultLocked}
        notes={notes}
        failedAttempts={failedAttempts}
        cryptoPassword={cryptoPassword}
        onPasswordChange={setCryptoPassword}
        onUnlock={handleUnlockVault}
        onNotesChange={setNotes}
        onClose={() => setNotesOpen(false)}
      />

      <SettingsModal
        isOpen={settingsOpen}
        rssFeeds={rssFeeds}
        newRssUrl={newRssUrl}
        groqKey={groqKey}
        doomscrollIntervalMs={doomscrollIntervalMs}
        onDoomscrollIntervalChange={onDoomscrollIntervalChange}
        onClose={() => setSettingsOpen(false)}
        onUrlChange={setNewRssUrl}
        onAddFeed={() => { if (newRssUrl && !rssFeeds.includes(newRssUrl)) { setRssFeeds(p => [...p, newRssUrl]); setNewRssUrl(''); } }}
        onRemoveFeed={(u) => setRssFeeds(p => p.filter(f => f !== u))}
        onGroqKeyChange={setGroqKey}
        onExportOPML={() => exportOPML(rssFeeds)}
        onImportOPML={handleImportOPML}
        onHardReset={handleHardReset}
      />
    </>
  );
}

export default App;
