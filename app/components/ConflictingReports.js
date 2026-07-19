'use client';

export default function ConflictingReports({ data }) {
  if (!data?.length) return null;

  return (
    <section className="dashboard__panel conflicting-panel">
      <div className="dashboard__panel-header">
        <span className="dashboard__panel-icon">⚡</span>
        <div>
          <h2 className="dashboard__panel-title">Conflicting Reports</h2>
          <p className="dashboard__panel-subtitle">Stories where sources present opposing narratives</p>
        </div>
      </div>
      <div className="conflicting-list">
        {data.map((report, i) => (
          <div key={i} className="conflicting-item" style={{ animationDelay: `${i * 120}ms` }}>
            <h3 className="conflicting-item__topic">{report.topic}</h3>
            <div className="conflicting-item__perspectives">
              <div className="conflicting-perspective conflicting-perspective--a">
                <span className="conflicting-perspective__label">Perspective A</span>
                <p className="conflicting-perspective__text">{report.perspective_a}</p>
              </div>
              <div className="conflicting-perspective__divider">
                <span className="conflicting-perspective__vs">VS</span>
              </div>
              <div className="conflicting-perspective conflicting-perspective--b">
                <span className="conflicting-perspective__label">Perspective B</span>
                <p className="conflicting-perspective__text">{report.perspective_b}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
