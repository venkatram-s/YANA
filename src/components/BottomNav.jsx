import React from 'react';
import { Newspaper, Zap, Search, PenSquare, Settings, Lock } from 'lucide-react';

export const BottomNav = ({ 
  feedMode, 
  onSetFeedMode, 
  onOpenNotes, 
  onOpenSettings, 
  isLocked,
  onFocusSearch 
}) => {
  return (
    <nav className="bottom-nav">
      <button 
        className={`nav-item ${feedMode === 'ordinary' ? 'active' : ''}`}
        onClick={() => onSetFeedMode('ordinary')}
      >
        <Newspaper size={20} />
        <span>News</span>
      </button>
      
      <button 
        className={`nav-item ${feedMode === 'doomscroll' ? 'active' : ''}`}
        onClick={() => onSetFeedMode('doomscroll')}
      >
        <Zap size={20} />
        <span>Streams</span>
      </button>

      <button className="nav-item search-trigger" onClick={onFocusSearch}>
        <div className="search-circle">
          <Search size={22} color="#000" />
        </div>
      </button>

      <button className="nav-item" onClick={onOpenNotes}>
        {isLocked ? <Lock size={20} color="#ef4444" /> : <PenSquare size={20} />}
        <span>Vault</span>
      </button>

      <button className="nav-item" onClick={onOpenSettings}>
        <Settings size={20} />
        <span>Settings</span>
      </button>
    </nav>
  );
};
