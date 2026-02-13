'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import NavBar from '@/components/NavBar';
import { GlobalMetrics, FearGreedIndex, TopMovers, CoinRankings, ChainFlows, VCFunding, NetFlows, NFTLeaderboard, SectorPerformance, WhaleAlerts, UpcomingEvents, PriceChart } from '@/components/crypto';
import { useCryptoPrices, useGlobalMetrics, useNews, useChains } from '@/lib/crypto/hooks';

// Dynamically import DraggableDashboard to avoid SSR issues with dnd-kit
const DraggableDashboard = dynamic(() => import('@/components/DraggableDashboard'), { ssr: false });

// Dynamically import MindshareBubbles separately as it might have issues
const MindshareBubbles = dynamic(() => import('@/components/crypto/MindshareBubbles').then(mod => ({ default: mod.default })), { ssr: false });

export default function MarketAnalysisPage() {
  const { prices, isLoading: pricesLoading, lastUpdated: pricesUpdated } = useCryptoPrices();
  const { global, fearGreed, gas, isLoading: globalLoading, lastUpdated: globalUpdated } = useGlobalMetrics();
  const { news, isLoading: newsLoading } = useNews();
  const { chains, isLoading: chainsLoading } = useChains();

  const modules = useMemo(() => [
    { id: 'price-chart', component: <div className="full-width-module"><PriceChart /></div> },
    { id: 'top-movers', component: <TopMovers coins={prices} isLoading={pricesLoading} lastUpdated={pricesUpdated} /> },
    { id: 'sector-performance', component: <SectorPerformance /> },
    { id: 'nft-leaderboard', component: <NFTLeaderboard /> },
    { id: 'mindshare', component: <MindshareBubbles coins={prices} news={news} isLoading={pricesLoading || newsLoading} /> },
    { id: 'coin-rankings', component: <CoinRankings coins={prices} isLoading={pricesLoading} lastUpdated={pricesUpdated} /> },
    { id: 'whale-alerts', component: <WhaleAlerts /> },
    { id: 'upcoming-events', component: <UpcomingEvents /> },
    { id: 'chain-tvl', component: <ChainFlows chains={chains} isLoading={chainsLoading} /> },
    { id: 'net-flows', component: <NetFlows /> },
    { id: 'vc-funding', component: <VCFunding /> },
  ], [prices, pricesLoading, pricesUpdated, news, newsLoading, chains, chainsLoading]);

  return (
    <main className="container">
      {/* Banner Header */}
      <div className="banner-header">
        <div className="banner-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/ZaddyPFP.png" alt="Logo" style={{ width: 56, height: 56, borderRadius: '10px', border: '2px solid rgba(46, 219, 132, 0.3)' }} />
            <div>
              <h1 style={{ marginBottom: 0 }}>ZaddyTools</h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>Market Analysis</p>
            </div>
          </div>
          <NavBar />
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="crypto-dashboard">
        {/* Top row - key metrics side by side */}
        <div className="dashboard-top-section">
          <GlobalMetrics data={global} gas={gas} isLoading={globalLoading} lastUpdated={globalUpdated} />
          <FearGreedIndex data={fearGreed} isLoading={globalLoading} />
        </div>

        {/* Draggable modules */}
        <DraggableDashboard modules={modules} storageKey="zaddytools-market-analysis-order" />
      </div>
    </main>
  );
}
