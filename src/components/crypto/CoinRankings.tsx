'use client';

import { useState } from 'react';
import { formatCurrency, formatCompactNumber, formatPercentage } from '@/lib/crypto/formatters';
import MiniSparkline from './MiniSparkline';
import type { CoinMarketData } from '@/lib/crypto/types';

type TimePeriod = '1h' | '24h' | '7d' | '30d';

interface CoinRankingsProps {
  coins: CoinMarketData[];
  isLoading?: boolean;
  lastUpdated?: string | null;
}

const getPriceChange = (coin: CoinMarketData, period: TimePeriod): number => {
  switch (period) {
    case '1h':
      return coin.price_change_percentage_1h_in_currency ?? 0;
    case '24h':
      return coin.price_change_percentage_24h ?? 0;
    case '7d':
      return coin.price_change_percentage_7d_in_currency ?? 0;
    case '30d':
      return coin.price_change_percentage_30d_in_currency ?? 0;
    default:
      return coin.price_change_percentage_24h ?? 0;
  }
};

export default function CoinRankings({ coins, isLoading, lastUpdated }: CoinRankingsProps) {
  const [sortBy, setSortBy] = useState<'rank' | 'price' | 'change' | 'mcap'>('mcap');
  const [showCount, setShowCount] = useState(25);
  const [period, setPeriod] = useState<TimePeriod>('24h');
  const [isExpanded, setIsExpanded] = useState(false);

  const sortedCoins = [...coins].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return b.current_price - a.current_price;
      case 'change':
        return getPriceChange(b, period) - getPriceChange(a, period);
      case 'mcap':
        return b.market_cap - a.market_cap;
      default:
        return a.market_cap_rank - b.market_cap_rank;
    }
  });

  const displayCoins = sortedCoins.slice(0, showCount);

  if (isLoading) {
    return (
      <div className="coin-rankings-card loading">
        <div className="skeleton skeleton-header" />
        <div className="rankings-list">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="skeleton skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`coin-rankings-card ${isExpanded ? 'expanded' : ''}`}>
      {/* Header */}
      <div className="rankings-header">
        <h3 className="rankings-title">Top Coins</h3>
        <div className="rankings-controls">
          <button
            className="expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand for screenshot'}
          >
            {isExpanded ? '⊖' : '⊕'}
          </button>
          <div className="rankings-toggles">
            {(['1h', '24h', '7d', '30d'] as TimePeriod[]).map((p) => (
              <button
                key={p}
                className={`rankings-toggle ${period === p ? 'active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rankings-select"
          >
            <option value="rank">Rank</option>
            <option value="price">Price</option>
            <option value="change">Change</option>
            <option value="mcap">Market Cap</option>
          </select>
          <select
            value={showCount}
            onChange={(e) => setShowCount(Number(e.target.value))}
            className="rankings-select"
          >
            <option value={25}>Top 25</option>
            <option value={50}>Top 50</option>
            <option value={100}>Top 100</option>
          </select>
        </div>
      </div>

      {/* Column headers */}
      <div className="rankings-columns-header">
        <span className="col-rank">#</span>
        <span className="col-name">Name</span>
        <span className="col-price">Price</span>
        <span className="col-change">{period}</span>
        <span className="col-mcap">Market Cap</span>
        <span className="col-chart">7d</span>
      </div>

      {/* List */}
      <div className={`rankings-list ${isExpanded ? 'expanded' : ''}`}>
        {displayCoins.map((coin) => {
          const change = getPriceChange(coin, period);
          const isPositive = change >= 0;
          const sparklineData = coin.sparkline_in_7d?.price?.filter((_, i) => i % 4 === 0) || [];

          return (
            <a
              key={coin.id}
              href={`https://www.coingecko.com/en/coins/${coin.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ranking-row"
            >
              <span className="col-rank">{coin.market_cap_rank}</span>
              <div className="col-name">
                <img src={coin.image} alt={coin.name} className="coin-image" />
                <span className="coin-name">{coin.name}</span>
                <span className="coin-symbol">{coin.symbol.toUpperCase()}</span>
              </div>
              <span className="col-price">{formatCurrency(coin.current_price)}</span>
              <span className={`col-change ${isPositive ? 'positive' : 'negative'}`}>
                {formatPercentage(change)}
              </span>
              <span className="col-mcap">{formatCompactNumber(coin.market_cap, true)}</span>
              <span className="col-chart">
                {sparklineData.length > 0 && (
                  <MiniSparkline data={sparklineData} isPositive={isPositive} />
                )}
              </span>
            </a>
          );
        })}
      </div>

      {/* Footer */}
      <div className="rankings-footer">
        <a
          href="https://www.coingecko.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="data-source-link"
        >
          Data from CoinGecko
        </a>
      </div>
      {lastUpdated && (
        <span className="last-updated">
          Updated {new Date(lastUpdated).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
