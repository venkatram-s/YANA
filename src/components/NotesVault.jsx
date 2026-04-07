import React, { useState } from 'react';
import { Lock, AlertTriangle, X, Download, PenSquare, Plus, Trash, Eye, Edit3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

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
  const [isEditing, setIsEditing] = useState(false);

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
      <div style={{ width: '220px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem' }}>Notes</h3>
          <button className="btn-icon" onClick={() => {
            const newId = Date.now().toString();
            onNotesChange([...notes, { id: newId, title: 'New Note', date: new Date().toISOString(), content: '' }]);
            setSelectedNoteId(newId);
            setIsEditing(true);
          }}>
            <Plus size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {notes.map(note => (
            <div 
              key={note.id} 
              onClick={() => setSelectedNoteId(note.id)}
              style={{ padding: '12px 16px', cursor: 'pointer', background: selectedNoteId === note.id ? 'var(--surface-hover)' : 'transparent', borderBottom: '1px solid var(--border-color)' }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{note.title || 'Untitled'}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{new Date(note.date).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--surface-color)' }}>
        <div className="notes-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
            <Lock size={14} color="#10b981"/> {selectedNote ? selectedNote.title : 'Select a Note'}
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {selectedNote && (
              <button 
                className="btn-icon" 
                onClick={() => setIsEditing(!isEditing)} 
                title={isEditing ? "View Markdown" : "Edit Note"}
              >
                {isEditing ? <Eye size={18} /> : <Edit3 size={18} />}
              </button>
            )}
            <button className="btn-icon" onClick={() => { if(selectedNote) onNotesChange(notes.filter(n => n.id !== selectedNote.id)); setSelectedNoteId(null); }}>
              <Trash size={18} color="#ef4444" />
            </button>
            <button className="btn-icon" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {selectedNote ? (
            isEditing ? (
              <textarea 
                className="notes-textarea"
                style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', color: 'var(--text-primary)', outline: 'none', resize: 'none' }}
                value={selectedNote.content}
                onChange={(e) => onNotesChange(notes.map(n => n.id === selectedNote.id ? {...n, content: e.target.value} : n))}
                placeholder="Type your notes here (Markdown supported)..."
                autoFocus
              />
            ) : (
              <div className="markdown-body">
                <ReactMarkdown>{selectedNote.content || '_No content extractions found._'}</ReactMarkdown>
              </div>
            )
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Select a note or create a new one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
