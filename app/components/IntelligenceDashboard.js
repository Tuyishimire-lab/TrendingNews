'use client';

import { useState, useEffect, useRef } from 'react';
import PoliticalCompass from './PoliticalCompass';
import GeoFocus from './GeoFocus';
import UnderreportedStories from './UnderreportedStories';
import ConflictingReports from './ConflictingReports';
import AIBriefing from './AIBriefing';
import SentimentPulse from './SentimentPulse';

/* ─── Narrative Card (inline for horizontal rail) ─── */
const CAT_COLORS = {
  top: '#6366f1', business: '#f59e0b', technology: '#3b82f6',
  science: '#10b981', health: '#ec4899', sports: '#f97316',
  entertainment: '#a855f7', politics: '#ef4444', world: '#06b6d4',
  environment: '#22c55e', food: '#eab308', tourism: '#8b5cf6',
};

function NarrativeCard({ n, index }) {
  const cats = Array.isArray(n.categories) ? n.categories : [];
  const color = CAT_COLORS[cats[0]] || '#6366f1';
  return (
    <div className="rail-card narrative-rail-card" style={{ '--accent': color, animationDelay: `${index * 60}ms` }}>
      <div className="narrative-rail-card__bar" />
      <div className="rail-card__rank">#{index + 1}</div>
      <h3 className="rail-card__title">{n.title}</h3>
      <p className="rail-card__body">{n.summary}</p>
      <div className="rail-card__footer">
        <div className="narrative-rail-card__cats">
          {cats.slice(0, 2).map((c) => (
            <span key={c} className="cat-tag" style={{ color: CAT_COLORS[c] || '#6366f1', borderColor: `${CAT_COLORS[c] || '#6366f1'}30` }}>{c}</span>
          ))}
        </div>
        <div className="narrative-rail-card__strength">
          <div className="strength-track">
            <div className="strength-fill" style={{ width: `${Math.min(n.strength || 50, 100)}%`, background: color }} />
          </div>
          <span className="strength-pct" style={{ color }}>{n.strength || 50}%</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Quote Card (inline for horizontal rail) ─── */
function QuoteCard({ q, index }) {
  const color = CAT_COLORS[q.category] || '#6366f1';
  return (
    <div className="rail-card quote-rail-card" style={{ '--accent': color, animationDelay: `${index * 80}ms` }}>
      <div className="quote-rail-card__mark" style={{ color }}>&ldquo;</div>
      <blockquote className="rail-card__quote">{q.quote}</blockquote>
      <div className="quote-rail-card__footer">
        <div>
          <span className="quote-rail-card__speaker">{q.speaker}</span>
          {q.context && <span className="quote-rail-card__context">{q.context}</span>}
        </div>
        {q.category && (
          <span className="cat-tag" style={{ color, borderColor: `${color}30` }}>{q.category}</span>
        )}
      </div>
    </div>
  );
}

/* ─── Section wrapper with scroll rail ─── */
function DashSection({ icon, title, subtitle, children, fullWidth = false }) {
  const railRef = useRef(null);

  function scroll(dir) {
    railRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  }

  return (
    <div className={`dash-section${fullWidth ? ' dash-section--full' : ''}`}>
      <div className="dash-section__head">
        <div className="dash-section__label">
          <span className="dash-section__icon">{icon}</span>
          <div>
            <h2 className="dash-section__title">{title}</h2>
            {subtitle && <p className="dash-section__sub">{subtitle}</p>}
          </div>
        </div>
        {!fullWidth && (
          <div className="dash-section__nav">
            <button className="scroll-btn" onClick={() => scroll(-1)} aria-label="Scroll left">‹</button>
            <button className="scroll-btn" onClick={() => scroll(1)}  aria-label="Scroll right">›</button>
          </div>
        )}
      </div>
      {fullWidth ? children : (
        <div className="section__rail" ref={railRef}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ─── Skeleton ─── */
function DashboardSkeleton() {
  return (
    <div className="intelligence-dashboard">
      <div className="digest-hero digest-hero--skeleton">
        <div className="digest-hero__content">
          <div className="skel skel--sm" />
          <div className="skel skel--lg" style={{ marginTop: '1rem' }} />
          <div className="skel skel--md" style={{ marginTop: '0.75rem' }} />
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="dash-section">
          <div className="skel skel--sm" style={{ width: '180px', marginBottom: '1rem' }} />
          <div className="section__rail">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="skel skel--card rail-skel" style={{ animationDelay: `${j * 80}ms` }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Error ─── */
function DashboardError({ message, onRetry }) {
  return (
    <div className="intelligence-dashboard">
      <div className="dashboard__error">
        <div className="dashboard__error-icon">🧠</div>
        <h2 className="dashboard__error-title">Intelligence Synthesis In Progress</h2>
        <p className="dashboard__error-desc">{message}</p>
        <button className="dashboard__error-btn" onClick={onRetry}>Retry Now</button>
      </div>
    </div>
  );
}

/* ─── DigestHero ─── */
function DigestHero({ sentiment, generatedAt }) {
  const mood    = sentiment?.mood    || 'Analysing...';
  const summary = sentiment?.summary || "Loading today's intelligence synthesis...";
  const now     = generatedAt ? new Date(generatedAt) : new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="digest-hero">
      <div className="digest-hero__glow" />
      <div className="digest-hero__content">
        <div className="digest-hero__meta">
          <span className="digest-hero__badge">🧠 AI Intelligence</span>
          <span className="digest-hero__date">{dateStr}</span>
        </div>
        <h1 className="digest-hero__title">Today&apos;s Global News Intelligence</h1>
        <p className="digest-hero__summary">{summary}</p>
        <div className="digest-hero__mood">
          <span className="digest-hero__mood-label">News Mood</span>
          <span className="digest-hero__mood-value">⚡ {mood}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Dashboard ─── */
export default function IntelligenceDashboard() {
  const [digest, setDigest]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => { fetchDigest(); }, []);

  async function fetchDigest() {
    setLoading(true); setError(null);
    try {
      const res  = await fetch('/api/ai/synthesize');
      const data = await res.json();
      if (data.success && data.digest) setDigest(data.digest);
      else setError('Intelligence generation in progress. This takes 5–10 seconds on first load.');
    } catch { setError('Failed to connect to intelligence layer. Please try again.'); }
    setLoading(false);
  }

  if (loading) return <DashboardSkeleton />;
  if (error && !digest) return <DashboardError message={error} onRetry={fetchDigest} />;

  const narratives  = digest?.hot_narratives || [];
  const quotes      = digest?.key_quotes     || [];

  return (
    <div className="intelligence-dashboard">
      {/* ── 0. Hero ─────────────────────────────────────────── */}
      <DigestHero sentiment={digest?.global_sentiment} generatedAt={digest?.generated_at} />

      {/* ── 1. Hot Narratives ────────────────────────────────── */}
      {narratives.length > 0 && (
        <DashSection icon="🔥" title="Hot Narratives" subtitle="Dominant story threads synthesized from all sources">
          {narratives.map((n, i) => <NarrativeCard key={i} n={n} index={i} />)}
        </DashSection>
      )}

      {/* ── 2. Intelligence Feed ─────────────────────────────── */}
      <DashSection icon="⚡" title="Intelligence Feed" subtitle="Real-time AI analysis across dimensions">
        <SentimentPulse externalData={digest?.global_sentiment} />
        <PoliticalCompass data={digest?.political_leaning} />
        <GeoFocus data={digest?.geo_focus || []} />
        <UnderreportedStories data={digest?.underreported || []} />
        <ConflictingReports data={digest?.conflicting_reports || []} />
      </DashSection>

      {/* ── 3. AI Daily Briefings ────────────────────────────── */}
      <DashSection icon="🧠" title="AI Daily Briefings" subtitle="AI-synthesized briefing for every news category" fullWidth>
        <AIBriefing />
      </DashSection>

      {/* ── 4. Key Quotes ────────────────────────────────────── */}
      {quotes.length > 0 && (
        <DashSection icon="💬" title="Key Quotes" subtitle="Today's most impactful statements">
          {quotes.map((q, i) => <QuoteCard key={i} q={q} index={i} />)}
        </DashSection>
      )}

      <div className="dashboard__footer">
        <span className="dashboard__footer-text">
          🤖 Synthesized by Llama 3.3 · {digest?.generated_at ? `Updated ${new Date(digest.generated_at).toLocaleTimeString()}` : 'AI Analysis'} · All content is AI-generated from 3 global news APIs
        </span>
      </div>
    </div>
  );
}
