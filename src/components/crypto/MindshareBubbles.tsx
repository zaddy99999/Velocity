'use client';

import { useMemo, useState } from 'react';
import { formatCompactNumber } from '@/lib/crypto/formatters';
import type { CoinMarketData, NewsItem } from '@/lib/crypto/types';

type TimePeriod = '1h' | '24h' | '7d' | '30d';

interface MindshareBubblesProps {
  coins: CoinMarketData[];
  news: NewsItem[];
  isLoading?: boolean;
}

interface HeatmapCell {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  marketCap: number;
  change: number;
  weight: number;
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

export default function MindshareBubbles({ coins, news, isLoading }: MindshareBubblesProps) {
  const [period, setPeriod] = useState<TimePeriod>('24h');

  const cells = useMemo(() => {
    if (coins.length === 0) return [];

    // Use top 20 coins for the heatmap
    const topCoins = coins.slice(0, 20);

    // Calculate total market cap for weighting
    const totalMarketCap = topCoins.reduce((sum, coin) => sum + coin.market_cap, 0);

    const cellData: HeatmapCell[] = topCoins.map((coin) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      image: coin.image,
      price: coin.current_price,
      marketCap: coin.market_cap,
      change: getPriceChange(coin, period),
      weight: (coin.market_cap / totalMarketCap) * 100,
    }));

    return cellData;
  }, [coins, period]);

  // Get color based on price change
  const getChangeColor = (change: number) => {
    if (change >= 10) return 'rgba(34, 197, 94, 0.9)';
    if (change >= 5) return 'rgba(34, 197, 94, 0.7)';
    if (change >= 2) return 'rgba(34, 197, 94, 0.5)';
    if (change >= 0) return 'rgba(34, 197, 94, 0.3)';
    if (change >= -2) return 'rgba(239, 68, 68, 0.3)';
    if (change >= -5) return 'rgba(239, 68, 68, 0.5)';
    if (change >= -10) return 'rgba(239, 68, 68, 0.7)';
    return 'rgba(239, 68, 68, 0.9)';
  };

  if (isLoading) {
    return (
      <div className="heatmap-card loading">
        <div className="skeleton skeleton-label" />
        <div className="heatmap-grid">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 80 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="heatmap-card">
      <div className="heatmap-header">
        <div>
          <h3 className="heatmap-title">Market Heatmap</h3>
          <div className="heatmap-toggles">
            {(['1h', '24h', '7d', '30d'] as TimePeriod[]).map((p) => (
              <button
                key={p}
                className={`heatmap-toggle ${period === p ? 'active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="heatmap-legend">
          <div className="legend-gradient">
            <span className="legend-label">-10%</span>
            <div className="gradient-bar" />
            <span className="legend-label">+10%</span>
          </div>
        </div>
      </div>

      <div className="heatmap-grid">
        {cells.map((cell) => {
          const isPositive = cell.change >= 0;
          // Determine cell size class based on weight (use log scale for better distribution)
          // BTC ~50%, ETH ~15%, others much smaller
          let sizeClass = 'small';
          if (cell.weight > 30) sizeClass = 'xlarge';  // Only BTC
          else if (cell.weight > 8) sizeClass = 'large';   // ETH, maybe BNB
          else if (cell.weight > 2) sizeClass = 'medium';  // Top 10ish

          return (
            <a
              key={cell.id}
              href={`https://www.coingecko.com/en/coins/${cell.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`heatmap-cell ${sizeClass}`}
              style={{ backgroundColor: getChangeColor(cell.change) }}
            >
              <div className="cell-content">
                <img src={cell.image} alt={cell.name} className="cell-image" />
                <span className="cell-symbol">{cell.symbol}</span>
                <span className={`cell-change ${isPositive ? 'positive' : 'negative'}`}>
                  {isPositive ? '+' : ''}{cell.change.toFixed(2)}%
                </span>
                <span className="cell-mcap">{formatCompactNumber(cell.marketCap, true)}</span>
              </div>
            </a>
          );
        })}
      </div>

      <div className="heatmap-footer">
        <a
          href="https://www.coingecko.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="data-source-link"
        >
          Data from CoinGecko
        </a>
      </div>
    </div>
  );
}
