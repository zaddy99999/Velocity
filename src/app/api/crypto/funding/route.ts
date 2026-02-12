import { NextResponse } from 'next/server';

interface FundingRate {
  symbol: string;
  rate: number;
  predictedRate: number;
  exchange: string;
}

let cache: { data: FundingRate[]; timestamp: number } | null = null;
const CACHE_DURATION = 2 * 60 * 1000;

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json(cache.data);
    }

    // Fetch from Binance Futures API (free, no key needed)
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT'];

    const fundingPromises = symbols.map(async (symbol) => {
      try {
        const res = await fetch(`https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=1`);
        if (!res.ok) return null;
        const data = await res.json();
        if (!data[0]) return null;

        // Also get mark price for predicted rate
        const markRes = await fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`);
        const markData = markRes.ok ? await markRes.json() : null;

        return {
          symbol: symbol.replace('USDT', ''),
          rate: parseFloat(data[0].fundingRate) * 100,
          predictedRate: markData ? parseFloat(markData.lastFundingRate) * 100 : 0,
          exchange: 'Binance',
        };
      } catch {
        return null;
      }
    });

    const results = await Promise.all(fundingPromises);
    const rates = results.filter((r): r is FundingRate => r !== null);

    // Sort by absolute rate (most extreme first)
    rates.sort((a, b) => Math.abs(b.rate) - Math.abs(a.rate));

    cache = { data: rates, timestamp: Date.now() };
    return NextResponse.json(rates);

  } catch (error) {
    console.error('Error fetching funding rates:', error);
    if (cache) return NextResponse.json(cache.data);
    return NextResponse.json([]);
  }
}
