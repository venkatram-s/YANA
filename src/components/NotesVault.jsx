import React, { useState } from 'react';
import { Lock, AlertTriangle, X, Download, PenSquare, Plus, Trash } from 'lucide-react';

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
  const [selectedNoteId, setSelectedNoteId] = useState(null);

  if (!isOpen) return null;

  if (isLocked) {
    const isNewUser = !notes || notes.length === 0;
    return (
      <div className="x-ray-overlay" style={{ justifyContent: 'center' }}>
        <div style={{ background: 'var(--surface-color)', padding: '30px', borderRadius: '16px', maxWidth: '400px', textAlign: 'center', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-glow)' }}>
          <Lock size={48} color="var(--accent-color)" style={{ margin: '0 auto 20px auto' }} />
          <h2 style={{ marginBottom: '10px' }}>{isNewUser ? 'Initialize Vault' : 'Vault Enclave Locked'}</h2>
          <input 
            type="password" 
            placeholder={isNewUser ? "Create Master Password" : "Master Cryptographic Key"}
            className="search-input"
            style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', marginBottom: '15px', textAlign: 'center', width: '100%' }}
            value={cryptoPassword}
            onChange={(e) => onPasswordChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onUnlock()}
            autoFocus
          />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button className="btn-primary" onClick={onUnlock}>{isNewUser ? 'Initialize' : 'Decrypt Vault'}</button>
            <button className="btn-icon" onClick={onClose}><X size={20} /></button>
          </div>
        </div>
      </div>
    );
  }

  const selectedNote = notes.find(n => n.id === selectedNoteId);

  return (
    <div className={`notes-panel open`} style={{ display: 'flex', flexDirection: 'row' }}>
      {/* Sidebar: Note List */}
      <div style={{ width: '200px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Notes</h3>
          <button className="btn-icon" onClick={() => onNotesChange([...notes, { id: Date.now().toString(), title: 'New Note', date: new Date().toISOString(), content: '' }])}>
            <Plus size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {notes.map(note => (
            <div 
              key={note.id} 
              onClick={() => setSelectedNoteId(note.id)}
              style={{ padding: '12px', cursor: 'pointer', background: selectedNoteId === note.id ? 'var(--surface-hover)' : 'transparent', borderBottom: '1px solid var(--border-color)' }}
            >
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{note.title}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(note.date).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="notes-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={16} color="#10b981"/> {selectedNote ? selectedNote.title : 'Select a Note'}
          </h2>
          <div>
            <button className="btn-icon" onClick={() => { if(selectedNote) onNotesChange(notes.filter(n => n.id !== selectedNote.id)); setSelectedNoteId(null); }}>
              <Trash size={20} color="#ef4444" />
            </button>
            <button className="btn-icon" onClick={onClose}>
              <X size={24} />
            </button>
          </div>
        </div>
        {selectedNote && (
          <textarea 
            className="notes-textarea"
            value={selectedNote.content}
            onChange={(e) => onNotesChange(notes.map(n => n.id === selectedNote.id ? {...n, content: e.target.value} : n))}
          />
        )}
      </div>
    </div>
  );
};
