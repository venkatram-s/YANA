import React, { useRef } from 'react';
import { X, Trash, Plus, ShieldAlert, Download, Upload, RefreshCw, Link as LinkIcon } from 'lucide-react';

export const SettingsModal = ({
  isOpen,
  rssFeeds,
  newRssUrl,
  groqKey,
  onClose,
  doomscrollIntervalMs,
  onDoomscrollIntervalChange,
  onAddFeed,
  onRemoveFeed,
  onUrlChange,
  onGroqKeyChange,
  primaryColor,
  secondaryColor,
  onPrimaryColorChange,
  onSecondaryColorChange,
  aiTone,
  onAiToneChange,
  customCss,
  onCustomCssChange,
  onExportOPML,
  onImportOPML,
  opmlSyncUrl,
  onOpmlSyncUrlChange,
  onSyncOPML,
  onHardReset,
}) => {
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  return (
    <div className="x-ray-overlay" style={{ justifyContent: 'center' }}>
      <div
        style={{
          background: 'var(--surface-color)',
          padding: '30px',
          borderRadius: '16px',
          width: '560px',
          maxWidth: '96vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid var(--border-color)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ color: 'var(--text-primary)' }}>Settings</h2>
          <button className="btn-icon" onClick={onClose}><X size={24} /></button>
        </div>

        {/* RSS Feeds (Restored) */}
        <section style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              RSS Subscriptions
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn-icon"
                title="Export OPML"
                onClick={onExportOPML}
                style={{ fontSize: '0.75rem', gap: '4px', display: 'flex', alignItems: 'center', color: 'var(--accent-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px' }}
              >
                <Download size={14} /> EXPORT
              </button>
              <button
                className="btn-icon"
                title="Import OPML"
                onClick={() => fileInputRef.current?.click()}
                style={{ fontSize: '0.75rem', gap: '4px', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px' }}
              >
                <Upload size={14} /> IMPORT
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".opml,.xml"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImportOPML(file);
                  e.target.value = '';
                }}
              />
            </div>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, marginBottom: '16px' }}>
            {rssFeeds.length === 0 && (
              <li style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '10px', textAlign: 'center' }}>
                No active dispatches
              </li>
            )}
            {rssFeeds.map(feed => (
              <li
                key={feed.id || feed.url}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--surface-hover)', borderRadius: '8px', marginBottom: '6px' }}
              >
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem' }}>{feed.name || 'Personal Feed'}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', wordBreak: 'break-all' }}>{feed.url}</div>
                </div>
                <button className="btn-icon" style={{ padding: '0 8px', flexShrink: 0 }} onClick={() => onRemoveFeed(feed)}>
                  <Trash size={15} color="#ef4444" />
                </button>
              </li>
            ))}
          </ul>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input
              type="text"
              className="search-input"
              style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', flex: 1 }}
              placeholder="Paste RSS feed URL..."
              value={newRssUrl}
              onChange={(e) => onUrlChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddFeed()}
            />
            <button className="btn-primary" onClick={onAddFeed} style={{ flexShrink: 0 }}>
              <Plus size={16} />
            </button>
          </div>

          {/* Remote Sync Enclave */}
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <LinkIcon size={12} /> Remote OPML Sync (Global Subscriptions)
            </h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                className="search-input"
                style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', flex: 1, fontSize: '0.8rem' }}
                placeholder="OPML URL (e.g. GitHub Gist)..."
                value={opmlSyncUrl || ''}
                onChange={(e) => onOpmlSyncUrlChange(e.target.value)}
              />
              <button 
                className="btn-secondary" 
                onClick={() => onSyncOPML()}
                style={{ flexShrink: 0, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
              >
                <RefreshCw size={14} /> SYNC
              </button>
            </div>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              Pulls subscriptions from a remote file and replaces local list. Ideal for multi-device sync.
            </p>
          </div>
        </section>

        {/* Custom Hex Themes (Easy Engine) */}
        <section style={{ marginBottom: '40px', paddingBottom: '30px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
            <h3 style={{ color: 'var(--accent-color)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '10px' }}>
               <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: '1px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900 }}>C</div>
               Terminal Aesthetics
            </h3>
          </div>
          
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Accent</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="color" 
                  value={primaryColor} 
                  onChange={(e) => onPrimaryColorChange(e.target.value)} 
                  style={{ width: '40px', height: '40px', border: 'none', background: 'transparent', cursor: 'pointer', flexShrink: 0 }}
                />
                <input 
                  type="text" 
                  className="search-input" 
                  style={{ fontSize: '0.85rem', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px', width: '100%' }}
                  value={primaryColor}
                  onChange={(e) => onPrimaryColorChange(e.target.value)}
                />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Canvas</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="color" 
                  value={secondaryColor} 
                  onChange={(e) => onSecondaryColorChange(e.target.value)} 
                  style={{ width: '40px', height: '40px', border: 'none', background: 'transparent', cursor: 'pointer', flexShrink: 0 }}
                />
                <input 
                  type="text" 
                  className="search-input" 
                  style={{ fontSize: '0.85rem', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px', width: '100%' }}
                  value={secondaryColor}
                  onChange={(e) => onSecondaryColorChange(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {[
              { name: 'Neon', p: '#f472b6', s: '#000000' },
              { name: 'Forest', p: '#10b981', s: '#064e3b' },
              { name: 'Royal', p: '#818cf8', s: '#1e1b4b' },
              { name: 'Slate', p: '#38bdf8', s: '#0f172a' },
              { name: 'Clear', p: '#6366f1', s: '#0d0d0d' },
            ].map(p => (
              <button 
                key={p.name}
                onClick={() => { onPrimaryColorChange(p.p); onSecondaryColorChange(p.s); }}
                style={{ fontSize: '0.65rem', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase' }}
              >
                {p.name}
              </button>
            ))}
          </div>
        </section>

        {/* AI Synthesis Character */}
        <section style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            AI Personality Core
          </h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['professional', 'sarcastic', 'quippy', 'positive'].map(tone => (
              <button
                key={tone}
                onClick={() => onAiToneChange(tone)}
                style={{ 
                  fontSize: '0.7rem', 
                  padding: '8px 16px', 
                  borderRadius: '10px', 
                  border: '1px solid', 
                  borderColor: aiTone === tone ? 'var(--accent-color)' : 'var(--border-color)',
                  background: aiTone === tone ? 'var(--accent-color)' : 'var(--surface-hover)', 
                  color: aiTone === tone ? '#000' : 'var(--text-primary)', 
                  cursor: 'pointer', 
                  fontWeight: 700, 
                  textTransform: 'uppercase',
                  transition: 'all 0.2s ease'
                }}
              >
                {tone}
              </button>
            ))}
          </div>
        </section>

        {/* AI (Groq) */}
        <section style={{ marginBottom: '28px' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            AI Cognitive Key (Groq)
          </h3>
          <input
            type="password"
            className="search-input"
            style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', width: '100%' }}
            placeholder="Paste Groq API Key..."
            value={groqKey || ''}
            onChange={(e) => onGroqKeyChange(e.target.value)}
          />
        </section>

        {/* Danger Zone */}
        <section style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          <button
            className="btn-icon"
            style={{ color: '#ef4444', border: '1px solid #ef4444', width: '100%', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={onHardReset}
          >
            <ShieldAlert size={18} /> Wipe Local System Cache
          </button>
        </section>
      </div>
    </div>
  );
};
