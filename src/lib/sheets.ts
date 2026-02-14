import { google, sheets_v4 } from 'googleapis';
import {
  ScrapedChannel,
  RunStatus,
  ChannelDisplayData,
  ChannelCategory,
} from './types';

const TABS = {
  DAILY_LOG: 'daily_log',
  LATEST: 'latest',
  METRICS: 'metrics',
  SUGGESTIONS: 'suggestions',
  DIGESTS: 'digests',
  GAME_GUIDE_DOCS: 'GameGuideDocs',
  GAME_GUIDE_FAQ: 'GameGuideFAQ',
  LORE_LINKS: 'LoreLinks',
  QUESTIONS: 'Questions',
  TOP_WALLETS: 'TopWallets',
};

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

function getSheets(): sheets_v4.Sheets {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!id) {
    throw new Error('Missing GOOGLE_SHEETS_SPREADSHEET_ID');
  }
  return id;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatTimestamp(date: Date): string {
  return date.toISOString();
}

export async function appendToDailyLog(channels: ScrapedChannel[]): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  const now = new Date();
  const date = formatDate(now);
  const timestamp = formatTimestamp(now);

  const rows = channels.map((ch) => [
    date,
    timestamp,
    ch.channelName,
    ch.channelUrl,
    ch.rank,
    ch.category,
    ch.isAbstract ? 'yes' : 'no',
    ch.logoUrl || '',
    ch.parseFailed ? '' : ch.totalViews,
    ch.gifCount !== null ? ch.gifCount : '',
    ch.parseFailed,
    ch.errorMessage || '',
    // Social data columns
    ch.tiktokUrl || '',
    ch.tiktokFollowers !== null && ch.tiktokFollowers !== undefined ? ch.tiktokFollowers : '',
    ch.tiktokLikes !== null && ch.tiktokLikes !== undefined ? ch.tiktokLikes : '',
    ch.youtubeUrl || '',
    ch.youtubeSubscribers !== null && ch.youtubeSubscribers !== undefined ? ch.youtubeSubscribers : '',
    ch.youtubeViews !== null && ch.youtubeViews !== undefined ? ch.youtubeViews : '',
    ch.youtubeVideoCount !== null && ch.youtubeVideoCount !== undefined ? ch.youtubeVideoCount : '',
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${TABS.DAILY_LOG}!A:S`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: rows,
    },
  });
}

export async function updateLatestTab(channels: ScrapedChannel[]): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  const now = new Date();
  const date = formatDate(now);
  const timestamp = formatTimestamp(now);

  // Get current latest data
  const currentLatest = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TABS.LATEST}!A:I`,
  });

  const currentRows = currentLatest.data.values || [];
  const headerRow = currentRows.length > 0 ? currentRows[0] : [
    'channel_name',
    'channel_url',
    'rank',
    'category',
    'is_abstract',
    'logo_url',
    'total_views',
    'date',
    'timestamp',
  ];

  // Create a map of current data by URL
  const latestByUrl = new Map<string, string[]>();
  for (let i = 1; i < currentRows.length; i++) {
    const row = currentRows[i];
    if (row[1]) {
      latestByUrl.set(row[1], row);
    }
  }

  // Update with new successful scrapes
  for (const ch of channels) {
    if (!ch.parseFailed) {
      latestByUrl.set(ch.channelUrl, [
        ch.channelName,
        ch.channelUrl,
        String(ch.rank),
        ch.category,
        ch.isAbstract ? 'yes' : 'no',
        ch.logoUrl || '',
        String(ch.totalViews),
        date,
        timestamp,
      ]);
    }
  }

  // Convert back to rows
  const newRows = [headerRow, ...Array.from(latestByUrl.values())];

  // Clear and rewrite
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${TABS.LATEST}!A:I`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${TABS.LATEST}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: newRows,
    },
  });
}

export async function updateMetricsTab(channels: ScrapedChannel[]): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  const now = new Date();
  const timestamp = formatTimestamp(now);

  // Get daily log to compute deltas
  const dailyLog = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TABS.DAILY_LOG}!A:L`,
  });

  const logRows = dailyLog.data.values || [];

  // Group by channel URL and date
  const viewsByChannelDate = new Map<string, Map<string, number>>();
  for (let i = 1; i < logRows.length; i++) {
    const row = logRows[i];
    const date = row[0];
    const channelUrl = row[3];
    const views = parseInt(row[8], 10); // column order: date, timestamp, name, url, rank, category, isAbstract, logo, views, gifCount, parseFailed, error
    const parseFailed = row[10] === 'TRUE' || row[10] === true;

    if (!parseFailed && !isNaN(views)) {
      if (!viewsByChannelDate.has(channelUrl)) {
        viewsByChannelDate.set(channelUrl, new Map());
      }
      viewsByChannelDate.get(channelUrl)!.set(date, views);
    }
  }

  // Compute metrics for each channel
  const metricsRows: string[][] = [
    [
      'channel_name',
      'channel_url',
      'rank',
      'category',
      'is_abstract',
      'logo_url',
      'latest_total_views',
      'gif_count',
      'delta_1d',
      'avg_7d_delta',
      'last_updated',
      'tiktok_url',
      'tiktok_followers',
      'tiktok_likes',
      'youtube_url',
      'youtube_subscribers',
      'youtube_views',
      'youtube_video_count',
    ],
  ];

  for (const ch of channels) {
    if (ch.parseFailed) continue;

    const channelHistory = viewsByChannelDate.get(ch.channelUrl);
    let delta1d: number | null = null;
    let avg7dDelta: number | null = null;

    if (channelHistory) {
      // Get sorted dates
      const dates = Array.from(channelHistory.keys()).sort();
      const todayViews = ch.totalViews;

      // Find previous day's views
      if (dates.length >= 1) {
        const prevDate = dates[dates.length - 1];
        const prevViews = channelHistory.get(prevDate);
        if (prevViews !== undefined) {
          delta1d = todayViews - prevViews;
        }
      }

      // Calculate 7-day rolling average of deltas
      if (dates.length >= 2) {
        const recentDates = dates.slice(-8); // Need 8 days to get 7 deltas
        const deltas: number[] = [];
        for (let i = 1; i < recentDates.length; i++) {
          const prev = channelHistory.get(recentDates[i - 1]);
          const curr = channelHistory.get(recentDates[i]);
          if (prev !== undefined && curr !== undefined) {
            deltas.push(curr - prev);
          }
        }
        // Include today's delta if we have it
        if (delta1d !== null) {
          deltas.push(delta1d);
        }
        if (deltas.length > 0) {
          const recentDeltas = deltas.slice(-7);
          avg7dDelta = Math.round(
            recentDeltas.reduce((a, b) => a + b, 0) / recentDeltas.length
          );
        }
      }
    }

    metricsRows.push([
      ch.channelName,
      ch.channelUrl,
      String(ch.rank),
      ch.category,
      ch.isAbstract ? 'yes' : 'no',
      ch.logoUrl || '',
      String(ch.totalViews),
      ch.gifCount !== null ? String(ch.gifCount) : '',
      delta1d !== null ? String(delta1d) : '',
      avg7dDelta !== null ? String(avg7dDelta) : '',
      timestamp,
      ch.tiktokUrl || '',
      ch.tiktokFollowers !== null && ch.tiktokFollowers !== undefined ? String(ch.tiktokFollowers) : '',
      ch.tiktokLikes !== null && ch.tiktokLikes !== undefined ? String(ch.tiktokLikes) : '',
      ch.youtubeUrl || '',
      ch.youtubeSubscribers !== null && ch.youtubeSubscribers !== undefined ? String(ch.youtubeSubscribers) : '',
      ch.youtubeViews !== null && ch.youtubeViews !== undefined ? String(ch.youtubeViews) : '',
      ch.youtubeVideoCount !== null && ch.youtubeVideoCount !== undefined ? String(ch.youtubeVideoCount) : '',
    ]);
  }

  // Clear and rewrite metrics
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${TABS.METRICS}!A:R`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${TABS.METRICS}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: metricsRows,
    },
  });
}

export async function getLatestData(): Promise<ChannelDisplayData[]> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    const metricsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TABS.METRICS}!A:R`,
    });

    const rows = metricsResponse.data.values || [];
    if (rows.length <= 1) return [];

    return rows.slice(1).map((row) => ({
      channelName: row[0] || '',
      channelUrl: row[1] || '',
      rank: parseInt(row[2], 10) || 0,
      category: (row[3] as ChannelCategory) || 'web2',
      isAbstract: row[4]?.toLowerCase() === 'yes' || row[4]?.toLowerCase() === 'true',
      logoUrl: row[5] || null,
      totalViews: parseInt(row[6], 10) || 0,
      gifCount: row[7] ? parseInt(row[7], 10) : null,
      delta1d: row[8] ? parseInt(row[8], 10) : null,
      avg7dDelta: row[9] ? parseInt(row[9], 10) : null,
      tiktokUrl: row[11] || undefined,
      tiktokFollowers: row[12] ? parseInt(row[12], 10) : null,
      tiktokLikes: row[13] ? parseInt(row[13], 10) : null,
      youtubeUrl: row[14] || undefined,
      youtubeSubscribers: row[15] ? parseInt(row[15], 10) : null,
      youtubeViews: row[16] ? parseInt(row[16], 10) : null,
      youtubeVideoCount: row[17] ? parseInt(row[17], 10) : null,
    }));
  } catch (error) {
    console.error('Error fetching latest data:', error);
    return [];
  }
}

