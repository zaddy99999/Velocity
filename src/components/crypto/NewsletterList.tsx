'use client';

import { useState } from 'react';

interface Newsletter {
  id: string;
  name: string;
  author: string;
  description: string;
  frequency: string;
  url: string;
  category: 'crypto' | 'finance' | 'ai';
}

const newsletters: Newsletter[] = [
  // Crypto Newsletters
  {
    id: 'make-money-online-crypto',
    name: 'Make Money Online',
    author: 'Elisa (@eeelistar)',
    description: '6-figure entrepreneur sharing learnings on multiple income streams, mindset & social media',
    frequency: 'Weekly',
    url: 'https://makemoneyonline.substack.com/',
    category: 'crypto',
  },
  {
    id: 'bankless',
    name: 'Bankless',
    author: 'Ryan & David',
    description: 'Your guide to crypto money and DeFi',
    frequency: 'Daily',
    url: 'https://bankless.com/',
    category: 'crypto',
  },
  {
    id: 'the-defiant',
    name: 'The Defiant',
    author: 'Camila Russo',
    description: 'DeFi news, interviews, and analysis',
    frequency: 'Daily',
    url: 'https://thedefiant.io/',
    category: 'crypto',
  },
  {
    id: 'milk-road',
    name: 'Milk Road',
    author: 'Milk Road Team',
    description: '5-min daily crypto newsletter',
    frequency: 'Daily',
    url: 'https://www.milkroad.com/',
    category: 'crypto',
  },
  {
    id: 'messari',
    name: 'Messari Daily',
    author: 'Messari',
    description: 'Institutional-grade crypto research',
    frequency: 'Daily',
    url: 'https://messari.io/',
    category: 'crypto',
  },
  {
    id: 'the-block',
    name: 'The Block Daily',
    author: 'The Block',
    description: 'Breaking crypto news & analysis',
    frequency: 'Daily',
    url: 'https://www.theblock.co/',
    category: 'crypto',
  },
  {
    id: 'week-in-eth',
    name: 'Week in Ethereum',
    author: 'Evan Van Ness',
    description: 'Ethereum ecosystem news roundup',
    frequency: 'Weekly',
    url: 'https://weekinethereumnews.com/',
    category: 'crypto',
  },
  {
    id: 'dose-of-defi',
    name: 'Dose of DeFi',
    author: 'Chris Powers',
    description: 'Deep dives on DeFi protocols',
    frequency: 'Weekly',
    url: 'https://doseofdefi.substack.com/',
    category: 'crypto',
  },
  {
    id: 'on-the-brink',
    name: 'On The Brink',
    author: 'Nic Carter & Matt Walsh',
    description: 'Bitcoin and macro perspectives',
    frequency: 'Weekly',
    url: 'https://onthebrink-podcast.com/',
    category: 'crypto',
  },
  // Finance Newsletters
  {
    id: 'make-money-online',
    name: 'Make Money Online',
    author: 'Elisa (@eeelistar)',
    description: '6-figure entrepreneur sharing learnings on multiple income streams, mindset & social media',
    frequency: 'Weekly',
    url: 'https://makemoneyonline.substack.com/',
    category: 'finance',
  },
  {
    id: 'morning-brew',
    name: 'Morning Brew',
    author: 'Morning Brew',
    description: 'Daily business news in 5 minutes',
    frequency: 'Daily',
    url: 'https://www.morningbrew.com/',
    category: 'finance',
  },
  {
    id: 'bloomberg-markets',
    name: 'Bloomberg Markets',
    author: 'Bloomberg',
    description: 'Global markets and finance news',
    frequency: 'Daily',
    url: 'https://www.bloomberg.com/account/newsletters',
    category: 'finance',
  },
  {
    id: 'finimize',
    name: 'Finimize',
    author: 'Finimize',
    description: 'Finance explained in 3 mins',
    frequency: 'Daily',
    url: 'https://finimize.com/',
    category: 'finance',
  },
  {
    id: 'stratechery',
    name: 'Stratechery',
    author: 'Ben Thompson',
    description: 'Tech & business strategy analysis',
    frequency: 'Daily',
    url: 'https://stratechery.com/',
    category: 'finance',
  },
  {
    id: 'chartr',
    name: 'Chartr',
    author: 'Chartr',
    description: 'Data-driven business insights',
    frequency: 'Weekly',
    url: 'https://www.chartr.co/',
    category: 'finance',
  },
  {
    id: 'odd-lots',
    name: 'Odd Lots',
    author: 'Bloomberg',
    description: 'Economics and markets deep dives',
    frequency: 'Weekly',
    url: 'https://www.bloomberg.com/oddlots',
    category: 'finance',
  },
  // AI Newsletters
  {
    id: 'make-money-online-ai',
    name: 'Make Money Online',
    author: 'Elisa (@eeelistar)',
    description: '6-figure entrepreneur sharing learnings on multiple income streams, mindset & social media',
    frequency: 'Weekly',
    url: 'https://makemoneyonline.substack.com/',
    category: 'ai',
  },
  {
    id: 'the-rundown-ai',
    name: 'The Rundown AI',
    author: 'Rowan Cheung',
    description: 'Daily AI news in 5 minutes',
    frequency: 'Daily',
    url: 'https://www.therundown.ai/',
    category: 'ai',
  },
  {
    id: 'ben-bites',
    name: "Ben's Bites",
    author: 'Ben Tossell',
    description: 'AI tools, news, and use cases',
    frequency: 'Daily',
    url: 'https://bensbites.beehiiv.com/',
    category: 'ai',
  },
  {
    id: 'tldr-ai',
    name: 'TLDR AI',
    author: 'TLDR',
    description: 'AI research and industry news',
    frequency: 'Daily',
    url: 'https://tldr.tech/ai',
    category: 'ai',
  },
  {
    id: 'the-neuron',
    name: 'The Neuron',
    author: 'The Neuron',
    description: 'AI news for business leaders',
    frequency: 'Daily',
    url: 'https://www.theneurondaily.com/',
    category: 'ai',
  },
];

