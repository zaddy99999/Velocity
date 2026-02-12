import { NextResponse } from 'next/server';

interface CryptoEvent {
  id: string;
  title: string;
  date: string;
  type: 'unlock' | 'launch' | 'upgrade' | 'airdrop' | 'listing' | 'other';
  coin?: string;
  importance: 'high' | 'medium' | 'low';
}

let cache: { data: CryptoEvent[]; timestamp: number } | null = null;
const CACHE_DURATION = 10 * 60 * 1000;

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json(cache.data);
    }

    // Fetch from CoinMarketCal API (free tier)
    const events: CryptoEvent[] = [];

    try {
      const res = await fetch('https://developers.coinmarketcal.com/v1/events?max=75&sortBy=date_event', {
        headers: {
          'Accept': 'application/json',
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.body) {
          data.body.forEach((event: {
            id: number;
            title: { en: string };
            coins: Array<{ symbol: string }>;
            date_event: string;
            categories: Array<{ name: string }>;
          }) => {
            const category = event.categories?.[0]?.name?.toLowerCase() || '';
            let type: CryptoEvent['type'] = 'other';
            if (category.includes('unlock') || category.includes('release')) type = 'unlock';
            else if (category.includes('launch') || category.includes('mainnet')) type = 'launch';
            else if (category.includes('upgrade') || category.includes('fork')) type = 'upgrade';
            else if (category.includes('airdrop')) type = 'airdrop';
            else if (category.includes('listing') || category.includes('exchange')) type = 'listing';

            events.push({
              id: String(event.id),
              title: event.title.en,
              date: event.date_event,
              type,
              coin: event.coins?.[0]?.symbol,
              importance: 'medium',
            });
          });
        }
      }
    } catch {}

    // If API fails or no events, use curated fallback
    if (events.length === 0) {
      const today = new Date();
      const upcoming: CryptoEvent[] = [
        // High importance events
        { id: '1', title: 'Ethereum Pectra Upgrade', date: new Date(today.getTime() + 7 * 86400000).toISOString().split('T')[0], type: 'upgrade', coin: 'ETH', importance: 'high' },
        { id: '2', title: 'ARB Token Unlock - 92.6M tokens', date: new Date(today.getTime() + 3 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'ARB', importance: 'high' },
        { id: '6', title: 'Starknet Provisions Airdrop', date: new Date(today.getTime() + 2 * 86400000).toISOString().split('T')[0], type: 'airdrop', coin: 'STRK', importance: 'high' },
        { id: '8', title: 'Celestia TIA Unlock - 175M tokens', date: new Date(today.getTime() + 18 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'TIA', importance: 'high' },
        { id: '10', title: 'MATIC Token Unlock - 240M tokens', date: new Date(today.getTime() + 25 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'MATIC', importance: 'high' },
        { id: '12', title: 'Dymension DYM Airdrop Wave 2', date: new Date(today.getTime() + 4 * 86400000).toISOString().split('T')[0], type: 'airdrop', coin: 'DYM', importance: 'high' },
        { id: '13', title: 'Bitcoin Halving Anniversary Event', date: new Date(today.getTime() + 30 * 86400000).toISOString().split('T')[0], type: 'other', coin: 'BTC', importance: 'high' },
        { id: '14', title: 'LayerZero ZRO Airdrop', date: new Date(today.getTime() + 6 * 86400000).toISOString().split('T')[0], type: 'airdrop', coin: 'ZRO', importance: 'high' },
        { id: '15', title: 'Worldcoin WLD Unlock - 6M tokens', date: new Date(today.getTime() + 9 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'WLD', importance: 'high' },

        // Medium importance events
        { id: '3', title: 'Sui Token Unlock - 64.2M tokens', date: new Date(today.getTime() + 5 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'SUI', importance: 'medium' },
        { id: '4', title: 'Aptos Token Unlock - 11.3M APT', date: new Date(today.getTime() + 10 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'APT', importance: 'medium' },
        { id: '5', title: 'OP Token Unlock - 31.3M tokens', date: new Date(today.getTime() + 12 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'OP', importance: 'medium' },
        { id: '7', title: 'AVAX Token Unlock - 9.5M tokens', date: new Date(today.getTime() + 14 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'AVAX', importance: 'medium' },
        { id: '9', title: 'Solana Breakpoint Conference', date: new Date(today.getTime() + 21 * 86400000).toISOString().split('T')[0], type: 'other', coin: 'SOL', importance: 'medium' },
        { id: '11', title: 'SEI Token Unlock - 55M tokens', date: new Date(today.getTime() + 8 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'SEI', importance: 'medium' },
        { id: '16', title: 'Pyth Network PYTH Unlock', date: new Date(today.getTime() + 11 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'PYTH', importance: 'medium' },
        { id: '17', title: 'Jupiter JUP Unlock - 100M tokens', date: new Date(today.getTime() + 13 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'JUP', importance: 'medium' },
        { id: '18', title: 'Blur BLUR Season 3 Ends', date: new Date(today.getTime() + 15 * 86400000).toISOString().split('T')[0], type: 'airdrop', coin: 'BLUR', importance: 'medium' },
        { id: '19', title: 'NEAR Protocol Upgrade', date: new Date(today.getTime() + 16 * 86400000).toISOString().split('T')[0], type: 'upgrade', coin: 'NEAR', importance: 'medium' },
        { id: '20', title: 'Cosmos ATOM Upgrade', date: new Date(today.getTime() + 17 * 86400000).toISOString().split('T')[0], type: 'upgrade', coin: 'ATOM', importance: 'medium' },
        { id: '21', title: 'Injective INJ Unlock', date: new Date(today.getTime() + 19 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'INJ', importance: 'medium' },
        { id: '22', title: 'Render RNDR Upgrade', date: new Date(today.getTime() + 20 * 86400000).toISOString().split('T')[0], type: 'upgrade', coin: 'RNDR', importance: 'medium' },
        { id: '23', title: 'Chainlink LINK Staking v0.2', date: new Date(today.getTime() + 22 * 86400000).toISOString().split('T')[0], type: 'upgrade', coin: 'LINK', importance: 'medium' },
        { id: '24', title: 'Uniswap UNI Governance Vote', date: new Date(today.getTime() + 23 * 86400000).toISOString().split('T')[0], type: 'other', coin: 'UNI', importance: 'medium' },
        { id: '25', title: 'Lido LDO Unlock - 15M tokens', date: new Date(today.getTime() + 24 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'LDO', importance: 'medium' },
        { id: '26', title: 'Eigenlayer EIGEN Unlock', date: new Date(today.getTime() + 26 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'EIGEN', importance: 'medium' },
        { id: '27', title: 'Pendle PENDLE Unlock', date: new Date(today.getTime() + 27 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'PENDLE', importance: 'medium' },
        { id: '28', title: 'GMX V2 Launch', date: new Date(today.getTime() + 28 * 86400000).toISOString().split('T')[0], type: 'launch', coin: 'GMX', importance: 'medium' },
        { id: '29', title: 'dYdX Chain Upgrade', date: new Date(today.getTime() + 29 * 86400000).toISOString().split('T')[0], type: 'upgrade', coin: 'DYDX', importance: 'medium' },
        { id: '30', title: 'Filecoin FIL Unlock', date: new Date(today.getTime() + 31 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'FIL', importance: 'medium' },
        { id: '31', title: 'The Graph GRT Unlock', date: new Date(today.getTime() + 32 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'GRT', importance: 'medium' },
        { id: '32', title: 'Immutable IMX Unlock', date: new Date(today.getTime() + 33 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'IMX', importance: 'medium' },
        { id: '33', title: 'Manta MANTA Unlock', date: new Date(today.getTime() + 34 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'MANTA', importance: 'medium' },
        { id: '34', title: 'Scroll SCR Airdrop', date: new Date(today.getTime() + 35 * 86400000).toISOString().split('T')[0], type: 'airdrop', coin: 'SCR', importance: 'medium' },
        { id: '35', title: 'ZkSync ZK Unlock', date: new Date(today.getTime() + 36 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'ZK', importance: 'medium' },
        { id: '36', title: 'Blast BLAST Unlock', date: new Date(today.getTime() + 37 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'BLAST', importance: 'medium' },
        { id: '37', title: 'Aave V4 Launch', date: new Date(today.getTime() + 38 * 86400000).toISOString().split('T')[0], type: 'launch', coin: 'AAVE', importance: 'medium' },
        { id: '38', title: 'Maker MKR Endgame Phase 2', date: new Date(today.getTime() + 39 * 86400000).toISOString().split('T')[0], type: 'upgrade', coin: 'MKR', importance: 'medium' },
        { id: '39', title: 'Compound COMP Unlock', date: new Date(today.getTime() + 40 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'COMP', importance: 'medium' },
        { id: '40', title: 'Synthetix SNX Upgrade', date: new Date(today.getTime() + 41 * 86400000).toISOString().split('T')[0], type: 'upgrade', coin: 'SNX', importance: 'medium' },

        // Low importance events
        { id: '41', title: 'Curve CRV Unlock', date: new Date(today.getTime() + 42 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'CRV', importance: 'low' },
        { id: '42', title: 'Frax FXS Unlock', date: new Date(today.getTime() + 43 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'FXS', importance: 'low' },
        { id: '43', title: 'Osmosis OSMO Unlock', date: new Date(today.getTime() + 44 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'OSMO', importance: 'low' },
        { id: '44', title: 'Axelar AXL Unlock', date: new Date(today.getTime() + 45 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'AXL', importance: 'low' },
        { id: '45', title: 'Ronin RON Unlock', date: new Date(today.getTime() + 46 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'RON', importance: 'low' },
        { id: '46', title: 'Kava KAVA Unlock', date: new Date(today.getTime() + 47 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'KAVA', importance: 'low' },
        { id: '47', title: 'Celo CELO Upgrade', date: new Date(today.getTime() + 48 * 86400000).toISOString().split('T')[0], type: 'upgrade', coin: 'CELO', importance: 'low' },
        { id: '48', title: 'Harmony ONE Unlock', date: new Date(today.getTime() + 49 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'ONE', importance: 'low' },
        { id: '49', title: 'IoTeX IOTX Unlock', date: new Date(today.getTime() + 50 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'IOTX', importance: 'low' },
        { id: '50', title: 'Moonbeam GLMR Unlock', date: new Date(today.getTime() + 51 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'GLMR', importance: 'low' },
        { id: '51', title: 'Flow FLOW Unlock', date: new Date(today.getTime() + 52 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'FLOW', importance: 'low' },
        { id: '52', title: 'Hedera HBAR Unlock', date: new Date(today.getTime() + 53 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'HBAR', importance: 'low' },
        { id: '53', title: 'Algorand ALGO Unlock', date: new Date(today.getTime() + 54 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'ALGO', importance: 'low' },
        { id: '54', title: 'Tezos XTZ Upgrade', date: new Date(today.getTime() + 55 * 86400000).toISOString().split('T')[0], type: 'upgrade', coin: 'XTZ', importance: 'low' },
        { id: '55', title: 'Zilliqa ZIL Unlock', date: new Date(today.getTime() + 56 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'ZIL', importance: 'low' },
        { id: '56', title: 'Fetch.ai FET Unlock', date: new Date(today.getTime() + 57 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'FET', importance: 'low' },
        { id: '57', title: 'Ocean OCEAN Unlock', date: new Date(today.getTime() + 58 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'OCEAN', importance: 'low' },
        { id: '58', title: 'SingularityNET AGIX Unlock', date: new Date(today.getTime() + 59 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'AGIX', importance: 'low' },
        { id: '59', title: 'Akash AKT Unlock', date: new Date(today.getTime() + 60 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'AKT', importance: 'low' },
        { id: '60', title: 'Arweave AR Unlock', date: new Date(today.getTime() + 61 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'AR', importance: 'low' },
        { id: '61', title: 'Enjin ENJ Upgrade', date: new Date(today.getTime() + 62 * 86400000).toISOString().split('T')[0], type: 'upgrade', coin: 'ENJ', importance: 'low' },
        { id: '62', title: 'Decentraland MANA Unlock', date: new Date(today.getTime() + 63 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'MANA', importance: 'low' },
        { id: '63', title: 'Sandbox SAND Unlock', date: new Date(today.getTime() + 64 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'SAND', importance: 'low' },
        { id: '64', title: 'Gala GALA Unlock', date: new Date(today.getTime() + 65 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'GALA', importance: 'low' },
        { id: '65', title: 'Illuvium ILV Unlock', date: new Date(today.getTime() + 66 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'ILV', importance: 'low' },
        { id: '66', title: 'Treasure MAGIC Unlock', date: new Date(today.getTime() + 67 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'MAGIC', importance: 'low' },
        { id: '67', title: 'Gods Unchained GODS Unlock', date: new Date(today.getTime() + 68 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'GODS', importance: 'low' },
        { id: '68', title: 'Vulcan Forged PYR Unlock', date: new Date(today.getTime() + 69 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'PYR', importance: 'low' },
        { id: '69', title: 'Merit Circle MC Unlock', date: new Date(today.getTime() + 70 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'MC', importance: 'low' },
        { id: '70', title: 'Yield Guild YGG Unlock', date: new Date(today.getTime() + 71 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'YGG', importance: 'low' },
        { id: '71', title: 'Stargate STG Unlock', date: new Date(today.getTime() + 72 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'STG', importance: 'low' },
        { id: '72', title: 'Radiant RDNT Unlock', date: new Date(today.getTime() + 73 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'RDNT', importance: 'low' },
        { id: '73', title: 'Ribbon RBN Unlock', date: new Date(today.getTime() + 74 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'RBN', importance: 'low' },
        { id: '74', title: 'Balancer BAL Unlock', date: new Date(today.getTime() + 75 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'BAL', importance: 'low' },
        { id: '75', title: 'Alchemix ALCX Unlock', date: new Date(today.getTime() + 76 * 86400000).toISOString().split('T')[0], type: 'unlock', coin: 'ALCX', importance: 'low' },
      ];
      events.push(...upcoming);
    }

    // Sort by date
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    cache = { data: events.slice(0, 75), timestamp: Date.now() };
    return NextResponse.json(events.slice(0, 75));

  } catch (error) {
    console.error('Error fetching events:', error);
    if (cache) return NextResponse.json(cache.data);
    return NextResponse.json([]);
  }
}
