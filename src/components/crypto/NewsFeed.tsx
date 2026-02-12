'use client';

import { useState, useMemo } from 'react';
import type { NewsItem } from '@/lib/crypto/types';

interface NewsFeedProps {
  news: NewsItem[];
  isLoading?: boolean;
  title?: string;
  icon?: string;
  accentColor?: string;
}

// Group news by day
function groupByDay(news: NewsItem[]): Map<string, NewsItem[]> {
  const grouped = new Map<string, NewsItem[]>();

  news.forEach(item => {
    const date = new Date(item.published_at);
    const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

    if (!grouped.has(dayKey)) {
      grouped.set(dayKey, []);
    }
    grouped.get(dayKey)!.push(item);
  });

  return grouped;
}

function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00'); // Noon to avoid timezone issues
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

export default function NewsFeed({
  news,
  isLoading,
  title = 'Daily News',
  icon = '📰',
  accentColor = '#2edb84',
}: NewsFeedProps) {
  const [dayIndex, setDayIndex] = useState(0);

  // Group news by day and get sorted day keys (most recent first)
  const { dayKeys, groupedNews } = useMemo(() => {
    const grouped = groupByDay(news);
    const keys = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));
    return { dayKeys: keys, groupedNews: grouped };
  }, [news]);

  const currentDayKey = dayKeys[dayIndex];
  const currentNews = currentDayKey ? groupedNews.get(currentDayKey) || [] : [];

  const canGoNewer = dayIndex > 0;
  const canGoOlder = dayIndex < dayKeys.length - 1;

  const accentRgb = accentColor === '#2edb84' ? '46, 219, 132' : '59, 130, 246';

  if (isLoading) {
    return (
      <div className="news-feed-card loading" style={{ borderColor: `rgba(${accentRgb}, 0.2)` }}>
        <div className="skeleton skeleton-label" />
        <div className="news-list">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton skeleton-news-item" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="news-feed-card" style={{ borderColor: `rgba(${accentRgb}, 0.2)` }}>
      <div className="news-header">
        <div className="news-header-left">
          <span className="news-icon">{icon}</span>
          <p className="widget-label">{title}</p>
        </div>
      </div>

      {/* Day Navigation */}
      <div className="news-day-nav">
        <button
          className="news-nav-btn"
          onClick={() => setDayIndex(i => i + 1)}
          disabled={!canGoOlder}
          style={{
            opacity: canGoOlder ? 1 : 0.3,
            borderColor: `rgba(${accentRgb}, 0.3)`,
          }}
          title="Older"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="news-day-label">
          <span className="news-day-title">{currentDayKey ? formatDayLabel(currentDayKey) : 'No news'}</span>
          <span className="news-day-count">{currentNews.length} articles</span>
        </div>

        <button
          className="news-nav-btn"
          onClick={() => setDayIndex(i => i - 1)}
          disabled={!canGoNewer}
          style={{
            opacity: canGoNewer ? 1 : 0.3,
            borderColor: `rgba(${accentRgb}, 0.3)`,
          }}
          title="Newer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div className="news-list">
        {currentNews.length === 0 ? (
          <div className="news-empty">
            <p>No articles for this day</p>
          </div>
        ) : (
          currentNews.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="news-item"
            >
              <p className="news-title">{item.title}</p>
              <div className="news-meta">
                <span className="news-source">{item.source.title}</span>
                {item.currencies && item.currencies.length > 0 && (
                  <>
                    <span className="news-separator">•</span>
                    <div className="news-tags">
                      {item.currencies.slice(0, 3).map((c) => (
                        <span key={c.code} className="news-tag" style={{ background: `rgba(${accentRgb}, 0.1)`, color: accentColor }}>
                          {c.code}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
