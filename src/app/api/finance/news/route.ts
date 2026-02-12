import { NextResponse } from 'next/server';

interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: { title: string };
  published_at: string;
  category?: string;
}

// Category detection keywords for traditional finance
const categoryKeywords: Record<string, string[]> = {
  'Stocks': ['stock', 'equity', 'shares', 'nasdaq', 'dow', 's&p', 'nyse', 'earnings', 'ipo'],
  'Gold': ['gold', 'xau', 'bullion', 'precious metal'],
  'Silver': ['silver', 'xag'],
  'Commodities': ['oil', 'crude', 'natural gas', 'wheat', 'copper', 'commodity', 'commodities'],
  'Fed': ['federal reserve', 'fed', 'powell', 'fomc', 'interest rate', 'rate hike', 'rate cut'],
  'Economy': ['gdp', 'inflation', 'cpi', 'unemployment', 'jobs report', 'recession', 'economy'],
  'Bonds': ['bond', 'treasury', 'yield', 'fixed income'],
  'Forex': ['forex', 'currency', 'dollar', 'euro', 'yen', 'gbp', 'fx'],
  'Real Estate': ['real estate', 'housing', 'mortgage', 'reit'],
  'Tech': ['apple', 'google', 'microsoft', 'amazon', 'nvidia', 'tesla', 'meta', 'tech stock'],
};

function detectCategory(title: string): string {
  const lowerTitle = title.toLowerCase();
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => lowerTitle.includes(kw))) {
      return category;
    }
  }
  return 'Markets';
}

let cache: { data: NewsItem[]; timestamp: number } | null = null;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

// RSS feeds for traditional finance
const rssFeeds = [
  // Major Financial News
  { url: 'https://feeds.bloomberg.com/markets/news.rss', name: 'Bloomberg', priority: 1 },
  { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', name: 'CNBC', priority: 1 },
  { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', name: 'MarketWatch', priority: 1 },
  { url: 'https://www.reutersagency.com/feed/?best-topics=business-finance', name: 'Reuters', priority: 1 },
  // Yahoo Finance
  { url: 'https://finance.yahoo.com/news/rssindex', name: 'Yahoo Finance', priority: 2 },
  // Seeking Alpha
  { url: 'https://seekingalpha.com/market_currents.xml', name: 'Seeking Alpha', priority: 2 },
  // Investing.com
  { url: 'https://www.investing.com/rss/news.rss', name: 'Investing.com', priority: 2 },
  // Financial Times (free content)
  { url: 'https://www.ft.com/rss/home', name: 'Financial Times', priority: 2 },
  // Commodities specific
  { url: 'https://www.kitco.com/rss/kitco_news.xml', name: 'Kitco', priority: 2 },
  // Barrons
  { url: 'https://www.barrons.com/feed', name: 'Barrons', priority: 3 },
];

async function fetchRSSNews(): Promise<NewsItem[]> {
  const results: NewsItem[] = [];

  const fetchPromises = rssFeeds.map(async (feed) => {
    try {
      const res = await fetch(
        `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`,
        { next: { revalidate: 120 } }
      );
      if (!res.ok) return [];

      const data = await res.json();
      if (data.status !== 'ok') return [];

      const limit = feed.priority === 1 ? 8 : feed.priority === 2 ? 5 : 3;

      return (data.items || []).slice(0, limit).map((item: {
        guid: string;
        title: string;
        link: string;
        pubDate: string;
      }, idx: number) => {
        const title = item.title;
        return {
          id: `fin-${feed.name}-${idx}`,
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

function isDuplicate(title1: string, title2: string): boolean {
  const t1 = title1.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const t2 = title2.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

  if (t1 === t2 || t1.includes(t2) || t2.includes(t1)) return true;

  const words1 = t1.split(/\s+/).slice(0, 6);
  const words2 = t2.split(/\s+/).slice(0, 6);
  const matchingWords = words1.filter(w => words2.includes(w));

  return matchingWords.length >= Math.min(words1.length, words2.length) * 0.7;
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json(cache.data);
    }

    const rssNews = await fetchRSSNews();

    // Sort by date
    rssNews.sort((a, b) =>
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );

    // Deduplicate
    const uniqueNews: NewsItem[] = [];
    for (const item of rssNews) {
      const isDupe = uniqueNews.some(existing => isDuplicate(item.title, existing.title));
      if (!isDupe) {
        uniqueNews.push(item);
      }
      if (uniqueNews.length >= 50) break;
    }

    cache = { data: uniqueNews, timestamp: Date.now() };
    return NextResponse.json(uniqueNews);
  } catch (error) {
    console.error('Error fetching finance news:', error);

    if (cache) {
      return NextResponse.json(cache.data);
    }

    return NextResponse.json([
      {
        id: '1',
        title: 'Loading market news...',
        url: '#',
        source: { title: 'Finance News' },
        published_at: new Date().toISOString(),
        category: 'Markets',
      }
    ]);
  }
}
