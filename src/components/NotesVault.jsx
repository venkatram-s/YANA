import React from 'react';
import { Lock, AlertTriangle, X, Download, PenSquare } from 'lucide-react';

/**
 * NotesVault component manages the encrypted "Dead Drop" notes storage.
 * Implements PBKDF2 logic and AES-GCM decryption prompts.
 */
export const NotesVault = ({
  isOpen,
  isLocked,
  notes,
  failedAttempts,
  cryptoPassword,
  onPasswordChange,
  onUnlock,
  onExport,
  onClose,
  onNotesChange,
}) => {
  if (!isOpen) return null;

  if (isLocked) {
    const isNewUser = !notes && failedAttempts === 0;

    return (
      <div className="x-ray-overlay" style={{ justifyContent: 'center' }}>
        <div style={{ background: 'var(--surface-color)', padding: '30px', borderRadius: '16px', maxWidth: '400px', textAlign: 'center', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-glow)' }}>
          <Lock size={48} color="var(--accent-color)" style={{ margin: '0 auto 20px auto' }} />
          <h2 style={{ marginBottom: '10px' }}>{isNewUser ? 'Initialize Vault' : 'Vault Enclave Locked'}</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
            {isNewUser ? 'Establish your master cryptographic key. This cannot be recovered.' : 'Derived decryption keys are volatile. Enter master password.'}
          </p>
          <input 
            type="password" 
            placeholder={isNewUser ? "Create Master Password" : "Master Cryptographic Key"}
            className="search-input"
            style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', marginBottom: '15px', textAlign: 'center', background: 'rgba(255,255,255,0.03)' }}
            value={cryptoPassword}
            onChange={(e) => onPasswordChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onUnlock()}
            autoFocus
          />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button className="btn-primary" onClick={onUnlock}>{isNewUser ? 'Initialize' : 'Decrypt Vault'}</button>
            <button className="btn-icon" onClick={onClose}><X size={20} /></button>
          </div>
          {failedAttempts > 0 && (
            <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '15px', fontWeight: '600' }}>
              <AlertTriangle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}/>
              ATA DROP WARNING: {3 - failedAttempts} attempts remaining.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`notes-panel open`}>
      <div className="notes-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock size={16} color="#10b981"/> Secure Thought Enclave
        </h2>
        <div>
          <button className="btn-icon" onClick={onExport} title="Stream to Markdown Dispatch">
            <Download size={20} />
          </button>
          <button className="btn-icon" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
      </div>
      <textarea 
        className="notes-textarea"
        placeholder="AES-GCM Protected Communication... Data persists in local enclave."
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
      />
    </div>
  );
};
