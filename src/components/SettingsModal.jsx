import React, { useRef } from 'react';
import { X, Trash, Plus, ShieldAlert, Download, Upload } from 'lucide-react';

export const SettingsModal = ({
  isOpen,
  rssFeeds,
  newRssUrl,
  groqKey,
  onClose,
  onAddFeed,
  onRemoveFeed,
  onUrlChange,
  onGroqKeyChange,
  onExportOPML,
  onImportOPML,
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
          width: '520px',
          maxWidth: '96vw',
          maxHeight: '88vh',
          overflowY: 'auto',
          border: '1px solid var(--border-color)',
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ color: 'var(--text-primary)' }}>Settings</h2>
          <button className="btn-icon" onClick={onClose}><X size={24} /></button>
        </div>

        {/* RSS Feeds */}
        <section style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              RSS Feeds
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn-icon"
                title="Export as OPML"
                onClick={onExportOPML}
                style={{ fontSize: '0.75rem', gap: '4px', display: 'flex', alignItems: 'center', color: 'var(--accent-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px' }}
              >
                <Download size={14} /> OPML
              </button>
              <button
                className="btn-icon"
                title="Import OPML"
                onClick={() => fileInputRef.current?.click()}
                style={{ fontSize: '0.75rem', gap: '4px', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px' }}
              >
                <Upload size={14} /> Import
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

          <ul style={{ listStyle: 'none', padding: 0, marginBottom: '12px' }}>
            {rssFeeds.length === 0 && (
              <li style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '10px', textAlign: 'center' }}>
                No feeds added yet
              </li>
            )}
            {rssFeeds.map(feed => (
              <li
                key={feed}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--surface-hover)', borderRadius: '8px', marginBottom: '6px' }}
              >
                <span style={{ color: 'var(--text-primary)', wordBreak: 'break-all', fontSize: '0.83rem', flex: 1 }}>{feed}</span>
                <button className="btn-icon" style={{ padding: '0 8px', flexShrink: 0 }} onClick={() => onRemoveFeed(feed)}>
                  <Trash size={15} color="#ef4444" />
                </button>
              </li>
            ))}
          </ul>

          <div style={{ display: 'flex', gap: '10px' }}>
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
        </section>

        {/* Display Options */}
        <section style={{ marginBottom: '28px' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            Display
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--surface-hover)', borderRadius: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>Images</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Images are shown with articles when available.</div>
              </div>
            </div>
          </div>
        </section>

        {/* Groq AI */}
        <section style={{ marginBottom: '28px' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            AI (Groq)
          </h3>
          <input
            type="password"
            className="search-input"
            style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', width: '100%' }}
            placeholder="Groq API Key..."
            value={groqKey}
            onChange={(e) => onGroqKeyChange(e.target.value)}
          />
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            Used only when you manually click Refine on an article.
          </p>
        </section>

        {/* Keyboard Shortcuts */}
        <section style={{ marginBottom: '28px' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            Keyboard Shortcuts
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              ['J', 'Next article'],
              ['K', 'Previous article'],
              ['R', 'AI Refine focused'],
              ['S', 'Open notes'],
              ['Esc', 'Panic mode'],
            ].map(([key, desc]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: 'var(--surface-hover)', borderRadius: '8px' }}>
                <kbd style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '5px', padding: '3px 8px', fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--accent-color)', fontWeight: 700, flexShrink: 0 }}>{key}</kbd>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Danger Zone */}
        <section style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          <button
            className="btn-icon"
            style={{ color: '#ef4444', border: '1px solid #ef4444', width: '100%', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={onHardReset}
          >
            <ShieldAlert size={18} /> Reset All Data
          </button>
        </section>
      </div>
    </div>
  );
};
