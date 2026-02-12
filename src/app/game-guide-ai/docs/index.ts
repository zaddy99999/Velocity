// Game documents - Add your game documentation here
// The AI will use these documents as context when answering questions

export interface GameDocument {
  title: string;
  content: string;
}

export interface GameDocs {
  [gameId: string]: GameDocument[];
}

// Add your game documentation below
// You can paste full documents, guides, FAQs, etc.

export const GAME_DOCS: GameDocs = {
  'general': [
    {
      title: 'Abstract Chain Overview',
      content: `
Abstract is a Layer 2 blockchain built for consumer crypto applications, particularly gaming and NFTs.
It's designed to make Web3 accessible to mainstream users with low fees and fast transactions.

Key features:
- EVM compatible
- Low gas fees
- Fast transaction finality
- Focus on gaming and consumer apps
- Strong NFT ecosystem
      `.trim(),
    },
  ],

  'gigaverse': [
    {
      title: 'Gigaverse Overview',
      content: `
Gigaverse features ROMs and Giglings NFT collections on Abstract.
[Add your Gigaverse documentation here]
      `.trim(),
    },
  ],

  'moody-madness': [
    {
      title: 'Moody Madness Overview',
      content: `
Moody Madness is a game on Abstract.
[Add your Moody Madness documentation here]
      `.trim(),
    },
  ],

  'hamieverse': [
    {
      title: 'Hamieverse Overview',
      content: `
Hamieverse Genesis is a hamster-themed gaming world on Abstract.
[Add your Hamieverse documentation here]
      `.trim(),
    },
  ],

  'ruyui': [
    {
      title: 'Ruyui Overview',
      content: `
Ruyui is an NFT collection on Abstract.
[Add your Ruyui documentation here]
      `.trim(),
    },
  ],

  'cambria': [
    {
      title: 'Cambria Overview',
      content: `
Cambria is a fantasy adventure game on Abstract.
[Add your Cambria documentation here]
      `.trim(),
    },
  ],

  'duper': [
    {
      title: 'Duper Overview',
      content: `
Duper is a game on Abstract.
[Add your Duper documentation here]
      `.trim(),
    },
  ],

  'onchainheroes': [
    {
      title: 'OnchainHeroes Overview',
      content: `
OnchainHeroes (OCH) is a hero battle game on Abstract.
[Add your OnchainHeroes documentation here]
      `.trim(),
    },
  ],
};

// Helper to get docs for a specific game
export function getGameDocs(gameId: string): GameDocument[] {
  return GAME_DOCS[gameId] || GAME_DOCS['general'] || [];
}

// Helper to format docs as context string
export function formatDocsAsContext(gameId: string): string {
  const docs = getGameDocs(gameId);
  if (docs.length === 0) return '';

  return docs.map(doc => `## ${doc.title}\n${doc.content}`).join('\n\n---\n\n');
}
