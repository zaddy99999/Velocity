'use client';

import useSWR from 'swr';

interface CryptoEvent {
  id: string;
  title: string;
  date: string;
  type: 'unlock' | 'launch' | 'upgrade' | 'airdrop' | 'listing' | 'other';
  coin?: string;
  importance: 'high' | 'medium' | 'low';
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

const typeEmoji: Record<string, string> = {
  unlock: '🔓',
  launch: '🚀',
  upgrade: '⬆️',
  airdrop: '🪂',
  listing: '📋',
  conference: '🎤',
  other: '📅',
};

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

  const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return `In ${diffDays} days`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function UpcomingEvents() {
  const { data: events, isLoading } = useSWR<CryptoEvent[]>(
    '/api/crypto/events',
    fetcher,
    { refreshInterval: 300000 }
  );

  if (isLoading) {
    return (
      <div className="widget-card">
        <p className="widget-label">📅 Upcoming Events</p>
        <div className="events-list">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="widget-card">
        <p className="widget-label">📅 Upcoming Events</p>
        <p className="widget-empty">No upcoming events</p>
      </div>
    );
  }

  return (
    <div className="widget-card">
      <p className="widget-label">📅 Upcoming Events</p>
      <div className="events-list scrollable">
        {events.map((event) => (
          <div key={event.id} className={`event-item ${event.importance}`}>
            <span className="event-emoji">{typeEmoji[event.type]}</span>
            <div className="event-info">
              <span className="event-title">{event.title}</span>
              {event.coin && <span className="event-coin">{event.coin}</span>}
            </div>
            <span className="event-date">{formatEventDate(event.date)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
