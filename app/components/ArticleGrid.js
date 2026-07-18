'use client';

import HeroArticle from './HeroArticle';
import ArticleCard from './ArticleCard';

function SkeletonCard() {
  return (
    <div className="skeleton">
      <div className="skeleton__image" />
      <div className="skeleton__body">
        <div className="skeleton__line skeleton__line--title" />
        <div className="skeleton__line skeleton__line--title-2" />
        <div className="skeleton__line skeleton__line--desc" />
        <div className="skeleton__line skeleton__line--desc-2" />
        <div className="skeleton__line skeleton__line--meta" />
      </div>
    </div>
  );
}

export default function ArticleGrid({
  articles,
  isLoading,
  isSearching,
  searchQuery,
  hasMore,
  onLoadMore,
  onArticleClick,
  lastUpdated,
}) {
  // Loading state
  if (isLoading && articles.length === 0) {
    return (
      <div className="article-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (!isLoading && articles.length === 0) {
    return (
      <div className="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        <h3>No articles found</h3>
        <p>Try a different search term or browse another category</p>
      </div>
    );
  }

  const heroArticle = !isSearching && articles.length > 1 ? articles[0] : null;
  const gridArticles = heroArticle ? articles.slice(1) : articles;

  return (
    <>
      {/* Search results header */}
      {isSearching && searchQuery && (
        <div className="search-results-header">
          <h2 className="search-results-title">
            Results for &quot;<span>{searchQuery}</span>&quot;
          </h2>
          <span className="search-results-count">
            {articles.length} article{articles.length !== 1 ? 's' : ''} found
          </span>
        </div>
      )}

      {/* Hero article */}
      {heroArticle && (
        <HeroArticle article={heroArticle} onClick={onArticleClick} />
      )}

      {/* Article grid */}
      <div className="article-grid">
        {gridArticles.map((article, i) => (
          <ArticleCard
            key={article.link || i}
            article={article}
            onClick={onArticleClick}
          />
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="load-more">
          <button className="load-more__btn" onClick={onLoadMore} disabled={isLoading}>
            <span>{isLoading ? 'Loading...' : 'Load More Articles'}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
      )}

      {/* Last updated */}
      {lastUpdated && (
        <div className="last-updated">
          Articles last fetched: {new Date(lastUpdated).toLocaleString()}
        </div>
      )}
    </>
  );
}
