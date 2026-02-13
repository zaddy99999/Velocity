'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface ChainMarketData {
  timestamp: number;
  total: number;
  BTC: number;
  ETH: number;
  SOL: number;
  BNB: number;
  XRP: number;
  Others: number;
}

interface MarketHistoryData {
  marketCap: ChainMarketData[];
  volume: ChainMarketData[];
  dominance: { timestamp: number; BTC: number; ETH: number; SOL: number; Others: number }[];
}

type ChartType = 'marketcap' | 'dominance' | 'volume' | 'tvl';
type TimePeriod = '1' | '7' | '30' | '90';

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'marketcap', label: 'Market Cap' },
  { value: 'dominance', label: 'Dominance' },
  { value: 'volume', label: 'Volume' },
  { value: 'tvl', label: 'DeFi TVL' },
];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PriceChart() {
  const [chartType, setChartType] = useState<ChartType>('marketcap');
  const [period, setPeriod] = useState<TimePeriod>('7');

  const { data: marketData, isLoading: marketLoading } = useSWR<MarketHistoryData>(
    `/api/crypto/market-history?days=${period}`,
    fetcher,
    { refreshInterval: 600000 }
  );

  const [enabledMarketCoins, setEnabledMarketCoins] = useState<Set<string>>(
    new Set(['total', 'BTC', 'ETH'])
  );

  const toggleMarketCoin = (symbol: string) => {
    setEnabledMarketCoins((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  };

  const MARKET_COINS = [
    { symbol: 'total', color: '#2edb84', label: 'Total', logo: null },
    { symbol: 'BTC', color: '#F7931A', label: 'BTC', logo: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
    { symbol: 'ETH', color: '#627EEA', label: 'ETH', logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
    { symbol: 'SOL', color: '#00FFA3', label: 'SOL', logo: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
    { symbol: 'BNB', color: '#F3BA2F', label: 'BNB', logo: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png' },
    { symbol: 'XRP', color: '#23292F', label: 'XRP', logo: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png' },
  ];

  const DOMINANCE_COINS = [
    { symbol: 'BTC', color: '#F7931A', label: 'Bitcoin', logo: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
    { symbol: 'ETH', color: '#627EEA', label: 'Ethereum', logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
    { symbol: 'SOL', color: '#00FFA3', label: 'Solana', logo: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
    { symbol: 'Others', color: '#888', label: 'Others', logo: null },
  ];

  const { data: tvlData, isLoading: tvlLoading } = useSWR<{ timestamp: number; tvl: number }[]>(
    `/api/crypto/tvl-history?days=${period}`,
    fetcher,
    { refreshInterval: 600000 }
  );

  const isLoading = marketLoading || (chartType === 'tvl' && tvlLoading);

  if (isLoading) {
    return (
      <div className="price-chart-card">
        <div className="price-chart-header">
          <p className="widget-label">Market Charts</p>
        </div>
        <div className="price-chart-container">
          <div className="skeleton" style={{ height: 300 }} />
        </div>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    if (period === '1') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatValue = (value: number, type: ChartType) => {
    if (type === 'dominance') return `${value.toFixed(1)}%`;
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    return `$${(value / 1e6).toFixed(0)}M`;
  };

  // Render market cap chart
  const renderMarketCapChart = () => {
    if (!marketData?.marketCap) return <div className="chart-placeholder">Loading market data...</div>;

    return (
      <>
        <div className="coin-toggles-with-logos">
          {MARKET_COINS.map((coin) => (
            <button
              key={coin.symbol}
              className={`coin-toggle-logo ${enabledMarketCoins.has(coin.symbol) ? 'active' : ''}`}
              style={{
                borderColor: enabledMarketCoins.has(coin.symbol) ? coin.color : undefined,
              }}
              onClick={() => toggleMarketCoin(coin.symbol)}
            >
              {coin.logo ? (
                <img src={coin.logo} alt={coin.label} className="coin-toggle-img" />
              ) : (
                <span className="coin-toggle-icon" style={{ color: coin.color }}>$</span>
              )}
              <span style={{ color: enabledMarketCoins.has(coin.symbol) ? coin.color : undefined }}>
                {coin.label}
              </span>
            </button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={marketData.marketCap} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="timestamp" tickFormatter={formatDate} stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(v) => formatValue(v, 'marketcap')} stroke="#666" fontSize={10} tickLine={false} axisLine={false} width={55} />
            <Tooltip
              contentStyle={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
              labelFormatter={(ts) => new Date(ts).toLocaleString()}
              formatter={(v: number, name: string) => [formatValue(v, 'marketcap'), name]}
            />
            {MARKET_COINS.filter(c => enabledMarketCoins.has(c.symbol)).map((coin) => (
              <Line key={coin.symbol} type="monotone" dataKey={coin.symbol} stroke={coin.color} strokeWidth={coin.symbol === 'total' ? 3 : 2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </>
    );
  };

  // Render dominance chart
  const renderDominanceChart = () => {
    if (!marketData?.dominance) return <div className="chart-placeholder">Loading dominance data...</div>;

    // Get latest dominance values
    const latest = marketData.dominance[marketData.dominance.length - 1];

    return (
      <>
        <div className="dominance-legend">
          {DOMINANCE_COINS.map((coin) => (
            <div key={coin.symbol} className="dominance-legend-item">
              {coin.logo ? (
                <img src={coin.logo} alt={coin.label} className="dominance-legend-img" />
              ) : (
                <span className="dominance-legend-dot" style={{ background: coin.color }} />
              )}
              <span className="dominance-legend-label">{coin.label}</span>
              <span className="dominance-legend-value" style={{ color: coin.color }}>
                {latest ? `${(latest[coin.symbol as keyof typeof latest] as number * 100).toFixed(1)}%` : '-'}
              </span>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart data={marketData.dominance} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} stackOffset="expand">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="timestamp" tickFormatter={formatDate} stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} stroke="#666" fontSize={10} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              contentStyle={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
              labelFormatter={(ts) => new Date(ts).toLocaleString()}
              formatter={(v: number, name: string) => [`${(v * 100).toFixed(1)}%`, name]}
            />
            <Area type="monotone" dataKey="BTC" stackId="1" stroke="#F7931A" fill="#F7931A" name="BTC" />
            <Area type="monotone" dataKey="ETH" stackId="1" stroke="#627EEA" fill="#627EEA" name="ETH" />
            <Area type="monotone" dataKey="SOL" stackId="1" stroke="#00FFA3" fill="#00FFA3" name="SOL" />
            <Area type="monotone" dataKey="Others" stackId="1" stroke="#888" fill="#444" name="Others" />
          </AreaChart>
        </ResponsiveContainer>
      </>
    );
  };

  // Render volume chart
  const renderVolumeChart = () => {
    if (!marketData?.volume) return <div className="chart-placeholder">Loading volume data...</div>;

    return (
      <>
        <div className="coin-toggles-with-logos">
          {MARKET_COINS.map((coin) => (
            <button
              key={coin.symbol}
              className={`coin-toggle-logo ${enabledMarketCoins.has(coin.symbol) ? 'active' : ''}`}
              style={{
                borderColor: enabledMarketCoins.has(coin.symbol) ? coin.color : undefined,
              }}
              onClick={() => toggleMarketCoin(coin.symbol)}
            >
              {coin.logo ? (
                <img src={coin.logo} alt={coin.label} className="coin-toggle-img" />
              ) : (
                <span className="coin-toggle-icon" style={{ color: coin.color }}>$</span>
              )}
              <span style={{ color: enabledMarketCoins.has(coin.symbol) ? coin.color : undefined }}>
                {coin.label}
              </span>
            </button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={marketData.volume} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="timestamp" tickFormatter={formatDate} stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(v) => formatValue(v, 'volume')} stroke="#666" fontSize={10} tickLine={false} axisLine={false} width={55} />
            <Tooltip
              contentStyle={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
              labelFormatter={(ts) => new Date(ts).toLocaleString()}
              formatter={(v: number, name: string) => [formatValue(v, 'volume'), name]}
            />
            {MARKET_COINS.filter(c => enabledMarketCoins.has(c.symbol)).map((coin) => (
              <Line key={coin.symbol} type="monotone" dataKey={coin.symbol} stroke={coin.color} strokeWidth={coin.symbol === 'total' ? 3 : 2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </>
    );
  };

  // Render TVL chart
  const renderTVLChart = () => {
    if (!tvlData || tvlData.length === 0) return <div className="chart-placeholder">Loading TVL data...</div>;

    // Get latest and first TVL for change calculation
    const latestTvl = tvlData[tvlData.length - 1]?.tvl || 0;
    const firstTvl = tvlData[0]?.tvl || 0;
    const tvlChange = firstTvl > 0 ? ((latestTvl - firstTvl) / firstTvl) * 100 : 0;

    return (
      <>
        <div className="tvl-header">
          <div className="tvl-stat">
            <span className="tvl-label">Total Value Locked</span>
            <span className="tvl-value">{formatValue(latestTvl, 'tvl')}</span>
          </div>
          <div className="tvl-stat">
            <span className="tvl-label">{period}D Change</span>
            <span className={`tvl-change ${tvlChange >= 0 ? 'positive' : 'negative'}`}>
              {tvlChange >= 0 ? '+' : ''}{tvlChange.toFixed(2)}%
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart data={tvlData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="timestamp" tickFormatter={formatDate} stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(v) => formatValue(v, 'tvl')} stroke="#666" fontSize={10} tickLine={false} axisLine={false} width={55} />
            <Tooltip
              contentStyle={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
              labelFormatter={(ts) => new Date(ts).toLocaleString()}
              formatter={(v: number) => [formatValue(v, 'tvl'), 'Total TVL']}
            />
            <Area type="monotone" dataKey="tvl" stroke="#ec4899" fill="rgba(236, 72, 153, 0.2)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </>
    );
  };

  const renderChart = () => {
    switch (chartType) {
      case 'marketcap': return renderMarketCapChart();
      case 'dominance': return renderDominanceChart();
      case 'volume': return renderVolumeChart();
      case 'tvl': return renderTVLChart();
      default: return renderMarketCapChart();
    }
  };

  return (
    <div className="price-chart-card">
      <div className="price-chart-header">
        <p className="widget-label">Market Charts</p>
        <div className="price-chart-controls">
          <div className="chart-type-toggles">
            {CHART_TYPES.map((ct) => (
              <button
                key={ct.value}
                className={`chart-toggle ${chartType === ct.value ? 'active' : ''}`}
                onClick={() => setChartType(ct.value)}
              >
                {ct.label}
              </button>
            ))}
          </div>
          <div className="chart-period-toggles">
            {(['1', '7', '30', '90'] as TimePeriod[]).map((p) => (
              <button
                key={p}
                className={`chart-toggle ${period === p ? 'active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p}D
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="price-chart-container">
        {renderChart()}
      </div>

      <div className="price-chart-footer">
        <span className="chart-note">
          {chartType === 'marketcap' && 'Total crypto market cap'}
          {chartType === 'dominance' && 'Market share by coin'}
          {chartType === 'volume' && '24h trading volume'}
          {chartType === 'tvl' && 'Total value locked in DeFi'}
        </span>
        <a href="https://www.coingecko.com/" target="_blank" rel="noopener noreferrer" className="data-source-link">
          Data from CoinGecko
        </a>
      </div>
    </div>
  );
}
