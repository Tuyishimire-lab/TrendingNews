'use client';

import { useState, useEffect, useCallback } from 'react';

const CATEGORIES = [
  { id: 'top', label: 'Top', emoji: '📰' },
  { id: 'world', label: 'World', emoji: '🌐' },
  { id: 'politics', label: 'Politics', emoji: '🏛️' },
  { id: 'technology', label: 'Tech', emoji: '💻' },
  { id: 'business', label: 'Business', emoji: '💼' },
  { id: 'science', label: 'Science', emoji: '🔬' },
  { id: 'health', label: 'Health', emoji: '🏥' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎬' },
  { id: 'environment', label: 'Environment', emoji: '🌿' },
  { id: 'food', label: 'Food', emoji: '🍽️' },
  { id: 'tourism', label: 'Tourism', emoji: '✈️' },
];

const MOOD_COLORS = {
  Optimistic: '#10b981', Positive: '#10b981', Progressive: '#10b981',
  Calm: '#3b82f6', Neutral: '#6b7280', Balanced: '#6b7280',
  Tense: '#f59e0b', Volatile: '#ef4444', Cautious: '#f59e0b',
  Alarming: '#ef4444', Crisis: '#ef4444', Negative: '#ef4444',
};

function getMoodColor(mood) {
  if (!mood) return '#6366f1';
  for (const [key, color] of Object.entries(MOOD_COLORS)) {
    if (mood.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return '#6366f1';
}

function BriefingContent({ briefing, loading, category }) {
  if (loading) {
    return (
      <div className="briefing-content briefing-content--loading">
        <div className="skel skel--sm" />
        <div className="skel skel--md" style={{ marginTop: '0.75rem' }} />
        <div className="skel skel--md" />
        <div className="skel skel--sm" style={{ marginTop: '0.5rem' }} />
      </div>
    );
  }

  if (!briefing?.briefing) {
    return (
      <div className="briefing-content briefing-content--empty">
        <p>No briefing available for {category} yet. Click the refresh button to generate one.</p>
      </div>
    );
  }

  const moodColor = getMoodColor(briefing.mood);

  return (
    <div className="briefing-content">
      <div className="briefing-content__header">
        {briefing.mood && (
          <span className="briefing-mood" style={{ color: moodColor, borderColor: `${moodColor}30` }}>
            ⚡ {briefing.mood}
          </span>
        )}
        {briefing.generatedAt && (
          <span className="briefing-time">
            {new Date(briefing.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
      <p className="briefing-content__text">{briefing.briefing}</p>
      {briefing.keyPoints?.length > 0 && (
        <ul className="briefing-content__points">
          {briefing.keyPoints.map((point, i) => (
            <li key={i}>
              <span className="briefing-content__bullet">→</span>
              {point}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AIBriefing() {
  const [activeTab, setActiveTab] = useState('top');
  const [briefings, setBriefings] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchBriefing = useCallback(async (category) => {
    if (briefings[category]) return; // Already loaded
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/briefing?category=${category}`);
      const data = await res.json();
      setBriefings((prev) => ({ ...prev, [category]: data }));
    } catch {
      setBriefings((prev) => ({ ...prev, [category]: null }));
    }
    setLoading(false);
  }, [briefings]);

  // Load first tab on mount
  useEffect(() => {
    fetchBriefing('top');
  }, []);

  const handleTabChange = (catId) => {
    setActiveTab(catId);
    fetchBriefing(catId);
  };

  const activeCat = CATEGORIES.find((c) => c.id === activeTab);

  return (
    <section className="dashboard__panel briefings-panel">
      <div className="dashboard__panel-header">
        <span className="dashboard__panel-icon">🧠</span>
        <div>
          <h2 className="dashboard__panel-title">AI Daily Briefings</h2>
          <p className="dashboard__panel-subtitle">AI-synthesized briefing for every news category</p>
        </div>
      </div>

      {/* Tab bar — scrollable */}
      <div className="briefing-tabs">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`briefing-tab ${activeTab === cat.id ? 'briefing-tab--active' : ''}`}
            onClick={() => handleTabChange(cat.id)}
          >
            <span className="briefing-tab__emoji">{cat.emoji}</span>
            <span className="briefing-tab__label">{cat.label}</span>
            {briefings[cat.id] && <span className="briefing-tab__dot" />}
          </button>
        ))}
      </div>

      {/* Active briefing */}
      <BriefingContent
        briefing={briefings[activeTab]}
        loading={loading && !briefings[activeTab]}
        category={activeCat?.label || activeTab}
      />
    </section>
  );
}
