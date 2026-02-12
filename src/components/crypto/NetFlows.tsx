'use client';

import { useState, useRef, useEffect } from 'react';
import useSWR from 'swr';
import { formatCompactNumber } from '@/lib/crypto/formatters';

interface FlowData {
  chain: string;
  inflow: number;
  outflow: number;
  net: number;
  logo: string;
}

type TimePeriod = '7d' | '1m' | '3m' | '1y';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function NetFlows() {
  const [period, setPeriod] = useState<TimePeriod>('7d');
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: flowData, isLoading } = useSWR<FlowData[]>(
    `/api/crypto/flows?period=${period}`,
    fetcher,
    { refreshInterval: 300000 }
  );

  const lastUpdatedRef = useRef<string | null>(null);
  useEffect(() => {
    if (flowData) {
      lastUpdatedRef.current = new Date().toISOString();
    }
  }, [flowData]);

  // Sort from most positive to least positive (negative at bottom)
  const sortedData = flowData ? [...flowData].sort((a, b) => b.net - a.net) : [];
  const maxNet = sortedData.length > 0 ? Math.max(...sortedData.map(d => Math.abs(d.net))) : 1;

  if (isLoading) {
    return (
      <div className="net-flows-card">
        <div className="net-flows-header">
          <p className="widget-label">Net Flows</p>
        </div>
        <div className="net-flows-list">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`net-flows-card ${isExpanded ? 'expanded' : ''}`}>
      <div className="net-flows-header">
        <p className="widget-label">Net Flows</p>
        <div className="net-flows-toggles">
          <button
            className="expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand for screenshot'}
          >
            {isExpanded ? '⊖' : '⊕'}
          </button>
          {(['7d', '1m', '3m', '1y'] as TimePeriod[]).map((p) => (
            <button
              key={p}
              className={`net-flows-toggle ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className={`net-flows-list ${isExpanded ? 'expanded' : ''}`}>
        {sortedData.map((item) => {
          const isPositive = item.net >= 0;
          const barWidth = (Math.abs(item.net) / maxNet) * 50; // 50% max width each side
          const logoUrl = `https://icons.llamao.fi/icons/chains/rsz_${item.logo}.jpg`;

          return (
            <div key={item.chain} className="net-flow-row">
              <div className="net-flow-label">
                <img
                  src={logoUrl}
                  alt={item.chain}
                  className="net-flow-logo"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <span className="net-flow-name">{item.chain}</span>
              </div>

              <div className="net-flow-centered-bar">
                {/* Negative side (left) */}
                <div className="net-flow-bar-half left">
                  {!isPositive && (
                    <div
                      className="net-flow-bar negative"
                      style={{ width: `${barWidth * 2}%` }}
                    />
                  )}
                </div>
                {/* Center line */}
                <div className="net-flow-center-line" />
                {/* Positive side (right) */}
                <div className="net-flow-bar-half right">
                  {isPositive && (
                    <div
                      className="net-flow-bar positive"
                      style={{ width: `${barWidth * 2}%` }}
                    />
                  )}
                </div>
              </div>

              <div className={`net-flow-value ${isPositive ? 'positive' : 'negative'}`}>
                {isPositive ? '+' : ''}{formatCompactNumber(item.net, true)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="net-flows-footer">
        <span className="data-source-link">Bridge data from DeFiLlama</span>
      </div>
      {lastUpdatedRef.current && (
        <span className="last-updated">
          Updated {new Date(lastUpdatedRef.current).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
