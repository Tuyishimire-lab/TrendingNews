'use client';

import { useState, useEffect } from 'react';

export default function SentimentPulse() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/ai/sentiment-overview')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data || data.total === 0) return null;

  const { percentages, total } = data;

  // SVG ring chart values
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const posLen = (percentages.positive / 100) * circumference;
  const negLen = (percentages.negative / 100) * circumference;
  const neuLen = (percentages.neutral / 100) * circumference;

  return (
    <div className="sentiment-pulse">
      <div className="sentiment-pulse__header">
        <span className="sentiment-pulse__icon">📊</span>
        <span className="sentiment-pulse__title">News Mood</span>
      </div>
      <div className="sentiment-pulse__chart">
        <svg viewBox="0 0 80 80" className="sentiment-pulse__ring">
          {/* Positive arc */}
          <circle cx="40" cy="40" r={radius}
            fill="none" stroke="var(--positive)" strokeWidth="6"
            strokeDasharray={`${posLen} ${circumference}`}
            strokeDashoffset="0" strokeLinecap="round"
            transform="rotate(-90 40 40)"
          />
          {/* Negative arc */}
          <circle cx="40" cy="40" r={radius}
            fill="none" stroke="var(--negative)" strokeWidth="6"
            strokeDasharray={`${negLen} ${circumference}`}
            strokeDashoffset={`${-posLen}`}
            transform="rotate(-90 40 40)"
          />
          {/* Neutral arc */}
          <circle cx="40" cy="40" r={radius}
            fill="none" stroke="var(--neutral-color)" strokeWidth="6"
            strokeDasharray={`${neuLen} ${circumference}`}
            strokeDashoffset={`${-(posLen + negLen)}`}
            transform="rotate(-90 40 40)"
          />
        </svg>
        <div className="sentiment-pulse__center">
          <span className="sentiment-pulse__total">{total}</span>
          <span className="sentiment-pulse__label">articles</span>
        </div>
      </div>
      <div className="sentiment-pulse__legend">
        <div className="sentiment-pulse__item">
          <span className="sentiment-pulse__dot sentiment-pulse__dot--pos" />
          😊 {percentages.positive}%
        </div>
        <div className="sentiment-pulse__item">
          <span className="sentiment-pulse__dot sentiment-pulse__dot--neg" />
          😟 {percentages.negative}%
        </div>
        <div className="sentiment-pulse__item">
          <span className="sentiment-pulse__dot sentiment-pulse__dot--neu" />
          😐 {percentages.neutral}%
        </div>
      </div>
    </div>
  );
}