export async function getRunStatus(): Promise<RunStatus> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TABS.DAILY_LOG}!A:L`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      return {
        lastRunTime: null,
        status: 'never_run',
        channelsProcessed: 0,
        channelsFailed: 0,
      };
    }

    // Get the last run's timestamp (most recent row)
    const lastRow = rows[rows.length - 1];
    const lastTimestamp = lastRow[1];

    // Count channels from the last run
    const lastDate = lastRow[0];
    let channelsProcessed = 0;
    let channelsFailed = 0;

    for (let i = rows.length - 1; i >= 1; i--) {
      if (rows[i][0] !== lastDate) break;
      channelsProcessed++;
      // parseFailed is at column index 10 (date, timestamp, name, url, rank, category, isAbstract, logo, views, gifCount, parseFailed, error)
      if (rows[i][10] === 'TRUE' || rows[i][10] === true) {
        channelsFailed++;
      }
    }

    let status: 'success' | 'partial' | 'failed';
    if (channelsFailed === 0) {
      status = 'success';
    } else if (channelsFailed === channelsProcessed) {
      status = 'failed';
    } else {
      status = 'partial';
    }

    return {
      lastRunTime: lastTimestamp,
      status,
      channelsProcessed,
      channelsFailed,
    };
  } catch (error) {
    console.error('Error fetching run status:', error);
    return {
      lastRunTime: null,
      status: 'never_run',
      channelsProcessed: 0,
      channelsFailed: 0,
    };
  }
}

export async function ensureTabsExist(): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  // Get existing sheets
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  const existingTabs = new Set(
    spreadsheet.data.sheets?.map((s) => s.properties?.title) || []
  );

  const tabsToCreate = Object.values(TABS).filter((tab) => !existingTabs.has(tab));

  if (tabsToCreate.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: tabsToCreate.map((title) => ({
          addSheet: {
            properties: { title },
          },
        })),
      },
    });

    // Add headers to new tabs
    const headerUpdates = [];

    if (tabsToCreate.includes(TABS.DAILY_LOG)) {
      headerUpdates.push({
        range: `${TABS.DAILY_LOG}!A1:K1`,
        values: [[
          'date',
          'timestamp',
          'channel_name',
          'channel_url',
          'rank',
          'category',
          'is_abstract',
          'logo_url',
          'total_views',
          'parse_failed',
          'error_message',
        ]],
      });
    }

    if (tabsToCreate.includes(TABS.LATEST)) {
      headerUpdates.push({
        range: `${TABS.LATEST}!A1:I1`,
        values: [[
          'channel_name',
          'channel_url',
          'rank',
          'category',
          'is_abstract',
          'logo_url',
          'total_views',
          'date',
          'timestamp',
        ]],
      });
    }

    if (tabsToCreate.includes(TABS.METRICS)) {
      headerUpdates.push({
        range: `${TABS.METRICS}!A1:J1`,
        values: [[
          'channel_name',
          'channel_url',
          'rank',
          'category',
          'is_abstract',
          'logo_url',
          'latest_total_views',
          'delta_1d',
          'avg_7d_delta',
          'last_updated',
        ]],
      });
    }

    if (headerUpdates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data: headerUpdates,
        },
      });
    }
  }
}

export interface SuggestionData {
  projectName: string;
  giphyUrl?: string;
  tiktokUrl?: string;
  category: 'web2' | 'web3';
  notes?: string;
  toolType?: string; // e.g., 'social-clips', 'tier-maker', 'game-guide', etc.
}

export interface SuggestionRow {
  rowIndex: number;
  timestamp: string;
  projectName: string;
  giphyUrl?: string;
  tiktokUrl?: string;
  category: 'web2' | 'web3';
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  toolType?: string;
}

// Digest types and functions
export interface DigestData {
  id: string; // e.g., "daily-2024-02-11-08" or "weekly-2024-02-11"
  mode: 'daily' | 'weekly';
  dateLabel: string;
  summary?: string;
  summaryUrl?: string;
  sections: { content: string; url?: string; category?: string; featured?: boolean }[];
  generatedAt: string;
  expiresAt: string; // When this digest should be regenerated
}

export async function saveDigest(digest: DigestData): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  // Ensure digests tab exists
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = new Set(
      spreadsheet.data.sheets?.map((s) => s.properties?.title) || []
    );

    if (!existingTabs.has(TABS.DIGESTS)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: { properties: { title: TABS.DIGESTS } },
          }],
        },
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TABS.DIGESTS}!A1:G1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['id', 'mode', 'date_label', 'summary', 'sections_json', 'generated_at', 'expires_at']],
        },
      });
    }
  } catch (error) {
    console.error('Error ensuring digests tab:', error);
  }

  // Check if digest already exists, update or append
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TABS.DIGESTS}!A:G`,
  });

  const rows = existing.data.values || [];
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === digest.id) {
      rowIndex = i + 1; // 1-indexed for Sheets
      break;
    }
  }

  const sectionsJson = JSON.stringify({
    summaryUrl: digest.summaryUrl,
    items: digest.sections.map(s => ({
      content: s.content,
      url: s.url,
      category: s.category,
      featured: s.featured,
    })),
  });

  const rowData = [
    digest.id,
    digest.mode,
    digest.dateLabel,
    digest.summary,
    sectionsJson,
    digest.generatedAt,
    digest.expiresAt,
  ];

  if (rowIndex > 0) {
    // Update existing row
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TABS.DIGESTS}!A${rowIndex}:G${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [rowData] },
    });
  } else {
    // Append new row
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${TABS.DIGESTS}!A:G`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [rowData] },
    });
  }
}

export async function getDigest(id: string): Promise<DigestData | null> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TABS.DIGESTS}!A:G`,
    });

    const rows = response.data.values || [];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        const sectionsData = JSON.parse(rows[i][4] || '{}');
        // Handle both old array format and new object format
        const items = Array.isArray(sectionsData) ? sectionsData : (sectionsData.items || []);
        const summaryUrl = Array.isArray(sectionsData) ? sectionsData[0]?.summaryUrl : sectionsData.summaryUrl;
        return {
          id: rows[i][0],
          mode: rows[i][1] as 'daily' | 'weekly',
          dateLabel: rows[i][2],
          summary: rows[i][3],
          summaryUrl,
          sections: items.map((s: { content: string; url?: string; category?: string; featured?: boolean }) => ({
            content: s.content,
            url: s.url,
            category: s.category,
            featured: s.featured,
          })),
          generatedAt: rows[i][5],
          expiresAt: rows[i][6],
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching digest:', error);
    return null;
  }
}

