import { NextResponse } from 'next/server';
import { getTierMakerItems, addTierMakerItems, updateTierMakerItem } from '@/lib/sheets';

// Category sort order (first to last)
const CATEGORY_ORDER = [
  'NFT + Game',
  'Defi',
  'NFT',
  'Game',
  'Social',
  'Infrastructure',
  'Other',
  'Memecoins',
];

// Normalize category names
function normalizeCategory(category: string): string {
  const lower = category.toLowerCase().trim();
  // Combine game,nft and nft,game variations
  if (lower === 'game,nft' || lower === 'nft,game' || lower === 'game, nft' || lower === 'nft, game') {
    return 'NFT + Game';
  }
  // Capitalize first letter of each word
  return category.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

// Sort items by category order
function sortByCategory(items: any[]): any[] {
  return items.sort((a, b) => {
    const catA = a.category || 'Other';
    const catB = b.category || 'Other';
    const indexA = CATEGORY_ORDER.indexOf(catA);
    const indexB = CATEGORY_ORDER.indexOf(catB);
    // If not in order list, put before Memecoins but after known categories
    const orderA = indexA === -1 ? CATEGORY_ORDER.length - 2 : indexA;
    const orderB = indexB === -1 ? CATEGORY_ORDER.length - 2 : indexB;
    return orderA - orderB;
  });
}

export async function GET() {
  try {
    const items = await getTierMakerItems();
    // Normalize categories
    const normalizedItems = items.map((item: any) => ({
      ...item,
      category: item.category ? normalizeCategory(item.category) : 'Other',
    }));
    // Sort by category order
    const sortedItems = sortByCategory(normalizedItems);
    return NextResponse.json(sortedItems);
  } catch (error) {
    console.error('Error fetching tier maker items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { items } = await request.json();
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Items must be an array' }, { status: 400 });
    }
    await addTierMakerItems(items);
    return NextResponse.json({ success: true, count: items.length });
  } catch (error) {
    console.error('Error adding tier maker items:', error);
    return NextResponse.json({ error: 'Failed to add items' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { name, newUrl } = await request.json();
    if (!name || !newUrl) {
      return NextResponse.json({ error: 'name and newUrl are required' }, { status: 400 });
    }
    await updateTierMakerItem(name, newUrl);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating tier maker item:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}
