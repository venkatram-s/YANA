import { useState, useEffect, useRef } from 'react';
import { Pause, Play } from 'lucide-react';

// Specialized Logic Layer Imports
import { DatabaseBroker } from './utils/databaseBroker';
import { CryptoHarden } from './utils/cryptoHarden';
import { fetchRssContent } from './services/newsService';

// Refactored UI Layer Imports
import { Header } from './components/Header';
import { IntelligentArticleCard } from './components/IntelligentArticleCard';
import { NotesVault } from './components/NotesVault';
import { SettingsModal } from './components/SettingsModal';

const DEFAULT_FEEDS = [
  'https://www.theverge.com/rss/index.xml',
  'https://techcrunch.com/feed/',
  'https://www.zdnet.com/news/rss.xml'
];

// Instantiating global service singletons to ensure consistent state and performance
const dbBroker = new DatabaseBroker();
const cryptoTool = new CryptoHarden();

/**
 * YANA Orchestrator (V3 Evolution)
 * 
 * Manages the high-level application state, including cryptographic handshakes, 
 * IndexedDB synchronizations, and dynamic UI layout transitions.
 */
function App() {
  // Global Application State 
  const [theme, setTheme] = useState('black');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isWarRoom, setIsWarRoom] = useState(false);
  
  // UI Interaction States
  const [notesOpen, setNotesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [ghostUIEnabled, setGhostUIEnabled] = useState(false);
  
  // Feed Configuration State
  const [rssFeeds, setRssFeeds] = useState(DEFAULT_FEEDS);
  const [newRssUrl, setNewRssUrl] = useState('');
  const [groqKey, setGroqKey] = useState(localStorage.getItem('groq_api_key') || '');
  
  // Component Interaction State
  const [ttsActiveId, setTtsActiveId] = useState(null);
  const [focusedArticleId, setFocusedArticleId] = useState(null);
  const [xrayActiveId, setXrayActiveId] = useState(null);
  const [isDictating, setIsDictating] = useState(false);

  // Cryptographic & Security States (Dead Drop Protocol)
  const [cryptoPassword, setCryptoPassword] = useState('');
  const [vaultLocked, setVaultLocked] = useState(true);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [notes, setNotes] = useState('');

  // Performance & Logic Persistence Refs
  const scrollIntervalRef = useRef(null);
  const observerRef = useRef(null);
  const pressTimerRef = useRef(null);
  const recognitionRef = useRef(null);
  const isHoveringRef = useRef(false);

  /**
   * INITIALIZATION SEQUENCE
   * Connects to IndexedDB, retrieves cached articles, and initializes Chrono-Interface logic.
   */
  useEffect(() => {
    const bootstrapApplication = async () => {
      // Step 1: Establish connection to the persistent IndexedDB enclave
      const storedFeeds = await dbBroker.getItem('rssFeeds');
      if (storedFeeds) setRssFeeds(storedFeeds);
      
      const hasEncryptedPayload = await dbBroker.getItem('encryptedNotes');
      if (!hasEncryptedPayload) {
          // If no encrypted payload exists, user is considered "New" or "Vault Not Initialized"
          setVaultLocked(false);
      }
      
      const cachedArticles = await dbBroker.getItem('cachedArticles');
      if (cachedArticles && cachedArticles.length > 0) {
          setArticles(cachedArticles);
          setLoading(false); 
      }

      // Step 2: Initialize visuals and theme configurations
      const lastTheme = localStorage.getItem('yana_theme') || 'black';
      setTheme(lastTheme);
      document.documentElement.setAttribute('data-theme', lastTheme);
      
      // Step 3: Chrono-Interface (Blue Light Mitigation Logic)
      // Gradually shifts --accent-color towards Red as bedtime (23:00) approaches.
      const handleChronoSync = () => {
        const now = new Date();
        const bedtime = new Date();
        bedtime.setHours(23, 0, 0, 0);
        let diff = bedtime.getTime() - now.getTime();
        let ratio = 0;
        if (diff < 0 && diff > -14400000) ratio = 1; // 4h past bedtime
        else if (diff > 0 && diff < 18000000) ratio = 1 - (diff / 18000000); // 5h leading up
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

    // Step 4: Initialize Speech Recognition for Voice-to-Note dictation
    const Lexicon = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (Lexicon) {
      const rec = new Lexicon();
      rec.continuous = false;
      rec.onresult = (evt) => {
        const transcript = evt.results[0][0].transcript;
        setNotes(prev => prev + `\n[VOICE_RECORD]: ${transcript}`);
        setIsDictating(false);
      };
      rec.onend = () => setIsDictating(false);
      recognitionRef.current = rec;
    }
  }, []);

  /**
   * FEED REFRESH ORCHESTRATION
   * Triggers whenever the RSS feed list updates.
   */
  useEffect(() => {
     const syncFeeds = async () => {
       await dbBroker.setItem('rssFeeds', rssFeeds);
       refreshGlobalFeeds();
     };
     syncFeeds();
  }, [rssFeeds]);

  /**
   * CRYPTOGRAPHIC AUTOMATION
   * Auto-encrypts volatile notes whenever they mutate while the vault is unlocked.
   */
  useEffect(() => {
     if (!vaultLocked && cryptoPassword) {
         const autoEncrypt = async () => {
             const pkg = await cryptoTool.encryptData(notes || ' ', cryptoPassword);
             await dbBroker.setItem('encryptedNotes', pkg);
         };
         autoEncrypt();
     }
  }, [notes, vaultLocked, cryptoPassword]);

  /**
   * FOCAL AWARENESS LOGIC
   * Uses IntersectionObserver for mobile and Hover state for desktop.
   */
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (isHoveringRef.current) return;
      let focalItem = null;
      let minDis = Infinity;
      entries.forEach(entry => {
        const d = Math.abs(entry.boundingClientRect.top + entry.boundingClientRect.height / 2 - window.innerHeight / 2);
        if (d < minDis) { minDis = d; focalItem = entry.target; }
      });
      if (focalItem) setFocusedArticleId(focalItem.getAttribute('data-id'));
    }, { threshold: [0.4, 0.6] });
    
    document.querySelectorAll('.article-card').forEach(el => observerRef.current.observe(el));
    return () => observerRef.current.disconnect();
  }, [articles, isWarRoom]);

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

  /**
   * CRYPTOGRAPHIC HANDSHAKE (VAULT UNLOCK)
   * Implements the "Dead Drop" wipe logic upon 3 consecutive decryption failures.
   */
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
          alert("FATAL_DATA_STERILIZATION: Consecutive failures detected. Internal enclaves eliminated.");
          window.location.reload();
       } else {
          alert(`Vault Authentication Failed. Attempts remaining: ${3 - fails}`);
       }
    }
  };

  const handleToggleAutoScroll = () => {
    if (isAutoScrolling) {
      clearInterval(scrollIntervalRef.current);
      setIsAutoScrolling(false);
      setGhostUIEnabled(false);
    } else {
      setIsAutoScrolling(true);
      setGhostUIEnabled(true);
      scrollIntervalRef.current = setInterval(() => window.scrollBy({ top: 1, behavior: 'auto' }), 40);
    }
  };

  const handleToggleTTS = (article) => {
    if (!('speechSynthesis' in window)) return;
    if (ttsActiveId === article.id) { 
        window.speechSynthesis.cancel(); setTtsActiveId(null); 
    } else {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(`${article.title}. ${article.snippet}`);
        msg.onend = () => setTtsActiveId(null);
        window.speechSynthesis.speak(msg);
        setTtsActiveId(article.id);
    }
  };

  const handleHardReset = () => {
    if (confirm("Initiate global system sterilization? This cannot be reversed.")) {
        dbBroker.purgeDatabase();
        localStorage.clear();
        window.location.reload();
    }
  };

  const filtered = articles.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.snippet.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Header
        theme={theme}
        isWarRoom={isWarRoom}
        isLocked={vaultLocked}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleWarRoom={() => setIsWarRoom(!isWarRoom)}
        onToggleTheme={() => { 
            const nt = theme === 'black' ? 'charcoal' : 'black'; 
            setTheme(nt); document.documentElement.setAttribute('data-theme', nt); 
        }}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenNotes={() => setNotesOpen(true)}
      />

      <main className={`feed-container ${isWarRoom ? 'war-room' : 'focus-masked'} ${ghostUIEnabled ? 'ghost-ui-active' : ''}`}>
        {loading && articles.length === 0 ? (
          <div className="loader"></div>
        ) : isWarRoom ? (
          <>
            {['Tech', 'Finance', 'Science', 'General'].map(cat => (
              <div className="war-column" key={cat}>
                <h3 className="column-title">{cat.toUpperCase()}</h3>
                {filtered.filter(a => (cat === 'General' ? !['Tech', 'Finance', 'Science'].includes(a.category) : a.category === cat)).map(ia => (
                   <IntelligentArticleCard
                      key={ia.id}
                      article={ia}
                      isWarRoom={true}
                      isFocused={true}
                      ttsActiveId={ttsActiveId}
                      isDictating={isDictating}
                      xrayActiveId={xrayActiveId}
                      onHover={setFocusedArticleId}
                      onLeave={() => setFocusedArticleId(null)}
                      onPointerDown={(a) => pressTimerRef.current = setTimeout(() => setXrayActiveId(a.id), 600)}
                      onPointerUp={() => { clearTimeout(pressTimerRef.current); setXrayActiveId(null); }}
                      onToggleTTS={handleToggleTTS}
                      onStartDictation={() => { setIsDictating(true); recognitionRef.current.start(); }}
                      onRefineWithAI={() => alert("Requires Groq API Key validation.")}
                   />
                ))}
              </div>
            ))}
          </>
        ) : (
          filtered.map(ia => (
             <IntelligentArticleCard
                key={ia.id}
                article={ia}
                isWarRoom={false}
                isFocused={focusedArticleId === ia.id}
                ttsActiveId={ttsActiveId}
                isDictating={isDictating}
                xrayActiveId={xrayActiveId}
                onHover={(id) => { isHoveringRef.current = true; setFocusedArticleId(id); }}
                onLeave={() => { isHoveringRef.current = false; setFocusedArticleId(null); }}
                onPointerDown={(a) => pressTimerRef.current = setTimeout(() => setXrayActiveId(a.id), 600)}
                onPointerUp={() => { clearTimeout(pressTimerRef.current); setXrayActiveId(null); }}
                onToggleTTS={handleToggleTTS}
                onStartDictation={() => { setIsDictating(true); recognitionRef.current.start(); }}
                onRefineWithAI={() => alert("Requires Groq API Key validation.")}
             />
          ))
        )}
      </main>

      <button className="floating-auto-scroll" onClick={handleToggleAutoScroll}>
        <div className={`scroll-indicator ${isAutoScrolling ? 'active' : ''}`}></div>
        <span>{isAutoScrolling ? 'Ghost Scroll Active' : 'Initiate Doomscroll'}</span>
        {isAutoScrolling ? <Pause size={18} /> : <Play size={18} />}
      </button>

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
            const a = document.createElement('a'); a.href = url; a.download = 'yana_export.md';
            a.click(); URL.revokeObjectURL(url);
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
        onAddFeed={() => { if (newRssUrl && !rssFeeds.includes(newRssUrl)) { setRssFeeds([...rssFeeds, newRssUrl]); setNewRssUrl(''); } }}
        onRemoveFeed={(u) => setRssFeeds(rssFeeds.filter(f => f !== u))}
        onGroqKeyChange={setGroqKey}
        onHardReset={handleHardReset}
      />
    </>
  );
}

export default App;