export async function getLatestDigests(mode: 'daily' | 'weekly', limit = 5): Promise<DigestData[]> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TABS.DIGESTS}!A:G`,
    });

    const rows = response.data.values || [];
    const digests: DigestData[] = [];

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] === mode) {
        const sectionsData = JSON.parse(rows[i][4] || '{}');
        const items = Array.isArray(sectionsData) ? sectionsData : (sectionsData.items || []);
        const summaryUrl = Array.isArray(sectionsData) ? sectionsData[0]?.summaryUrl : sectionsData.summaryUrl;
        digests.push({
          id: rows[i][0],
          mode: rows[i][1] as 'daily' | 'weekly',
          dateLabel: rows[i][2],
          summary: rows[i][3],
          summaryUrl,
          sections: items.map((s: { content: string; url?: string; category?: string; featured?: boolean }) => ({
            content: s.content,
            url: s.url,
            category: s.category,
            featured: s.featured,
          })),
          generatedAt: rows[i][5],
          expiresAt: rows[i][6],
        });
      }
    }

    // Sort by generated time descending and limit
    return digests
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching digests:', error);
    return [];
  }
}

export async function updateTierMakerItem(name: string, newUrl: string): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  // Get all rows to find the one to update
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'TierMaker List (Projects)!A:C',
  });

  const rows = response.data.values || [];
  let rowIndex = -1;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]?.trim().toLowerCase() === name.toLowerCase()) {
      rowIndex = i + 1; // 1-indexed for Sheets
      break;
    }
  }

  if (rowIndex > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `TierMaker List (Projects)!B${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[newUrl]],
      },
    });
  }
}

