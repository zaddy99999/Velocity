import { NextResponse } from 'next/server';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

const MAJOR_COINS = [
  { id: 'bitcoin', symbol: 'BTC', color: '#F7931A' },
  { id: 'ethereum', symbol: 'ETH', color: '#627EEA' },
  { id: 'solana', symbol: 'SOL', color: '#00FFA3' },
  { id: 'binancecoin', symbol: 'BNB', color: '#F3BA2F' },
  { id: 'ripple', symbol: 'XRP', color: '#23292F' },
  { id: 'cardano', symbol: 'ADA', color: '#0033AD' },
  { id: 'dogecoin', symbol: 'DOGE', color: '#C2A633' },
  { id: 'avalanche-2', symbol: 'AVAX', color: '#E84142' },
  { id: 'polkadot', symbol: 'DOT', color: '#E6007A' },
  { id: 'chainlink', symbol: 'LINK', color: '#375BD2' },
  { id: 'matic-network', symbol: 'MATIC', color: '#8247E5' },
  { id: 'sui', symbol: 'SUI', color: '#6FBCF0' },
];

interface PricePoint {
  timestamp: number;
  price: number;
}

interface CoinHistory {
  id: string;
  symbol: string;
  color: string;
  prices: PricePoint[];
}

let cache: { data: CoinHistory[]; timestamp: number } | null = null;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days') || '7';

    const cacheKey = `${days}`;
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json(cache.data);
    }

    const results: CoinHistory[] = [];

    // Fetch price history for each coin
    for (const coin of MAJOR_COINS) {
      try {
        const res = await fetch(
          `${COINGECKO_API}/coins/${coin.id}/market_chart?vs_currency=usd&days=${days}`,
          { next: { revalidate: 600 } }
        );

        if (res.ok) {
          const data = await res.json();
          // Normalize prices to percentage change from start
          const prices = data.prices as [number, number][];
          if (prices && prices.length > 0) {
            const startPrice = prices[0][1];
            results.push({
              id: coin.id,
              symbol: coin.symbol,
              color: coin.color,
              prices: prices.map(([timestamp, price]) => ({
                timestamp,
                price: ((price - startPrice) / startPrice) * 100, // Convert to % change
              })),
            });
          }
        }
      } catch (e) {
        console.error(`Failed to fetch ${coin.id}:`, e);
      }

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 100));
    }

    cache = { data: results, timestamp: Date.now() };
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching price history:', error);
    if (cache) return NextResponse.json(cache.data);
    return NextResponse.json([]);
  }
}
