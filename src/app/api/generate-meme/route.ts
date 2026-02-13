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
              text: `You are creating a DALL-E prompt to recreate a meme with a different character.

IMAGE 1: The CHARACTER to use (analyze this carefully - note every visual detail)
IMAGE 2: The MEME TEMPLATE to recreate (the scene/pose to copy)

STEP 1 - Describe the CHARACTER from Image 1 in extreme detail:
- What type of character is it? (cartoon, pixel art, anime, photo, mascot, etc.)
- Exact colors (skin/fur color, clothing colors, any accessories)
- Distinctive features (hat, glasses, expression, pose, style)
- Art style (flat colors, gradients, realistic, cartoon, etc.)

STEP 2 - Describe the MEME TEMPLATE from Image 2:
- What is the scene/setting?
- What pose/action is the subject doing?
- What makes this meme recognizable?
- Background details, lighting, composition

STEP 3 - Write a DALL-E prompt that:
- Places the EXACT character from Image 1 (with all their specific visual features) into the scene from Image 2
- The character must look IDENTICAL to Image 1 - same colors, same style, same features
- The pose/scene must match Image 2 exactly
- Keep the same art style as Image 1 (don't make a cartoon realistic or vice versa)

${customPrompt ? `Additional instructions: ${customPrompt}` : ''}

Return ONLY the final DALL-E prompt. Be extremely specific about the character's appearance so DALL-E recreates them accurately.`,
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
