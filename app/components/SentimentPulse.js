'use client';

export default function SentimentPulse({ externalData }) {
  // Accept either external data from IntelligenceDashboard or fallback to nothing
  if (!externalData) return null;

  const positive = externalData.positive ?? 33;
  const negative = externalData.negative ?? 33;
  const neutral  = externalData.neutral  ?? 34;
  const mood     = externalData.mood     || 'Neutral';
  const summary  = externalData.summary  || '';

  // SVG ring chart
  const radius       = 42;
  const circumference = 2 * Math.PI * radius;
  const posLen   = (positive / 100) * circumference;
  const negLen   = (negative / 100) * circumference;
  const neuLen   = (neutral  / 100) * circumference;

  const dominant = positive >= negative && positive >= neutral ? 'positive'
    : negative >= positive && negative >= neutral ? 'negative'
    : 'neutral';

  const dominantEmoji = dominant === 'positive' ? '😊' : dominant === 'negative' ? '😟' : '😐';

  return (
    <section className="dashboard__panel sentiment-panel">
      <div className="dashboard__panel-header">
        <span className="dashboard__panel-icon">📊</span>
        <div>
          <h2 className="dashboard__panel-title">Sentiment Pulse</h2>
          <p className="dashboard__panel-subtitle">Overall emotional tone of today&apos;s global news</p>
        </div>
      </div>
      <div className="sentiment-layout">
        {/* Ring chart */}
        <div className="sentiment-ring-wrap">
          <svg viewBox="0 0 90 90" className="sentiment-ring-svg">
            {/* Track */}
            <circle cx="45" cy="45" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            {/* Positive */}
            <circle cx="45" cy="45" r={radius}
              fill="none" stroke="var(--positive)" strokeWidth="8"
              strokeDasharray={`${posLen} ${circumference}`}
              strokeDashoffset="0"
              strokeLinecap="round"
              transform="rotate(-90 45 45)"
            />
            {/* Negative */}
            <circle cx="45" cy="45" r={radius}
              fill="none" stroke="var(--negative)" strokeWidth="8"
              strokeDasharray={`${negLen} ${circumference}`}
              strokeDashoffset={`${-posLen}`}
              strokeLinecap="round"
              transform="rotate(-90 45 45)"
            />
            {/* Neutral */}
            <circle cx="45" cy="45" r={radius}
              fill="none" stroke="var(--neutral-color)" strokeWidth="8"
              strokeDasharray={`${neuLen} ${circumference}`}
              strokeDashoffset={`${-(posLen + negLen)}`}
              strokeLinecap="round"
              transform="rotate(-90 45 45)"
            />
            <text x="45" y="42" textAnchor="middle" fontSize="16" fill="white">{dominantEmoji}</text>
            <text x="45" y="55" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.5)">{mood}</text>
          </svg>
        </div>

        {/* Legend + summary */}
        <div className="sentiment-details">
          <div className="sentiment-legend">
            <div className="sentiment-legend__item">
              <span className="sentiment-legend__dot" style={{ background: 'var(--positive)' }} />
              <span>Positive</span>
              <strong>{positive}%</strong>
            </div>
            <div className="sentiment-legend__item">
              <span className="sentiment-legend__dot" style={{ background: 'var(--negative)' }} />
              <span>Negative</span>
              <strong>{negative}%</strong>
            </div>
            <div className="sentiment-legend__item">
              <span className="sentiment-legend__dot" style={{ background: 'var(--neutral-color)' }} />
              <span>Neutral</span>
              <strong>{neutral}%</strong>
            </div>
          </div>
          {summary && <p className="sentiment-summary">{summary}</p>}
        </div>
      </div>
    </section>
  );
}
