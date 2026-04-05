import React from 'react';
import { BookOpen, Search, Columns, Moon, Sun, Settings, PenSquare, Lock } from 'lucide-react';

/**
 * Header component orchestrates global navigation and state-based visual toggles.
 * Structured with high-contrast accessibility and fluid typography.
 */
export const Header = ({
  theme,
  isWarRoom,
  isLocked,
  searchQuery,
  onSearchChange,
  onToggleWarRoom,
  onToggleTheme,
  onOpenSettings,
  onOpenNotes,
}) => (
  <header className="app-header">
    <div className="logo-container">
      <BookOpen className="logo-icon" size={28} color="var(--accent-color)" />
      <h1 className="logo-text">YANA <span>V3</span></h1>
    </div>

    <div className="search-container">
      <Search size={18} color="var(--text-muted)" />
      <input
        type="text"
        placeholder="Adaptive Search..."
        className="search-input"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>

    <div className="header-actions">
      <button
        className={`btn-icon ${isWarRoom ? 'active' : ''}`}
        onClick={onToggleWarRoom}
        title="War Room Configuration"
      >
        <Columns size={20} />
      </button>
      <button
        className="btn-icon"
        onClick={onToggleTheme}
        title="Toggle Visual Identity"
      >
        {theme === 'black' ? <Moon size={20} /> : <Sun size={20} />}
      </button>
      <button
        className="btn-icon"
        onClick={onOpenSettings}
        title="Settings & Enclave"
      >
        <Settings size={20} />
      </button>
      <button
        className="btn-icon"
        onClick={onOpenNotes}
        title="Encrypted Intelligence Vault"
      >
        {isLocked ? <Lock size={20} color="#ef4444" /> : <PenSquare size={20} />}
      </button>
    </div>
  </header>
);
