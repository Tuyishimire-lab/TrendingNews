'use client';

import { formatDate } from '@/lib/utils';

export default function HeroArticle({ article, onClick }) {
  if (!article) return null;

  const cat = Array.isArray(article.category) ? article.category[0] : (article.category || 'top');

  return (
    <section className="hero-article" onClick={() => onClick(article)}>
      {article.image_url && (
        <div className="hero-article__image-wrap">
          <img
            className="hero-article__image"
            src={article.image_url}
            alt={article.title}
            loading="lazy"
            onError={(e) => { e.target.parentElement.style.display = 'none'; }}
          />
          <div className="hero-article__overlay" />
        </div>
      )}
      <div className="hero-article__content">
        <span className="hero-article__badge">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          {cat}
        </span>
        <h2 className="hero-article__title">{article.title}</h2>
        <p className="hero-article__description">{article.description}</p>
        <div className="hero-article__meta">
          <span className="hero-article__source">
            {article.source_icon && (
              <img src={article.source_icon} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
            )}
            {article.source_name || 'Unknown'}
          </span>
          <span>•</span>
          <time>{formatDate(article.pub_date)}</time>
        </div>
      </div>
    </section>
  );
}
