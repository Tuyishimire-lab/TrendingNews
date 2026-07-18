'use client';

import { useState, useRef } from 'react';

export default function Header({ onSearch, onRefresh, onLogoClick }) {
  const [query, setQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const debounceRef = useRef(null);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(val);
    }, 500);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  return (
    <header className="header">
      <div className="header__inner">
        <div className="header__brand">
          <div className="header__logo" onClick={onLogoClick}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <defs>
                <linearGradient id="logo-grad" x1="0" y1="0" x2="32" y2="32">
                  <stop offset="0%" stopColor="#6366f1"/>
                  <stop offset="50%" stopColor="#8b5cf6"/>
                  <stop offset="100%" stopColor="#a855f7"/>
                </linearGradient>
              </defs>
              <circle cx="16" cy="16" r="14" stroke="url(#logo-grad)" strokeWidth="2.5" fill="none"/>
              <path d="M10 20V12l4 5 4-5v8" stroke="url(#logo-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <span className="header__title">
              Nova<span className="header__title--accent">Pulse</span>
            </span>
          </div>
          <span className="header__tagline">AI-Powered News</span>
        </div>

        <div className="header__search">
          <svg className="header__search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            type="text"
            className="header__search-input"
            placeholder="Search news..."
            value={query}
            onChange={handleInput}
            autoComplete="off"
          />
          {query && (
            <button className="header__search-clear" onClick={handleClear} aria-label="Clear search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        <div className="header__actions">
          <button
            className={`header__btn${isRefreshing ? ' spinning' : ''}`}
            onClick={handleRefresh}
            title="Refresh articles"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
