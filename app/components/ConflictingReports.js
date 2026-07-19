'use client';

export default function ConflictingReports({ data }) {
  if (!data?.length) return null;

  // In horizontal rail, show each conflicting topic as its own card-like item
  // stacked vertically within the wider rail card
  return (
    <section className="dashboard__panel conflicting-panel rail-panel">
      <div className="dashboard__panel-header">
        <span className="dashboard__panel-icon">⚡</span>
        <div>
          <h2 className="dashboard__panel-title">Conflicting Reports</h2>
          <p className="dashboard__panel-subtitle">Opposing narratives on same events</p>
        </div>
      </div>
      <div className="conflicting-list">
        {data.map((report, i) => (
          <div key={i} className="conflicting-item">
            <h3 className="conflicting-item__topic">{report.topic}</h3>
            <div className="conflicting-stacked">
              <div className="cstack cstack--a">
                <span className="cstack__label">Perspective A</span>
                <p className="cstack__text">{report.perspective_a}</p>
              </div>
              <div className="cstack__vs">VS</div>
              <div className="cstack cstack--b">
                <span className="cstack__label">Perspective B</span>
                <p className="cstack__text">{report.perspective_b}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
