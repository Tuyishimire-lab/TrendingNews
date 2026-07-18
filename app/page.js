'use client';

import { useState, useCallback } from 'react';
import Header from './components/Header';
import CategoryBar from './components/CategoryBar';
import ArticleGrid from './components/ArticleGrid';
import ArticleModal from './components/ArticleModal';
import { useToast } from './components/ToastProvider';

export default function Home() {
  const showToast = useToast();
  const [category, setCategory] = useState('top');
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // Fetch articles by category
  const fetchArticles = useCallback(async (cat, pg = 1, append = false) => {
    if (!append) setIsLoading(true);
    try {
      const params = new URLSearchParams({ category: cat, page: String(pg), pageSize: '20' });
      const res = await fetch(`/api/articles?${params}`);
      const data = await res.json();

      if (append) {
        setArticles((prev) => [...prev, ...(data.articles || [])]);
      } else {
        setArticles(data.articles || []);
      }
      setHasMore(data.hasMore || false);
      setPage(pg);
      setLastUpdated(data.lastUpdated || null);
      setIsSearching(false);
      setSearchQuery('');
    } catch {
      showToast('Failed to load articles. Try refreshing.', 'error');
    }
    setIsLoading(false);
  }, [showToast]);

  // Search articles
  const searchArticles = useCallback(async (query) => {
    if (!query.trim()) {
      setIsSearching(false);
      setSearchQuery('');
      fetchArticles(category);
      return;
    }
    setIsLoading(true);
    setIsSearching(true);
    setSearchQuery(query);
    try {
      const params = new URLSearchParams({ q: query });
      const res = await fetch(`/api/articles?${params}`);
      const data = await res.json();
      setArticles(data.articles || []);
      setHasMore(false);
    } catch {
      showToast('Search failed. Please try again.', 'error');
    }
    setIsLoading(false);
  }, [category, fetchArticles, showToast]);

  // Initial load
  if (!initialized) {
    setInitialized(true);
    fetchArticles('top');
  }

  // Category change
  const handleCategoryChange = useCallback((cat) => {
    setCategory(cat);
    fetchArticles(cat);
  }, [fetchArticles]);

  // Load more
  const handleLoadMore = useCallback(() => {
    fetchArticles(category, page + 1, true);
  }, [category, page, fetchArticles]);

  // Refresh
  const handleRefresh = useCallback(async () => {
    showToast('Refreshing articles...', 'info');
    try {
      await fetch('/api/cron/fetch-news', { method: 'POST' });
      await fetchArticles(category);
      showToast('Articles refreshed!', 'success');
    } catch {
      showToast('Refresh failed. Daily limit may be reached.', 'error');
    }
  }, [category, fetchArticles, showToast]);

  // Logo click
  const handleLogoClick = useCallback(() => {
    setCategory('top');
    fetchArticles('top');
  }, [fetchArticles]);

  return (
    <>
      <Header
        onSearch={searchArticles}
        onRefresh={handleRefresh}
        onLogoClick={handleLogoClick}
      />
      <CategoryBar
        activeCategory={category}
        onSelect={handleCategoryChange}
      />
      <main className="main">
        <ArticleGrid
          articles={articles}
          isLoading={isLoading}
          isSearching={isSearching}
          searchQuery={searchQuery}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          onArticleClick={setSelectedArticle}
          lastUpdated={lastUpdated}
        />
      </main>
      {selectedArticle && (
        <ArticleModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}
    </>
  );
}
