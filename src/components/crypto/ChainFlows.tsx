'use client';

import { useState } from 'react';
import { formatCompactNumber } from '@/lib/crypto/formatters';
import type { ChainData } from '@/lib/crypto/types';

interface ChainFlowsProps {
  chains: ChainData[];
  isLoading?: boolean;
}

// Special case mappings for chain names that don't match the icon URL pattern
const chainLogoOverrides: Record<string, string> = {
  bsc: 'binance',
  'zksync era': 'zksync-era',
  'polygon zkevm': 'polygon-zkevm',
  'arbitrum one': 'arbitrum',
  'op mainnet': 'optimism',
  'bnb smart chain': 'binance',
};

// Generate logo URL from chain name
const getChainLogoUrl = (chainName: string, chainId: string): string => {
  const name = chainName.toLowerCase();
  const override = chainLogoOverrides[name];
  const logoName = override || name.replace(/\s+/g, '-');
  return `https://icons.llamao.fi/icons/chains/rsz_${logoName}.jpg`;
};

export default function ChainFlows({ chains, isLoading }: ChainFlowsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const allChains = chains.slice(0, 75);
  const topChains = showAll ? allChains : allChains.slice(0, 10);

  // Calculate total TVL for percentage
  const totalTVL = topChains.reduce((sum, chain) => sum + chain.tvl, 0);

  if (isLoading) {
    return (
      <div className="chain-flows-card loading">
        <div className="skeleton skeleton-label" />
        <div className="chain-flows-list">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`chain-flows-card ${isExpanded ? 'expanded' : ''}`}>
      <div className="chain-flows-header">
        <p className="widget-label">Chain TVL ({topChains.length})</p>
        <button
          className="expand-btn"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? 'Collapse' : 'Expand for screenshot'}
        >
          {isExpanded ? '⊖' : '⊕'}
        </button>
      </div>

      <div className={`chain-flows-list scrollable ${isExpanded ? 'expanded' : ''}`}>
        {topChains.map((chain, index) => {
          const percentage = (chain.tvl / totalTVL) * 100;
          const logoUrl = getChainLogoUrl(chain.name, chain.id);

          return (
            <div key={chain.id} className="chain-flow-item">
              <span className="chain-rank">{index + 1}</span>
              <img
                src={logoUrl}
                alt={chain.name}
                className="chain-logo"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="chain-logo-placeholder hidden">
                {chain.name.charAt(0)}
              </div>
              <div className="chain-info">
                <p className="chain-name">{chain.name}</p>
                <div className="chain-bar-container">
                  <div
                    className="chain-bar"
                    style={{ width: `${Math.min(percentage * 1.5, 100)}%` }}
                  />
                </div>
              </div>
              <div className="chain-stats">
                <p className="chain-tvl">{formatCompactNumber(chain.tvl, true)}</p>
                <p className="chain-percent">{percentage.toFixed(1)}%</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="chain-footer">
        {allChains.length > 10 && (
          <button
            className="show-more-btn"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show Less' : `Show All ${allChains.length}`}
          </button>
        )}
        <a
          href="https://defillama.com/chains"
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
