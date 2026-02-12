'use client';

import { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

// Runescape-style skill calculation from wallet data
interface WalletSkills {
  trading: number;      // Trading volume → level
  collecting: number;   // NFT count → level
  exploring: number;    // Contracts interacted → level
  holding: number;      // Balance + age → level
  speed: number;        // Tx per active day → level
  badges: number;       // Badge count → level
  gas: number;          // Gas spent → level
  profit: number;       // P&L performance → level
  tokens: number;       // Token diversity → level
}

function calculateSkillLevels(data: WalletData): WalletSkills {
  // Convert metrics to levels (1-99 like Runescape)
  const volumeUsd = parseFloat(data.tradingVolumeUsd?.replace(/[^0-9.]/g, '') || '0');
  const txPerDay = data.activeDays > 0 ? data.transactionCount / data.activeDays : 0;
  const profitRatio = data.ethReceived > 0 ? (data.ethReceived - data.ethSent) / data.ethReceived : 0;

  return {
    trading: Math.min(99, Math.max(1, Math.floor(Math.log10(volumeUsd + 1) * 15))),
    collecting: Math.min(99, Math.max(1, Math.floor(Math.log10(data.nftCount + 1) * 25))),
    exploring: Math.min(99, Math.max(1, Math.floor(data.contractsInteracted * 1.5))),
    holding: Math.min(99, Math.max(1, Math.floor((data.walletAgeDays || 0) / 4))),
    speed: Math.min(99, Math.max(1, Math.floor(txPerDay * 5))),
    badges: Math.min(99, Math.max(1, (data.abstractBadgeCount || 0) * 4)),
    gas: Math.min(99, Math.max(1, Math.floor(parseFloat(data.totalGasUsedUsd?.replace(/[^0-9.]/g, '') || '0') / 2))),
    profit: Math.min(99, Math.max(1, Math.floor(50 + profitRatio * 49))),
    tokens: Math.min(99, Math.max(1, data.tokenCount * 3)),
  };
}

function getTotalLevel(skills: WalletSkills): number {
  return Object.values(skills).reduce((sum, level) => sum + level, 0);
}

// Skill icons (emoji-based for simplicity, can replace with custom icons)
const SKILL_CONFIG: { key: keyof WalletSkills; name: string; icon: string; color: string }[] = [
  { key: 'trading', name: 'Trading', icon: '📈', color: '#f1c40f' },
  { key: 'collecting', name: 'Collecting', icon: '🎨', color: '#9b59b6' },
  { key: 'exploring', name: 'Exploring', icon: '🧭', color: '#3498db' },
  { key: 'holding', name: 'Holding', icon: '💎', color: '#1abc9c' },
  { key: 'speed', name: 'Speed', icon: '⚡', color: '#e74c3c' },
  { key: 'badges', name: 'Badges', icon: '🏅', color: '#2edb84' },
  { key: 'gas', name: 'Gas', icon: '⛽', color: '#e67e22' },
  { key: 'profit', name: 'Profit', icon: '💰', color: '#27ae60' },
  { key: 'tokens', name: 'Tokens', icon: '🪙', color: '#f39c12' },
];

interface FavoriteApp {
  address: string;
  name: string;
  interactions: number;
  percentage: number;
}

interface Badge {
  id: string;
  label: string;
  description: string;
  color: string;
  icon: string;
  tokenId?: string;
  image?: string;
}

interface XeetCard {
  tokenId: string;
  name: string;
  image?: string;
  balance: number;
}

interface NftHolding {
  contractAddress: string;
  tokenId: string;
  name: string;
  collectionName: string;
  image?: string;
  count: number;
  estimatedValueUsd?: number;
}

interface Personality {
  title: string;
  emoji: string;
  description: string;
}

interface WalletData {
  address: string;
  balance: string;
  balanceFormatted: string;
  balanceUsd: string;
  transactionCount: number;
  firstTxDate: string | null;
  lastTxDate: string | null;
  walletAgeDays: number | null;
  activeDays: number;
  contractsInteracted: number;
  tokenCount: number;
  nftCount: number;
  totalGasUsed: string;
  totalGasUsedUsd: string;
  tradingVolume: string;
  tradingVolumeUsd: string;
  ethReceived: number;
  ethReceivedUsd: string;
  ethSent: number;
  ethSentUsd: string;
  netPnl: number;
  netPnlUsd: string;
  isProfitable: boolean;
  ethPriceUsd: number;
  favoriteApps: FavoriteApp[];
  badges: Badge[];
  abstractBadgeCount: number;
  xeetCards: XeetCard[];
  xeetCardCount: number;
  nftHoldings: NftHolding[];
  walletScore: number;
  walletRank: string;
  walletPercentile: number;
  personality: Personality;
  limitedData?: boolean;
  error?: string;
}

// Runescape-style skill tile component
function SkillTile({ skill, level }: { skill: typeof SKILL_CONFIG[0]; level: number }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: 52,
      height: 52,
      background: 'linear-gradient(180deg, #3d3224 0%, #2a2318 50%, #1a1610 100%)',
      border: '2px solid #5c4a32',
      borderRadius: 4,
      position: 'relative',
      cursor: 'pointer',
      transition: 'all 0.15s',
    }}
    title={`${skill.name}: Level ${level}`}
    >
      <span style={{ fontSize: '1.25rem', marginBottom: 2 }}>{skill.icon}</span>
      <span style={{
        fontSize: '0.7rem',
        fontWeight: 700,
        color: level >= 99 ? '#ffd700' : level >= 50 ? '#2edb84' : '#c9a959',
        textShadow: level >= 99 ? '0 0 8px #ffd700' : 'none',
        fontFamily: 'monospace',
      }}>
        {level}
      </span>
    </div>
  );
}

