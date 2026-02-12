import { NextResponse } from 'next/server';

const DEFILLAMA_API = 'https://api.llama.fi';

let cache: { data: unknown; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json(cache.data);
    }

    const response = await fetch(`${DEFILLAMA_API}/protocols`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`DeFi Llama API error: ${response.status}`);
    }

    const protocols = await response.json();

    // Sort by TVL and take top 20
    const topProtocols = protocols
      .filter((p: { tvl: number }) => p.tvl && p.tvl > 0)
      .sort((a: { tvl: number }, b: { tvl: number }) => b.tvl - a.tvl)
      .slice(0, 20)
      .map((p: {
        id: string;
        name: string;
        symbol: string;
        tvl: number;
        change_1d: number;
        change_7d: number;
        logo: string;
        category: string
      }) => ({
        id: p.id,
        name: p.name,
        symbol: p.symbol,
        tvl: p.tvl,
        change_1d: p.change_1d,
        change_7d: p.change_7d,
        logo: p.logo,
        category: p.category,
      }));

    cache = { data: topProtocols, timestamp: Date.now() };
    return NextResponse.json(topProtocols);
  } catch (error) {
    console.error('Error fetching TVL data:', error);
    if (cache) {
      return NextResponse.json(cache.data);
    }
    return NextResponse.json({ error: 'Failed to fetch TVL data' }, { status: 500 });
  }
}
