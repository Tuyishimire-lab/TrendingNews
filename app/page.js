'use client';

import { useState, useCallback } from 'react';
import Header from './components/Header';
import TrendingTopics from './components/TrendingTopics';
import IntelligenceDashboard from './components/IntelligenceDashboard';
import AIChatPanel from './components/AIChatPanel';
import { useToast } from './components/ToastProvider';

export default function Home() {
  const showToast = useToast();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatQuery, setChatQuery] = useState('');

  // Search now opens the AI chat with the query
  const handleSearch = useCallback((query) => {
    if (!query?.trim()) return;
    setChatQuery(query.trim());
    setChatOpen(true);
  }, []);

  // Trending topic click → open chat with topic
  const handleTopicClick = useCallback((topic) => {
    setChatQuery(topic);
    setChatOpen(true);
  }, []);

  // Refresh: force-regenerate synthesis and fetch new articles
  const handleRefresh = useCallback(async () => {
    showToast('🧠 Regenerating AI intelligence...', 'info');
    try {
      await Promise.all([
        fetch('/api/cron/fetch-news', { method: 'POST' }),
        fetch('/api/ai/synthesize', { method: 'POST' }),
      ]);
      showToast('Intelligence updated! Reloading...', 'success');
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      showToast('Refresh failed. Please try again.', 'error');
    }
  }, [showToast]);

  const handleOpenChat = useCallback(() => {
    setChatQuery('');
    setChatOpen(true);
  }, []);

  return (
    <>
      <Header
        onSearch={handleSearch}
        onRefresh={handleRefresh}
        onLogoClick={() => window.location.reload()}
      />
      <TrendingTopics onTopicClick={handleTopicClick} />

      <main className="main">
        <IntelligenceDashboard />
      </main>

      {/* AI Chat FAB */}
      <button
        className="chat-fab"
        onClick={handleOpenChat}
        aria-label="Open AI Chat"
      >
        <span className="chat-fab__icon">💬</span>
        <span className="chat-fab__pulse" />
      </button>

      <AIChatPanel
        isOpen={chatOpen}
        onClose={() => { setChatOpen(false); setChatQuery(''); }}
        initialQuery={chatQuery}
      />
    </>
  );
}
