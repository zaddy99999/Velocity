import { NextResponse } from 'next/server';
import { getSuggestions, updateSuggestionStatus } from '@/lib/sheets';

// Simple admin auth check - you can make this more secure
const ADMIN_KEY = process.env.ADMIN_KEY || 'zaddy-admin-2024';

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('x-admin-key');
  return authHeader === ADMIN_KEY;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null;

    const suggestions = await getSuggestions(status || undefined);
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { rowIndex, status } = body;

    if (!rowIndex || !status || !['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    await updateSuggestionStatus(rowIndex, status);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating suggestion:', error);
    return NextResponse.json({ error: 'Failed to update suggestion' }, { status: 500 });
  }
}
