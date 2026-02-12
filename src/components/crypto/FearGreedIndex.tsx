'use client';

import useSWR from 'swr';
import type { FearGreedData } from '@/lib/crypto/types';

interface FearGreedIndexProps {
  data?: FearGreedData;
  isLoading?: boolean;
}

interface MarketSentiment {
  longShortRatio: number;
  openInterest: number;
  openInterestChange: number;
  liquidations24h: { long: number; short: number };
  btcFunding: number;
  ethFunding: number;
  lastUpdated: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function FearGreedIndex({ data, isLoading }: FearGreedIndexProps) {
  const { data: sentiment } = useSWR<MarketSentiment>('/api/crypto/sentiment', fetcher, {
    refreshInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="fear-greed-card loading">
        <div className="skeleton skeleton-label" />
        <div className="skeleton skeleton-gauge" />
      </div>
    );
  }

  const value = parseInt(data?.value || '50', 10);
  const classification = data?.value_classification || 'Neutral';

  const getColor = (val: number) => {
    if (val <= 25) return '#ef4444';
    if (val <= 45) return '#f97316';
    if (val <= 55) return '#eab308';
    if (val <= 75) return '#84cc16';
    return '#22c55e';
  };

  const color = getColor(value);
  const lsRatio = sentiment?.longShortRatio || 1;
  const isLongBias = lsRatio > 1;

  return (
    <div className="fear-greed-card">
      <p className="widget-label">Market Sentiment</p>

      <div className="fear-greed-content">
        {/* Circular gauge */}
        <div className="gauge-container">
          <svg className="gauge-svg" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.5" fill="none" stroke={color} strokeWidth="3"
              strokeDasharray={`${value} 100`} strokeLinecap="round"
              className="gauge-progress" transform="rotate(-90 18 18)"
            />
          </svg>
          <div className="gauge-value" style={{ color }}>{value}</div>
        </div>

        {/* Sentiment info */}
        <div className="fear-greed-info">
          <p className="fear-greed-label" style={{ color }}>{classification}</p>

          <div className="sentiment-stats">
            <div className="sentiment-stat">
              <span className="sentiment-label">Long/Short</span>
              <span className={`sentiment-value ${isLongBias ? 'positive' : 'negative'}`}>
                {lsRatio.toFixed(2)}
              </span>
            </div>
            <div className="sentiment-stat">
              <span className="sentiment-label">Open Interest</span>
              <span className="sentiment-value">
                ${((sentiment?.openInterest || 0) / 1e9).toFixed(1)}B
              </span>
            </div>
            <div className="sentiment-stat">
              <span className="sentiment-label">24h Liqs</span>
              <span className="sentiment-value negative">
                ${(((sentiment?.liquidations24h?.long || 0) + (sentiment?.liquidations24h?.short || 0)) / 1e6).toFixed(0)}M
              </span>
            </div>
            <div className="sentiment-stat">
              <span className="sentiment-label">BTC Funding</span>
              <span className={`sentiment-value ${(sentiment?.btcFunding || 0) >= 0 ? 'positive' : 'negative'}`}>
                {((sentiment?.btcFunding || 0) * 100).toFixed(3)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="fear-greed-footer">
        <a href="https://alternative.me/crypto/fear-and-greed-index/" target="_blank" rel="noopener noreferrer" className="data-source-link">
          Fear & Greed from Alternative.me
        </a>
      </div>
      {sentiment?.lastUpdated && (
        <span className="last-updated">
          Updated {new Date(sentiment.lastUpdated).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
