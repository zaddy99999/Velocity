'use client';

import { useRef, useEffect } from 'react';
import useSWR from 'swr';
import { formatNumber, formatTimeAgo } from '@/lib/crypto/formatters';

interface Liquidation {
  id: string;
  coin: string;
  amount: number;
  amountUsd: number;
  side: 'long' | 'short';
  exchange: string;
  timestamp: string;
}

interface LiquidationData {
  totalLongs24h: number;
  totalShorts24h: number;
  liquidations: Liquidation[];
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function LiquidationTracker() {
  const { data, isLoading } = useSWR<LiquidationData>(
    '/api/crypto/liquidations',
    fetcher,
    { refreshInterval: 60000 } // Auto-refresh every 60 seconds
  );

  const lastUpdatedRef = useRef<string | null>(null);
  useEffect(() => {
    if (data) {
      lastUpdatedRef.current = new Date().toISOString();
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="widget-card">
        <p className="widget-label">Liquidation Tracker</p>
        <div className="liquidation-summary">
          <div className="skeleton skeleton-row" style={{ height: '60px' }} />
        </div>
        <div className="liquidation-list">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="widget-card">
        <p className="widget-label">Liquidation Tracker</p>
        <p className="widget-empty">Unable to load liquidation data</p>
      </div>
    );
  }

  const { totalLongs24h, totalShorts24h, liquidations } = data;
  const total24h = totalLongs24h + totalShorts24h;
  const longPercentage = total24h > 0 ? (totalLongs24h / total24h) * 100 : 50;

  return (
    <div className="widget-card">
      <p className="widget-label">Liquidation Tracker</p>

      {/* Summary section */}
      <div className="liquidation-summary">
        <div className="liquidation-totals">
          <div className="liquidation-total long">
            <span className="liquidation-total-label">Longs Liquidated</span>
            <span className="liquidation-total-value">${formatNumber(totalLongs24h)}</span>
          </div>
          <div className="liquidation-total short">
            <span className="liquidation-total-label">Shorts Liquidated</span>
            <span className="liquidation-total-value">${formatNumber(totalShorts24h)}</span>
          </div>
        </div>

        {/* Visual ratio bar */}
        <div className="liquidation-ratio-container">
          <div className="liquidation-ratio-bar">
            <div
              className="liquidation-ratio-long"
              style={{ width: `${longPercentage}%` }}
            />
            <div
              className="liquidation-ratio-short"
              style={{ width: `${100 - longPercentage}%` }}
            />
          </div>
          <div className="liquidation-ratio-labels">
            <span className="ratio-label long">{longPercentage.toFixed(1)}% Longs</span>
            <span className="ratio-label short">{(100 - longPercentage).toFixed(1)}% Shorts</span>
          </div>
        </div>

        <div className="liquidation-24h-total">
          <span>24h Total:</span>
          <span className="liquidation-24h-value">${formatNumber(total24h)}</span>
        </div>
      </div>

      {/* Recent liquidations list */}
      <div className="liquidation-list scrollable">
        {liquidations.slice(0, 15).map((liq) => (
          <div key={liq.id} className={`liquidation-item ${liq.side}`}>
            <span className={`liquidation-side-indicator ${liq.side}`}>
              {liq.side === 'long' ? 'L' : 'S'}
            </span>
            <div className="liquidation-info">
              <span className="liquidation-coin">{liq.coin}</span>
              <span className="liquidation-amount">${formatNumber(liq.amountUsd)}</span>
            </div>
            <div className="liquidation-meta">
              <span className="liquidation-exchange">{liq.exchange}</span>
              <span className="liquidation-time">{formatTimeAgo(liq.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>

      {lastUpdatedRef.current && (
        <span className="last-updated">
          Updated {new Date(lastUpdatedRef.current).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
