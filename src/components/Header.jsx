import React from 'react';
import { BookOpen, Search, Moon, Sun, Settings, PenSquare, Lock, Newspaper, Zap, Flame, Monitor } from 'lucide-react';

export const Header = ({
  theme,
  feedMode,
  isLocked,
  searchQuery,
  streak,
  onSearchChange,
  onSetFeedMode,
  onToggleTheme,
  onOpenSettings,
  onOpenNotes,
}) => (
  <header className="app-header">
    <div className="logo-container">
      <BookOpen className="logo-icon" size={28} color="var(--accent-color)" />
      <h1 className="logo-text">YANA</h1>
      {streak > 0 && (
        <div className="streak-badge" title={`${streak}-day reading streak`}>
          <Flame size={13} />
          <span>{streak}</span>
        </div>
      )}
    </div>

    <div className="search-container">
      <Search size={18} color="var(--text-muted)" />
      <input
        type="text"
        placeholder="Search..."
        className="search-input"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>

    <div className="header-actions">
      <div className="mode-toggle">
        <button
          className={`mode-btn ${feedMode === 'ordinary' ? 'active' : ''}`}
          onClick={() => onSetFeedMode('ordinary')}
          title="Ordinary News"
        >
          <Newspaper size={15} />
          <span>News</span>
        </button>
        <button
          className={`mode-btn ${feedMode === 'doomscroll' ? 'active' : ''}`}
          onClick={() => onSetFeedMode('doomscroll')}
          title="Doomscrolling"
        >
          <Zap size={15} />
          <span>Doomscroll</span>
        </button>
      </div>

      <button className="btn-icon" onClick={onToggleTheme} title={`Toggle theme (Current: ${theme})`}>
        {theme === 'light' ? <Sun size={20} /> : theme === 'pitch-black' ? <Moon size={20} /> : <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--accent-color)' }}>C</div>}
      </button>
      <button className="btn-icon" onClick={onOpenSettings} title="Settings">
        <Settings size={20} />
      </button>
      <button className="btn-icon" onClick={onOpenNotes} title="Notes Vault">
        {isLocked ? <Lock size={20} color="#ef4444" /> : <PenSquare size={20} />}
      </button>
    </div>
  </header>
);