// Skills panel component (Runescape style)
function SkillsPanel({ skills }: { skills: WalletSkills }) {
  const totalLevel = getTotalLevel(skills);
  const maxTotal = 99 * SKILL_CONFIG.length; // 891 max

  return (
    <div style={{
      background: 'linear-gradient(180deg, #4a3c28 0%, #3d3224 100%)',
      border: '3px solid #5c4a32',
      borderRadius: 6,
      padding: '0.75rem',
      width: 'fit-content',
    }}>
      {/* Skills Grid - 3 columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 4,
        marginBottom: '0.5rem',
      }}>
        {SKILL_CONFIG.map((skill) => (
          <SkillTile key={skill.key} skill={skill} level={skills[skill.key]} />
        ))}
      </div>

      {/* Total Level */}
      <div style={{
        background: '#1a1610',
        border: '2px solid #5c4a32',
        borderRadius: 4,
        padding: '0.35rem',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '0.6rem', color: '#8b7355', textTransform: 'uppercase' }}>Total level</div>
        <div style={{
          fontSize: '1rem',
          fontWeight: 700,
          color: totalLevel >= maxTotal * 0.8 ? '#ffd700' : '#c9a959',
          fontFamily: 'monospace',
        }}>
          {totalLevel}
        </div>
      </div>
    </div>
  );
}

