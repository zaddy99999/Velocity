import { NextResponse } from 'next/server';
import { getRunStatus, getLatestData } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Debug: check env vars
    const hasEmail = !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const hasKey = !!process.env.GOOGLE_PRIVATE_KEY;
    const hasSheet = !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    console.log('Env check:', { hasEmail, hasKey, hasSheet });

    const [status, channelData] = await Promise.all([
      getRunStatus().catch(err => {
        console.error('getRunStatus error:', err);
        return { lastRunTime: null, status: 'error' as const, channelsProcessed: 0, channelsFailed: 0 };
      }),
      getLatestData().catch(err => {
        console.error('getLatestData error:', err);
        return [];
      }),
    ]);

    return NextResponse.json({
      status,
      channels: channelData,
      debug: { hasEmail, hasKey, hasSheet },
    });
  } catch (error) {
    console.error('Failed to fetch status:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch status',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
