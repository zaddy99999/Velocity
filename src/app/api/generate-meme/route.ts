import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';

function getReplicate() {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN not configured');
  }
  return new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { templateUrl, characterUrl } = await request.json();

    if (!templateUrl || !characterUrl) {
      return NextResponse.json({ error: 'Both template and character images required' }, { status: 400 });
    }

    console.log('Starting face swap with Replicate...');
    console.log('Character (swap_image):', characterUrl.substring(0, 100) + '...');
    console.log('Template (target_image):', templateUrl.substring(0, 100) + '...');

    const replicate = getReplicate();

    // Use face-swap model: swap the character face into the meme template
    const output = await replicate.run(
      "codeplugtech/face-swap:278a81e7ebb22db98bcba54de985d22cc1abeead2754eb1f2af717247be69b34",
      {
        input: {
          swap_image: characterUrl,    // The face/character to insert
          target_image: templateUrl,   // The meme template (target scene)
        }
      }
    );

    console.log('Replicate output:', output);

    if (!output) {
      return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
    }

    // Output is the URL of the generated image
    const generatedUrl = typeof output === 'string' ? output : (output as any)[0];

    return NextResponse.json({
      imageUrl: generatedUrl,
    });

  } catch (error: any) {
    console.error('Meme generation error:', error);
    const errorMessage = error?.message || 'Generation failed';
    return NextResponse.json({
      error: errorMessage,
    }, { status: 500 });
  }
}
