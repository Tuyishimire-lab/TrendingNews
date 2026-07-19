'use client';

import { useEffect, useRef } from 'react';

const LEAN_CONFIG = {
  Left:   { color: '#3b82f6', emoji: '◀', gradient: 'linear-gradient(90deg, #3b82f6, #6366f1)' },
  Center: { color: '#a855f7', emoji: '⬤', gradient: 'linear-gradient(90deg, #6366f1, #a855f7)' },
  Right:  { color: '#ef4444', emoji: '▶', gradient: 'linear-gradient(90deg, #a855f7, #ef4444)' },
};

function TriMeter({ breakdown }) {
  const left   = breakdown?.left   ?? 33;
  const center = breakdown?.center ?? 34;
  const right  = breakdown?.right  ?? 33;

  return (
    <div className="political-meter">
      <div className="political-meter__track">
        <div
          className="political-meter__segment political-meter__segment--left"
          style={{ width: `${left}%` }}
          title={`Left: ${left}%`}
        />
        <div
          className="political-meter__segment political-meter__segment--center"
          style={{ width: `${center}%` }}
          title={`Center: ${center}%`}
        />
        <div
          className="political-meter__segment political-meter__segment--right"
          style={{ width: `${right}%` }}
          title={`Right: ${right}%`}
        />
      </div>
      <div className="political-meter__labels">
        <span className="political-meter__label political-meter__label--left">◀ Left {left}%</span>
        <span className="political-meter__label political-meter__label--center">Center {center}%</span>
        <span className="political-meter__label political-meter__label--right">Right {right}% ▶</span>
      </div>
    </div>
  );
}

export default function PoliticalCompass({ data }) {
  if (!data) return null;

  const lean = data.lean || 'Center';
  const config = LEAN_CONFIG[lean] || LEAN_CONFIG.Center;
  const evidence = Array.isArray(data.evidence) ? data.evidence : [];

  return (
    <section className="dashboard__panel political-panel rail-panel">
      <div className="dashboard__panel-header">
        <span className="dashboard__panel-icon">⚖️</span>
        <div>
          <h2 className="dashboard__panel-title">Political Compass</h2>
          <p className="dashboard__panel-subtitle">Media lean analysis of today&apos;s coverage</p>
        </div>
      </div>

      {/* Lean badge */}
      <div className="political-lean" style={{ '--lean-color': config.color }}>
        <span className="political-lean__emoji">{config.emoji}</span>
        <span className="political-lean__label" style={{ color: config.color }}>
          Leans {lean}
        </span>
        <span className="political-lean__score">
          Confidence: {Math.round((data.score || 0.5) * 100)}%
        </span>
      </div>

      {/* Tri-segment meter */}
      <TriMeter breakdown={data.breakdown} />

      {/* Analysis */}
      {data.analysis && (
        <p className="political-analysis">{data.analysis}</p>
      )}

      {/* Evidence */}
      {evidence.length > 0 && (
        <div className="political-evidence">
          <span className="political-evidence__label">Evidence from today&apos;s coverage:</span>
          <ul className="political-evidence__list">
            {evidence.slice(0, 3).map((ev, i) => (
              <li key={i} className="political-evidence__item">
                <span className="political-evidence__dot" style={{ background: config.color }} />
                {ev}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
