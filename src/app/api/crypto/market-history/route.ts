import { NextResponse } from 'next/server';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

interface ChainMarketData {
  timestamp: number;
  total: number;
  BTC: number;
  ETH: number;
  SOL: number;
  BNB: number;
  XRP: number;
  Others: number;
}

interface MarketHistoryResponse {
  marketCap: ChainMarketData[];
  volume: ChainMarketData[];
  dominance: { timestamp: number; BTC: number; ETH: number; SOL: number; Others: number }[];
}

const COINS = [
  { id: 'bitcoin', symbol: 'BTC' },
  { id: 'ethereum', symbol: 'ETH' },
  { id: 'solana', symbol: 'SOL' },
  { id: 'binancecoin', symbol: 'BNB' },
  { id: 'ripple', symbol: 'XRP' },
];

let cache: { data: MarketHistoryResponse; days: string; timestamp: number } | null = null;
const CACHE_DURATION = 10 * 60 * 1000;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days') || '7';

    if (cache && cache.days === days && Date.now() - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json(cache.data);
    }

    // Fetch market chart data for each coin
    const coinDataPromises = COINS.map(coin =>
      fetch(`${COINGECKO_API}/coins/${coin.id}/market_chart?vs_currency=usd&days=${days}`)
        .then(res => res.ok ? res.json() : null)
        .catch(() => null)
    );

    const coinResults = await Promise.all(coinDataPromises);

    // Get global data for dominance
    let globalDom: Record<string, number> = { btc: 50, eth: 18, sol: 3, bnb: 3, xrp: 2 };
    try {
      const globalRes = await fetch(`${COINGECKO_API}/global`);
      if (globalRes.ok) {
        const globalData = await globalRes.json();
        globalDom = globalData.data?.market_cap_percentage || globalDom;
      }
    } catch {}

    // Process data into unified format
    const marketCapData: ChainMarketData[] = [];
    const volumeData: ChainMarketData[] = [];
    const dominanceData: { timestamp: number; BTC: number; ETH: number; SOL: number; Others: number }[] = [];

    // Use BTC as reference for timestamps
    const btcData = coinResults[0];
    if (btcData?.market_caps) {
      const timestamps = btcData.market_caps.map((d: [number, number]) => d[0]);

      timestamps.forEach((timestamp: number, i: number) => {
        const mcapEntry: ChainMarketData = { timestamp, total: 0, BTC: 0, ETH: 0, SOL: 0, BNB: 0, XRP: 0, Others: 0 };
        const volEntry: ChainMarketData = { timestamp, total: 0, BTC: 0, ETH: 0, SOL: 0, BNB: 0, XRP: 0, Others: 0 };

        COINS.forEach((coin, j) => {
          const data = coinResults[j];
          if (data) {
            const mcap = data.market_caps?.[i]?.[1] || 0;
            const vol = data.total_volumes?.[i]?.[1] || 0;
            mcapEntry[coin.symbol as keyof ChainMarketData] = mcap as never;
            volEntry[coin.symbol as keyof ChainMarketData] = vol as never;
            mcapEntry.total += mcap;
            volEntry.total += vol;
          }
        });

        // Estimate others from BTC dominance
        const btcDom = globalDom.btc || 50;
        const estimatedTotal = mcapEntry.BTC / (btcDom / 100);
        mcapEntry.Others = Math.max(0, estimatedTotal - mcapEntry.BTC - mcapEntry.ETH - mcapEntry.SOL - mcapEntry.BNB - mcapEntry.XRP);
        mcapEntry.total = estimatedTotal;

        marketCapData.push(mcapEntry);
        volumeData.push(volEntry);

        // Dominance data
        dominanceData.push({
          timestamp,
          BTC: mcapEntry.BTC / mcapEntry.total,
          ETH: mcapEntry.ETH / mcapEntry.total,
          SOL: mcapEntry.SOL / mcapEntry.total,
          Others: mcapEntry.Others / mcapEntry.total,
        });
      });
    }

    // Sample data to reduce size
    const sampleRate = days === '1' ? 1 : days === '7' ? 4 : days === '30' ? 12 : 24;
    const sample = <T,>(arr: T[]) => arr.filter((_, i) => i % sampleRate === 0 || i === arr.length - 1);

    const results: MarketHistoryResponse = {
      marketCap: sample(marketCapData),
      volume: sample(volumeData),
      dominance: sample(dominanceData),
    };

    cache = { data: results, days, timestamp: Date.now() };
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching market history:', error);
    if (cache) return NextResponse.json(cache.data);
    return NextResponse.json({ marketCap: [], volume: [], dominance: [] });
  }
}