export async function addTierMakerItems(items: { handle: string; name?: string }[]): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  const rows = items.map(item => [
    `https://x.com/${item.handle}`,
    item.name || item.handle,
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'TierMaker List (Projects)!A:B',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: rows,
    },
  });
}

export async function getTierMakerItems(): Promise<{ handle: string; name?: string; category?: string }[]> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'TierMaker List (Projects)!A:C',
    });

    const rows = response.data.values || [];
    const items: { handle: string; name?: string; category?: string }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      // Column A = display name, Column B = Twitter URL, Column C = category
      const displayName = row[0]?.trim();
      const twitterUrl = row[1]?.trim();
      const category = row[2]?.trim();

      if (twitterUrl) {
        // Extract handle from URL
        let handle = twitterUrl;
        if (handle.includes('x.com/') || handle.includes('twitter.com/')) {
          handle = handle.split('/').pop() || handle;
        }
        handle = handle.replace('@', '');
        if (handle) {
          items.push({
            handle,
            name: displayName || undefined,
            category: category || undefined,
          });
        }
      }
    }

    return items;
  } catch (error) {
    console.error('Error fetching tier maker items:', error);
    return [];
  }
}

export async function addPeopleTierMakerItems(items: { name: string; handle: string; category?: string }[]): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  const rows = items.map(item => [
    item.name,
    `https://x.com/${item.handle}`,
    item.category || 'Community',
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'TierMaker List (People)!A:C',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: rows,
    },
  });
}

