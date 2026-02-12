import { NextResponse } from 'next/server';
import { google } from 'googleapis';

interface GameMeta {
  id: string;
  name: string;
  twitterHandle: string | null;
  twitterPfp: string | null;
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Missing Google service account credentials');
  }

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

// Extract Twitter handle from URL or handle string
function extractTwitterHandle(input: string): string | null {
  if (!input) return null;

  // Remove common URL prefixes
  let handle = input.trim();
  handle = handle.replace(/^https?:\/\/(www\.)?(twitter\.com|x\.com)\//, '');
  handle = handle.replace(/^@/, '');
  handle = handle.split('/')[0]; // Remove anything after the handle
  handle = handle.split('?')[0]; // Remove query params

  return handle || null;
}

// Get Twitter profile image URL using unavatar.io (no API key needed)
function getTwitterPfpUrl(handle: string): string {
  return `https://unavatar.io/twitter/${handle}`;
}

export async function GET() {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Missing spreadsheet ID' }, { status: 500 });
    }

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Read GameGuideDocs tab
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'GameGuideDocs!A:D',
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      return NextResponse.json({ games: [] });
    }

    // Find column indices from header
    const headers = rows[0].map((h: string) => h?.toLowerCase().trim());
    const nameCol = headers.findIndex((h: string) => h === 'name' || h === 'game name');
    const gameIdCol = headers.findIndex((h: string) => h === 'game id' || h === 'gameid' || h === 'id');
    const twitterCol = headers.findIndex((h: string) => h.includes('twitter') || h.includes('x.com'));

    const gamesMap = new Map<string, GameMeta>();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const gameId = row[gameIdCol]?.trim().toLowerCase();
      const name = row[nameCol]?.trim();
      const twitterUrl = row[twitterCol]?.trim();

      if (gameId && name && !gamesMap.has(gameId)) {
        const handle = extractTwitterHandle(twitterUrl || '');
        gamesMap.set(gameId, {
          id: gameId,
          name,
          twitterHandle: handle,
          twitterPfp: handle ? getTwitterPfpUrl(handle) : null,
        });
      }
    }

    return NextResponse.json({
      games: Array.from(gamesMap.values()),
    });

  } catch (error) {
    console.error('Error fetching game metadata:', error);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }
}
