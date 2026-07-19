'use client';

const CATEGORY_ICONS = {
  top: '📰', business: '💼', technology: '💻', science: '🔬',
  health: '🏥', sports: '⚽', entertainment: '🎬', politics: '🏛️',
  world: '🌐', environment: '🌿', food: '🍽️', tourism: '✈️',
};

export default function UnderreportedStories({ data }) {
  if (!data?.length) return null;

  return (
    <section className="dashboard__panel underreported-panel">
      <div className="dashboard__panel-header">
        <span className="dashboard__panel-icon">🔍</span>
        <div>
          <h2 className="dashboard__panel-title">Underreported</h2>
          <p className="dashboard__panel-subtitle">Important stories getting too little attention</p>
        </div>
      </div>
      <div className="underreported-list">
        {data.map((story, i) => (
          <div key={i} className="underreported-item" style={{ animationDelay: `${i * 120}ms` }}>
            <div className="underreported-item__tag">
              <span>{CATEGORY_ICONS[story.category] || '📌'}</span>
              <span className="underreported-item__category">{story.category || 'news'}</span>
              <span className="underreported-item__badge">Under-covered</span>
            </div>
            <h3 className="underreported-item__title">{story.title}</h3>
            <p className="underreported-item__why">
              <span className="underreported-item__why-label">⚠ Why it matters: </span>
              {story.why_important}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
