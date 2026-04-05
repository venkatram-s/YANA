import React from 'react';
import { Volume2, VolumeX, Mic, Bot } from 'lucide-react';

/**
 * IntelligentArticleCard component handles individual news items, 
 * including X-Ray, TTS playback, and user interactions.
 */
export const IntelligentArticleCard = ({
  article,
  isFocused,
  isWarRoom,
  ttsActiveId,
  isDictating,
  xrayActiveId,
  onHover,
  onLeave,
  onPointerDown,
  onPointerUp,
  onToggleTTS,
  onStartDictation,
  onRefineWithAI,
}) => {
  const isXrayActive = xrayActiveId === article.id;
  const isTtsActive = ttsActiveId === article.id;

  return (
    <article
      className={`article-card ${!isFocused && !isWarRoom ? 'unfocused' : ''}`}
      data-id={article.id}
      onMouseEnter={() => onHover(article.id)}
      onMouseLeave={onLeave}
    >
      <div 
        onPointerDown={() => onPointerDown(article)}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {article.image && (
          <img src={article.image} alt="High-Resolution Dispatch Thumbnail" className="article-media" />
        )}
        
        {isXrayActive && (
          <div className="x-ray-overlay">
            <div className="x-ray-title">⚡ Intelligent Entity Extraction</div>
            <div className="x-ray-entities">
              <span className="x-ray-entity">Apple Vision Pro</span>
              <span className="x-ray-entity">Tim Cook</span>
              <span className="x-ray-entity">Nvidia H100</span>
              <span className="x-ray-entity">OpenAI Sora</span>
            </div>
          </div>
        )}

        <div className="article-content">
          <div className="article-meta">
            <span className={`article-category ${article.aiRefined ? 'ai-verified' : ''}`}>
              {article.category}
            </span>
            <span>{new Date(article.pubDate).toLocaleDateString()}</span>
          </div>
          <h2 className="article-title">{article.title}</h2>
          <p className="article-snippet">{article.snippet}</p>
          
          <div className="article-actions">
            <button className="btn-primary" onClick={() => onToggleTTS(article)}>
              {isTtsActive ? <VolumeX size={16} /> : <Volume2 size={16} />}
              {isTtsActive ? 'Suspend' : 'Listen'}
            </button>
            <button className="btn-icon" title="Refine with AI Intelligence" onClick={() => onRefineWithAI(article.id)}>
              <Bot size={18} color={'var(--text-secondary)'} />
            </button>
            {isTtsActive && window.SpeechRecognition && (
              <button 
                className={`btn-icon ${isDictating ? 'recording' : ''}`} 
                title="Dictate Intelligence Thought" 
                onClick={onStartDictation}
              >
                <Mic size={18} />
              </button>
            )}
          </div>
          {isDictating && isTtsActive && <div className="voice-note-transcribing">Capturing Thought Stream...</div>}
        </div>
      </div>
    </article>
  );
};
  
