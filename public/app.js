/* ═══════════════════════════════════════════════════════════
   NOVAPULSE — Frontend Application
   AI-Powered News Web App
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── State ─── */
  const state = {
    currentCategory: 'top',
    searchQuery: '',
    articles: [],           // Currently displayed articles
    allArticles: {},         // Cache: category → articles[]
    nextPage: null,          // Pagination token
    isLoading: false,
    isSearching: false,
    aiCache: {},             // articleUrl → { summary, sentiment }
    lastUpdated: null,
  };

  /* ─── DOM References ─── */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    searchInput:        $('#search-input'),
    searchClear:        $('#search-clear'),
    categoriesList:     $('#categories-list'),
    heroSection:        $('#hero-section'),
    articleGrid:        $('#article-grid'),
    emptyState:         $('#empty-state'),
    loadMoreContainer:  $('#load-more-container'),
    loadMoreBtn:        $('#load-more-btn'),
    lastUpdated:        $('#last-updated'),
    refreshBtn:         $('#refresh-btn'),
    menuBtn:            $('#menu-btn'),
    searchContainer:    $('#search-container'),
    creditsCount:       $('#credits-count'),

    // Search results
    searchResultsHeader: $('#search-results-header'),
    searchQueryDisplay:  $('#search-query-display'),
    searchResultsCount:  $('#search-results-count'),

    // Modal
    modal:              $('#article-modal'),
    modalClose:         $('#modal-close'),
    modalImage:         $('#modal-image'),
    modalImageWrap:     $('#modal-image-wrap'),
    modalCategory:      $('#modal-category'),
    modalSourceIcon:    $('#modal-source-icon'),
    modalSourceName:    $('#modal-source-name'),
    modalDate:          $('#modal-date'),
    modalTitle:         $('#modal-title'),
    modalDescription:   $('#modal-description'),
    modalLink:          $('#modal-link'),

    // AI
    aiSummarizeBtn:     $('#ai-summarize-btn'),
    aiSentimentBtn:     $('#ai-sentiment-btn'),
    aiSummaryResult:    $('#ai-summary-result'),
    aiSummaryContent:   $('#ai-summary-content'),
    aiSentimentResult:  $('#ai-sentiment-result'),
    aiSentimentContent: $('#ai-sentiment-content'),

    // Toast
    toastContainer:     $('#toast-container'),
  };

  /* ─── Utilities ─── */
  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffHrs = diffMs / (1000 * 60 * 60);

    if (diffHrs < 1) return `${Math.max(1, Math.floor(diffMs / 60000))}m ago`;
    if (diffHrs < 24) return `${Math.floor(diffHrs)}h ago`;
    if (diffHrs < 48) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast--exit');
      toast.addEventListener('animationend', () => toast.remove());
    }, 3500);
  }

  /* ─── API Layer ─── */
  async function fetchArticles(category, page = null) {
    const params = new URLSearchParams({ category });
    if (page) params.set('page', page);

    const res = await fetch(`/api/articles?${params}`);
    if (!res.ok) throw new Error(`Failed to fetch articles: ${res.status}`);
    return res.json();
  }

  async function searchArticles(query) {
    const params = new URLSearchParams({ q: query });
    const res = await fetch(`/api/articles?${params}`);
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    return res.json();
  }

  async function aiSummarize(article) {
    const res = await fetch('/api/ai/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: article.title,
        description: article.description,
        content: article.content,
        source: article.source_name || article.source_id,
      }),
    });
    if (!res.ok) throw new Error(`AI summarize failed: ${res.status}`);
    return res.json();
  }

  async function aiSentiment(article) {
    const res = await fetch('/api/ai/sentiment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: article.title,
        description: article.description,
        content: article.content,
      }),
    });
    if (!res.ok) throw new Error(`AI sentiment failed: ${res.status}`);
    return res.json();
  }

  async function triggerFetch() {
    const res = await fetch('/api/cron/fetch-news', { method: 'POST' });
    if (!res.ok) throw new Error(`Cron trigger failed: ${res.status}`);
    return res.json();
  }

  /* ─── Rendering ─── */

  // Skeleton cards
  function renderSkeletons(count = 6) {
    dom.heroSection.classList.add('hidden');
    dom.emptyState.classList.add('hidden');
    dom.loadMoreContainer.classList.add('hidden');
    dom.articleGrid.innerHTML = Array(count).fill('').map(() => `
      <div class="skeleton">
        <div class="skeleton__image"></div>
        <div class="skeleton__body">
          <div class="skeleton__line skeleton__line--title"></div>
          <div class="skeleton__line skeleton__line--title-2"></div>
          <div class="skeleton__line skeleton__line--desc"></div>
          <div class="skeleton__line skeleton__line--desc-2"></div>
          <div class="skeleton__line skeleton__line--meta"></div>
        </div>
      </div>
    `).join('');
  }

  // Hero article (first article in feed)
  function renderHero(article) {
    if (!article) {
      dom.heroSection.classList.add('hidden');
      return;
    }

    const cat = Array.isArray(article.category) ? article.category[0] : (article.category || state.currentCategory);
    const imgHtml = article.image_url
      ? `<img class="hero-article__image" src="${escapeHtml(article.image_url)}" alt="${escapeHtml(article.title)}" loading="lazy" onerror="this.parentElement.style.display='none'">`
      : '';

    dom.heroSection.innerHTML = `
      <div class="hero-article__image-wrap">
        ${imgHtml}
        <div class="hero-article__overlay"></div>
      </div>
      <div class="hero-article__content">
        <span class="hero-article__badge">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          ${escapeHtml(cat)}
        </span>
        <h2 class="hero-article__title">${escapeHtml(article.title)}</h2>
        <p class="hero-article__description">${escapeHtml(article.description)}</p>
        <div class="hero-article__meta">
          <span class="hero-article__source">
            ${article.source_icon ? `<img src="${escapeHtml(article.source_icon)}" alt="" onerror="this.style.display='none'">` : ''}
            ${escapeHtml(article.source_name || article.source_id || 'Unknown')}
          </span>
          <span>•</span>
          <time>${formatDate(article.pub_date)}</time>
        </div>
      </div>
    `;

    dom.heroSection.classList.remove('hidden');
    dom.heroSection.onclick = () => openModal(article);
  }

  // Article card
  function createCardHtml(article, index) {
    const cat = Array.isArray(article.category) ? article.category[0] : (article.category || '');
    const hasImage = article.image_url;

    return `
      <article class="article-card" data-index="${index}" style="animation-delay: ${0.05 * (index % 9)}s">
        <div class="article-card__image-wrap">
          ${hasImage
            ? `<img class="article-card__image" src="${escapeHtml(article.image_url)}" alt="${escapeHtml(article.title)}" loading="lazy" onerror="this.outerHTML='<div class=\\'article-card__image-placeholder\\'><svg width=\\'48\\' height=\\'48\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'1\\'><rect x=\\'3\\' y=\\'3\\' width=\\'18\\' height=\\'18\\' rx=\\'2\\'/><circle cx=\\'8.5\\' cy=\\'8.5\\' r=\\'1.5\\'/><path d=\\'m21 15-5-5L5 21\\'/></svg></div>'">`
            : `<div class="article-card__image-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
              </div>`
          }
          ${cat ? `<span class="article-card__category">${escapeHtml(cat)}</span>` : ''}
        </div>
        <div class="article-card__body">
          <h3 class="article-card__title">${escapeHtml(article.title)}</h3>
          <p class="article-card__description">${escapeHtml(article.description)}</p>
          <div class="article-card__footer">
            <span class="article-card__source">
              ${article.source_icon ? `<img src="${escapeHtml(article.source_icon)}" alt="" onerror="this.style.display='none'">` : ''}
              ${escapeHtml(article.source_name || article.source_id || 'Unknown')}
            </span>
            <time class="article-card__date">${formatDate(article.pub_date)}</time>
          </div>
        </div>
      </article>
    `;
  }

  // Render article grid
  function renderArticles(articles, append = false) {
    if (!articles || articles.length === 0) {
      if (!append) {
        dom.articleGrid.innerHTML = '';
        dom.heroSection.classList.add('hidden');
        dom.emptyState.classList.remove('hidden');
      }
      dom.loadMoreContainer.classList.add('hidden');
      return;
    }

    dom.emptyState.classList.add('hidden');

    let displayArticles = articles;
    let heroArticle = null;

    // Show hero for category view (not search, not append)
    if (!append && !state.isSearching && articles.length > 1) {
      heroArticle = articles[0];
      displayArticles = articles.slice(1);
    }

    if (!append) {
      renderHero(heroArticle);
    }

    const html = displayArticles.map((a, i) => {
      const baseIndex = append ? dom.articleGrid.children.length + i : i;
      return createCardHtml(a, baseIndex);
    }).join('');

    if (append) {
      dom.articleGrid.insertAdjacentHTML('beforeend', html);
    } else {
      dom.articleGrid.innerHTML = html;
    }

    // Attach click handlers
    dom.articleGrid.querySelectorAll('.article-card').forEach((card) => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.index, 10);
        // Find the actual article from the full list
        const allDisplayed = state.articles;
        const heroOffset = (!state.isSearching && allDisplayed.length > 1) ? 1 : 0;
        const articleIdx = heroOffset + idx;
        if (allDisplayed[articleIdx]) {
          openModal(allDisplayed[articleIdx]);
        }
      });
    });
  }

  // Last updated
  function renderLastUpdated(timestamp) {
    if (!timestamp) {
      dom.lastUpdated.textContent = '';
      return;
    }
    const d = new Date(timestamp);
    dom.lastUpdated.textContent = `Articles last fetched: ${d.toLocaleString()}`;
  }

  /* ─── Modal ─── */
  let currentModalArticle = null;

  function openModal(article) {
    currentModalArticle = article;

    // Image
    if (article.image_url) {
      dom.modalImage.src = article.image_url;
      dom.modalImage.alt = article.title || '';
      dom.modalImage.onerror = function () { dom.modalImageWrap.style.display = 'none'; };
      dom.modalImageWrap.style.display = '';
    } else {
      dom.modalImageWrap.style.display = 'none';
    }

    // Category
    const cat = Array.isArray(article.category) ? article.category[0] : (article.category || state.currentCategory);
    dom.modalCategory.textContent = cat;

    // Source
    if (article.source_icon) {
      dom.modalSourceIcon.src = article.source_icon;
      dom.modalSourceIcon.style.display = '';
    } else {
      dom.modalSourceIcon.style.display = 'none';
    }
    dom.modalSourceName.textContent = article.source_name || article.source_id || 'Unknown Source';

    // Date
    dom.modalDate.textContent = formatDate(article.pub_date);

    // Content
    dom.modalTitle.textContent = article.title || '';
    dom.modalDescription.textContent = article.description || article.content || 'No description available.';

    // Link
    dom.modalLink.href = article.link || '#';

    // Reset AI sections
    dom.aiSummaryResult.classList.add('hidden');
    dom.aiSentimentResult.classList.add('hidden');
    dom.aiSummarizeBtn.classList.remove('loading', 'done');
    dom.aiSentimentBtn.classList.remove('loading', 'done');

    // Check AI cache
    const cacheKey = article.link || article.title;
    if (state.aiCache[cacheKey]) {
      if (state.aiCache[cacheKey].summary) {
        showAISummary(state.aiCache[cacheKey].summary);
        dom.aiSummarizeBtn.classList.add('done');
      }
      if (state.aiCache[cacheKey].sentiment) {
        showAISentiment(state.aiCache[cacheKey].sentiment);
        dom.aiSentimentBtn.classList.add('done');
      }
    }

    // Show modal
    dom.modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    dom.modal.classList.add('hidden');
    document.body.style.overflow = '';
    currentModalArticle = null;
  }

  function showAISummary(data) {
    let html = `<p>${escapeHtml(data.summary)}</p>`;
    if (data.keyTakeaways && data.keyTakeaways.length > 0) {
      html += '<ul>';
      data.keyTakeaways.forEach((t) => {
        html += `<li><strong>→</strong> ${escapeHtml(t)}</li>`;
      });
      html += '</ul>';
    }
    dom.aiSummaryContent.innerHTML = html;
    dom.aiSummaryResult.classList.remove('hidden');
  }

  function showAISentiment(data) {
    const sentClass = data.sentiment === 'positive' ? 'positive'
      : data.sentiment === 'negative' ? 'negative' : 'neutral';

    const emoji = data.sentiment === 'positive' ? '😊'
      : data.sentiment === 'negative' ? '😟' : '😐';

    let html = `
      <div class="sentiment-badge sentiment-badge--${sentClass}">
        ${emoji} ${escapeHtml(data.sentiment ? data.sentiment.charAt(0).toUpperCase() + data.sentiment.slice(1) : 'Unknown')}
        ${data.confidence ? `· ${Math.round(data.confidence * 100)}% confidence` : ''}
      </div>
      <p>${escapeHtml(data.reasoning || '')}</p>
    `;
    dom.aiSentimentContent.innerHTML = html;
    dom.aiSentimentResult.classList.remove('hidden');
  }

  /* ─── Data Loading ─── */
  async function loadCategory(category, append = false) {
    if (state.isLoading) return;
    state.isLoading = true;
    state.isSearching = false;

    if (!append) {
      state.currentCategory = category;
      state.articles = [];
      state.nextPage = null;
      renderSkeletons();
      updateCategoryChips();
      dom.searchResultsHeader.classList.add('hidden');
    }

    try {
      const data = await fetchArticles(category, append ? state.nextPage : null);
      const newArticles = data.articles || [];
      state.nextPage = data.nextPage || null;
      state.lastUpdated = data.lastUpdated || null;

      if (append) {
        state.articles = [...state.articles, ...newArticles];
        renderArticles(newArticles, true);
      } else {
        state.articles = newArticles;
        renderArticles(newArticles);
      }

      // Show/hide load more
      if (state.nextPage) {
        dom.loadMoreContainer.classList.remove('hidden');
      } else {
        dom.loadMoreContainer.classList.add('hidden');
      }

      renderLastUpdated(state.lastUpdated);

    } catch (err) {
      console.error('Failed to load articles:', err);
      showToast('Failed to load articles. Try refreshing.', 'error');
      if (!append) {
        dom.articleGrid.innerHTML = '';
        dom.emptyState.classList.remove('hidden');
      }
    } finally {
      state.isLoading = false;
    }
  }

  async function performSearch(query) {
    if (!query.trim()) {
      loadCategory(state.currentCategory);
      return;
    }

    if (state.isLoading) return;
    state.isLoading = true;
    state.isSearching = true;

    renderSkeletons();

    try {
      const data = await searchArticles(query);
      const articles = data.articles || [];

      state.articles = articles;
      state.nextPage = null;

      dom.searchQueryDisplay.textContent = query;
      dom.searchResultsCount.textContent = `${articles.length} article${articles.length !== 1 ? 's' : ''} found`;
      dom.searchResultsHeader.classList.remove('hidden');

      renderArticles(articles);
      dom.loadMoreContainer.classList.add('hidden');

    } catch (err) {
      console.error('Search failed:', err);
      showToast('Search failed. Please try again.', 'error');
    } finally {
      state.isLoading = false;
    }
  }

  /* ─── Category Chips ─── */
  function updateCategoryChips() {
    dom.categoriesList.querySelectorAll('.category-chip').forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.category === state.currentCategory);
    });
  }

  /* ─── AI Feature Handlers ─── */
  async function handleSummarize() {
    if (!currentModalArticle) return;
    const cacheKey = currentModalArticle.link || currentModalArticle.title;

    // Check cache
    if (state.aiCache[cacheKey]?.summary) {
      showAISummary(state.aiCache[cacheKey].summary);
      return;
    }

    dom.aiSummarizeBtn.classList.add('loading');

    try {
      const result = await aiSummarize(currentModalArticle);
      if (!state.aiCache[cacheKey]) state.aiCache[cacheKey] = {};
      state.aiCache[cacheKey].summary = result;
      showAISummary(result);
      dom.aiSummarizeBtn.classList.remove('loading');
      dom.aiSummarizeBtn.classList.add('done');
    } catch (err) {
      console.error('AI summarize failed:', err);
      dom.aiSummarizeBtn.classList.remove('loading');
      showToast('AI summary failed. Please try again.', 'error');
    }
  }

  async function handleSentiment() {
    if (!currentModalArticle) return;
    const cacheKey = currentModalArticle.link || currentModalArticle.title;

    // Check cache
    if (state.aiCache[cacheKey]?.sentiment) {
      showAISentiment(state.aiCache[cacheKey].sentiment);
      return;
    }

    dom.aiSentimentBtn.classList.add('loading');

    try {
      const result = await aiSentiment(currentModalArticle);
      if (!state.aiCache[cacheKey]) state.aiCache[cacheKey] = {};
      state.aiCache[cacheKey].sentiment = result;
      showAISentiment(result);
      dom.aiSentimentBtn.classList.remove('loading');
      dom.aiSentimentBtn.classList.add('done');
    } catch (err) {
      console.error('AI sentiment failed:', err);
      dom.aiSentimentBtn.classList.remove('loading');
      showToast('Sentiment analysis failed. Please try again.', 'error');
    }
  }

  /* ─── Refresh Handler ─── */
  async function handleRefresh() {
    dom.refreshBtn.classList.add('spinning');
    showToast('Refreshing articles...', 'info');

    try {
      await triggerFetch();
      // Reload current view
      state.allArticles = {};
      await loadCategory(state.currentCategory);
      showToast('Articles refreshed!', 'success');
    } catch (err) {
      console.error('Refresh failed:', err);
      showToast('Refresh failed. Daily limit may be reached.', 'error');
    } finally {
      dom.refreshBtn.classList.remove('spinning');
    }
  }

  /* ─── Event Binding ─── */
  function bindEvents() {
    // Category chips
    dom.categoriesList.addEventListener('click', (e) => {
      const chip = e.target.closest('.category-chip');
      if (!chip) return;
      const category = chip.dataset.category;
      if (category === state.currentCategory && !state.isSearching) return;

      // Clear search
      dom.searchInput.value = '';
      dom.searchClear.classList.add('hidden');
      state.searchQuery = '';

      loadCategory(category);
    });

    // Search
    const debouncedSearch = debounce((query) => {
      state.searchQuery = query;
      performSearch(query);
    }, 500);

    dom.searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      dom.searchClear.classList.toggle('hidden', !val);
      if (!val) {
        // Cleared — go back to category view
        state.isSearching = false;
        dom.searchResultsHeader.classList.add('hidden');
        loadCategory(state.currentCategory);
      } else {
        debouncedSearch(val);
      }
    });

    dom.searchClear.addEventListener('click', () => {
      dom.searchInput.value = '';
      dom.searchClear.classList.add('hidden');
      state.searchQuery = '';
      state.isSearching = false;
      dom.searchResultsHeader.classList.add('hidden');
      loadCategory(state.currentCategory);
      dom.searchInput.focus();
    });

    // Load more
    dom.loadMoreBtn.addEventListener('click', () => {
      loadCategory(state.currentCategory, true);
    });

    // Refresh
    dom.refreshBtn.addEventListener('click', handleRefresh);

    // Mobile menu (toggle search)
    dom.menuBtn.addEventListener('click', () => {
      dom.searchContainer.classList.toggle('mobile-visible');
    });

    // Modal close
    dom.modalClose.addEventListener('click', closeModal);
    dom.modal.addEventListener('click', (e) => {
      if (e.target === dom.modal) closeModal();
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    // AI buttons
    dom.aiSummarizeBtn.addEventListener('click', handleSummarize);
    dom.aiSentimentBtn.addEventListener('click', handleSentiment);

    // Logo click — reset to top
    $('#logo').addEventListener('click', () => {
      dom.searchInput.value = '';
      dom.searchClear.classList.add('hidden');
      state.searchQuery = '';
      state.isSearching = false;
      dom.searchResultsHeader.classList.add('hidden');
      loadCategory('top');
    });
  }

  /* ─── Init ─── */
  function init() {
    bindEvents();
    loadCategory('top');
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
