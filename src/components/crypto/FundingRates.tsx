'use client';

import useSWR from 'swr';

interface FundingRate {
  symbol: string;
  rate: number;
  predictedRate: number;
  exchange: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function FundingRates() {
  const { data: rates, isLoading } = useSWR<FundingRate[]>(
    '/api/crypto/funding',
    fetcher,
    { refreshInterval: 60000 }
  );

  if (isLoading) {
    return (
      <div className="widget-card">
        <p className="widget-label">📈 Funding Rates</p>
        <div className="funding-list">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  if (!rates || rates.length === 0) {
    return (
      <div className="widget-card">
        <p className="widget-label">📈 Funding Rates</p>
        <p className="widget-empty">No funding data</p>
      </div>
    );
  }

  // Determine market sentiment
  const avgRate = rates.reduce((sum, r) => sum + r.rate, 0) / rates.length;
  const sentiment = avgRate > 0.01 ? 'Overleveraged Long' : avgRate < -0.01 ? 'Overleveraged Short' : 'Neutral';
  const sentimentColor = avgRate > 0.01 ? '#ef4444' : avgRate < -0.01 ? '#22c55e' : '#888';

  return (
    <div className="widget-card">
      <div className="funding-header">
        <p className="widget-label">📈 Funding Rates</p>
        <span className="funding-sentiment" style={{ color: sentimentColor }}>
          {sentiment}
        </span>
      </div>
      <div className="funding-list">
        {rates.slice(0, 8).map((rate) => (
          <div key={rate.symbol} className="funding-item">
            <span className="funding-symbol">{rate.symbol}</span>
            <div className="funding-bar-container">
              <div
                className="funding-bar"
                style={{
                  width: `${Math.min(Math.abs(rate.rate) * 500, 100)}%`,
                  background: rate.rate >= 0
                    ? 'linear-gradient(90deg, rgba(34,197,94,0.3), rgba(34,197,94,0.8))'
                    : 'linear-gradient(90deg, rgba(239,68,68,0.8), rgba(239,68,68,0.3))',
                  marginLeft: rate.rate < 0 ? 'auto' : 0,
                }}
              />
            </div>
            <span className={`funding-rate ${rate.rate >= 0 ? 'positive' : 'negative'}`}>
              {rate.rate >= 0 ? '+' : ''}{rate.rate.toFixed(4)}%
            </span>
          </div>
        ))}
      </div>
      <p className="funding-note">Positive = longs pay shorts</p>
    </div>
  );
}
