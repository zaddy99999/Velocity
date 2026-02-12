import { NextResponse } from 'next/server';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const FEAR_GREED_API = 'https://api.alternative.me/fng/';

let cache: { data: unknown; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 1000; // 60 seconds

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json(cache.data);
    }

    // Fetch global metrics, fear/greed, and gas in parallel
    const [globalResponse, fearGreedResponse, gasResponse] = await Promise.all([
      fetch(`${COINGECKO_API}/global`, {
        next: { revalidate: 60 },
        headers: { 'Accept': 'application/json' }
      }),
      fetch(`${FEAR_GREED_API}?limit=31`, {
        next: { revalidate: 300 }
      }),
      fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle', {
        next: { revalidate: 30 }
      }),
    ]);

    if (!globalResponse.ok) {
      throw new Error(`CoinGecko API error: ${globalResponse.status}`);
    }

    const globalData = await globalResponse.json();

    // Default fear/greed data with history
    let fearGreedData = {
      value: '50',
      value_classification: 'Neutral',
      yesterday: '50',
      lastWeek: '50',
      lastMonth: '50',
    };

    if (fearGreedResponse.ok) {
      const fgData = await fearGreedResponse.json();
      if (fgData.data?.length > 0) {
        fearGreedData = {
          value: fgData.data[0].value,
          value_classification: fgData.data[0].value_classification,
          yesterday: fgData.data[1]?.value || fgData.data[0].value,
          lastWeek: fgData.data[7]?.value || fgData.data[0].value,
          lastMonth: fgData.data[30]?.value || fgData.data[0].value,
        };
      }
    }

    // Gas data
    let gasData = { low: 0, average: 0, fast: 0 };
    if (gasResponse.ok) {
      const gData = await gasResponse.json();
      if (gData.result) {
        gasData = {
          low: parseInt(gData.result.SafeGasPrice) || 0,
          average: parseInt(gData.result.ProposeGasPrice) || 0,
          fast: parseInt(gData.result.FastGasPrice) || 0,
        };
      }
    }

    const data = {
      global: globalData.data,
      fearGreed: fearGreedData,
      gas: gasData,
    };

    cache = { data, timestamp: Date.now() };
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching global data:', error);

    if (cache) {
      return NextResponse.json(cache.data);
    }

    return NextResponse.json({ error: 'Failed to fetch global data' }, { status: 500 });
  }
}
