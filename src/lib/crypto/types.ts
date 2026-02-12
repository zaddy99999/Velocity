export interface CoinMarketData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_1h_in_currency?: number;
  price_change_percentage_24h_in_currency?: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_14d_in_currency?: number;
  price_change_percentage_30d_in_currency?: number;
  circulating_supply?: number;
  total_supply?: number;
  max_supply?: number | null;
  sparkline_in_7d?: {
    price: number[];
  };
}

export interface GlobalData {
  total_market_cap: { usd: number };
  total_volume: { usd: number };
  market_cap_percentage: { btc: number; eth: number };
  market_cap_change_percentage_24h_usd: number;
  active_cryptocurrencies?: number;
}

export interface FearGreedData {
  value: string;
  value_classification: string;
  timestamp?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: {
    title: string;
  };
  published_at: string;
  currencies?: Array<{ code: string; title: string }>;
  category?: string;
}

export interface DeFiProtocol {
  id: string;
  name: string;
  symbol: string;
  tvl: number;
  change_1d?: number;
  change_7d?: number;
  logo?: string;
  category?: string;
}

export interface ChainData {
  id: string;
  name: string;
  tvl: number;
  symbol?: string;
  chainId?: number;
}
