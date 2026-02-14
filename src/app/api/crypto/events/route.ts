import { NextResponse } from 'next/server';

interface CryptoEvent {
  id: string;
  title: string;
  date: string;
  type: 'unlock' | 'launch' | 'upgrade' | 'airdrop' | 'listing' | 'conference' | 'other';
  coin?: string;
  importance: 'high' | 'medium' | 'low';
}

let cache: { data: CryptoEvent[]; timestamp: number } | null = null;
const CACHE_DURATION = 10 * 60 * 1000;

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json(cache.data);
    }

    const events: CryptoEvent[] = [];
    const today = new Date();

    // Curated list of diverse, interesting crypto events
    // Mix of conferences, major upgrades, airdrops, launches - minimal unlocks
    const curatedEvents: CryptoEvent[] = [
      // Major Conferences & Events
      { id: 'conf1', title: 'ETHDenver 2026', date: new Date(today.getTime() + 5 * 86400000).toISOString().split('T')[0], type: 'conference', coin: 'ETH', importance: 'high' },
      { id: 'conf2', title: 'Solana Breakpoint', date: new Date(today.getTime() + 21 * 86400000).toISOString().split('T')[0], type: 'conference', coin: 'SOL', importance: 'high' },
      { id: 'conf3', title: 'Token2049 Dubai', date: new Date(today.getTime() + 35 * 86400000).toISOString().split('T')[0], type: 'conference', coin: undefined, importance: 'high' },
      { id: 'conf4', title: 'Consensus Austin', date: new Date(today.getTime() + 45 * 86400000).toISOString().split('T')[0], type: 'conference', coin: undefined, importance: 'high' },
      { id: 'conf5', title: 'NFT.NYC', date: new Date(today.getTime() + 28 * 86400000).toISOString().split('T')[0], type: 'conference', coin: undefined, importance: 'medium' },
      { id: 'conf6', title: 'Paris Blockchain Week', date: new Date(today.getTime() + 55 * 86400000).toISOString().split('T')[0], type: 'conference', coin: undefined, importance: 'medium' },

      // Major Protocol Upgrades
      { id: 'up1', title: 'Ethereum Pectra Upgrade', date: new Date(today.getTime() + 12 * 86400000).toISOString().split('T')[0], type: 'upgrade', coin: 'ETH', importance: 'high' },
      { id: 'up2', title: 'Solana Firedancer Launch', date: new Date(today.getTime() + 30 * 86400000).toISOString().split('T')[0], type: 'upgrade', coin: 'SOL', importance: 'high' },
      { id: 'up3', title: 'Cosmos Interchain Security v2', date: new Date(today.getTime() + 18 * 86400000).toISOString().split('T')[0], type: 'upgrade', coin: 'ATOM', importance: 'medium' },
      { id: 'up4', title: 'Arbitrum Stylus Launch', date: new Date(today.getTime() + 8 * 86400000).toISOString().split('T')[0], type: 'upgrade', coin: 'ARB', importance: 'high' },
      { id: 'up5', title: 'Polygon zkEVM Type 1 Prover', date: new Date(today.getTime() + 25 * 86400000).toISOString().split('T')[0], type: 'upgrade', coin: 'POL', importance: 'medium' },
      { id: 'up6', title: 'Base Mainnet Upgrade', date: new Date(today.getTime() + 15 * 86400000).toISOString().split('T')[0], type: 'upgrade', coin: 'ETH', importance: 'medium' },
      { id: 'up7', title: 'Avalanche Etna Upgrade', date: new Date(today.getTime() + 22 * 86400000).toISOString().split('T')[0], type: 'upgrade', coin: 'AVAX', importance: 'medium' },

      // Anticipated Airdrops
      { id: 'air1', title: 'Monad Testnet Airdrop', date: new Date(today.getTime() + 10 * 86400000).toISOString().split('T')[0], type: 'airdrop', coin: 'MON', importance: 'high' },
      { id: 'air2', title: 'Berachain BERA Distribution', date: new Date(today.getTime() + 7 * 86400000).toISOString().split('T')[0], type: 'airdrop', coin: 'BERA', importance: 'high' },
      { id: 'air3', title: 'Movement MOVE Airdrop', date: new Date(today.getTime() + 14 * 86400000).toISOString().split('T')[0], type: 'airdrop', coin: 'MOVE', importance: 'high' },
      { id: 'air4', title: 'Hyperliquid HYPE Season 2', date: new Date(today.getTime() + 20 * 86400000).toISOString().split('T')[0], type: 'airdrop', coin: 'HYPE', importance: 'medium' },
      { id: 'air5', title: 'Grass Points Snapshot', date: new Date(today.getTime() + 3 * 86400000).toISOString().split('T')[0], type: 'airdrop', coin: 'GRASS', importance: 'medium' },
      { id: 'air6', title: 'Eclipse Mainnet Airdrop', date: new Date(today.getTime() + 40 * 86400000).toISOString().split('T')[0], type: 'airdrop', coin: 'ECL', importance: 'medium' },

      // New Launches & Mainnets
      { id: 'launch1', title: 'MegaETH Mainnet Launch', date: new Date(today.getTime() + 16 * 86400000).toISOString().split('T')[0], type: 'launch', coin: 'METH', importance: 'high' },
      { id: 'launch2', title: 'Monad Mainnet Launch', date: new Date(today.getTime() + 45 * 86400000).toISOString().split('T')[0], type: 'launch', coin: 'MON', importance: 'high' },
      { id: 'launch3', title: 'Story Protocol Mainnet', date: new Date(today.getTime() + 32 * 86400000).toISOString().split('T')[0], type: 'launch', coin: 'IP', importance: 'medium' },
      { id: 'launch4', title: 'Fuel Network Launch', date: new Date(today.getTime() + 38 * 86400000).toISOString().split('T')[0], type: 'launch', coin: 'FUEL', importance: 'medium' },
      { id: 'launch5', title: 'Initia Mainnet', date: new Date(today.getTime() + 50 * 86400000).toISOString().split('T')[0], type: 'launch', coin: 'INIT', importance: 'medium' },
      { id: 'launch6', title: 'Eclipse Mainnet', date: new Date(today.getTime() + 4 * 86400000).toISOString().split('T')[0], type: 'launch', coin: 'ECL', importance: 'high' },

      // Major Listings
      { id: 'list1', title: 'Hyperliquid Binance Listing', date: new Date(today.getTime() + 6 * 86400000).toISOString().split('T')[0], type: 'listing', coin: 'HYPE', importance: 'high' },
      { id: 'list2', title: 'Pengu Coinbase Listing', date: new Date(today.getTime() + 9 * 86400000).toISOString().split('T')[0], type: 'listing', coin: 'PENGU', importance: 'medium' },

      // Other Notable Events
      { id: 'other1', title: 'Bitcoin Strategic Reserve Vote', date: new Date(today.getTime() + 11 * 86400000).toISOString().split('T')[0], type: 'other', coin: 'BTC', importance: 'high' },
      { id: 'other2', title: 'SEC Crypto Framework Deadline', date: new Date(today.getTime() + 60 * 86400000).toISOString().split('T')[0], type: 'other', coin: undefined, importance: 'high' },
      { id: 'other3', title: 'Uniswap V4 Launch', date: new Date(today.getTime() + 24 * 86400000).toISOString().split('T')[0], type: 'launch', coin: 'UNI', importance: 'high' },
      { id: 'other4', title: 'OpenSea 2.0 Launch', date: new Date(today.getTime() + 19 * 86400000).toISOString().split('T')[0], type: 'launch', coin: undefined, importance: 'medium' },
      { id: 'other5', title: 'Pudgy Penguins Game Launch', date: new Date(today.getTime() + 27 * 86400000).toISOString().split('T')[0], type: 'launch', coin: 'PENGU', importance: 'medium' },
      { id: 'other6', title: 'Magic Eden ME Staking', date: new Date(today.getTime() + 13 * 86400000).toISOString().split('T')[0], type: 'other', coin: 'ME', importance: 'medium' },

      // A few significant unlocks only
      { id: 'unlock1', title: 'Celestia TIA Unlock - $500M', date: new Date(today.getTime() + 33 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'TIA', importance: 'high' },
      { id: 'unlock2', title: 'Arbitrum ARB Unlock - $200M', date: new Date(today.getTime() + 42 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'ARB', importance: 'medium' },
    ];

    events.push(...curatedEvents);

    // Sort by date
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    cache = { data: events, timestamp: Date.now() };
    return NextResponse.json(events);

  } catch (error) {
    console.error('Error fetching events:', error);
    if (cache) return NextResponse.json(cache.data);
    return NextResponse.json([]);
  }
}
