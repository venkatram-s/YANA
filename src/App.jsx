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


// Safe path for mobile assets
const SUCCESS_SOUND_URL = './attached_assets/koiroylers-correct-356013.mp3';

function App() {
  // Move core utilities into useMemo to avoid global initialization TDZ issues
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
    try {
      const allResolved = await Promise.all(
        targetFeeds.map(f => fetchRssContent(f.url).catch(() => []))
      );
      const combined = allResolved.flat().sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
      setArticles(combined);
      if (combined.length > 0) triggerGlitch();
    } catch (err) {
      console.error('YANA REFRESH FAILED:', err);
    } finally {
      setLoading(false);
    }
  }, [triggerGlitch]);

  const refreshFeeds = useCallback(() => refreshFeedsInternal(rssFeeds), [rssFeeds, refreshFeedsInternal]);

  // Load Feeds and Settings from DB (One-time only)
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const initDB = async () => {
      try {
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
        
        // Initial fetch directly from the DB result
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
        ? results.map((r, i) => `[${i+1}] ${r.title}\n${r.snippet}\nSource: ${r.url}`).join('\n\n')
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
      new Audio(SUCCESS_SOUND_URL).play().catch(() => {});
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

  const filtered = useMemo(() => {
     const query = searchQuery.toLowerCase();
     return articles.filter(a => a.title.toLowerCase().includes(query) || a.snippet.toLowerCase().includes(query));
  }, [articles, searchQuery]);

  // Update filteredRef for navigation
  useEffect(() => {
    filteredRef.current = filtered;
  }, [filtered]);

  return (
    <div className={`yana-container ${isGlitching ? 'glitch-active' : ''}`}>
      <Header 
        theme={theme} 
        feedMode={feedMode}
        onSetTheme={setTheme}
        onSetFeedMode={setFeedMode}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        searchRef={searchRef}
        streak={streak}
      />

      <main className={`feed-container mode-${feedMode}`} ref={feedContainerRef}>
        {loading ? (
          <div className="skeleton-grid">{[1, 2, 3, 4, 5, 6].map(i => <SkeletonLoader key={i} />)}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
             <h2>Intelligence Stream Empty</h2>
             <p>Reconnecting to global dispatch nodes...</p>
            <button className="btn-primary" onClick={() => refreshFeeds()}>Reconnect Now</button>
          </div>
        ) : (
          filtered.map(article => (
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
          ))
        )}
      </main>

      <BottomNav onSetFeedMode={setFeedMode} onOpenVault={() => setNotesOpen(true)} onOpenSettings={() => setSettingsOpen(true)} />

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
        onHardReset={() => { 
            localStorage.clear(); 
            dbBroker.purgeDatabase().then(() => window.location.reload());
        }}
      />
    </div>
  );
}

export default App;