export async function getPeopleTierMakerItems(): Promise<{ handle: string; name?: string; category?: string }[]> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'TierMaker List (People)!A:C',
    });

    const rows = response.data.values || [];
    const items: { handle: string; name?: string; category?: string }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      // Column A = display name, Column B = Twitter URL, Column C = category
      const displayName = row[0]?.trim();
      const twitterUrl = row[1]?.trim();
      const category = row[2]?.trim();

      if (twitterUrl) {
        // Extract handle from URL
        let handle = twitterUrl;
        if (handle.includes('x.com/') || handle.includes('twitter.com/')) {
          handle = handle.split('/').pop() || handle;
        }
        handle = handle.replace('@', '');
        if (handle) {
          items.push({
            handle,
            name: displayName || undefined,
            category: category || undefined,
          });
        }
      }
    }

    return items;
  } catch (error) {
    console.error('Error fetching people tier maker items:', error);
    return [];
  }
}

// ==================== GAME GUIDE DOCS ====================

export interface GameGuideDoc {
  gameId: string;
  gameName: string;
  title: string;
  content: string;
  sourceUrls?: string[];
}

// Cache for fetched URL content (persists during server runtime)
const urlContentCache = new Map<string, { content: string; fetchedAt: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour cache

// Extract URLs from text (handles multiple URLs per cell, newline or comma separated)
function extractUrls(text: string): string[] {
  const urlPattern = /https?:\/\/[^\s,\n]+/g;
  const matches = text.match(urlPattern) || [];
  return matches.map(url => url.trim().replace(/[,;]$/, '')); // Clean trailing punctuation
}

// Convert Google Docs URL to export format
function convertGoogleDocUrl(url: string): string {
  // Match Google Docs URL pattern
  const docMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) {
    const docId = docMatch[1];
    return `https://docs.google.com/document/d/${docId}/export?format=txt`;
  }
  return url;
}

// Fetch content from a URL (GitBook, docs sites, etc.) with caching
async function fetchDocContent(url: string): Promise<string> {
  // Convert Google Docs URLs to export format
  const fetchUrl = convertGoogleDocUrl(url);

  // Check cache first
  const cached = urlContentCache.get(fetchUrl);
  if (cached && (Date.now() - cached.fetchedAt) < CACHE_TTL) {
    console.log(`Using cached content for ${fetchUrl}`);
    return cached.content;
  }
  try {
    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ZaddyTools/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.log(`Failed to fetch ${url}: ${response.status}`);
      return '';
    }

    const html = await response.text();

    // Extract text content from HTML (simple extraction)
    // Remove script and style tags
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');

    // Convert common HTML elements to text
    text = text
      .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n\n## $1\n')
      .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n')
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .replace(/\n\s+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Limit content length to avoid token limits
    if (text.length > 15000) {
      text = text.substring(0, 15000) + '\n\n[Content truncated...]';
    }

    console.log(`Fetched ${text.length} chars from ${fetchUrl}`);

    // Cache the result (use original URL as key for consistency)
    urlContentCache.set(fetchUrl, { content: text, fetchedAt: Date.now() });

    return text;
  } catch (error) {
    console.error(`Error fetching doc from ${url}:`, error);
    return '';
  }
}

