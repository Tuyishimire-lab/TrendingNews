'use client';

import { useState, useEffect } from 'react';

export default function TrendingTopics({ onTopicClick }) {
  const [topics, setTopics] = useState([]);

  useEffect(() => {
    fetch('/api/ai/trending')
      .then((r) => r.json())
      .then((data) => setTopics(data.topics || []))
      .catch(() => {});
  }, []);

  if (topics.length === 0) return null;

  return (
    <div className="trending">
      <div className="trending__label">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        Trending
      </div>
      <div className="trending__pills">
        {topics.map((t, i) => (
          <button
            key={i}
            className="trending__pill"
            onClick={() => onTopicClick(t.topic)}
            title={t.description}
          >
            <span className="trending__fire">🔥</span>
            {t.topic}
            {t.article_count > 0 && (
              <span className="trending__count">{t.article_count}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
