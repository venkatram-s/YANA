import React from 'react';
import { Volume2, VolumeX, Bot, Loader2, PenSquare, Share2 } from 'lucide-react';

function bionicText(text) {
  if (!text) return null;
  return text.split(' ').map((word, i) => {
    if (!word) return <span key={i}> </span>;
    const boldLen = Math.max(1, Math.ceil(word.length * 0.4));
    return (
      <span key={i}>
        <span className="bionic-bold">{word.slice(0, boldLen)}</span>
        {word.slice(boldLen)}{' '}
      </span>
    );
  });
}

export const IntelligentArticleCard = ({
  article,
  isFocused,
  isDoomscroll,
  ttsActiveId,
  xrayActiveId,
  onHover,
  onLeave,
  onPointerDown,
  onPointerUp,
  onToggleTTS,
  onRefineWithAI,
  onSaveToNotes,
}) => {
  const isXrayActive = xrayActiveId === article.id;
  const isTtsActive = ttsActiveId === article.id;

  const handleShare = async () => {
    const url = article.link || window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: article.title, text: article.snippet, url }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); } catch {}
    }
  };

  return (
    <article
      className={`article-card ${!isFocused && isDoomscroll ? 'unfocused' : ''}`}
      data-id={article.id}
      style={article.image ? {
        backgroundImage: `url(${article.image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : {}}
      onMouseEnter={() => onHover(article.id)}
      onMouseLeave={onLeave}
      onPointerDown={() => onPointerDown(article)}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* Gradient overlay */}
      <div className="card-overlay" />

      {/* X-Ray */}
      {isXrayActive && (
        <div className="x-ray-overlay">
          <div className="x-ray-title">⚡ Entity Extraction</div>
          <div className="x-ray-entities">
            <span className="x-ray-entity">Apple Vision Pro</span>
            <span className="x-ray-entity">Tim Cook</span>
            <span className="x-ray-entity">Nvidia H100</span>
            <span className="x-ray-entity">OpenAI Sora</span>
          </div>
        </div>
      )}

      {/* Bottom content + right actions */}
      <div className="card-bottom">
        <div className="card-content">
          <div className="card-meta">
            <span className="article-source">{article.source || 'Feed'}</span>
            <span className="card-date">{new Date(article.pubDate).toLocaleDateString()}</span>
          </div>
          <h2 className="card-title">{article.title}</h2>
          <p className="card-snippet">{bionicText(article.snippet)}</p>
        </div>

        <div className="card-actions">
          <button
            className={`card-action-btn ${article.aiRefined ? 'action-refined' : ''}`}
            onClick={() => onRefineWithAI(article.id)}
            disabled={article.loading}
            title="AI Refine"
          >
            {article.loading
              ? <Loader2 size={24} className="spin" />
              : <Bot size={24} />}
            <span>Refine</span>
          </button>

          <button className="card-action-btn" onClick={onSaveToNotes} title="Save to Notes">
            <PenSquare size={24} />
            <span>Save</span>
          </button>

          <button className="card-action-btn" onClick={() => onToggleTTS(article)} title="Listen">
            {isTtsActive ? <VolumeX size={24} /> : <Volume2 size={24} />}
            <span>{isTtsActive ? 'Stop' : 'Listen'}</span>
          </button>

          <button className="card-action-btn" onClick={handleShare} title="Share">
            <Share2 size={24} />
            <span>Share</span>
          </button>
          <a className="readmore-link" href={article.link || '#'} target="_blank" rel="noreferrer">
            Readmore
          </a>
        </div>
      </div>
    </article>
  );
};
