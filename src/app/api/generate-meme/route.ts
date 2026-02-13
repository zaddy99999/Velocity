import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { templateUrl, characterUrl, customPrompt } = await request.json();

    if (!templateUrl || !characterUrl) {
      return NextResponse.json({ error: 'Both template and character images required' }, { status: 400 });
    }

    // Step 1: Use GPT-4 Vision to understand both images and create a detailed prompt
    const visionResponse = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a meme recreation expert. I'm giving you two images:

IMAGE 1 (Character): This is the character/person I want to INSERT into the meme.
IMAGE 2 (Meme Template): This is the popular meme format I want to recreate.

Your task: Write a DALL-E prompt that recreates the meme template EXACTLY - same composition, pose, background, lighting, style, and visual elements - but with the character from Image 1 swapped in as the main subject.

Key requirements:
- Preserve the EXACT pose, angle, and body position from the meme template
- Keep the background, setting, and all environmental details identical
- Maintain the same art style, lighting, and mood
- The character from Image 1 should be recognizable but posed exactly like the original meme subject
- Include any iconic visual elements that make this meme recognizable

${customPrompt ? `Additional instructions: ${customPrompt}` : ''}

Return ONLY the DALL-E prompt, nothing else. Be specific and detailed.`,
            },
            {
              type: 'image_url',
              image_url: { url: characterUrl },
            },
            {
              type: 'image_url',
              image_url: { url: templateUrl },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const dallePrompt = visionResponse.choices[0]?.message?.content;

    if (!dallePrompt) {
      return NextResponse.json({ error: 'Failed to generate prompt' }, { status: 500 });
    }

    // Step 2: Generate the image with DALL-E
    const imageResponse = await getOpenAI().images.generate({
      model: 'dall-e-3',
      prompt: dallePrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    const generatedUrl = imageResponse.data?.[0]?.url;

    if (!generatedUrl) {
      return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
    }

    return NextResponse.json({
      imageUrl: generatedUrl,
      prompt: dallePrompt
    });

  } catch (error: any) {
    console.error('Meme generation error:', error);
    return NextResponse.json({
      error: error.message || 'Generation failed'
    }, { status: 500 });
  }
}
