import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { readFileSync } from 'fs';
import { join } from 'path';

function getReplicate() {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN not configured');
  }
  return new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });
}

// Convert local file path to base64 data URL
async function toDataUrl(url: string): Promise<string> {
  // Already a data URL
  if (url.startsWith('data:')) {
    return url;
  }

  // Local file path - read from public folder
  if (url.startsWith('/')) {
    const filePath = join(process.cwd(), 'public', url);
    const buffer = readFileSync(filePath);
    const base64 = buffer.toString('base64');
    const ext = url.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
    return `data:${mimeType};base64,${base64}`;
  }

  // External URL - fetch and convert to base64
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${url}`);
  }
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  return `data:${contentType};base64,${base64}`;
}

export async function POST(request: NextRequest) {
  try {
    const { templateUrl, characterUrl } = await request.json();

    if (!templateUrl || !characterUrl) {
      return NextResponse.json({ error: 'Both template and character images required' }, { status: 400 });
    }

    console.log('Starting face swap with Replicate...');
    console.log('Character URL type:', characterUrl.startsWith('data:') ? 'data URL' : characterUrl.substring(0, 50));
    console.log('Template URL type:', templateUrl.startsWith('data:') ? 'data URL' : templateUrl.substring(0, 50));

    // Convert images to data URLs so Replicate can access them
    const [templateDataUrl, characterDataUrl] = await Promise.all([
      toDataUrl(templateUrl),
      toDataUrl(characterUrl),
    ]);

    console.log('Converted to data URLs, calling Replicate...');

    const replicate = getReplicate();

    // Create prediction
    const prediction = await replicate.predictions.create({
      version: "278a81e7ebb22db98bcba54de985d22cc1abeead2754eb1f2af717247be69b34",
      input: {
        input_image: templateDataUrl,
        swap_image: characterDataUrl,
      }
    });

    console.log('Prediction created:', prediction.id);

    // Poll for completion (up to 60 seconds)
    let result = prediction;
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      if (result.status === 'succeeded' || result.status === 'failed') {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
      result = await replicate.predictions.get(prediction.id);
      console.log(`Poll ${i + 1}: status=${result.status}`);
    }

    console.log('Final result:', JSON.stringify(result));

    if (result.status === 'failed') {
      throw new Error(result.error || 'Prediction failed');
    }

    const generatedUrl = result.output;
    console.log('Output URL:', generatedUrl);

    if (!generatedUrl) {
      // Check logs for face detection issue
      const logs = (result as any).logs || '';
      if (logs.includes('No face') || logs.includes('None None')) {
        return NextResponse.json({
          error: 'No face detected in one of the images. Try images with clearer, front-facing faces.'
        }, { status: 400 });
      }
      return NextResponse.json({
        error: 'Generation failed - no output received'
      }, { status: 500 });
    }

    return NextResponse.json({
      imageUrl: generatedUrl,
    });

  } catch (error: any) {
    console.error('Meme generation error:', error);
    const errorMessage = error?.message || 'Generation failed';

    // Handle rate limiting
    if (errorMessage.includes('429') || errorMessage.includes('throttled')) {
      return NextResponse.json({
        error: 'Rate limited - please wait a few seconds and try again. Add $5+ to Replicate for faster limits.',
      }, { status: 429 });
    }

    // Handle payment issues
    if (errorMessage.includes('402') || errorMessage.includes('credit')) {
      return NextResponse.json({
        error: 'Replicate credits needed. Add funds at replicate.com/account/billing',
      }, { status: 402 });
    }

    // Handle no face detected
    if (errorMessage.includes('No face') || errorMessage.includes('face found')) {
      return NextResponse.json({
        error: 'No face detected in one of the images. Make sure both images have clear, visible faces.',
      }, { status: 400 });
    }

    return NextResponse.json({
      error: errorMessage,
    }, { status: 500 });
  }
}
