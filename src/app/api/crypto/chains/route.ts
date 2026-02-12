import { NextResponse } from 'next/server';

const DEFILLAMA_API = 'https://api.llama.fi';

let cache: { data: unknown; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json(cache.data);
    }

    const response = await fetch(`${DEFILLAMA_API}/v2/chains`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`DeFi Llama API error: ${response.status}`);
    }

    const chains = await response.json();

    // Sort by TVL and take top 15
    const topChains = chains
      .filter((c: { tvl: number }) => c.tvl && c.tvl > 0)
      .sort((a: { tvl: number }, b: { tvl: number }) => b.tvl - a.tvl)
      .slice(0, 75)
      .map((c: {
        gecko_id: string;
        name: string;
        tvl: number;
        tokenSymbol: string;
        chainId: number;
      }) => ({
        id: c.gecko_id || c.name.toLowerCase(),
        name: c.name,
        tvl: c.tvl,
        symbol: c.tokenSymbol || '',
        chainId: c.chainId,
      }));

    cache = { data: topChains, timestamp: Date.now() };
    return NextResponse.json(topChains);
  } catch (error) {
    console.error('Error fetching chain data:', error);
    if (cache) {
      return NextResponse.json(cache.data);
    }
    return NextResponse.json({ error: 'Failed to fetch chain data' }, { status: 500 });
  }
}
