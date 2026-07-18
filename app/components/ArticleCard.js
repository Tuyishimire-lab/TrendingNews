'use client';

import { formatDate } from '@/lib/utils';

export default function ArticleCard({ article, onClick }) {
  const cat = Array.isArray(article.category) ? article.category[0] : (article.category || '');

  return (
    <article className="article-card" onClick={() => onClick(article)}>
      <div className="article-card__image-wrap">
        {article.image_url ? (
          <img
            className="article-card__image"
            src={article.image_url}
            alt={article.title}
            loading="lazy"
            onError={(e) => {
              e.target.outerHTML = '<div class="article-card__image-placeholder"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>';
            }}
          />
        ) : (
          <div className="article-card__image-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          </div>
        )}
        {cat && <span className="article-card__category">{cat}</span>}
      </div>
      <div className="article-card__body">
        <h3 className="article-card__title">{article.title}</h3>
        <p className="article-card__description">{article.description}</p>
        <div className="article-card__footer">
          <span className="article-card__source">
            {article.source_icon && (
              <img src={article.source_icon} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
            )}
            {article.source_name || 'Unknown'}
          </span>
          <time className="article-card__date">{formatDate(article.pub_date)}</time>
        </div>
      </div>
    </article>
  );
}
