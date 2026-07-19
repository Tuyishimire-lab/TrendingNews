'use client';

const CATEGORY_COLORS = {
  top: '#6366f1', business: '#f59e0b', technology: '#3b82f6',
  science: '#10b981', health: '#ec4899', sports: '#f97316',
  entertainment: '#a855f7', politics: '#ef4444', world: '#06b6d4',
  environment: '#22c55e', food: '#eab308', tourism: '#8b5cf6',
};

function StrengthBar({ strength }) {
  return (
    <div className="narrative__strength-track">
      <div
        className="narrative__strength-fill"
        style={{ width: `${Math.min(strength || 50, 100)}%` }}
      />
    </div>
  );
}

function NarrativeCard({ narrative, index }) {
  const categories = Array.isArray(narrative.categories) ? narrative.categories : [];
  const primaryColor = CATEGORY_COLORS[categories[0]] || '#6366f1';

  return (
    <div
      className="narrative-card"
      style={{ '--narrative-accent': primaryColor, animationDelay: `${index * 80}ms` }}
    >
      <div className="narrative-card__accent-bar" />
      <div className="narrative-card__rank">#{index + 1}</div>
      <h3 className="narrative-card__title">{narrative.title}</h3>
      <p className="narrative-card__summary">{narrative.summary}</p>
      <div className="narrative-card__footer">
        <div className="narrative-card__cats">
          {categories.slice(0, 2).map((cat) => (
            <span
              key={cat}
              className="narrative-card__cat"
              style={{ color: CATEGORY_COLORS[cat] || '#6366f1', borderColor: `${CATEGORY_COLORS[cat]}30` || 'rgba(99,102,241,0.2)' }}
            >
              {cat}
            </span>
          ))}
        </div>
        <div className="narrative-card__strength">
          <span className="narrative-card__strength-label">{narrative.strength || 50}%</span>
          <StrengthBar strength={narrative.strength} />
        </div>
      </div>
    </div>
  );
}

export default function HotNarratives({ narratives }) {
  if (!narratives?.length) return null;

  return (
    <section className="dashboard__panel hot-narratives">
      <div className="dashboard__panel-header">
        <span className="dashboard__panel-icon">🔥</span>
        <div>
          <h2 className="dashboard__panel-title">Hot Narratives</h2>
          <p className="dashboard__panel-subtitle">Dominant story threads synthesized from all sources</p>
        </div>
      </div>
      <div className="narratives-grid">
        {narratives.map((n, i) => (
          <NarrativeCard key={i} narrative={n} index={i} />
        ))}
      </div>
    </section>
  );
}
