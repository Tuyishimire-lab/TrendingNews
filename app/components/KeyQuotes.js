'use client';

import { useState, useEffect, useRef } from 'react';

const CATEGORY_COLORS = {
  top: '#6366f1', business: '#f59e0b', technology: '#3b82f6',
  science: '#10b981', health: '#ec4899', sports: '#f97316',
  entertainment: '#a855f7', politics: '#ef4444', world: '#06b6d4',
  environment: '#22c55e', food: '#eab308', tourism: '#8b5cf6',
};

function QuoteCard({ quote, isActive }) {
  const color = CATEGORY_COLORS[quote.category] || '#6366f1';
  return (
    <div className={`quote-card ${isActive ? 'quote-card--active' : ''}`}>
      <div className="quote-card__mark" style={{ color }}>&ldquo;</div>
      <blockquote className="quote-card__text">{quote.quote}</blockquote>
      <div className="quote-card__meta">
        <div className="quote-card__speaker">
          <span className="quote-card__speaker-name">{quote.speaker}</span>
          {quote.context && (
            <span className="quote-card__context">{quote.context}</span>
          )}
        </div>
        {quote.category && (
          <span className="quote-card__cat" style={{ color, borderColor: `${color}30` }}>
            {quote.category}
          </span>
        )}
      </div>
    </div>
  );
}

export default function KeyQuotes({ quotes }) {
  const [active, setActive] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!quotes?.length) return;
    intervalRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % quotes.length);
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, [quotes]);

  if (!quotes?.length) return null;

  return (
    <section className="dashboard__panel quotes-panel">
      <div className="dashboard__panel-header">
        <span className="dashboard__panel-icon">💬</span>
        <div>
          <h2 className="dashboard__panel-title">Key Quotes</h2>
          <p className="dashboard__panel-subtitle">Today&apos;s most impactful statements</p>
        </div>
      </div>
      <div className="quotes-carousel">
        <div className="quotes-carousel__track">
          <QuoteCard quote={quotes[active]} isActive />
        </div>
        <div className="quotes-carousel__dots">
          {quotes.map((_, i) => (
            <button
              key={i}
              className={`quotes-dot ${i === active ? 'quotes-dot--active' : ''}`}
              onClick={() => {
                clearInterval(intervalRef.current);
                setActive(i);
              }}
              aria-label={`Quote ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
