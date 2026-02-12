'use client';

import { formatCompactNumber, formatPercentage } from '@/lib/crypto/formatters';
import type { DeFiProtocol } from '@/lib/crypto/types';

interface TVLLeaderboardProps {
  protocols: DeFiProtocol[];
  isLoading?: boolean;
}

export default function TVLLeaderboard({ protocols, isLoading }: TVLLeaderboardProps) {
  const topProtocols = protocols.slice(0, 15);

  if (isLoading) {
    return (
      <div className="tvl-card loading">
        <div className="skeleton skeleton-label" />
        <div className="tvl-list">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="tvl-card">
      <p className="widget-label">TVL Leaderboard</p>

      <div className="tvl-list">
        {topProtocols.map((protocol, index) => (
          <div key={protocol.id} className="tvl-item">
            <span className="tvl-rank">{index + 1}</span>
            {protocol.logo ? (
              <img src={protocol.logo} alt={protocol.name} className="tvl-logo" />
            ) : (
              <div className="tvl-logo-placeholder">
                {protocol.name.charAt(0)}
              </div>
            )}
            <div className="tvl-info">
              <p className="tvl-name">{protocol.name}</p>
              {protocol.category && (
                <p className="tvl-category">{protocol.category}</p>
              )}
            </div>
            <div className="tvl-stats">
              <p className="tvl-value">{formatCompactNumber(protocol.tvl, true)}</p>
              {protocol.change_1d !== undefined && (
                <p className={`tvl-change ${protocol.change_1d >= 0 ? 'positive' : 'negative'}`}>
                  {formatPercentage(protocol.change_1d)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="tvl-footer">
        <a
          href="https://defillama.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="data-source-link"
        >
          Data from DeFiLlama
        </a>
      </div>
    </div>
  );
}