// Pre-cached demo wallet data for instant loading
const DEMO_WALLET_ADDRESS = '0x0351b76923992c2aFE0f040D22B43Ef0B8773D24';
const CACHED_DEMO_DATA: WalletData = {
  address: DEMO_WALLET_ADDRESS,
  balance: "527414148986414",
  balanceFormatted: "0.0005 ETH",
  balanceUsd: "$1.04",
  transactionCount: 2000,
  firstTxDate: "2025-01-28",
  lastTxDate: "2026-02-12",
  walletAgeDays: 379,
  activeDays: 39,
  contractsInteracted: 47,
  tokenCount: 21,
  nftCount: 105,
  totalGasUsed: "0.020272 ETH",
  totalGasUsedUsd: "$39.93",
  tradingVolume: "55.7883 ETH",
  tradingVolumeUsd: "$127,141",
  ethReceived: 17.527911647753726,
  ethReceivedUsd: "$79,546",
  ethSent: 8.749454864400557,
  ethSentUsd: "$47,595",
  netPnl: 31910.835517361676,
  netPnlUsd: "+$31,911",
  isProfitable: true,
  ethPriceUsd: 1969.47,
  favoriteApps: [
    { address: "0x980596ac24d0ca1e82a0a1d7ffaa6803acd2708c", name: "0x9805...708c", interactions: 972, percentage: 49 },
    { address: "0x3272596f776470d2d7c3f7dff3dc50888b7d8967", name: "0x3272...8967", interactions: 577, percentage: 29 },
    { address: "0x3439153eb7af838ad19d56e1571fbd09333c2809", name: "WETH", interactions: 112, percentage: 6 },
    { address: "0x0351b76923992c2afe0f040d22b43ef0b8773d24", name: "AccountProxy", interactions: 90, percentage: 5 },
    { address: "0x11614ee1ef07dee4ac28893a00f6f63b13223906", name: "0x1161...3906", interactions: 62, percentage: 3 }
  ],
  badges: [
    { id: "badge-1", label: "Discord Verified", description: "Abstract Badge #1", color: "#2edb84", icon: "🏅", tokenId: "1", image: "https://abstract-assets.abs.xyz/badges/badge-discord.png" },
    { id: "badge-2", label: "X Verified", description: "Abstract Badge #2", color: "#2edb84", icon: "🏅", tokenId: "2", image: "https://abstract-assets.abs.xyz/badges/badge-twitter.png" },
    { id: "badge-3", label: "Fund your Account", description: "Abstract Badge #3", color: "#2edb84", icon: "🏅", tokenId: "3", image: "https://abstract-assets.abs.xyz/badges/badge-fund-account.png" },
    { id: "badge-4", label: "App Voter", description: "Abstract Badge #4", color: "#2edb84", icon: "🏅", tokenId: "4", image: "https://abstract-assets.abs.xyz/badges/badge-app-voter.png" },
    { id: "badge-5", label: "The Trader", description: "Abstract Badge #5", color: "#2edb84", icon: "🏅", tokenId: "5", image: "https://abstract-assets.abs.xyz/badges/badge-the-trader.png" },
    { id: "badge-10", label: "You're So Early", description: "Abstract Badge #10", color: "#2edb84", icon: "🏅", tokenId: "10", image: "https://abstract-assets.abs.xyz/badges/badge-so-early.png" },
    { id: "badge-16", label: "The Sock Master", description: "Abstract Badge #16", color: "#2edb84", icon: "🏅", tokenId: "16", image: "https://abstract-assets.abs.xyz/badges/badge-sock-master.png" },
    { id: "badge-18", label: "Roach Racer", description: "Abstract Badge #18", color: "#2edb84", icon: "🏅", tokenId: "18", image: "https://abstract-assets.abs.xyz/badges/badge-roach-racing.png" },
    { id: "badge-22", label: "Gacha Goat", description: "Abstract Badge #22", color: "#2edb84", icon: "🏅", tokenId: "22", image: "https://abstract-assets.abs.xyz/badges/badge-gacha-goat.png" },
    { id: "badge-26", label: "The Big Badge", description: "Abstract Badge #26", color: "#2edb84", icon: "🏅", tokenId: "26", image: "https://abstract-assets.abs.xyz/badges/badge-bigcoin.png" },
    { id: "badge-27", label: "Multiplier Mommy", description: "Abstract Badge #27", color: "#2edb84", icon: "🏅", tokenId: "27", image: "https://abstract-assets.abs.xyz/badges/badge-multiplier-mommy.png" },
    { id: "badge-28", label: "Myriad Grand Master", description: "Abstract Badge #28", color: "#2edb84", icon: "🏅", tokenId: "28", image: "https://abstract-assets.abs.xyz/badges/badge-myriad-mastermind.png" },
    { id: "badge-29", label: "Giga Juicy", description: "Abstract Badge #29", color: "#2edb84", icon: "🏅", tokenId: "29", image: "https://abstract-assets.abs.xyz/badges/badge-giga-juicy.png" },
    { id: "badge-31", label: "Abstract Games Survivor", description: "Abstract Badge #31", color: "#2edb84", icon: "🏅", tokenId: "31", image: "https://abstract-assets.abs.xyz/badges/badge-abstract-games-survivor.png" },
    { id: "badge-42", label: "Cambrian Artifact Hunter", description: "Abstract Badge #42", color: "#2edb84", icon: "🏅", tokenId: "42", image: "https://abstract-assets.abs.xyz/badges/badge-cambria-gold-rush.png" },
    { id: "badge-45", label: "The Email Notification Badge", description: "Abstract Badge #45", color: "#2edb84", icon: "🏅", tokenId: "45", image: "https://abstract-assets.abs.xyz/badges/badge-email-notification.png" },
    { id: "badge-46", label: "The Speed Trader Badge", description: "Abstract Badge #46", color: "#2edb84", icon: "🏅", tokenId: "46", image: "https://abstract-assets.abs.xyz/badges/badge-speed-trader.png" },
    { id: "badge-48", label: "The One Year Badge", description: "Abstract Badge #48", color: "#2edb84", icon: "🏅", tokenId: "48", image: "https://abstract-assets.abs.xyz/badges/badge-wrapped.png" },
    { id: "badge-49", label: "Badge #49", description: "Abstract Badge #49", color: "#2edb84", icon: "🏅", tokenId: "49" }
  ],
  abstractBadgeCount: 19,
  xeetCards: [],
  xeetCardCount: 0,
  nftHoldings: [],
  walletScore: 82,
  walletRank: "A",
  walletPercentile: 3,
  personality: { title: "Master Collector", emoji: "🏆", description: "A true NFT connoisseur with an impressive collection" },
  limitedData: false
};

