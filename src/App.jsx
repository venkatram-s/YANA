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

const DEFAULT_FEEDS = [];

const dbBroker = new DatabaseBroker();
const cryptoTool = new CryptoHarden();

function App() {
  const [theme, setTheme] = useState('black');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  // 'ordinary' | 'doomscroll'
  const [feedMode, setFeedMode] = useState('ordinary');

  const [notesOpen, setNotesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);

  const [rssFeeds, setRssFeeds] = useState(DEFAULT_FEEDS);
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

  // Start/stop auto-scroll
  const startScroll = useCallback(() => {
    clearInterval(scrollIntervalRef.current);
    setIsAutoScrolling(true);
    scrollIntervalRef.current = setInterval(() => {
      const container = feedContainerRef.current;
      if (container) container.scrollBy({ top: 2, behavior: 'auto' });
    }, 30);
  }, []);

  const stopScroll = useCallback(() => {
    clearInterval(scrollIntervalRef.current);
    setIsAutoScrolling(false);
  }, []);

  // When mode switches, start/stop auto-scroll accordingly
  useEffect(() => {
    if (feedMode === 'doomscroll') {
      startScroll();
    } else {
      stopScroll();
    }
    return () => clearInterval(scrollIntervalRef.current);
  }, [feedMode]);

  // Initialization
  useEffect(() => {
    const bootstrapApplication = async () => {
      const storedFeeds = await dbBroker.getItem('rssFeeds');
      if (storedFeeds) setRssFeeds(storedFeeds);

      const hasEncryptedPayload = await dbBroker.getItem('encryptedNotes');
      if (!hasEncryptedPayload) setVaultLocked(false);

      const cachedArticles = await dbBroker.getItem('cachedArticles');
      if (cachedArticles && cachedArticles.length > 0) {
        setArticles(cachedArticles);
        setLoading(false);
      }

      const lastTheme = localStorage.getItem('yana_theme') || 'black';
      setTheme(lastTheme);
      document.documentElement.setAttribute('data-theme', lastTheme);

      const handleChronoSync = () => {
        const now = new Date();
        const bedtime = new Date();
        bedtime.setHours(23, 0, 0, 0);
        let diff = bedtime.getTime() - now.getTime();
        let ratio = 0;
        if (diff < 0 && diff > -14400000) ratio = 1;
        else if (diff > 0 && diff < 18000000) ratio = 1 - (diff / 18000000);
        const r = Math.round(59 + (239 - 59) * ratio);
        const g = Math.round(130 + (68 - 130) * ratio);
        const b = Math.round(246 + (68 - 246) * ratio);
        document.documentElement.style.setProperty('--accent-color', `rgb(${r}, ${g}, ${b})`);
      };
      const chronoTick = setInterval(handleChronoSync, 30000);
      handleChronoSync();

      return () => clearInterval(chronoTick);
    };

    bootstrapApplication();

    const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionImpl) {
      const recognizerInstance = new SpeechRecognitionImpl();
      recognizerInstance.continuous = false;
      recognizerInstance.interimResults = false;
      recognizerInstance.lang = 'en-US';
      recognizerInstance.onresult = (evt) => {
        const stream = evt.results[0][0].transcript;
        setNotes(prev => `${prev}\n[TRANSCRIPT]: ${stream}`);
        setIsDictating(false);
      };
      recognizerInstance.onerror = (e) => {
        console.warn('Speech recognition error:', e);
        setIsDictating(false);
      };
      recognizerInstance.onend = () => setIsDictating(false);
      recognitionRef.current = recognizerInstance;
    }
  }, []);

  // Sync feeds to IndexedDB and refresh
  useEffect(() => {
    const syncFeeds = async () => {
      await dbBroker.setItem('rssFeeds', rssFeeds);
      refreshGlobalFeeds();
    };
    syncFeeds();
  }, [rssFeeds]);

  // Auto-encrypt notes
  useEffect(() => {
    if (!vaultLocked && cryptoPassword) {
      const autoEncrypt = async () => {
        const pkg = await cryptoTool.encryptData(notes || ' ', cryptoPassword);
        await dbBroker.setItem('encryptedNotes', pkg);
      };
      autoEncrypt();
    }
  }, [notes, vaultLocked, cryptoPassword]);

  // Focal awareness — IntersectionObserver scoped to the feed container
  useEffect(() => {
    const container = feedContainerRef.current;
    if (!container) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      if (isHoveringRef.current) return;
      let focalItem = null;
      let maxRatio = 0;
      entries.forEach(entry => {
        if (entry.intersectionRatio > maxRatio) {
          maxRatio = entry.intersectionRatio;
          focalItem = entry.target;
        }
      });
      if (focalItem && maxRatio > 0.3) {
        setFocusedArticleId(focalItem.getAttribute('data-id'));
      }
    }, { root: container, threshold: [0, 0.3, 0.5, 0.8, 1.0] });

    container.querySelectorAll('.article-card').forEach(el => observerRef.current.observe(el));
    return () => observerRef.current.disconnect();
  }, [articles]);

  const refreshGlobalFeeds = async () => {
    if (articles.length === 0) setLoading(true);
    const aggregated = [];
    for (const url of rssFeeds) {
      const batch = await fetchRssContent(url);
      aggregated.push(...batch);
    }
    aggregated.sort((x, y) => new Date(y.pubDate) - new Date(x.pubDate));
    setArticles(aggregated);
    dbBroker.setItem('cachedArticles', aggregated);
    setLoading(false);
  };

  const handleUnlockVault = async () => {
    try {
      const encrypted = await dbBroker.getItem('encryptedNotes');
      if (!encrypted) { setVaultLocked(false); return; }
      const plainText = await cryptoTool.decryptData(encrypted, cryptoPassword);
      setNotes(plainText);
      setVaultLocked(false);
      setFailedAttempts(0);
    } catch (e) {
      const fails = failedAttempts + 1;
      setFailedAttempts(fails);
      if (fails >= 3) {
        await dbBroker.purgeDatabase();
        localStorage.clear();
        alert('FATAL_DATA_STERILIZATION: Consecutive failures detected. Internal enclaves eliminated.');
        window.location.reload();
      } else {
        alert(`Vault Authentication Failed. Attempts remaining: ${3 - fails}`);
      }
    }
  };

  const handleTogglePause = () => {
    if (isAutoScrolling) {
      stopScroll();
    } else {
      startScroll();
    }
  };

  const handleRefineWithAI = async (articleId) => {
    if (!groqKey) {
      alert('Groq API Key required. Add it in Settings.');
      setSettingsOpen(true);
      return;
    }
    setArticles(prev => prev.map(a => a.id === articleId ? { ...a, loading: true } : a));
    try {
      const article = articles.find(a => a.id === articleId);
      const prompt = `Refine this news snippet into a 2-sentence high-impact brief: ${article.title} - ${article.snippet}`;
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const data = await response.json();
      const refinedBrief = data.choices[0].message.content;
      setArticles(prev => prev.map(a => a.id === articleId ? { ...a, snippet: refinedBrief, aiRefined: true, loading: false } : a));
    } catch (err) {
      console.error('AI Refinement Failure:', err);
      setArticles(prev => prev.map(a => a.id === articleId ? { ...a, loading: false } : a));
      alert('Failed to reach AI service.');
    }
  };

  const handleToggleTTS = (article) => {
    if (!('speechSynthesis' in window)) return;
    if (ttsActiveId === article.id) {
      window.speechSynthesis.cancel();
      setTtsActiveId(null);
    } else {
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance(`${article.title}. ${article.snippet}`);
      msg.onend = () => setTtsActiveId(null);
      window.speechSynthesis.speak(msg);
      setTtsActiveId(article.id);
    }
  };

  const handleHardReset = () => {
    if (confirm('Reset all data? This cannot be reversed.')) {
      dbBroker.purgeDatabase();
      localStorage.clear();
      window.location.reload();
    }
  };

  const filtered = articles.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.snippet.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isDoomscroll = feedMode === 'doomscroll';

  return (
    <>
      <Header
        theme={theme}
        feedMode={feedMode}
        isLocked={vaultLocked}
        searchQuery={searchQuery}
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
        className={`feed-container ${isDoomscroll ? 'doomscroll-mode' : ''}`}
      >
        {loading && articles.length === 0 ? (
          [1, 2, 3, 4, 5].map(i => <SkeletonLoader key={i} />)
        ) : articles.length === 0 ? (
          <div className="empty-state">
            <h2 style={{ color: 'var(--accent-color)', marginBottom: '15px' }}>ZERO_INTELLIGENCE_SOURCES</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>No active news protocols detected. Add RSS sources in Settings to begin.</p>
            <button className="btn-primary" onClick={() => setSettingsOpen(true)}>Initialize Sources</button>
          </div>
        ) : (
          filtered.map(ia => (
            <IntelligentArticleCard
              key={ia.id}
              article={ia}
              isDoomscroll={isDoomscroll}
              isFocused={focusedArticleId === ia.id}
              ttsActiveId={ttsActiveId}
              isDictating={isDictating}
              xrayActiveId={xrayActiveId}
              onHover={(id) => { isHoveringRef.current = true; setFocusedArticleId(id); }}
              onLeave={() => { isHoveringRef.current = false; setFocusedArticleId(null); }}
              onPointerDown={(a) => { pressTimerRef.current = setTimeout(() => setXrayActiveId(a.id), 600); }}
              onPointerUp={() => { clearTimeout(pressTimerRef.current); setXrayActiveId(null); }}
              onToggleTTS={handleToggleTTS}
              onStartDictation={() => { setIsDictating(true); recognitionRef.current?.start(); }}
              onRefineWithAI={handleRefineWithAI}
            />
          ))
        )}
      </main>

      {isDoomscroll && (
        <button className="floating-auto-scroll" onClick={handleTogglePause}>
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
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'yana_notes.md';
          a.click();
          URL.revokeObjectURL(url);
        }}
        onClose={() => setNotesOpen(false)}
        onNotesChange={setNotes}
      />

      <SettingsModal
        isOpen={settingsOpen}
        rssFeeds={rssFeeds}
        newRssUrl={newRssUrl}
        groqKey={groqKey}
        onClose={() => setSettingsOpen(false)}
        onUrlChange={setNewRssUrl}
        onAddFeed={() => {
          if (newRssUrl && !rssFeeds.includes(newRssUrl)) {
            setRssFeeds([...rssFeeds, newRssUrl]);
            setNewRssUrl('');
          }
        }}
        onRemoveFeed={(u) => setRssFeeds(rssFeeds.filter(f => f !== u))}
        onGroqKeyChange={setGroqKey}
        onHardReset={handleHardReset}
      />
    </>
  );
}

export default App;
