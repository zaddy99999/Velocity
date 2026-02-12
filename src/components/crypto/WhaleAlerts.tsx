'use client';

import { useRef, useEffect } from 'react';
import useSWR from 'swr';
import { formatNumber, formatTimeAgo } from '@/lib/crypto/formatters';

interface WhaleTransaction {
  id: string;
  symbol: string;
  amount: number;
  amountUsd: number;
  from: string;
  to: string;
  type: 'exchange_inflow' | 'exchange_outflow' | 'whale_transfer';
  timestamp: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

const typeEmoji: Record<string, string> = {
  exchange_inflow: '🔴',
  exchange_outflow: '🟢',
  whale_transfer: '🐋',
};

const typeLabel: Record<string, string> = {
  exchange_inflow: 'to exchange',
  exchange_outflow: 'from exchange',
  whale_transfer: 'whale move',
};

export default function WhaleAlerts() {
  const { data: transactions, isLoading } = useSWR<WhaleTransaction[]>(
    '/api/crypto/whales',
    fetcher,
    { refreshInterval: 60000 }
  );

  const lastUpdatedRef = useRef<string | null>(null);
  useEffect(() => {
    if (transactions) {
      lastUpdatedRef.current = new Date().toISOString();
    }
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="widget-card">
        <p className="widget-label">🐋 Whale Alerts</p>
        <div className="whale-list">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="widget-card">
        <p className="widget-label">🐋 Whale Alerts</p>
        <p className="widget-empty">No recent whale activity</p>
      </div>
    );
  }

  return (
    <div className="widget-card">
      <p className="widget-label">🐋 Whale Alerts</p>
      <div className="whale-list scrollable">
        {transactions.map((tx) => (
          <div key={tx.id} className="whale-item">
            <span className="whale-emoji">{typeEmoji[tx.type]}</span>
            <div className="whale-info">
              <span className="whale-amount">
                {formatNumber(tx.amount)} {tx.symbol}
              </span>
              <span className="whale-usd">${formatNumber(tx.amountUsd)}</span>
            </div>
            <div className="whale-meta">
              <span className="whale-type">{typeLabel[tx.type]}</span>
              <span className="whale-time">{formatTimeAgo(tx.timestamp)}</span>
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
