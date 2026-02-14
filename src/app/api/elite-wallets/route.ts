import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), 'public', 'data');

    const obsidianPath = path.join(dataDir, 'wallets-obsidian.json');
    const diamondPath = path.join(dataDir, 'wallets-diamond.json');

    let obsidian = [];
    let diamond = [];

    if (fs.existsSync(obsidianPath)) {
      obsidian = JSON.parse(fs.readFileSync(obsidianPath, 'utf-8'));
    }

    if (fs.existsSync(diamondPath)) {
      diamond = JSON.parse(fs.readFileSync(diamondPath, 'utf-8'));
    }

    return NextResponse.json({ obsidian, diamond });
  } catch (error) {
    console.error('Error loading elite wallets:', error);
    return NextResponse.json({ obsidian: [], diamond: [] });
  }
}