export async function getGameGuideDocs(gameId?: string): Promise<GameGuideDoc[]> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    // Read all columns (A through Z to capture all content)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TABS.GAME_GUIDE_DOCS}!A:Z`,
    });

    const rows = response.data.values || [];
    console.log(`GameGuideDocs: Found ${rows.length} rows, looking for gameId: ${gameId || 'all'}`);

    if (rows.length === 0) return [];

    // Get header row to determine column mapping
    const header = rows[0].map((h: string) => h?.toLowerCase().trim() || '');
    console.log('Headers:', header);

    // Find column indices (flexible matching)
    const gameIdCol = header.findIndex((h: string) => h.includes('game') && h.includes('id')) !== -1
      ? header.findIndex((h: string) => h.includes('game') && h.includes('id'))
      : header.findIndex((h: string) => h === 'id' || h === 'game_id');
    const nameCol = header.findIndex((h: string) => h === 'name' || h === 'game_name' || h === 'game name');
    const contentCol = header.findIndex((h: string) =>
      h.includes('content') || h.includes('docs') || h.includes('documentation') || h.includes('resource')
    );

    console.log(`Column mapping - gameId: ${gameIdCol}, name: ${nameCol}, content: ${contentCol}`);

    const docs: GameGuideDoc[] = [];

    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      // Get values from mapped columns, with fallbacks
      const docGameId = (gameIdCol >= 0 ? row[gameIdCol] : row[1])?.trim() || '';
      const docName = (nameCol >= 0 ? row[nameCol] : row[0])?.trim() || '';

      // Collect all resource links/content from columns
      const allUrls: string[] = [];
      let directContent = '';

      for (let c = 3; c < row.length; c++) {
        const cellValue = row[c]?.trim() || '';
        if (cellValue) {
          // Extract any URLs from the cell (handles multiple URLs per cell)
          const urls = extractUrls(cellValue);
          allUrls.push(...urls);

          // Also check for non-URL text content
          const textWithoutUrls = cellValue.replace(/https?:\/\/[^\s,\n]+/g, '').trim();
          if (textWithoutUrls) {
            directContent += '\n\n' + textWithoutUrls;
          }
        }
      }

      const doc: GameGuideDoc = {
        gameId: docGameId,
        gameName: docName,
        title: `${docName} Documentation`,
        content: directContent.trim(),
        sourceUrls: allUrls.length > 0 ? allUrls : undefined,
      };

      // Filter by gameId if provided
      if (doc.gameId && (doc.content || doc.sourceUrls?.length)) {
        if (!gameId || doc.gameId === gameId) {
          docs.push(doc);
        }
      }
    }

    console.log(`Returning ${docs.length} docs`);
    return docs;
  } catch (error) {
    console.error('Error fetching game guide docs:', error);
    return [];
  }
}

// Fetch and enrich docs with content from URLs
export async function getGameGuideDocsWithContent(gameId?: string): Promise<GameGuideDoc[]> {
  const docs = await getGameGuideDocs(gameId);

  // Fetch content from all URLs in parallel
  const enrichedDocs = await Promise.all(
    docs.map(async (doc) => {
      let combinedContent = doc.content || '';

      if (doc.sourceUrls && doc.sourceUrls.length > 0) {
        // Fetch all URLs for this doc
        const fetchResults = await Promise.all(
          doc.sourceUrls.map(url => fetchDocContent(url))
        );

        // Combine fetched content
        for (let i = 0; i < doc.sourceUrls.length; i++) {
          if (fetchResults[i]) {
            combinedContent += `\n\n--- Source: ${doc.sourceUrls[i]} ---\n\n${fetchResults[i]}`;
          }
        }
      }

      return {
        ...doc,
        content: combinedContent.trim() || `[Could not fetch content from URLs]`,
      };
    })
  );

  return enrichedDocs.filter(doc => doc.content && !doc.content.startsWith('[Could not'));
}

export async function ensureGameGuideDocsTab(): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = new Set(
      spreadsheet.data.sheets?.map((s) => s.properties?.title) || []
    );

    if (!existingTabs.has(TABS.GAME_GUIDE_DOCS)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: { properties: { title: TABS.GAME_GUIDE_DOCS } },
          }],
        },
      });

      // Add headers and example row
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TABS.GAME_GUIDE_DOCS}!A1:D2`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            ['game_id', 'game_name', 'doc_title', 'content'],
            ['general', 'General', 'Abstract Overview', 'Abstract is a Layer 2 blockchain for gaming and consumer apps.'],
          ],
        },
      });
    }
  } catch (error) {
    console.error('Error ensuring GameGuideDocs tab:', error);
  }
}

export async function populateGameGuideGames(): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  const games = [
    { id: 'general', name: 'General', title: 'Abstract Overview', content: 'Abstract is a Layer 2 blockchain built for consumer crypto applications, particularly gaming and NFTs. It features low fees, fast transactions, and a focus on gaming and consumer apps.' },
    { id: 'gigaverse', name: 'Gigaverse', title: 'Overview', content: '[Add Gigaverse documentation here]' },
    { id: 'moody-madness', name: 'Moody Madness', title: 'Overview', content: '[Add Moody Madness documentation here]' },
    { id: 'hamieverse', name: 'Hamieverse', title: 'Overview', content: '[Add Hamieverse documentation here]' },
    { id: 'ruyui', name: 'Ruyui', title: 'Overview', content: '[Add Ruyui documentation here]' },
    { id: 'cambria', name: 'Cambria', title: 'Overview', content: '[Add Cambria documentation here]' },
    { id: 'duper', name: 'Duper', title: 'Overview', content: '[Add Duper documentation here]' },
    { id: 'onchainheroes', name: 'OnchainHeroes', title: 'Overview', content: '[Add OnchainHeroes documentation here]' },
  ];

  const rows = games.map(g => [g.id, g.name, g.title, g.content]);

  // Clear existing data (except header) and write new games
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${TABS.GAME_GUIDE_DOCS}!A2:D100`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${TABS.GAME_GUIDE_DOCS}!A2`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: rows,
    },
  });
}

// Game Guide FAQ - hardcoded answers from sheet
export interface GameGuideFAQ {
  gameId: string;
  keywords: string[];
  answer: string;
}

export async function getGameGuideFAQs(gameId?: string): Promise<GameGuideFAQ[]> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TABS.GAME_GUIDE_FAQ}!A:C`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return [];

    const faqs: GameGuideFAQ[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowGameId = row[0]?.trim() || '';
      const keywords = (row[1] || '').split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean);
      const answer = row[2]?.trim() || '';

      if (rowGameId && keywords.length > 0 && answer) {
        if (!gameId || rowGameId === gameId) {
          faqs.push({ gameId: rowGameId, keywords, answer });
        }
      }
    }
    return faqs;
  } catch (error) {
    // Tab might not exist yet, that's ok
    console.log('GameGuideFAQ tab not found or empty');
    return [];
  }
}

