import { NextResponse } from 'next/server';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

interface CoinGeckoCategory {
  id: string;
  name: string;
  market_cap: number;
  market_cap_change_24h: number;
  volume_24h: number;
  top_3_coins: string[];
}

// Priority sectors with clean display names
const prioritySectors: Record<string, string> = {
  'layer-1': 'Layer 1',
  'layer-2': 'Layer 2',
  'decentralized-finance-defi': 'DeFi',
  'meme-token': 'Memecoins',
  'stablecoins': 'Stablecoins',
  'non-fungible-tokens-nft': 'NFTs',
  'gaming': 'Gaming',
  'artificial-intelligence': 'AI',
  'real-world-assets-rwa': 'RWA',
  'decentralized-exchange': 'DEX',
  'lending-borrowing': 'Lending',
  'liquid-staking-tokens': 'Liquid Staking',
  'oracle': 'Oracles',
  'privacy-coins': 'Privacy',
  'infrastructure': 'Infrastructure',
  'storage': 'Storage',
  'bridge': 'Bridges',
  'governance': 'Governance',
  'metaverse': 'Metaverse',
  'yield-farming': 'Yield',
};

let cache: { data: unknown; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json(cache.data);
    }

    const response = await fetch(
      `${COINGECKO_API}/coins/categories?order=market_cap_desc`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const categories: CoinGeckoCategory[] = await response.json();

    // Filter to priority sectors and map to clean names
    const priorityIds = Object.keys(prioritySectors);
    const filteredCategories = categories.filter(cat =>
      priorityIds.includes(cat.id) && cat.market_cap && cat.market_cap > 0
    );

    // Sort by market cap and take top 15
    const sectors = filteredCategories
      .sort((a, b) => b.market_cap - a.market_cap)
      .slice(0, 15)
      .map(cat => ({
        id: cat.id,
        name: prioritySectors[cat.id] || cat.name,
        marketCap: cat.market_cap,
        change24h: cat.market_cap_change_24h || 0,
        volume24h: cat.volume_24h || 0,
        topCoins: cat.top_3_coins || [],
      }));

    cache = { data: sectors, timestamp: Date.now() };

    return NextResponse.json(sectors);
  } catch (error) {
    console.error('Error fetching sectors:', error);

    // Return cached data if available, even if stale
    if (cache) {
      return NextResponse.json(cache.data);
    }

    return NextResponse.json({ error: 'Failed to fetch sectors' }, { status: 500 });
  }
}
