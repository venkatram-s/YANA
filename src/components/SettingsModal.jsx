import React from 'react';
import { X, Trash, Plus, ShieldAlert } from 'lucide-react';

/**
 * SettingsModal component provides a high-contrast localized management interface.
 */
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
  onHardReset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="x-ray-overlay" style={{ justifyContent: 'center' }}>
      <div 
        style={{
          background: 'var(--surface-color)', 
          padding: '30px', 
          borderRadius: '16px', 
          width: '500px', 
          maxWidth: '96vw', 
          maxHeight: '85vh', 
          overflowY: 'auto'
        }} 
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ color: 'var(--text-primary)' }}>Enclave Configurations</h2>
          <button className="btn-icon" onClick={onClose}><X size={24} /></button>
        </div>
        
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '10px', fontSize: '1rem' }}>Active Intelligence Feeds</h3>
          <ul style={{ listStyle: 'none', padding: 0, marginBottom: '15px' }}>
            {rssFeeds.map(feed => (
              <li key={feed} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--surface-hover)', borderRadius: '8px', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-primary)', wordBreak: 'break-all', fontSize: '0.85rem' }}>{feed}</span>
                <button className="btn-icon" style={{ padding: '0 8px' }} onClick={() => onRemoveFeed(feed)}>
                  <Trash size={16} color="#ef4444" />
                </button>
              </li>
            ))}
          </ul>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              className="search-input" 
              style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', width: '100%' }} 
              placeholder="Inject RSS Protocol Source..." 
              value={newRssUrl}
              onChange={(e) => onUrlChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddFeed()}
            />
            <button className="btn-primary" onClick={onAddFeed}><Plus size={16} /></button>
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '10px', fontSize: '1rem' }}>AI Intelligence Bridge (Groq)</h3>
          <input 
            type="password" 
            className="search-input" 
            style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', width: '100%' }} 
            placeholder="gsk_Vault_Access_Token..." 
            value={groqKey}
            onChange={(e) => onGroqKeyChange(e.target.value)}
          />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '10px' }}>
            Used for deep-extraction heuristics and entity refinement.
          </p>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          <button 
             className="btn-icon" 
             style={{ color: '#ef4444', border: '1px solid #ef4444', width: '100%', borderRadius: '8px', padding: '12px' }} 
             onClick={onHardReset}
          >
            <ShieldAlert size={18} style={{ marginRight: '8px' }} /> Catastrophic Reset & Sterilization
          </button>
        </div>
      </div>
    </div>
  );
};
