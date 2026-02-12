import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const templatesDir = path.join(process.cwd(), 'public/meme-templates');

    // Read all files from the local directory
    const files = fs.readdirSync(templatesDir)
      .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
      .sort();

    const templates = files.map((file, index) => ({
      id: `template-${index}`,
      name: file.replace(/\.[^.]+$/, ''),
      imageUrl: `/meme-templates/${file}`,
      thumbnailUrl: `/meme-templates/${file}`,
    }));

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error reading meme templates:', error);
    return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 });
  }
}
