'use client';

import { formatCompactNumber } from '@/lib/crypto/formatters';

interface FundingData {
  name: string;
  symbol: string;
  funding: number;
  logo: string;
}

const fundingData: FundingData[] = [
  { name: 'Polygon', symbol: 'MATIC', funding: 450000000, logo: 'polygon' },
  { name: 'Sui', symbol: 'SUI', funding: 405000000, logo: 'sui' },
  { name: 'Aptos', symbol: 'APT', funding: 350000000, logo: 'aptos' },
  { name: 'Solana', symbol: 'SOL', funding: 314000000, logo: 'solana' },
  { name: 'Monad', symbol: 'MONAD', funding: 244000000, logo: 'monad' },
  { name: 'Berachain', symbol: 'BERA', funding: 211000000, logo: 'berachain' },
  { name: 'Starknet', symbol: 'STRK', funding: 282000000, logo: 'starknet' },
  { name: 'Arbitrum', symbol: 'ARB', funding: 123000000, logo: 'arbitrum' },
  { name: 'Sei', symbol: 'SEI', funding: 85000000, logo: 'sei' },
  { name: 'Tron', symbol: 'TRX', funding: 70000000, logo: 'tron' },
  { name: 'Cardano', symbol: 'ADA', funding: 62000000, logo: 'cardano' },
  { name: 'Avalanche', symbol: 'AVAX', funding: 60000000, logo: 'avalanche' },
  { name: 'Ethereum', symbol: 'ETH', funding: 18000000, logo: 'ethereum' },
  { name: 'Optimism', symbol: 'OP', funding: 178000000, logo: 'optimism' },
  { name: 'Abstract', symbol: 'ABS', funding: 11000000, logo: 'abstract' },
];

// Sort by funding amount
const sortedData = [...fundingData].sort((a, b) => b.funding - a.funding);
const maxFunding = sortedData[0]?.funding || 1;

export default function VCFunding() {
  return (
    <div className="vc-funding-card">
      <p className="widget-label">VC Funding Raised</p>

      <div className="vc-vertical-chart">
        {sortedData.map((item) => {
          const barHeight = (item.funding / maxFunding) * 100;
          const logoUrl = `https://icons.llamao.fi/icons/chains/rsz_${item.logo}.jpg`;

          return (
            <div key={item.name} className="vc-vertical-bar-container">
              <span className="vc-vertical-value">{formatCompactNumber(item.funding, true)}</span>
              <div className="vc-vertical-track">
                <div
                  className="vc-vertical-fill"
                  style={{ height: `${barHeight}%` }}
                />
              </div>
              <div className="vc-vertical-logo-wrapper">
                <img
                  src={logoUrl}
                  alt={item.name}
                  className="vc-vertical-logo"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    (target.nextElementSibling as HTMLElement)?.classList.remove('hidden');
                  }}
                />
                <div className="vc-vertical-logo-placeholder hidden">
                  {item.symbol.charAt(0)}
                </div>
              </div>
              <span className="vc-vertical-name">{item.symbol}</span>
            </div>
          );
        })}
      </div>

      <div className="vc-footer">
        <span className="data-source-link">Funding data from public sources</span>
      </div>
    </div>
  );
}
