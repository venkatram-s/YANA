import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import { DatabaseBroker } from './utils/databaseBroker';
import { CryptoHarden } from './utils/cryptoHarden';
import { fetchRssContent } from './services/newsService';
import { BottomNav } from './components/BottomNav';

import { Header } from './components/Header';
import { IntelligentArticleCard } from './components/IntelligentArticleCard';
import { SkeletonLoader } from './components/SkeletonLoader';
import { NotesVault } from './components/NotesVault';
import { SettingsModal } from './components/SettingsModal';
import { getApiUrl } from './utils/config';
import { parseOPML, generateOPML } from './utils/opmlHelpers';


// Safe path for mobile assets
const SUCCESS_SOUND_URL = './attached_assets/koiroylers-correct-356013.mp3';

function App() {
  const dbBroker = useMemo(() => new DatabaseBroker(), []);
  const cryptoTool = useMemo(() => new CryptoHarden(), []);

  const [theme, setTheme] = useState(() => localStorage.getItem('yana_theme') || 'pitch-black');
  const [primaryColor, setPrimaryColor] = useState(() => localStorage.getItem('yana_primary_color') || '#60a5fa');
  const [secondaryColor, setSecondaryColor] = useState(() => localStorage.getItem('yana_secondary_color') || '#000000');

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedMode, setFeedMode] = useState('doomscroll');
  const [isGlitching, setIsGlitching] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aiTone, setAiTone] = useState(() => localStorage.getItem('yana_ai_tone') || 'professional');
  const [searchQuery, setSearchQuery] = useState('');

  const [streak] = useState(() => {
    const today = new Date().toDateString();
    const last = localStorage.getItem('yana_last_visit');
    const streakVal = parseInt(localStorage.getItem('yana_streak') || '0', 10);
    if (last === today) return streakVal;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const next = last === yesterday.toDateString() ? streakVal + 1 : 1;
    localStorage.setItem('yana_streak', String(next));
    localStorage.setItem('yana_last_visit', today);
    return next;
  });

  const [rssFeeds, setRssFeeds] = useState([]);
  const [newRssUrl, setNewRssUrl] = useState('');
  const [groqKey, setGroqKey] = useState(localStorage.getItem('groq_api_key') || '');
  const [ttsActiveId, setTtsActiveId] = useState(null);
  const [focusedArticleId, setFocusedArticleId] = useState(null);
  const [cryptoPassword, setCryptoPassword] = useState('');
  const [vaultLocked, setVaultLocked] = useState(true);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [notes, setNotes] = useState([]);
  const [customCss, setCustomCss] = useState(() => localStorage.getItem('yana_custom_css') || '');
  const [doomscrollIntervalMs, setDoomscrollIntervalMs] = useState(() => {
    const v = localStorage.getItem('yana_doomscroll_interval_ms');
    const parsed = v ? parseInt(v, 10) : 5000;
    return isNaN(parsed) ? 5000 : parsed;
  });

  const [opmlSyncUrl, setOpmlSyncUrl] = useState(() => localStorage.getItem('yana_opml_sync_url') || '');

  const [xrayActiveId, setXrayActiveId] = useState(null);
  const pressTimerRef = useRef(null);
  const feedContainerRef = useRef(null);
  const searchRef = useRef(null);
  const filteredRef = useRef([]);
  const hasInitializedRef = useRef(false);

  // Load custom CSS
  useEffect(() => {
    let style = document.getElementById('yana-custom-runtime-css');
    if (!style) {
      style = document.createElement('style');
      style.id = 'yana-custom-runtime-css';
      document.head.appendChild(style);
    }
    style.innerHTML = customCss;
  }, [customCss]);

  // Load themes
  useEffect(() => {
    document.documentElement.className = `theme-${theme}`;
    document.documentElement.style.setProperty('--accent-color', primaryColor);
    document.documentElement.style.setProperty('--bg-color', secondaryColor);
    localStorage.setItem('yana_theme', theme);
    localStorage.setItem('yana_primary_color', primaryColor);
    localStorage.setItem('yana_secondary_color', secondaryColor);
  }, [theme, primaryColor, secondaryColor]);

  const triggerGlitch = useCallback(() => {
    setIsGlitching(true);
    setTimeout(() => setIsGlitching(false), 300);
  }, []);

  const refreshFeedsInternal = useCallback(async (targetFeeds) => {
    if (!targetFeeds || targetFeeds.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    triggerGlitch();

    // Partial Loading for High Perceived Speed
    let accum = [];
    const feedCount = targetFeeds.length;
    let finishedCount = 0;

    targetFeeds.forEach(async (f) => {
      try {
        const res = await fetchRssContent(f.url);
        accum = [...accum, ...res].sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));
        setArticles(prev => {
          const combined = [...prev, ...res].filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
          return combined.sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));
        });
      } catch (err) {
        console.error(`Feed ${f.url} failed:`, err);
      } finally {
        finishedCount++;
        if (finishedCount === feedCount) {
          setLoading(false);
          dbBroker.setItem('articles_cache', accum);
        }
      }
    });

  }, [dbBroker, triggerGlitch]);

  const refreshFeeds = useCallback(() => refreshFeedsInternal(rssFeeds), [rssFeeds, refreshFeedsInternal]);

  // Load Initial State from DB
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const initDB = async () => {
      try {
        // Instant Boot from Cache
        const cachedArticles = await dbBroker.getItem('articles_cache');
        if (cachedArticles && cachedArticles.length > 0) {
          setArticles(cachedArticles);
          setLoading(false);
        }

        const feeds = await dbBroker.getItem('rssFeeds');
        let currentFeeds = feeds;
        if (!feeds || feeds.length === 0) {
          const defaults = [
            { id: '1', url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge' },
            { id: '2', url: 'https://news.ycombinator.com/rss', name: 'Hacker News' },
            { id: '3', url: 'https://techcrunch.com/feed/', name: 'TechCrunch' }
          ];
          currentFeeds = defaults;
          await dbBroker.setItem('rssFeeds', defaults);
        }
        setRssFeeds(currentFeeds);

        // Background refresh dispatches
        refreshFeedsInternal(currentFeeds);

        const cachedNotes = await dbBroker.getItem('encryptedNotes');
        if (cachedNotes) setNotes(cachedNotes);
      } catch (err) {
        console.error('YANA DB BOOTSTRAP FAILED:', err);
        setLoading(false);
      }
    };
    initDB();
  }, [dbBroker, refreshFeedsInternal]);

  const navigateArticle = useCallback((dir) => {
    const list = filteredRef.current;
    if (!list.length) return;
    const idx = list.findIndex(a => a.id === focusedArticleId);
    const nextIdx = Math.max(0, Math.min(list.length - 1, idx + dir));
    const nextId = list[nextIdx]?.id;
    if (!nextId) return;
    setFocusedArticleId(nextId);
    const el = feedContainerRef.current?.querySelector(`[data-id="${nextId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusedArticleId]);

  const handleRefineWithAI = useCallback(async (articleId) => {
    if (!groqKey) { alert('Add a Groq API key in Settings first.'); setSettingsOpen(true); return; }
    setArticles(p => p.map(a => a.id === articleId ? { ...a, loading: true } : a));
    try {
      const art = articles.find(a => a.id === articleId);
      const searchQueryParam = encodeURIComponent(`${art.title} ${art.snippet.substring(0, 100)}`);
      const searchRes = await fetch(getApiUrl(`/api/web-search?q=${searchQueryParam}`));
      const searchData = await searchRes.json();
      const results = searchData.results || [];
      const contextText = results.length > 0
        ? results.map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.url}`).join('\n\n')
        : 'No live search results available.';

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{
            role: 'user',
            content: `Article: ${art.title}\nContext:\n${contextText}\n\nSummary in tone "${aiTone}". [Summary] | Tags: [Tag1, Tag2]`
          }]
        }),
      });
      const data = await res.json();
      const content = data.choices[0].message.content;
      const [refined, tagStr] = content.split('| Tags: ');
      const newTags = tagStr ? tagStr.split(',').map(t => t.trim()) : [];
      setArticles(p => p.map(a => a.id === articleId ? { ...a, snippet: refined, tags: newTags, aiRefined: true, loading: false } : a));
      new Audio(SUCCESS_SOUND_URL).play().catch(() => { });
    } catch (err) {
      console.error('AI refinement failed:', err);
      setArticles(p => p.map(a => a.id === articleId ? { ...a, loading: false } : a));
    }
  }, [aiTone, articles, groqKey]);

  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const k = e.key.toLowerCase();
      if (k === 'j') navigateArticle(1);
      if (k === 'k') navigateArticle(-1);
      if (k === 's') setNotesOpen(true);
      if (k === 'r' && focusedArticleId) handleRefineWithAI(focusedArticleId);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusedArticleId, navigateArticle, handleRefineWithAI]);

  const handleUnlockVault = useCallback(async () => {
    if (!cryptoPassword) return;
    try {
      const encPackage = await dbBroker.getItem('encryptedNotes');
      if (!encPackage) { setVaultLocked(false); return; }
      const decrypted = await cryptoTool.decryptData(encPackage, cryptoPassword);
      if (decrypted) {
        setNotes(JSON.parse(decrypted));
        setVaultLocked(false);
        setFailedAttempts(0);
      }
    } catch (e) {
      console.error("YANA CRYPTO FAILURE:", e);
      const f = failedAttempts + 1;
      setFailedAttempts(f);
      if (f >= 3) {
        await dbBroker.purgeDatabase();
        localStorage.clear();
        window.location.reload();
      } else {
        alert(`ACCESS_DENIED: ${3 - f} attempts remaining.`);
      }
    }
  }, [cryptoPassword, failedAttempts, dbBroker, cryptoTool]);

  const handleToggleTTS = useCallback((article) => {
    if (!('speechSynthesis' in window)) return;
    if (ttsActiveId === article.id) { window.speechSynthesis.cancel(); setTtsActiveId(null); return; }
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(`${article.title}. ${article.snippet}`);
    msg.onend = () => setTtsActiveId(null);
    window.speechSynthesis.speak(msg);
    setTtsActiveId(article.id);
  }, [ttsActiveId]);

  const handleSaveToNotes = useCallback(async (article) => {
    if (vaultLocked) { setNotesOpen(true); alert('Unlock vault to save.'); return; }
    const newNote = {
      id: Date.now().toString(),
      title: `Ref: ${article.title}`,
      date: new Date().toISOString(),
      content: `### ${article.title}\nSource: ${article.source}\nDate: ${article.pubDate}\n\n${article.snippet}\n\n[Original Dispatch](${article.link})`
    };
    const updated = [...notes, newNote];
    setNotes(updated);
    const encrypted = await cryptoTool.encryptData(JSON.stringify(updated), cryptoPassword);
    await dbBroker.setItem('encryptedNotes', encrypted);
  }, [vaultLocked, notes, cryptoPassword, cryptoTool, dbBroker]);

  const handleUpdateNotes = useCallback(async (updated) => {
    setNotes(updated);
    if (!vaultLocked) {
      const encrypted = await cryptoTool.encryptData(JSON.stringify(updated), cryptoPassword);
      await dbBroker.setItem('encryptedNotes', encrypted);
    }
  }, [vaultLocked, cryptoPassword, cryptoTool, dbBroker]);

  const handleImportOPML = useCallback(async (file) => {
    try {
      const text = await file.text();
      const importedFeeds = parseOPML(text);
      if (importedFeeds.length === 0) { alert('No valid feeds found in OPML.'); return; }
      const updated = [...rssFeeds, ...importedFeeds].filter((v, i, a) => a.findIndex(t => (t.url === v.url)) === i);
      setRssFeeds(updated);
      await dbBroker.setItem('rssFeeds', updated);
      refreshFeedsInternal(updated);
      triggerGlitch();
    } catch (err) {
      console.error('OPML Import Failed:', err);
      alert('Failed to parse OPML file.');
    }
  }, [rssFeeds, dbBroker, refreshFeedsInternal, triggerGlitch]);

  const handleExportOPML = useCallback(() => {
    const content = generateOPML(rssFeeds);
    const blob = new Blob([content], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `yana_feeds_${new Date().toISOString().slice(0, 10)}.opml`;
    link.click();
    URL.revokeObjectURL(url);
  }, [rssFeeds]);

  const handleSyncOPML = useCallback(async (targetUrl) => {
    const urlToUse = targetUrl || opmlSyncUrl;
    if (!urlToUse) return;
    setLoading(true);
    try {
      const res = await fetch(getApiUrl(`/api/proxy?url=${encodeURIComponent(urlToUse)}`));
      const text = await res.text();
      const importedFeeds = parseOPML(text);
      if (importedFeeds.length > 0) {
        setRssFeeds(importedFeeds);
        await dbBroker.setItem('rssFeeds', importedFeeds);
        refreshFeedsInternal(importedFeeds);
      }
    } catch (err) {
      console.error('OPML Sync Failed:', err);
      alert('Failed to sync remote OPML.');
    }
  }, [opmlSyncUrl, dbBroker, refreshFeedsInternal]);

  const filtered = useMemo(() => {
    const query = searchQuery?.toLowerCase() || '';
    return articles.filter(a => {
      const t = (a.title || '').toLowerCase();
      const s = (a.snippet || '').toLowerCase();
      return t.includes(query) || s.includes(query);
    });
  }, [articles, searchQuery]);

  // Handle Search Input in Header
  const handleSearchChange = useCallback((val) => {
    setSearchQuery(val);
  }, []);

  // Cycle themes in Header
  const handleToggleTheme = useCallback(() => {
    if (theme === 'light') setTheme('pitch-black');
    else if (theme === 'pitch-black') setTheme('custom');
    else setTheme('light');
  }, [theme]);

  // Update filteredRef for navigation
  useEffect(() => {
    filteredRef.current = filtered;
  }, [filtered]);

  return (
    <div className={`yana-container ${isGlitching ? 'glitch-active' : ''}`}>
      <Header
        theme={theme}
        feedMode={feedMode}
        isLocked={vaultLocked}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onToggleTheme={handleToggleTheme}
        onSetFeedMode={setFeedMode}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenNotes={() => setNotesOpen(true)}
        searchRef={searchRef}
        streak={streak}
      />

      <main className={`feed-container mode-${feedMode}`} ref={feedContainerRef}>
        {loading && articles.length === 0 ? (
          <div className="skeleton-grid">{[1, 2, 3, 4, 5, 6].map(i => <SkeletonLoader key={i} />)}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <h2>Intelligence Stream Empty</h2>
            <p>Reconnecting to global dispatch nodes...</p>
            <button className="btn-primary" onClick={() => refreshFeeds()}>Reconnect Now</button>
            {opmlSyncUrl && <button className="btn-secondary" onClick={() => handleSyncOPML()} style={{ marginTop: '10px' }}>Sync Remote OPML</button>}
          </div>
        ) : (
          <>
            {loading && <div style={{ position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)', background: 'var(--accent-color)', color: '#000', padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, zIndex: 1000, boxShadow: '0 4px 10px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="spinner-mini" style={{ width: '12px', height: '12px', border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              FETCHING UPDATES...
            </div>}
            {filtered.map(article => (
              <IntelligentArticleCard
                key={article.id}
                article={article}
                isFocused={focusedArticleId === article.id}
                isDoomscroll={feedMode === 'doomscroll'}
                ttsActiveId={ttsActiveId}
                xrayActiveId={xrayActiveId}
                onHover={setFocusedArticleId}
                onPointerDown={() => { pressTimerRef.current = setTimeout(() => setXrayActiveId(article.id), 800); }}
                onPointerUp={() => { clearTimeout(pressTimerRef.current); setXrayActiveId(null); }}
                onToggleTTS={handleToggleTTS}
                onRefineWithAI={handleRefineWithAI}
                onSaveToNotes={() => handleSaveToNotes(article)}
              />
            ))}
          </>
        )}
      </main>

      <BottomNav
        feedMode={feedMode}
        onSetFeedMode={setFeedMode}
        onOpenNotes={() => setNotesOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        isLocked={vaultLocked}
        onFocusSearch={() => searchRef.current?.focus()}
      />

      <NotesVault
        isOpen={notesOpen}
        isLocked={vaultLocked}
        notes={notes}
        cryptoPassword={cryptoPassword}
        onPasswordChange={setCryptoPassword}
        onUnlock={handleUnlockVault}
        onClose={() => setNotesOpen(false)}
        onNotesChange={handleUpdateNotes}
      />

      <SettingsModal
        isOpen={settingsOpen}
        rssFeeds={rssFeeds}
        newRssUrl={newRssUrl}
        groqKey={groqKey}
        onClose={() => setSettingsOpen(false)}
        doomscrollIntervalMs={doomscrollIntervalMs}
        onDoomscrollIntervalChange={setDoomscrollIntervalMs}
        onAddFeed={async () => {
          if (!newRssUrl) return;
          const newFeed = { id: Date.now().toString(), url: newRssUrl, name: 'Personal Feed' };
          const updated = [...rssFeeds, newFeed];
          setRssFeeds(updated);
          setNewRssUrl('');
          await dbBroker.setItem('rssFeeds', updated);
          refreshFeedsInternal(updated);
        }}
        onRemoveFeed={async (feed) => {
          const updated = rssFeeds.filter(f => f.id !== feed.id);
          setRssFeeds(updated);
          await dbBroker.setItem('rssFeeds', updated);
        }}
        onUrlChange={setNewRssUrl}
        onGroqKeyChange={(key) => { setGroqKey(key); localStorage.setItem('groq_api_key', key); }}
        primaryColor={primaryColor}
        onPrimaryColorChange={setPrimaryColor}
        secondaryColor={secondaryColor}
        onSecondaryColorChange={setSecondaryColor}
        aiTone={aiTone}
        onAiToneChange={setAiTone}
        customCss={customCss}
        onCustomCssChange={setCustomCss}
        onExportOPML={handleExportOPML}
        onImportOPML={handleImportOPML}
        opmlSyncUrl={opmlSyncUrl}
        onOpmlSyncUrlChange={(u) => { setOpmlSyncUrl(u); localStorage.setItem('yana_opml_sync_url', u); }}
        onSyncOPML={handleSyncOPML}
        onHardReset={() => {
          localStorage.clear();
          dbBroker.purgeDatabase().then(() => window.location.reload());
        }}
      />
    </div>
  );
}

export default App;