export async function findFAQAnswer(gameId: string, question: string): Promise<string | null> {
  const faqs = await getGameGuideFAQs(gameId);
  const questionLower = question.toLowerCase();

  for (const faq of faqs) {
    // Check if any keyword matches the question
    if (faq.keywords.some(kw => questionLower.includes(kw))) {
      return faq.answer;
    }
  }
  return null;
}

export async function ensureGameGuideFAQTab(): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    console.log('Checking for GameGuideFAQ tab...');
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = new Set(
      spreadsheet.data.sheets?.map((s) => s.properties?.title) || []
    );
    console.log('Existing tabs:', Array.from(existingTabs));

    if (!existingTabs.has(TABS.GAME_GUIDE_FAQ)) {
      console.log('Creating GameGuideFAQ tab...');
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: { properties: { title: TABS.GAME_GUIDE_FAQ } },
          }],
        },
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TABS.GAME_GUIDE_FAQ}!A1:C1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['game_id', 'keywords', 'answer']],
        },
      });
      console.log('GameGuideFAQ tab created successfully');
    } else {
      console.log('GameGuideFAQ tab already exists');
    }
  } catch (error) {
    console.error('Error ensuring GameGuideFAQ tab:', error);
  }
}

export async function submitSuggestion(suggestion: SuggestionData): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  const now = new Date();
  const timestamp = formatTimestamp(now);

  // Ensure the suggestions tab exists
  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const existingTabs = new Set(
      spreadsheet.data.sheets?.map((s) => s.properties?.title) || []
    );

    if (!existingTabs.has(TABS.SUGGESTIONS)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: TABS.SUGGESTIONS },
            },
          }],
        },
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TABS.SUGGESTIONS}!A1:H1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            'timestamp',
            'project_name',
            'giphy_url',
            'tiktok_url',
            'category',
            'notes',
            'status',
            'tool_type',
          ]],
        },
      });
    }
  } catch (error) {
    console.error('Error ensuring suggestions tab exists:', error);
  }

  // Append the suggestion
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${TABS.SUGGESTIONS}!A:H`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        timestamp,
        suggestion.projectName,
        suggestion.giphyUrl || '',
        suggestion.tiktokUrl || '',
        suggestion.category,
        suggestion.notes || '',
        'pending',
        suggestion.toolType || 'social-clips',
      ]],
    },
  });
}

export async function getSuggestions(status?: 'pending' | 'approved' | 'rejected'): Promise<SuggestionRow[]> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TABS.SUGGESTIONS}!A:H`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return [];

    const suggestions: SuggestionRow[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowStatus = (row[6] || 'pending') as 'pending' | 'approved' | 'rejected';

      // Filter by status if specified
      if (status && rowStatus !== status) continue;

      suggestions.push({
        rowIndex: i + 1, // 1-indexed for sheets
        timestamp: row[0] || '',
        projectName: row[1] || '',
        giphyUrl: row[2] || undefined,
        tiktokUrl: row[3] || undefined,
        category: (row[4] || 'web3') as 'web2' | 'web3',
        notes: row[5] || undefined,
        status: rowStatus,
        toolType: row[7] || 'social-clips',
      });
    }

    // Sort by timestamp descending (newest first)
    return suggestions.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return [];
  }
}

export async function updateSuggestionStatus(
  rowIndex: number,
  status: 'pending' | 'approved' | 'rejected'
): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${TABS.SUGGESTIONS}!G${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[status]],
    },
  });
}

// ==================== LORE LINKS ====================

export interface LoreLink {
  type: 'novel' | 'comic' | 'other';
  title: string;
  url: string;
  description?: string;
  gameId?: string;
}

