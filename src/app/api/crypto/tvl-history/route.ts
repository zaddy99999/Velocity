import { NextResponse } from 'next/server';

const DEFILLAMA_API = 'https://api.llama.fi';

interface TVLPoint {
  timestamp: number;
  tvl: number;
}

let cache: { data: TVLPoint[]; days: string; timestamp: number } | null = null;
const CACHE_DURATION = 10 * 60 * 1000;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days') || '7';

    if (cache && cache.days === days && Date.now() - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json(cache.data);
    }

    // Fetch historical TVL from DeFiLlama
    const response = await fetch(`${DEFILLAMA_API}/v2/historicalChainTvl`);

    if (!response.ok) {
      throw new Error(`DeFiLlama API error: ${response.status}`);
    }

    const data = await response.json();

    // Filter to requested time range
    const now = Date.now();
    const daysMs = parseInt(days) * 24 * 60 * 60 * 1000;
    const startTime = now - daysMs;

    const results: TVLPoint[] = data
      .filter((point: { date: number }) => point.date * 1000 >= startTime)
      .map((point: { date: number; tvl: number }) => ({
        timestamp: point.date * 1000,
        tvl: point.tvl,
      }));

    // Sample data based on period
    const sampleRate = days === '1' ? 1 : days === '7' ? 1 : days === '30' ? 2 : 4;
    const sampledResults = results.filter((_: TVLPoint, i: number) => i % sampleRate === 0 || i === results.length - 1);

    cache = { data: sampledResults, days, timestamp: Date.now() };
    return NextResponse.json(sampledResults);
  } catch (error) {
    console.error('Error fetching TVL history:', error);
    if (cache) return NextResponse.json(cache.data);
    return NextResponse.json([]);
  }
}
