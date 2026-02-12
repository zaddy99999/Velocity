import { NextResponse } from 'next/server';

interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: { title: string };
  published_at: string;
  category?: string;
}

let cache: { data: NewsItem[]; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Search terms for Abstract Chain
const searchTerms = [
  'Abstract Chain crypto',
  'Abstract L2 blockchain',
  'Abstract blockchain',
];

// Fetch from Google News RSS
async function fetchGoogleNews(query: string): Promise<NewsItem[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    // Google News RSS feed
    const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`;

    const res = await fetch(
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) return [];

    const data = await res.json();
    if (data.status !== 'ok') return [];

    return (data.items || []).slice(0, 10).map((item: {
      guid: string;
      title: string;
      link: string;
      pubDate: string;
      author?: string;
    }, idx: number) => ({
      id: `google-abstract-${idx}-${Date.now()}`,
      title: item.title.replace(/ - .*$/, ''), // Remove source suffix Google adds
      url: item.link,
      source: { title: extractSource(item.title) || 'Google News' },
      published_at: new Date(item.pubDate).toISOString(),
      category: 'Abstract',
    }));
  } catch (error) {
    console.error('Error fetching Google News:', error);
    return [];
  }
}

// Extract source from Google News title (they append " - Source Name")
function extractSource(title: string): string {
  const match = title.match(/ - ([^-]+)$/);
  return match ? match[1].trim() : 'News';
}

// Fetch from crypto news sources and filter for Abstract
async function fetchFilteredCryptoNews(): Promise<NewsItem[]> {
  try {
    // Fetch from our existing crypto news endpoint
    const res = await fetch('http://localhost:3001/api/crypto/news', {
      next: { revalidate: 120 }
    });

    if (!res.ok) return [];

    const news: NewsItem[] = await res.json();

    // Filter for Abstract mentions
    const abstractKeywords = ['abstract', 'abstract chain', 'abstract l2', 'abstract network'];

    return news.filter(item => {
      const title = item.title.toLowerCase();
      return abstractKeywords.some(kw => title.includes(kw));
    }).map(item => ({
      ...item,
      id: `filtered-${item.id}`,
      category: 'Abstract',
    }));
  } catch {
    return [];
  }
}

// Fetch from Abstract official sources
async function fetchAbstractOfficial(): Promise<NewsItem[]> {
  const feeds = [
    // Abstract's Mirror blog
    { url: 'https://abstract.mirror.xyz/feed/atom', name: 'Abstract Blog' },
    // Abstract Medium if they have one
    { url: 'https://medium.com/feed/@abstract', name: 'Abstract Medium' },
  ];

  const results: NewsItem[] = [];

  for (const feed of feeds) {
    try {
      const res = await fetch(
        `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`,
        { next: { revalidate: 300 } }
      );

      if (!res.ok) continue;

      const data = await res.json();
      if (data.status !== 'ok') continue;

      const items = (data.items || []).slice(0, 5).map((item: {
        guid: string;
        title: string;
        link: string;
        pubDate: string;
      }, idx: number) => ({
        id: `abstract-official-${feed.name}-${idx}`,
        title: item.title,
        url: item.link,
        source: { title: feed.name },
        published_at: new Date(item.pubDate).toISOString(),
        category: 'Official',
      }));

      results.push(...items);
    } catch {
      continue;
    }
  }

  return results;
}

// Deduplicate by title similarity
function isDuplicate(title1: string, title2: string): boolean {
  const t1 = title1.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const t2 = title2.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

  if (t1 === t2 || t1.includes(t2) || t2.includes(t1)) return true;

  const words1 = t1.split(/\s+/).slice(0, 5);
  const words2 = t2.split(/\s+/).slice(0, 5);
  const matchingWords = words1.filter(w => words2.includes(w));

  return matchingWords.length >= Math.min(words1.length, words2.length) * 0.6;
}

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json(cache.data);
    }

    // Fetch from all sources in parallel
    const [googleNews1, googleNews2, officialNews, filteredNews] = await Promise.all([
      fetchGoogleNews(searchTerms[0]),
      fetchGoogleNews(searchTerms[1]),
      fetchAbstractOfficial(),
      fetchFilteredCryptoNews(),
    ]);

    // Combine all news
    const allNews = [...officialNews, ...googleNews1, ...googleNews2, ...filteredNews];

    // Sort by date (newest first)
    allNews.sort((a, b) =>
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );

    // Deduplicate
    const uniqueNews: NewsItem[] = [];
    for (const item of allNews) {
      const isDupe = uniqueNews.some(existing => isDuplicate(item.title, existing.title));
      if (!isDupe) {
        uniqueNews.push(item);
      }
      if (uniqueNews.length >= 30) break;
    }

    cache = { data: uniqueNews, timestamp: Date.now() };
    return NextResponse.json(uniqueNews);
  } catch (error) {
    console.error('Error fetching Abstract news:', error);

    if (cache) {
      return NextResponse.json(cache.data);
    }

    return NextResponse.json([]);
  }
}
