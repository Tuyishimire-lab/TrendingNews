'use client';

import { useState, useEffect } from 'react';

export default function AIBriefing({ category }) {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setBriefing(null);
    fetch(`/api/ai/briefing?category=${category}`)
      .then((r) => r.json())
      .then((data) => {
        setBriefing(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [category]);

  if (loading) {
    return (
      <div className="ai-briefing ai-briefing--loading">
        <div className="ai-briefing__header">
          <span className="ai-briefing__icon">🧠</span>
          <span className="ai-briefing__title">AI Daily Briefing</span>
        </div>
        <div className="ai-briefing__shimmer">
          <div className="skeleton__line skeleton__line--title" />
          <div className="skeleton__line skeleton__line--desc" />
          <div className="skeleton__line skeleton__line--desc-2" />
        </div>
      </div>
    );
  }

  if (!briefing?.briefing) return null;

  return (
    <div className="ai-briefing">
      <div className="ai-briefing__glow" />
      <div className="ai-briefing__header">
        <div className="ai-briefing__label">
          <span className="ai-briefing__icon">🧠</span>
          <span className="ai-briefing__title">AI Daily Briefing</span>
          <span className="ai-briefing__category">{category}</span>
        </div>
        {briefing.mood && (
          <span className="ai-briefing__mood">
            ⚡ {briefing.mood}
          </span>
        )}
      </div>
      <p className="ai-briefing__text">{briefing.briefing}</p>
      {briefing.keyPoints?.length > 0 && (
        <ul className="ai-briefing__points">
          {briefing.keyPoints.map((point, i) => (
            <li key={i}>
              <span className="ai-briefing__bullet">→</span>
              {point}
            </li>
          ))}
        </ul>
      )}
      {briefing.generatedAt && (
        <span className="ai-briefing__time">
          Generated {new Date(briefing.generatedAt).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
