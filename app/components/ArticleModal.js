'use client';

import { useState, useEffect } from 'react';
import { formatDate } from '@/lib/utils';

const SENTIMENT_MAP = {
  positive: { emoji: '😊', label: 'Positive', cls: 'positive' },
  negative: { emoji: '😟', label: 'Negative', cls: 'negative' },
  neutral: { emoji: '😐', label: 'Neutral', cls: 'neutral' },
};

export default function ArticleModal({ article, onClose }) {
  const [summary, setSummary] = useState(article?.ai_summary || '');
  const [takeaways, setTakeaways] = useState([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (article) {
      setSummary(article.ai_summary || '');
      setTakeaways([]);
    }
  }, [article]);

  if (!article) return null;

  const cat = Array.isArray(article.category) ? article.category[0] : (article.category || 'top');
  const sent = SENTIMENT_MAP[article.ai_sentiment];
  const confidencePct = article.ai_sentiment_score ? Math.round(article.ai_sentiment_score * 100) : null;

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

          {/* AI Insights Section */}
          <div className="modal__ai-section">
            <div className="modal__ai-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a4 4 0 0 1 4 4v1h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2V6a4 4 0 0 1 4-4zm-2 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm4 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/></svg>
              AI Insights
              <span className="modal__ai-powered">Powered by Llama 3.3</span>
            </div>

            {loading ? (
              <div className="ai-loading" style={{ padding: '1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid var(--border-color)', borderTopColor: 'var(--accent-glow)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                Analyzing article content...
              </div>
            ) : (
              <>
                {/* AI Summary */}
                {summary ? (
                  <div className="ai-result">
                    <div className="ai-result__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="ai-result__label">✨ AI Summary</span>
                      {takeaways.length === 0 && (
                        <button
                          className="ai-btn ai-btn--secondary"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          onClick={async () => {
                            setLoading(true);
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
                              if (res.ok) {
                                const data = await res.json();
                                setSummary(data.summary);
                                setTakeaways(data.keyTakeaways || []);
                                // Save locally to article object to preserve state if reopened
                                article.ai_summary = data.summary;
                                article.key_takeaways = data.keyTakeaways;
                              }
                            } catch (err) {
                              console.error(err);
                            } finally {
                              setLoading(false);
                            }
                          }}
                        >
                          🔍 Deepen Analysis
                        </button>
                      )}
                    </div>
                    <div className="ai-result__content">
                      <p style={{ lineHeight: '1.5' }}>{summary}</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '0.5rem 0' }}>
                    <button
                      className="ai-btn"
                      onClick={async () => {
                        setLoading(true);
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
                          if (res.ok) {
                            const data = await res.json();
                            setSummary(data.summary);
                            setTakeaways(data.keyTakeaways || []);
                            article.ai_summary = data.summary;
                            article.key_takeaways = data.keyTakeaways;
                          }
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      ✨ Generate AI Summary
                    </button>
                  </div>
                )}

                {/* Key Takeaways */}
                {takeaways.length > 0 && (
                  <div className="ai-result" style={{ marginTop: '0.75rem' }}>
                    <div className="ai-result__header">
                      <span className="ai-result__label">📌 Key Takeaways</span>
                    </div>
                    <div className="ai-result__content">
                      <ul style={{ paddingLeft: '1.25rem', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {takeaways.map((t, idx) => (
                          <li key={idx} style={{ listStyleType: 'disc', lineHeight: '1.4' }}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Sentiment */}
                {sent && (
                  <div className="ai-result" style={{ marginTop: '0.75rem' }}>
                    <div className="ai-result__header">
                      <span className="ai-result__label">🎭 Sentiment</span>
                    </div>
                    <div className="ai-result__content">
                      <div className={`sentiment-badge sentiment-badge--${sent.cls}`}>
                        {sent.emoji} {sent.label}
                        {confidencePct && ` · ${confidencePct}% confidence`}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {article.ai_tags?.length > 0 && (
                  <div className="modal__ai-tags" style={{ marginTop: '0.75rem' }}>
                    {article.ai_tags.map((tag, i) => (
                      <span key={i} className="article-card__tag">{tag}</span>
                    ))}
                  </div>
                )}
              </>
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
