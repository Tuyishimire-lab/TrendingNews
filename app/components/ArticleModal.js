'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatDate } from '@/lib/utils';

export default function ArticleModal({ article, onClose }) {
  const [summary, setSummary] = useState(null);
  const [sentiment, setSentiment] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingSentiment, setLoadingSentiment] = useState(false);

  // Close on escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleSummarize = useCallback(async () => {
    if (summary || loadingSummary) return;
    setLoadingSummary(true);
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          description: article.description,
          content: article.content,
          source: article.source_name,
        }),
      });
      if (res.ok) setSummary(await res.json());
    } catch { /* silently fail */ }
    setLoadingSummary(false);
  }, [article, summary, loadingSummary]);

  const handleSentiment = useCallback(async () => {
    if (sentiment || loadingSentiment) return;
    setLoadingSentiment(true);
    try {
      const res = await fetch('/api/ai/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          description: article.description,
          content: article.content,
        }),
      });
      if (res.ok) setSentiment(await res.json());
    } catch { /* silently fail */ }
    setLoadingSentiment(false);
  }, [article, sentiment, loadingSentiment]);

  if (!article) return null;

  const cat = Array.isArray(article.category) ? article.category[0] : (article.category || 'top');
  const sentClass = sentiment?.sentiment === 'positive' ? 'positive'
    : sentiment?.sentiment === 'negative' ? 'negative' : 'neutral';
  const sentEmoji = sentiment?.sentiment === 'positive' ? '😊'
    : sentiment?.sentiment === 'negative' ? '😟' : '😐';

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <button className="modal__close" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>

        {/* Image */}
        {article.image_url && (
          <div className="modal__image-wrap">
            <img
              className="modal__image"
              src={article.image_url}
              alt={article.title}
              onError={(e) => { e.target.parentElement.style.display = 'none'; }}
            />
            <span className="modal__category-badge">{cat}</span>
          </div>
        )}

        <div className="modal__body">
          {/* Meta */}
          <div className="modal__meta">
            <div className="modal__source">
              {article.source_icon && (
                <img className="modal__source-icon" src={article.source_icon} alt="" width={20} height={20}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              {article.source_name || 'Unknown Source'}
            </div>
            <time className="modal__date">{formatDate(article.pub_date)}</time>
          </div>

          {/* Content */}
          <h1 className="modal__title">{article.title}</h1>
          <p className="modal__description">{article.description || article.content || 'No description available.'}</p>

          {/* AI Section */}
          <div className="modal__ai-section">
            <div className="modal__ai-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a4 4 0 0 1 4 4v1h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2V6a4 4 0 0 1 4-4zm-2 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm4 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/></svg>
              AI Insights
            </div>
            <div className="modal__ai-actions">
              <button
                className={`ai-btn${loadingSummary ? ' loading' : ''}${summary ? ' done' : ''}`}
                onClick={handleSummarize}
                disabled={loadingSummary || !!summary}
              >
                ✨ {summary ? 'Summarized' : 'Summarize'}
              </button>
              <button
                className={`ai-btn${loadingSentiment ? ' loading' : ''}${sentiment ? ' done' : ''}`}
                onClick={handleSentiment}
                disabled={loadingSentiment || !!sentiment}
              >
                🎭 {sentiment ? 'Analyzed' : 'Sentiment'}
              </button>
            </div>

            {/* Summary Result */}
            {summary && (
              <div className="ai-result">
                <div className="ai-result__header">
                  <span className="ai-result__label">AI Summary</span>
                  <span className="ai-result__powered">Powered by Llama 3.3</span>
                </div>
                <div className="ai-result__content">
                  <p>{summary.summary}</p>
                  {summary.keyTakeaways?.length > 0 && (
                    <ul>
                      {summary.keyTakeaways.map((t, i) => (
                        <li key={i}><strong>→</strong> {t}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Sentiment Result */}
            {sentiment && (
              <div className="ai-result" style={{ marginTop: summary ? '0.75rem' : '1rem' }}>
                <div className="ai-result__header">
                  <span className="ai-result__label">Sentiment Analysis</span>
                  <span className="ai-result__powered">Powered by Llama 3.3</span>
                </div>
                <div className="ai-result__content">
                  <div className={`sentiment-badge sentiment-badge--${sentClass}`}>
                    {sentEmoji} {sentiment.sentiment?.charAt(0).toUpperCase() + sentiment.sentiment?.slice(1)}
                    {sentiment.confidence && ` · ${Math.round(sentiment.confidence * 100)}% confidence`}
                  </div>
                  <p>{sentiment.reasoning}</p>
                </div>
              </div>
            )}
          </div>

          {/* Read full article */}
          <a className="modal__read-full" href={article.link} target="_blank" rel="noopener noreferrer">
            Read Full Article
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
