'use client';

const GEO_COLORS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7',
];

export default function GeoFocus({ data }) {
  if (!data?.length) return null;

  const maxCount = Math.max(...data.map((r) => r.story_count || 1), 1);

  return (
    <section className="dashboard__panel geo-panel">
      <div className="dashboard__panel-header">
        <span className="dashboard__panel-icon">🌍</span>
        <div>
          <h2 className="dashboard__panel-title">Geo Focus</h2>
          <p className="dashboard__panel-subtitle">Regional news coverage intensity today</p>
        </div>
      </div>
      <div className="geo-list">
        {data.map((region, i) => {
          const pct = Math.round(((region.story_count || 1) / maxCount) * 100);
          const color = GEO_COLORS[i % GEO_COLORS.length];
          return (
            <div key={i} className="geo-item">
              <div className="geo-item__header">
                <span className="geo-item__emoji">{region.emoji || '🌐'}</span>
                <span className="geo-item__region">{region.region}</span>
                <span className="geo-item__count" style={{ color }}>
                  {region.story_count} stories
                </span>
              </div>
              <div className="geo-item__bar-track">
                <div
                  className="geo-item__bar-fill"
                  style={{ width: `${pct}%`, background: color, animationDelay: `${i * 100}ms` }}
                />
              </div>
              {region.top_story && (
                <p className="geo-item__story">{region.top_story}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
