'use client';

import { useState, useEffect } from 'react';
import HotNarratives from './HotNarratives';
import PoliticalCompass from './PoliticalCompass';
import GeoFocus from './GeoFocus';
import UnderreportedStories from './UnderreportedStories';
import ConflictingReports from './ConflictingReports';
import KeyQuotes from './KeyQuotes';
import AIBriefing from './AIBriefing';
import SentimentPulse from './SentimentPulse';

function DigestHero({ sentiment, generatedAt }) {
  const mood = sentiment?.mood || 'Analysing...';
  const summary = sentiment?.summary || "Loading today's intelligence synthesis...";
  const now = generatedAt ? new Date(generatedAt) : new Date();
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
          <span className="digest-hero__mood-label">Current News Mood</span>
          <span className="digest-hero__mood-value">⚡ {mood}</span>
        </div>
      </div>
    </div>
  );
}

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
      <div className="dashboard__panel dashboard__panel--skeleton" style={{ gridArea: 'narratives' }}>
        <div className="skel skel--sm" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginTop: '1rem' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skel skel--card" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      </div>
      <div className="dashboard__panel dashboard__panel--skeleton" style={{ gridArea: 'sentiment' }}>
        <div className="skel skel--sm" />
        <div className="skel skel--card" style={{ marginTop: '1rem', height: '120px' }} />
      </div>
      <div className="dashboard__trio">
        {[1, 2, 3].map((i) => (
          <div key={i} className="dashboard__panel dashboard__panel--skeleton">
            <div className="skel skel--sm" />
            <div className="skel skel--md" style={{ marginTop: '1rem' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

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

export default function IntelligenceDashboard() {
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDigest();
  }, []);

  async function fetchDigest() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/synthesize');
      const data = await res.json();
      if (data.success && data.digest) {
        setDigest(data.digest);
      } else {
        setError('Intelligence generation in progress. This takes 5–10 seconds on first load.');
      }
    } catch {
      setError('Failed to connect to intelligence layer. Please try again.');
    }
    setLoading(false);
  }

  if (loading) return <DashboardSkeleton />;
  if (error && !digest) return <DashboardError message={error} onRetry={fetchDigest} />;

  const hasQuotes = digest?.key_quotes?.length > 0;
  const hasConflicting = digest?.conflicting_reports?.length > 0;

  return (
    <div className="intelligence-dashboard">
      {/* ROW 1: Hero — full width */}
      <DigestHero sentiment={digest?.global_sentiment} generatedAt={digest?.generated_at} />

      {/* ROW 2: Hot Narratives (left) + Sentiment Pulse (right) */}
      <HotNarratives narratives={digest?.hot_narratives || []} />
      <SentimentPulse externalData={digest?.global_sentiment} />

      {/* ROW 3: 3-column trio (Political + Geo + Underreported) */}
      <div className="dashboard__trio">
        <PoliticalCompass data={digest?.political_leaning} />
        <GeoFocus data={digest?.geo_focus || []} />
        <UnderreportedStories data={digest?.underreported || []} />
      </div>

      {/* ROW 4: AI Briefings — full width */}
      <AIBriefing />

      {/* ROW 5: Key Quotes + Conflicting Reports (conditional) */}
      {(hasQuotes || hasConflicting) && (
        <div className="dashboard__pair">
          {hasQuotes && <KeyQuotes quotes={digest.key_quotes} />}
          {hasConflicting && <ConflictingReports data={digest.conflicting_reports} />}
        </div>
      )}

      <div className="dashboard__footer">
        <span className="dashboard__footer-text">
          🤖 Synthesized by Llama 3.3 · {digest?.generated_at ? `Updated ${new Date(digest.generated_at).toLocaleTimeString()}` : 'AI Analysis'} · All content is AI-generated from 3 global news APIs
        </span>
      </div>
    </div>
  );
}