export async function getLoreLinks(gameId?: string): Promise<LoreLink[]> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TABS.LORE_LINKS}!A:E`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return [];

    const links: LoreLink[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowGameId = row[0]?.trim() || '';
      const type = (row[1]?.trim().toLowerCase() || 'other') as 'novel' | 'comic' | 'other';
      const title = row[2]?.trim() || '';
      const url = row[3]?.trim() || '';
      const description = row[4]?.trim() || '';

      if (title && url) {
        if (!gameId || rowGameId === gameId) {
          links.push({ gameId: rowGameId, type, title, url, description });
        }
      }
    }
    return links;
  } catch (error) {
    console.log('LoreLinks tab not found or empty');
    return [];
  }
}

export async function ensureLoreLinksTab(): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = new Set(
      spreadsheet.data.sheets?.map((s) => s.properties?.title) || []
    );

    if (!existingTabs.has(TABS.LORE_LINKS)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: { properties: { title: TABS.LORE_LINKS } },
          }],
        },
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TABS.LORE_LINKS}!A1:E1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['game_id', 'type', 'title', 'url', 'description']],
        },
      });
    }
  } catch (error) {
    console.error('Error ensuring LoreLinks tab:', error);
  }
}

// ==================== QUIZ QUESTIONS ====================

export interface QuizQuestion {
  id: string;
  gameId: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export async function getQuizQuestions(gameId?: string): Promise<QuizQuestion[]> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TABS.QUESTIONS}!A:J`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return [];

    const questions: QuizQuestion[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowGameId = row[0]?.trim() || '';
      const question = row[1]?.trim() || '';
      const optionA = row[2]?.trim() || '';
      const optionB = row[3]?.trim() || '';
      const optionC = row[4]?.trim() || '';
      const optionD = row[5]?.trim() || '';
      const correctAnswer = (row[6]?.trim().toUpperCase() || 'A') as 'A' | 'B' | 'C' | 'D';
      const category = row[7]?.trim() || '';
      const difficulty = (row[8]?.trim().toLowerCase() || 'medium') as 'easy' | 'medium' | 'hard';

      if (question && optionA && optionB) {
        if (!gameId || rowGameId === gameId) {
          questions.push({
            id: `q-${i}`,
            gameId: rowGameId,
            question,
            optionA,
            optionB,
            optionC,
            optionD,
            correctAnswer,
            category,
            difficulty,
          });
        }
      }
    }
    return questions;
  } catch (error) {
    console.log('Questions tab not found or empty');
    return [];
  }
}

export async function ensureQuestionsTab(): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = new Set(
      spreadsheet.data.sheets?.map((s) => s.properties?.title) || []
    );

    if (!existingTabs.has(TABS.QUESTIONS)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: { properties: { title: TABS.QUESTIONS } },
          }],
        },
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TABS.QUESTIONS}!A1:I1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['game_id', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'category', 'difficulty']],
        },
      });
    }
  } catch (error) {
    console.error('Error ensuring Questions tab:', error);
  }
}

// ==================== TOP WALLETS ====================

export interface TopWallet {
  id: string;
  wallet: string;
  name: string;
  tier: number;
  tierV2: number;
  badges: number;
  streaming: boolean;
  pfp?: string;
  txs?: number;
}

export async function writeTopWallets(obsidian: TopWallet[], diamond: TopWallet[]): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  // Ensure tab exists
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = new Set(
      spreadsheet.data.sheets?.map((s) => s.properties?.title) || []
    );

    if (!existingTabs.has(TABS.TOP_WALLETS)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: { properties: { title: TABS.TOP_WALLETS } },
          }],
        },
      });
    }
  } catch (error) {
    console.error('Error ensuring TopWallets tab:', error);
  }

  // Build all rows - header + all wallets
  const header = ['tier_name', 'id', 'wallet', 'name', 'tier', 'tierV2', 'badges', 'streaming', 'pfp', 'txs', 'portal_link'];

  const obsidianRows = obsidian.map(w => [
    'Obsidian',
    w.id,
    w.wallet,
    w.name,
    w.tier,
    w.tierV2,
    w.badges,
    w.streaming ? 'yes' : 'no',
    w.pfp || '',
    w.txs || '',
    `https://portal.abs.xyz/profile/${w.wallet}`,
  ]);

  const diamondRows = diamond.map(w => [
    'Diamond',
    w.id,
    w.wallet,
    w.name,
    w.tier,
    w.tierV2,
    w.badges,
    w.streaming ? 'yes' : 'no',
    w.pfp || '',
    w.txs || '',
    `https://portal.abs.xyz/profile/${w.wallet}`,
  ]);

  const allRows = [header, ...obsidianRows, ...diamondRows];

  // Single write call - clear and update
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${TABS.TOP_WALLETS}!A:K`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${TABS.TOP_WALLETS}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: allRows,
    },
  });

  console.log(`Wrote ${allRows.length - 1} wallets to TopWallets tab`);
}
