'use client';

import { useState } from 'react';
import useSWR from 'swr';

interface Podcast {
  id: string;
  name: string;
  author: string;
  artwork: string;
  url: string;
  feedUrl: string;
  genre: string;
  episodeCount: number;
  category: 'crypto' | 'ai';
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PodcastList() {
  const [activeTab, setActiveTab] = useState<'crypto' | 'ai'>('crypto');

  const { data: podcasts, isLoading } = useSWR<Podcast[]>(
    '/api/podcasts',
    fetcher,
    { refreshInterval: 1800000 } // 30 minutes
  );

  const filteredPodcasts = podcasts?.filter(p => p.category === activeTab) || [];

  if (isLoading) {
    return (
      <div className="podcast-card loading">
        <div className="skeleton skeleton-label" />
        <div className="podcast-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton skeleton-podcast" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="podcast-card">
      <div className="podcast-header">
        <div className="podcast-header-left">
          <span className="podcast-icon">🎙️</span>
          <p className="widget-label">Top Podcasts</p>
        </div>
        <div className="podcast-tabs">
          <button
            className={`podcast-tab ${activeTab === 'crypto' ? 'active' : ''}`}
            onClick={() => setActiveTab('crypto')}
          >
            Crypto
          </button>
          <button
            className={`podcast-tab ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            AI & Tech
          </button>
        </div>
      </div>

      <div className="podcast-grid">
        {filteredPodcasts.map((podcast) => (
          <a
            key={podcast.id}
            href={podcast.url}
            target="_blank"
            rel="noopener noreferrer"
            className="podcast-item"
          >
            <img
              src={podcast.artwork}
              alt={podcast.name}
              className="podcast-artwork"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/ZaddyPFP.png';
              }}
            />
            <div className="podcast-info">
              <p className="podcast-name">{podcast.name}</p>
              <p className="podcast-author">{podcast.author}</p>
              <p className="podcast-meta">{podcast.episodeCount} episodes</p>
            </div>
          </a>
        ))}
      </div>

      <div className="podcast-footer">
        <span className="podcast-source">Data from Apple Podcasts</span>
      </div>
    </div>
  );
}