const WALLET_CACHE_KEY = 'wallet-analytics-cache';

export default function WalletAnalyticsPage() {
  const [address, setAddress] = useState(DEMO_WALLET_ADDRESS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(CACHED_DEMO_DATA);

  // Load wallet data on mount - fetch fresh data
  useEffect(() => {
    let shouldFetch = true;
    let addressToFetch = DEMO_WALLET_ADDRESS;

    try {
      const cached = localStorage.getItem(WALLET_CACHE_KEY);
      if (cached) {
        const { address: cachedAddr, data, timestamp } = JSON.parse(cached);
        // Use cached data if it's less than 5 minutes old
        if (data && Date.now() - timestamp < 5 * 60 * 1000) {
          setAddress(cachedAddr);
          setWalletData(data);
          shouldFetch = false;
        } else if (cachedAddr) {
          // Cache expired, but use the same address
          addressToFetch = cachedAddr;
        }
      }
    } catch {
      // Ignore cache errors
    }

    // Fetch fresh data on mount (cached data may have stale xeetCards)
    if (shouldFetch) {
      // Inline fetch to avoid dependency issues
      (async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/wallet-analytics?address=${encodeURIComponent(addressToFetch)}`);
          const data = await response.json();
          if (response.ok) {
            setWalletData(data);
            setAddress(addressToFetch);
            // Cache the result
            try {
              localStorage.setItem(WALLET_CACHE_KEY, JSON.stringify({
                address: addressToFetch,
                data,
                timestamp: Date.now(),
              }));
            } catch {
              // Ignore storage errors
            }
          }
        } catch {
          // Use fallback cached demo data on error
        } finally {
          setLoading(false);
        }
      })();
    }
  }, []);

  const handleAnalyze = async (walletAddress?: string) => {
    const addr = typeof walletAddress === 'string' ? walletAddress : address;
    if (!addr.trim()) {
      setError('Please enter a wallet address');
      return;
    }

    setLoading(true);
    setError(null);
    setWalletData(null);

    try {
      const response = await fetch(`/api/wallet-analytics?address=${encodeURIComponent(addr.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to fetch wallet data');
        return;
      }

      setWalletData(data);

      // Cache the wallet data for instant loading next time
      try {
        localStorage.setItem(WALLET_CACHE_KEY, JSON.stringify({
          address: addr.trim(),
          data,
          timestamp: Date.now(),
        }));
      } catch {
        // Ignore storage errors
      }
    } catch (err) {
      setError('Failed to connect to Abstract network');
    } finally {
      setLoading(false);
    }
  };

  // Demo wallet is pre-loaded, no need to fetch on mount
  // Only fetch if user changes to a different wallet

  return (
    <main className="container">
      {/* Banner Header */}
      <div className="banner-header">
        <div className="banner-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/ZaddyPFP.png" alt="Logo" style={{ width: 56, height: 56, borderRadius: '10px', border: '2px solid rgba(46, 219, 132, 0.3)' }} />
            <div>
              <h1 style={{ marginBottom: 0 }}>ZaddyTools</h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>Wallet Analytics</p>
            </div>
          </div>
          <NavBar />
        </div>
      </div>

      {/* Input Section with Title */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <img src="/abspfp.png" alt="Abstract" style={{ width: 40, height: 40, borderRadius: '8px' }} />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Abstract Wallet Analytics</h2>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Analyze any wallet on Abstract L2</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
              Wallet Address
            </label>
            <input
              type="text"
              className="id-input"
              placeholder="0x..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              style={{ width: '100%' }}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={() => handleAnalyze()}
            disabled={loading}
            style={{ whiteSpace: 'nowrap' }}
          >
            {loading ? 'Analyzing...' : 'Analyze Wallet'}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(231, 76, 60, 0.1)', border: '1px solid rgba(231, 76, 60, 0.3)', borderRadius: '6px', color: '#e74c3c' }}>
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {walletData && (
        <>
          {/* Combined Score, Personality & P&L Card */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              {/* Left: Score Circle */}
              {(() => {
                const scoreColor = walletData.walletScore >= 80 ? '#ffd700' : walletData.walletScore >= 60 ? '#2edb84' : walletData.walletScore >= 40 ? '#3498db' : '#c9a959';
                return (
                  <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
                    <svg width="90" height="90" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="45" cy="45" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                      <circle
                        cx="45" cy="45" r="40" fill="none"
                        stroke={scoreColor}
                        strokeWidth="6"
                        strokeDasharray={`${(walletData.walletScore / 100) * 251.3} 251.3`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: scoreColor }}>{walletData.walletScore}</div>
                      <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Score</div>
                    </div>
                  </div>
                );
              })()}

              {/* Middle: Percentile & Personality */}
              <div style={{ flex: 1, minWidth: '150px' }}>
                {walletData.walletPercentile && (
                  <div style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.6rem',
                    background: 'rgba(46, 219, 132, 0.15)',
                    border: '1px solid rgba(46, 219, 132, 0.3)',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#2edb84',
                    marginBottom: '0.5rem',
                  }}>
                    Top {walletData.walletPercentile}%
                  </div>
                )}
                {walletData.personality && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>{walletData.personality.emoji}</span>
                    <span style={{ fontSize: '0.9rem', color: '#2edb84', fontWeight: 600 }}>{walletData.personality.title}</span>
                  </div>
                )}
              </div>

              {/* Right: P&L */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>Net P&L</div>
                <div style={{
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  color: walletData.isProfitable ? '#2edb84' : '#e74c3c',
                  textShadow: walletData.isProfitable ? '0 0 15px rgba(46, 219, 132, 0.3)' : '0 0 15px rgba(231, 76, 60, 0.3)',
                }}>
                  {walletData.netPnlUsd}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>
                  <span style={{ color: '#2edb84' }}>{walletData.ethReceivedUsd}</span>
                  <span style={{ margin: '0 0.3rem' }}>→</span>
                  <span style={{ color: '#e74c3c' }}>{walletData.ethSentUsd}</span>
                </div>
              </div>
            </div>

            {/* Address */}
            <div style={{ marginTop: '1rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all', color: 'rgba(255,255,255,0.6)' }}>
                {walletData.address}
              </div>
            </div>

            {/* Limited Data Notice */}
            {walletData.limitedData && (
              <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(255, 193, 7, 0.1)', border: '1px solid rgba(255, 193, 7, 0.3)', borderRadius: '6px', fontSize: '0.7rem', color: '#ffc107' }}>
                Some stats are estimated. For full analytics, an Abscan API key is needed.
              </div>
            )}

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginTop: '1rem' }}>
              <div className="wallet-stat-card">
                <div className="wallet-stat-value">{walletData.transactionCount.toLocaleString()}</div>
                <div className="wallet-stat-label">Transactions</div>
              </div>
              <div className="wallet-stat-card">
                <div className="wallet-stat-value">{walletData.activeDays}</div>
                <div className="wallet-stat-label">Active Days</div>
              </div>
              <div className="wallet-stat-card">
                <div className="wallet-stat-value">{walletData.walletAgeDays ?? 0} days</div>
                <div className="wallet-stat-label">Wallet Age</div>
              </div>
              <div className="wallet-stat-card">
                <div className="wallet-stat-value">{walletData.nftCount.toLocaleString()}</div>
                <div className="wallet-stat-label">NFTs Held</div>
              </div>
              <div className="wallet-stat-card">
                <div className="wallet-stat-value">{walletData.abstractBadgeCount || 0}</div>
                <div className="wallet-stat-label">Badges</div>
              </div>
              <div className="wallet-stat-card">
                <div className="wallet-stat-value">{walletData.contractsInteracted}</div>
                <div className="wallet-stat-label">Apps Used</div>
              </div>
              <div className="wallet-stat-card">
                <div className="wallet-stat-value">{walletData.tradingVolumeUsd}</div>
                <div className="wallet-stat-label">Volume</div>
              </div>
              <div className="wallet-stat-card">
                <div className="wallet-stat-value">{walletData.totalGasUsedUsd}</div>
                <div className="wallet-stat-label">Gas Spent</div>
              </div>
            </div>
          </div>

          {/* Abstract Badges */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#2edb84', fontSize: '0.9rem' }}>Abstract Badges</h3>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                {walletData.abstractBadgeCount || 0} badge{walletData.abstractBadgeCount !== 1 ? 's' : ''}
              </span>
            </div>
            {walletData.badges.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' }}>
                {walletData.badges.map((badge) => (
                  <a
                    key={badge.id}
                    href={`https://opensea.io/assets/abstract/0xbc176ac2373614f9858a118917d83b139bcb3f8c/${badge.tokenId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      textDecoration: 'none',
                      transition: 'all 0.2s ease',
                    }}
                    title={badge.description}
                  >
                    {badge.image ? (
                      <img
                        src={badge.image}
                        alt={badge.label}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '8px',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: '2rem' }}>{badge.icon}</span>
                    )}
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.8)',
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}>
                      {badge.label}
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                No Abstract Badges found. Earn badges by completing activities on the{' '}
                <a href="https://abs.xyz/portal" target="_blank" rel="noopener noreferrer" style={{ color: '#2edb84' }}>
                  Abstract Portal
                </a>
              </div>
            )}
          </div>

          {/* Xeet Creator Cards */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <img
                  src="https://i2c.seadn.io/collection/xeet-creator-cards/image_type_logo/b2b3ef6100871f21a24e968da0d24c/bcb2b3ef6100871f21a24e968da0d24c.png"
                  alt="Xeet"
                  style={{ width: 24, height: 24, borderRadius: '4px' }}
                />
                <h3 style={{ margin: 0, color: '#00cccc', fontSize: '0.9rem' }}>Xeet Creator Cards ({walletData.xeetCardCount || 0})</h3>
              </div>
            </div>
            {walletData.xeetCards && walletData.xeetCards.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                {walletData.xeetCards.map((card) => (
                  <a
                    key={card.tokenId}
                    href={`https://opensea.io/assets/abstract/0xec27d2237432d06981e1f18581494661517e1bd3/${card.tokenId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      borderRadius: '12px',
                      background: 'rgba(0, 204, 204, 0.05)',
                      border: '1px solid rgba(0, 204, 204, 0.2)',
                      cursor: 'pointer',
                      textDecoration: 'none',
                      transition: 'all 0.2s ease',
                    }}
                    title={card.name}
                  >
                    {card.image ? (
                      <img
                        src={card.image}
                        alt={card.name}
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: '8px',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 80,
                        height: 80,
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #00cccc, #2edb84)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                      }}>
                        🎴
                      </div>
                    )}
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.8)',
                      textAlign: 'center',
                      lineHeight: 1.2,
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {card.name}
                    </span>
                    {card.balance > 1 && (
                      <span style={{
                        fontSize: '0.6rem',
                        color: '#00cccc',
                        fontWeight: 600,
                      }}>
                        x{card.balance}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                No Xeet Creator Cards found. Collect cards on{' '}
                <a href="https://opensea.io/collection/xeet-creator-cards" target="_blank" rel="noopener noreferrer" style={{ color: '#00cccc' }}>
                  OpenSea
                </a>
              </div>
            )}
          </div>

          {/* Skills & Portfolio - Side by Side */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Runescape-style Skills Panel */}
            <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: '#c9a959', textAlign: 'center', fontFamily: 'monospace' }}>Skills</h4>
              <SkillsPanel skills={calculateSkillLevels(walletData)} />
            </div>

            {/* Portfolio Estimate */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#2edb84', textAlign: 'center' }}>Portfolio Estimate</h4>

            {(() => {
              // Estimate portfolio values
              const ethValue = parseFloat(walletData.balanceUsd?.replace(/[^0-9.]/g, '') || '0');
              const nftEstValue = walletData.nftCount * 15; // ~$15 avg floor estimate for Abstract NFTs
              const totalValue = ethValue + nftEstValue;

              const portfolioData = [
                { name: 'ETH', value: ethValue, color: '#627eea', percent: totalValue > 0 ? (ethValue / totalValue * 100).toFixed(1) : '0' },
                { name: 'NFTs', value: nftEstValue, color: '#00cccc', percent: totalValue > 0 ? (nftEstValue / totalValue * 100).toFixed(1) : '0' },
              ];

              return (
                <div style={{ textAlign: 'center' }}>
                  {/* Total Value */}
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>Estimated Total</div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', textShadow: '0 0 20px rgba(46, 219, 132, 0.3)' }}>
                    ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>

                  {/* Pie Chart */}
                  <div style={{ height: 140, margin: '0.5rem 0' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={portfolioData.filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {portfolioData.filter(d => d.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
                          contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Breakdown bars */}
                  <div>
                    {portfolioData.map((item, i) => (
                      <div key={i} style={{ marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.2rem' }}>
                          <span style={{ color: item.color, fontWeight: 600 }}>{item.name}</span>
                          <span style={{ color: 'rgba(255,255,255,0.7)' }}>${item.value.toLocaleString()} ({item.percent}%)</span>
                        </div>
                        <div style={{ height: 5, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${item.percent}%`,
                            background: item.color,
                            borderRadius: 3,
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            </div>
          </div>

          {/* Top Holdings & P&L */}
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#2edb84' }}>Top Holdings</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {/* ETH Balance */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #627eea, #3c3c3d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                    Ξ
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Ethereum</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{walletData.balanceFormatted}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{walletData.balanceUsd}</div>
                </div>
              </div>

              {/* Top NFT Holdings */}
              {walletData.nftHoldings && walletData.nftHoldings.slice(0, 4).map((nft) => (
                <div key={`${nft.contractAddress}-${nft.tokenId}`} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {nft.image ? (
                      <img src={nft.image} alt={nft.name} style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: 6, background: 'linear-gradient(135deg, #00cccc, #2edb84)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#fff', fontWeight: 600 }}>
                        NFT
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{nft.collectionName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{nft.count > 1 ? `${nft.count} NFTs` : nft.name}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {nft.estimatedValueUsd ? (
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2edb84' }}>
                        ${nft.estimatedValueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#00cccc' }}>{nft.count} held</div>
                    )}
                  </div>
                </div>
              ))}

              {(!walletData.nftHoldings || walletData.nftHoldings.length === 0) && walletData.nftCount > 0 && (
                <div style={{
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.08)',
                  textAlign: 'center',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '0.8rem'
                }}>
                  {walletData.nftCount} NFTs in collection
                </div>
              )}
            </div>

            {/* P&L Summary */}
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: walletData.isProfitable ? 'rgba(46, 219, 132, 0.1)' : 'rgba(231, 76, 60, 0.1)',
              borderRadius: 12,
              border: `1px solid ${walletData.isProfitable ? 'rgba(46, 219, 132, 0.2)' : 'rgba(231, 76, 60, 0.2)'}`
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>Total Received</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#2edb84' }}>{walletData.ethReceivedUsd}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>Total Sent</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#e74c3c' }}>{walletData.ethSentUsd}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>Gas Spent</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f39c12' }}>{walletData.totalGasUsedUsd}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>Net P&L</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: walletData.isProfitable ? '#2edb84' : '#e74c3c' }}>{walletData.netPnlUsd}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Explorer Link */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <a
              href={`https://abscan.org/address/${walletData.address}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#2edb84', textDecoration: 'none', fontSize: '0.85rem' }}
            >
              View on Abscan Explorer &rarr;
            </a>
          </div>
        </>
      )}
    </main>
  );
}
