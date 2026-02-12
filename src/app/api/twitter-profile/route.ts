import { NextResponse } from 'next/server';

// Simple in-memory cache
const cache = new Map<string, { name: string; avatar: string; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get('handle');

  if (!handle) {
    return NextResponse.json({ error: 'Handle required' }, { status: 400 });
  }

  // Check cache first
  const cached = cache.get(handle.toLowerCase());
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ name: cached.name, avatar: cached.avatar, handle });
  }

  try {
    // Use fxtwitter API - reliable and no rate limiting
    const fxRes = await fetch(`https://api.fxtwitter.com/${handle}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (fxRes.ok) {
      const data = await fxRes.json();
      if (data.user?.name) {
        const avatar = data.user.avatar_url || `https://unavatar.io/twitter/${handle}`;
        cache.set(handle.toLowerCase(), { name: data.user.name, avatar, timestamp: Date.now() });
        return NextResponse.json({ name: data.user.name, avatar, handle });
      }
    }

    // Fallback: return the handle with unavatar
    return NextResponse.json({ name: handle, avatar: `https://unavatar.io/twitter/${handle}`, handle });
  } catch (e) {
    return NextResponse.json({ name: handle, avatar: `https://unavatar.io/twitter/${handle}`, handle });
  }
}
