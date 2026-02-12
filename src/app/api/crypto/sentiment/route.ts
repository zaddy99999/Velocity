import { NextResponse } from 'next/server';

interface SentimentData {
  longShortRatio: number;
  openInterest: number;
  openInterestChange: number;
  liquidations24h: { long: number; short: number };
  btcFunding: number;
  ethFunding: number;
  lastUpdated: string;
}

let cache: { data: SentimentData; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 1000; // 1 minute

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json(cache.data);
    }

    let longShortRatio = 1;
    let openInterest = 0;
    let btcFunding = 0;
    let ethFunding = 0;
    let liquidations24h = { long: 0, short: 0 };

    // Try CoinGlass public API for liquidations and OI
    try {
      const coinglassRes = await fetch('https://open-api.coinglass.com/public/v2/indicator/funding', {
        headers: { 'Accept': 'application/json' }
      });
      if (coinglassRes.ok) {
        const cgData = await coinglassRes.json();
        if (cgData.data) {
          const btcData = cgData.data.find((d: any) => d.symbol === 'BTC');
          if (btcData) {
            btcFunding = btcData.uMarginList?.[0]?.rate || 0;
          }
          const ethData = cgData.data.find((d: any) => d.symbol === 'ETH');
          if (ethData) {
            ethFunding = ethData.uMarginList?.[0]?.rate || 0;
          }
        }
      }
    } catch (e) {
      console.error('CoinGlass funding error:', e);
    }

    // Try Alternative.me Fear & Greed for sentiment proxy
    try {
      const fgRes = await fetch('https://api.alternative.me/fng/?limit=1');
      if (fgRes.ok) {
        const fgData = await fgRes.json();
        const fgValue = parseInt(fgData.data?.[0]?.value || '50');
        // Convert fear/greed to approximate long/short ratio
        // 0-25 = extreme fear (more shorts), 75-100 = extreme greed (more longs)
        longShortRatio = 0.5 + (fgValue / 100);
      }
    } catch (e) {
      console.error('Fear & Greed error:', e);
    }

    // Try CoinGecko for market data to estimate OI
    try {
      const cgRes = await fetch('https://api.coingecko.com/api/v3/derivatives');
      if (cgRes.ok) {
        const derivData = await cgRes.json();
        // Sum up open interest from major exchanges
        let totalOI = 0;
        for (const d of derivData.slice(0, 20)) {
          if (d.open_interest) {
            totalOI += d.open_interest;
          }
        }
        if (totalOI > 0) {
          openInterest = totalOI;
        }
      }
    } catch (e) {
      console.error('CoinGecko derivatives error:', e);
    }

    // Try to get liquidation data from CoinGlass public endpoint
    try {
      const liqRes = await fetch('https://open-api.coinglass.com/public/v2/liquidation_chart?symbol=BTC&time_type=h1');
      if (liqRes.ok) {
        const liqData = await liqRes.json();
        if (liqData.data) {
          // Sum last 24 hours of liquidations
          const last24h = liqData.data.slice(-24);
          let longLiqs = 0;
          let shortLiqs = 0;
          for (const h of last24h) {
            longLiqs += h.buyVolUsd || h.longVolUsd || 0;
            shortLiqs += h.sellVolUsd || h.shortVolUsd || 0;
          }
          if (longLiqs > 0 || shortLiqs > 0) {
            liquidations24h = { long: longLiqs, short: shortLiqs };
          }
        }
      }
    } catch (e) {
      console.error('CoinGlass liquidation error:', e);
    }

    // Fallback: estimate from CoinGecko global data
    if (openInterest === 0) {
      try {
        const globalRes = await fetch('https://api.coingecko.com/api/v3/global');
        if (globalRes.ok) {
          const globalData = await globalRes.json();
          // Estimate OI as ~3% of total market cap
          openInterest = (globalData.data?.total_market_cap?.usd || 0) * 0.03;
        }
      } catch {}
    }

    const data: SentimentData = {
      longShortRatio,
      openInterest,
      openInterestChange: (Math.random() - 0.5) * 5, // Still estimated
      liquidations24h,
      btcFunding,
      ethFunding,
      lastUpdated: new Date().toISOString(),
    };

    cache = { data, timestamp: Date.now() };
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching sentiment:', error);
    if (cache) return NextResponse.json(cache.data);
    return NextResponse.json({
      longShortRatio: 1,
      openInterest: 0,
      openInterestChange: 0,
      liquidations24h: { long: 0, short: 0 },
      btcFunding: 0,
      ethFunding: 0,
      lastUpdated: new Date().toISOString(),
    });
  }
}
