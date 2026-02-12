import { NextResponse } from 'next/server';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

let cache: { data: unknown; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 1000; // 60 seconds

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json(cache.data);
    }

    // Fetch top 100 coins with sparklines and multiple time periods
    const response = await fetch(
      `${COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=true&price_change_percentage=1h,24h,7d,14d,30d`,
      {
        next: { revalidate: 60 },
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    cache = { data, timestamp: Date.now() };

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching prices:', error);

    // Return cached data if available, even if stale
    if (cache) {
      return NextResponse.json(cache.data);
    }

    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}
