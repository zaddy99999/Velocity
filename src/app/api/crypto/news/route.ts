import { NextResponse } from 'next/server';

interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: { title: string };
  published_at: string;
  currencies?: Array<{ code: string; title: string }>;
  category?: string;
}

// Category detection keywords
const categoryKeywords: Record<string, string[]> = {
  'DeFi': ['defi', 'lending', 'yield', 'liquidity', 'swap', 'dex', 'aave', 'uniswap', 'compound', 'maker', 'curve'],
  'NFT': ['nft', 'opensea', 'blur', 'collectible', 'pfp', 'art'],
  'Bitcoin': ['bitcoin', 'btc', 'satoshi', 'lightning'],
  'Ethereum': ['ethereum', 'eth', 'vitalik', 'eip', 'gas'],
  'Regulation': ['sec', 'regulation', 'lawsuit', 'court', 'legal', 'congress', 'ban', 'law', 'compliance', 'cftc'],
  'Layer 2': ['layer 2', 'l2', 'rollup', 'arbitrum', 'optimism', 'zksync', 'polygon', 'base'],
  'Altcoins': ['solana', 'sol', 'cardano', 'ada', 'xrp', 'ripple', 'bnb', 'avax', 'dot'],
  'Memecoins': ['meme', 'doge', 'shib', 'pepe', 'bonk', 'wif', 'floki'],
  'Exchange': ['binance', 'coinbase', 'kraken', 'exchange', 'cex', 'trading'],
  'Stablecoin': ['stablecoin', 'usdt', 'usdc', 'tether', 'circle', 'dai'],
  'AI': ['ai', 'artificial intelligence', 'machine learning', 'gpt', 'llm'],
};

function detectCategory(title: string): string {
  const lowerTitle = title.toLowerCase();
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => lowerTitle.includes(kw))) {
      return category;
    }
  }
  return 'General';
}

let cache: { data: NewsItem[]; timestamp: number } | null = null;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

// CryptoCompare news API
async function fetchCryptoCompareNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch(
      'https://min-api.cryptocompare.com/data/v2/news/?lang=EN',
      { next: { revalidate: 120 } }
    );
    if (!res.ok) return [];

    const data = await res.json();
    return (data.Data || []).slice(0, 20).map((item: {
      id: string;
      title: string;
      url: string;
      source: string;
      published_on: number;
      categories: string;
    }) => {
      const title = item.title;
      return {
        id: `cc-${item.id}`,
        title,
        url: item.url,
        source: { title: item.source },
        published_at: new Date(item.published_on * 1000).toISOString(),
        currencies: item.categories?.split('|').slice(0, 3).map((c: string) => ({
          code: c,
          title: c
        })),
        category: detectCategory(title),
      };
    });
  } catch {
    return [];
  }
}

// RSS feeds configuration
const rssFeeds = [
  // Major News Outlets
  { url: 'https://cointelegraph.com/rss', name: 'Cointelegraph', priority: 1 },
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', name: 'CoinDesk', priority: 1 },
  { url: 'https://decrypt.co/feed', name: 'Decrypt', priority: 1 },
  // Research & Analysis
  { url: 'https://thedefiant.io/feed', name: 'The Defiant', priority: 2 },
  { url: 'https://www.theblock.co/rss.xml', name: 'The Block', priority: 1 },
  // Bitcoin Focused
  { url: 'https://bitcoinmagazine.com/.rss/full/', name: 'Bitcoin Magazine', priority: 2 },
  // DeFi & Analysis
  { url: 'https://newsletter.banklesshq.com/feed', name: 'Bankless', priority: 2 },
  // Additional Sources
  { url: 'https://cryptoslate.com/feed/', name: 'CryptoSlate', priority: 2 },
  { url: 'https://www.newsbtc.com/feed/', name: 'NewsBTC', priority: 3 },
  { url: 'https://bitcoinist.com/feed/', name: 'Bitcoinist', priority: 3 },
];

// RSS feeds via rss2json
async function fetchRSSNews(): Promise<NewsItem[]> {
  const results: NewsItem[] = [];

  // Fetch in parallel for speed
  const fetchPromises = rssFeeds.map(async (feed) => {
    try {
      const res = await fetch(
        `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`,
        { next: { revalidate: 120 } }
      );
      if (!res.ok) return [];

      const data = await res.json();
      if (data.status !== 'ok') return [];

      // Get more from priority sources
      const limit = feed.priority === 1 ? 8 : feed.priority === 2 ? 5 : 3;

      return (data.items || []).slice(0, limit).map((item: {
        guid: string;
        title: string;
        link: string;
        pubDate: string;
        description?: string;
      }, idx: number) => {
        const title = item.title;
        return {
          id: `rss-${feed.name}-${idx}`,
          title,
          url: item.link,
          source: { title: feed.name },
          published_at: new Date(item.pubDate).toISOString(),
          category: detectCategory(title),
        };
      });
    } catch {
      return [];
    }
  });

  const allResults = await Promise.all(fetchPromises);
  allResults.forEach(items => results.push(...items));

  return results;
}

// Improved deduplication using edit distance approximation
function isDuplicate(title1: string, title2: string): boolean {
  const t1 = title1.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const t2 = title2.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

  // Exact match or substring
  if (t1 === t2 || t1.includes(t2) || t2.includes(t1)) return true;

  // Check first N words match
  const words1 = t1.split(/\s+/).slice(0, 6);
  const words2 = t2.split(/\s+/).slice(0, 6);
  const matchingWords = words1.filter(w => words2.includes(w));

  return matchingWords.length >= Math.min(words1.length, words2.length) * 0.7;
}

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json(cache.data);
    }

    // Fetch from all sources in parallel
    const [cryptoCompareNews, rssNews] = await Promise.all([
      fetchCryptoCompareNews(),
      fetchRSSNews(),
    ]);

    // Combine all news
    const allNews = [...cryptoCompareNews, ...rssNews];

    // Sort by date (newest first)
    allNews.sort((a, b) =>
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );

    // Improved deduplication
    const uniqueNews: NewsItem[] = [];
    for (const item of allNews) {
      const isDupe = uniqueNews.some(existing => isDuplicate(item.title, existing.title));
      if (!isDupe) {
        uniqueNews.push(item);
      }
      if (uniqueNews.length >= 50) break; // Keep more for filtering
    }

    cache = { data: uniqueNews, timestamp: Date.now() };
    return NextResponse.json(uniqueNews);
  } catch (error) {
    console.error('Error fetching news:', error);

    if (cache) {
      return NextResponse.json(cache.data);
    }

    // Fallback placeholder news
    return NextResponse.json([
      {
        id: '1',
        title: 'Loading latest crypto news...',
        url: '#',
        source: { title: 'Crypto News' },
        published_at: new Date().toISOString(),
        category: 'General',
      }
    ]);
  }
}
