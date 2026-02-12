'use client';

import useSWR from 'swr';
import { formatCompactNumber } from '@/lib/crypto/formatters';

interface Sector {
  id: string;
  name: string;
  marketCap: number;
  change24h: number;
  volume24h: number;
  topCoins: string[];
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

function getHeatmapColor(change: number): string {
  // Clamp change between -10 and +10 for color intensity
  const clamped = Math.max(-10, Math.min(10, change));
  const intensity = Math.abs(clamped) / 10;

  if (change >= 0) {
    // Green gradient
    const r = Math.round(34 - intensity * 20);
    const g = Math.round(197 - intensity * 50);
    const b = Math.round(94 - intensity * 50);
    return `rgba(${r}, ${g}, ${b}, ${0.3 + intensity * 0.5})`;
  } else {
    // Red gradient
    const r = Math.round(239);
    const g = Math.round(68 - intensity * 30);
    const b = Math.round(68 - intensity * 30);
    return `rgba(${r}, ${g}, ${b}, ${0.3 + intensity * 0.5})`;
  }
}

export default function SectorPerformance() {
  const { data: sectors, isLoading } = useSWR<Sector[]>('/api/crypto/sectors', fetcher, {
    refreshInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="widget-card">
        <p className="widget-label">📊 Sectors</p>
        <div className="sector-heatmap loading">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="skeleton sector-tile-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (!sectors || sectors.length === 0) {
    return (
      <div className="widget-card">
        <p className="widget-label">📊 Sectors</p>
        <p className="widget-empty">No sector data</p>
      </div>
    );
  }

  // Sort by market cap for sizing
  const sorted = [...sectors].sort((a, b) => b.marketCap - a.marketCap);

  return (
    <div className="widget-card">
      <p className="widget-label">📊 Sectors</p>
      <div className="sector-heatmap">
        {sorted.slice(0, 12).map((sector, idx) => (
          <div
            key={sector.id}
            className={`sector-tile ${idx < 4 ? 'large' : ''}`}
            style={{ background: getHeatmapColor(sector.change24h) }}
          >
            <span className="sector-tile-name">{sector.name}</span>
            <span className={`sector-tile-change ${sector.change24h >= 0 ? 'positive' : 'negative'}`}>
              {sector.change24h >= 0 ? '+' : ''}{sector.change24h.toFixed(1)}%
            </span>
            <span className="sector-tile-mcap">${formatCompactNumber(sector.marketCap)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
