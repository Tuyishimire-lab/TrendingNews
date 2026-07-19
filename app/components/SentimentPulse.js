'use client';

export default function SentimentPulse({ externalData }) {
  if (!externalData) return null;

  const positive = externalData.positive ?? 33;
  const negative = externalData.negative ?? 33;
  const neutral  = externalData.neutral  ?? 34;
  const mood     = externalData.mood     || 'Neutral';
  const summary  = externalData.summary  || '';

  // Compact SVG ring (smaller radius)
  const r  = 30;
  const cx = 38;
  const cy = 38;
  const circ = 2 * Math.PI * r;
  const posLen = (positive / 100) * circ;
  const negLen = (negative / 100) * circ;
  const neuLen = (neutral  / 100) * circ;

  const dominant = positive >= negative && positive >= neutral ? 'positive'
    : negative  >= positive && negative >= neutral  ? 'negative'
    : 'neutral';

  const dominantColor =
    dominant === 'positive' ? 'var(--positive)' :
    dominant === 'negative' ? 'var(--negative)' :
    'var(--neutral-color)';

  const dominantEmoji = dominant === 'positive' ? '😊' : dominant === 'negative' ? '😟' : '😐';

  const bars = [
    { label: 'Positive', pct: positive, color: 'var(--positive)' },
    { label: 'Negative', pct: negative, color: 'var(--negative)' },
    { label: 'Neutral',  pct: neutral,  color: 'var(--neutral-color)' },
  ];

  return (
    <section className="dashboard__panel sentiment-panel">
      <div className="dashboard__panel-header">
        <span className="dashboard__panel-icon">📊</span>
        <div>
          <h2 className="dashboard__panel-title">Sentiment Pulse</h2>
          <p className="dashboard__panel-subtitle">Today&apos;s global news tone</p>
        </div>
      </div>

      {/* Compact ring + mood pill */}
      <div className="sp-ring-row">
        <div className="sp-ring-wrap">
          <svg viewBox={`0 0 ${cx * 2} ${cy * 2}`} width="76" height="76">
            {/* Track */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
            {/* Positive arc */}
            <circle cx={cx} cy={cy} r={r}
              fill="none" stroke="var(--positive)" strokeWidth="7"
              strokeDasharray={`${posLen} ${circ}`} strokeDashoffset="0"
              strokeLinecap="butt" transform={`rotate(-90 ${cx} ${cy})`}
            />
            {/* Negative arc */}
            <circle cx={cx} cy={cy} r={r}
              fill="none" stroke="var(--negative)" strokeWidth="7"
              strokeDasharray={`${negLen} ${circ}`} strokeDashoffset={`${-posLen}`}
              strokeLinecap="butt" transform={`rotate(-90 ${cx} ${cy})`}
            />
            {/* Neutral arc */}
            <circle cx={cx} cy={cy} r={r}
              fill="none" stroke="var(--neutral-color)" strokeWidth="7"
              strokeDasharray={`${neuLen} ${circ}`} strokeDashoffset={`${-(posLen + negLen)}`}
              strokeLinecap="butt" transform={`rotate(-90 ${cx} ${cy})`}
            />
            {/* Center emoji */}
            <text x={cx} y={cy + 2} textAnchor="middle" dominantBaseline="middle"
              fontSize="13" fill="white">{dominantEmoji}</text>
          </svg>
        </div>
        <div className="sp-mood-col">
          <span className="sp-mood-pill" style={{ background: `${dominantColor}22`, borderColor: `${dominantColor}55`, color: dominantColor }}>
            ⚡ {mood}
          </span>
          {summary && <p className="sp-summary">{summary}</p>}
        </div>
      </div>

      {/* Horizontal bar chart */}
      <div className="sp-bars">
        {bars.map(({ label, pct, color }) => (
          <div key={label} className="sp-bar-row">
            <span className="sp-bar-label">{label}</span>
            <div className="sp-bar-track">
              <div className="sp-bar-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="sp-bar-pct" style={{ color }}>{pct}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}