const frequencyColors: Record<string, string> = {
  'Daily': '#22c55e',
  'Weekly': '#3b82f6',
  'Monthly': '#8b5cf6',
};

export default function NewsletterList() {
  const [activeTab, setActiveTab] = useState<'crypto' | 'finance' | 'ai'>('crypto');

  const filteredNewsletters = newsletters.filter(n => n.category === activeTab);

  return (
    <div className="newsletter-card">
      <div className="newsletter-header">
        <div className="newsletter-header-left">
          <span className="newsletter-icon">📧</span>
          <p className="widget-label">Top Newsletters</p>
        </div>
        <div className="newsletter-tabs">
          <button
            className={`newsletter-tab ${activeTab === 'crypto' ? 'active' : ''}`}
            onClick={() => setActiveTab('crypto')}
          >
            Crypto
          </button>
          <button
            className={`newsletter-tab ${activeTab === 'finance' ? 'active' : ''}`}
            onClick={() => setActiveTab('finance')}
          >
            Finance
          </button>
          <button
            className={`newsletter-tab ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            AI
          </button>
        </div>
      </div>

      <div className="newsletter-grid">
        {filteredNewsletters.map((newsletter) => (
          <a
            key={newsletter.id}
            href={newsletter.url}
            target="_blank"
            rel="noopener noreferrer"
            className="newsletter-item"
          >
            <div className="newsletter-info">
              <div className="newsletter-title-row">
                <p className="newsletter-name">{newsletter.name}</p>
                <span
                  className="newsletter-frequency"
                  style={{ color: frequencyColors[newsletter.frequency] }}
                >
                  {newsletter.frequency}
                </span>
              </div>
              <p className="newsletter-author">by {newsletter.author}</p>
              <p className="newsletter-description">{newsletter.description}</p>
            </div>
            <span className="newsletter-subscribe">Subscribe →</span>
          </a>
        ))}
      </div>
    </div>
  );
}
