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
              text: `I have two images:
1. A meme template that I want to recreate
2. A character that should replace the main subject in the meme

Please analyze both images and write a detailed DALL-E prompt that will recreate the meme scene exactly, but with the character from the second image as the main subject.

Describe:
- The exact composition, pose, and framing of the meme
- The background, lighting, and style
- How the new character should be positioned/posed to match the original
- Any text or visual elements that should be preserved

${customPrompt ? `Additional instructions: ${customPrompt}` : ''}

Return ONLY the DALL-E prompt, nothing else.`,
            },
            {
              type: 'image_url',
              image_url: { url: templateUrl },
            },
            {
              type: 'image_url',
              image_url: { url: characterUrl },
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
