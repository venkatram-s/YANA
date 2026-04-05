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

// ── Streak logic ──────────────────────────────────────────────────────────────
function calcStreak() {
  const today = new Date().toDateString();
  const last = localStorage.getItem('yana_last_visit');
  const streak = parseInt(localStorage.getItem('yana_streak') || '0', 10);

  if (last === today) return streak;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const newStreak = last === yesterday.toDateString() ? streak + 1 : 1;
  localStorage.setItem('yana_streak', String(newStreak));
  localStorage.setItem('yana_last_visit', today);
  return newStreak;
}

// ── OPML helpers ──────────────────────────────────────────────────────────────
function exportOPML(feeds) {
  const items = feeds
    .map(url => `    <outline type="rss" text="${url}" xmlUrl="${url}" />`)
    .join('\n');
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
  const outlines = Array.from(doc.querySelectorAll('outline[xmlUrl]'));
  return outlines.map(o => o.getAttribute('xmlUrl')).filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
function App() {
  const [theme, setTheme] = useState('black');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedMode, setFeedMode] = useState('ordinary');
  const [isGlitching, setIsGlitching] = useState(false);

  const [notesOpen, setNotesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panicMode, setPanicMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [noImageMode, setNoImageMode] = useState(() => localStorage.getItem('yana_no_image') === 'true');
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
  const [notes, setNotes] = useState('');

  const scrollIntervalRef = useRef(null);
  const observerRef = useRef(null);
  const pressTimerRef = useRef(null);
  const recognitionRef = useRef(null);
  const isHoveringRef = useRef(false);
  const feedContainerRef = useRef(null);
  const filteredRef = useRef([]);

  // Sync noImageMode to DOM + localStorage
  useEffect(() => {
    localStorage.setItem('yana_no_image', String(noImageMode));
    document.documentElement.setAttribute('data-no-image', String(noImageMode));
  }, [noImageMode]);

  // Sync groqKey to localStorage
  useEffect(() => {
    localStorage.setItem('groq_api_key', groqKey);
  }, [groqKey]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  const startScroll = useCallback(() => {
    clearInterval(scrollIntervalRef.current);
    setIsAutoScrolling(true);
    scrollIntervalRef.current = setInterval(() => {
      const c = feedContainerRef.current;
      if (c) c.scrollBy({ top: 2, behavior: 'auto' });
    }, 30);
  }, []);

  const stopScroll = useCallback(() => {
    clearInterval(scrollIntervalRef.current);
    setIsAutoScrolling(false);
  }, []);

  useEffect(() => {
    if (feedMode === 'doomscroll') startScroll();
    else stopScroll();
    return () => clearInterval(scrollIntervalRef.current);
  }, [feedMode]);

  // ── Initialization ─────────────────────────────────────────────────────────
  useEffect(() => {
    const boot = async () => {
      const storedFeeds = await dbBroker.getItem('rssFeeds');
      if (storedFeeds) setRssFeeds(storedFeeds);

      const hasVault = await dbBroker.getItem('encryptedNotes');
      if (!hasVault) setVaultLocked(false);

      const cached = await dbBroker.getItem('cachedArticles');
      if (cached?.length) { setArticles(cached); setLoading(false); }

      const lastTheme = localStorage.getItem('yana_theme') || 'black';
      setTheme(lastTheme);
      document.documentElement.setAttribute('data-theme', lastTheme);

      const chronoSync = () => {
        const now = new Date();
        const bed = new Date(); bed.setHours(23, 0, 0, 0);
        const diff = bed.getTime() - now.getTime();
        let ratio = 0;
        if (diff < 0 && diff > -14400000) ratio = 1;
        else if (diff > 0 && diff < 18000000) ratio = 1 - diff / 18000000;
        const r = Math.round(59 + (239 - 59) * ratio);
        const g = Math.round(130 + (68 - 130) * ratio);
        const b = Math.round(246 + (68 - 246) * ratio);
        document.documentElement.style.setProperty('--accent-color', `rgb(${r},${g},${b})`);
      };
      const tick = setInterval(chronoSync, 30000);
      chronoSync();
      return () => clearInterval(tick);
    };
    boot();

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const r = new SR();
      r.continuous = false; r.interimResults = false; r.lang = 'en-US';
      r.onresult = (e) => { setNotes(p => `${p}\n[TRANSCRIPT]: ${e.results[0][0].transcript}`); setIsDictating(false); };
      r.onerror = () => setIsDictating(false);
      r.onend = () => setIsDictating(false);
      recognitionRef.current = r;
    }
  }, []);

  // ── Feed sync ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const sync = async () => {
      await dbBroker.setItem('rssFeeds', rssFeeds);
      refreshFeeds();
    };
    sync();
  }, [rssFeeds]);

  // ── Notes encryption ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!vaultLocked && cryptoPassword) {
      cryptoTool.encryptData(notes || ' ', cryptoPassword)
        .then(pkg => dbBroker.setItem('encryptedNotes', pkg));
    }
  }, [notes, vaultLocked, cryptoPassword]);

  // ── IntersectionObserver for focused card ──────────────────────────────────
  useEffect(() => {
    const container = feedContainerRef.current;
    if (!container) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (isHoveringRef.current) return;
      let best = null, bestRatio = 0;
      entries.forEach(e => { if (e.intersectionRatio > bestRatio) { bestRatio = e.intersectionRatio; best = e.target; } });
      if (best && bestRatio > 0.3) setFocusedArticleId(best.getAttribute('data-id'));
    }, { root: container, threshold: [0, 0.3, 0.5, 0.8, 1] });
    container.querySelectorAll('.article-card').forEach(el => observerRef.current.observe(el));
    return () => observerRef.current?.disconnect();
  }, [articles]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      // Ignore when typing in input/textarea
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'Escape') {
        if (panicMode) { setPanicMode(false); return; }
        if (settingsOpen) { setSettingsOpen(false); return; }
        if (notesOpen) { setNotesOpen(false); return; }
        setPanicMode(true);
        return;
      }

      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        navigateArticle(1);
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        navigateArticle(-1);
      } else if (e.key === 's' || e.key === 'S') {
        setNotesOpen(true);
      } else if (e.key === 'r' || e.key === 'R') {
        if (focusedArticleId) handleRefineWithAI(focusedArticleId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panicMode, settingsOpen, notesOpen, focusedArticleId, filteredRef.current]);

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

  // ── Save article to notes ──────────────────────────────────────────────────
  const handleSaveToNotes = (article) => {
    const entry = `\n\n## ${article.title}\n*${article.source || 'Feed'} · ${new Date(article.pubDate).toLocaleDateString()}*\n\n${article.snippet}\n\n[Read more](${article.link || ''})`;
    setNotes(prev => prev + entry);
    setNotesOpen(true);
  };

  // ── Glitch trigger ─────────────────────────────────────────────────────────
  const triggerGlitch = () => {
    setIsGlitching(true);
    setTimeout(() => setIsGlitching(false), 120);
  };

  // ── Feed refresh ───────────────────────────────────────────────────────────
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

  // ── Vault unlock ───────────────────────────────────────────────────────────
  const handleUnlockVault = async () => {
    try {
      const enc = await dbBroker.getItem('encryptedNotes');
      if (!enc) { setVaultLocked(false); return; }
      const plain = await cryptoTool.decryptData(enc, cryptoPassword);
      setNotes(plain); setVaultLocked(false); setFailedAttempts(0);
    } catch {
      const f = failedAttempts + 1;
      setFailedAttempts(f);
      if (f >= 3) {
        await dbBroker.purgeDatabase(); localStorage.clear();
        alert('FATAL: Vault wiped after 3 failed attempts.');
        window.location.reload();
      } else {
        alert(`Wrong password. ${3 - f} attempt(s) remaining.`);
      }
    }
  };

  // ── AI Refine ──────────────────────────────────────────────────────────────
  const handleRefineWithAI = async (articleId) => {
    if (!groqKey) { alert('Add a Groq API key in Settings first.'); setSettingsOpen(true); return; }
    setArticles(p => p.map(a => a.id === articleId ? { ...a, loading: true } : a));
    try {
      const art = articles.find(a => a.id === articleId);
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: `Summarize in 2 sharp sentences: ${art.title} — ${art.snippet}` }] }),
      });
      const data = await res.json();
      const refined = data.choices[0].message.content;
      setArticles(p => p.map(a => a.id === articleId ? { ...a, snippet: refined, aiRefined: true, loading: false } : a));
    } catch {
      setArticles(p => p.map(a => a.id === articleId ? { ...a, loading: false } : a));
      alert('AI request failed.');
    }
  };

  // ── TTS ───────────────────────────────────────────────────────────────────
  const handleToggleTTS = (article) => {
    if (!('speechSynthesis' in window)) return;
    if (ttsActiveId === article.id) { window.speechSynthesis.cancel(); setTtsActiveId(null); return; }
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(`${article.title}. ${article.snippet}`);
    msg.onend = () => setTtsActiveId(null);
    window.speechSynthesis.speak(msg);
    setTtsActiveId(article.id);
  };

  // ── OPML ──────────────────────────────────────────────────────────────────
  const handleImportOPML = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const urls = parseOPML(e.target.result);
      if (!urls.length) { alert('No feeds found in OPML file.'); return; }
      setRssFeeds(prev => [...new Set([...prev, ...urls])]);
    };
    reader.readAsText(file);
  };

  const handleHardReset = () => {
    if (confirm('Reset all data? This cannot be undone.')) {
      dbBroker.purgeDatabase(); localStorage.clear(); window.location.reload();
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
        className={`feed-container ${isGlitching ? 'glitching' : ''}`}
      >
        {loading && articles.length === 0 ? (
          [1, 2, 3, 4, 5].map(i => <SkeletonLoader key={i} />)
        ) : articles.length === 0 ? (
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
        <button className="floating-auto-scroll" onClick={() => isAutoScrolling ? stopScroll() : startScroll()}>
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
        onExport={() => {
          const blob = new Blob([notes], { type: 'text/markdown' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'yana_notes.md';
          a.click();
        }}
        onClose={() => setNotesOpen(false)}
        onNotesChange={setNotes}
      />

      <SettingsModal
        isOpen={settingsOpen}
        rssFeeds={rssFeeds}
        newRssUrl={newRssUrl}
        groqKey={groqKey}
        noImageMode={noImageMode}
        onClose={() => setSettingsOpen(false)}
        onUrlChange={setNewRssUrl}
        onAddFeed={() => { if (newRssUrl && !rssFeeds.includes(newRssUrl)) { setRssFeeds(p => [...p, newRssUrl]); setNewRssUrl(''); } }}
        onRemoveFeed={(u) => setRssFeeds(p => p.filter(f => f !== u))}
        onGroqKeyChange={setGroqKey}
        onToggleNoImage={() => setNoImageMode(p => !p)}
        onExportOPML={() => exportOPML(rssFeeds)}
        onImportOPML={handleImportOPML}
        onHardReset={handleHardReset}
      />
    </>
  );
}

export default App;
