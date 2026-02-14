# CrowdPlay — Product Requirements Document

**Version:** 1.0
**Date:** February 14, 2026
**Status:** Draft

---

## 1. Problem / Opportunity

Going out to a bar, restaurant, or venue and hearing music you hate sucks. DJs and venue owners have no easy way to know what the crowd actually wants to hear. Existing solutions (shouting at the DJ, paper request slips) are broken. CrowdPlay bridges the gap — letting crowds vote on what plays next while giving DJs full control over their Spotify queue.

---

## 2. Core Concept

CrowdPlay is a location-based, crowd-sourced jukebox web app. Users find their venue, pick songs, and vote. The highest-voted songs auto-queue to the venue's Spotify playlist. DJs/venue owners maintain control with skip and block capabilities.

**Tagline:** *The crowd picks the music. The DJ keeps control.*

---

## 3. Target Users

**Guests (Song Pickers)**
- Bar/restaurant/venue patrons who want to influence the music
- No account required to participate, optional account for perks
- Limited to 5 song requests per session to prevent spam

**Hosts (DJs / Venue Owners)**
- DJs, bartenders, restaurant owners, event hosts
- Anyone can create a "spot" — verified venues get a badge
- Link their Spotify account and claim a location

---

## 4. User Flows

### 4.1 Guest Flow
1. Open CrowdPlay on phone (no download needed — mobile web)
2. App detects location or user searches for nearby spots
3. Select the venue they're at
4. Browse suggested/trending songs or search by name/artist
5. Pick up to 5 songs to add to the queue
6. Upvote or downvote songs already in the queue
7. Watch the live queue update in real time

### 4.2 Host Flow
1. Sign up and connect Spotify account (OAuth)
2. Claim a location (search by name/address via Google Places)
3. Set preferences: genre filters, blacklisted songs/artists, explicit content toggle
4. Go live — spot appears on the map for nearby guests
5. Monitor the queue — songs auto-add by vote count
6. Skip or block any song at any time
7. End session when done

---

## 5. MVP Features

### Song Discovery & Requests
- Search songs by name or artist (via Spotify API)
- Suggested songs: trending at this spot, popular nearby, genre-matched
- Album art, song name, artist displayed in a clean card UI
- Explicit content tag (E badge)

### Voting System
- Upvote / downvote on queued songs
- Queue sorted by net votes in real time
- 5-song request limit per user per session
- Anonymous voting (no account needed), account optional for history

### Live Queue
- Real-time queue visible to all guests and the host
- Currently playing song displayed at top
- Next-up songs ranked by votes
- Auto-queues top-voted song to Spotify when current song nears end

### Spot Management (Host Dashboard)
- Connect Spotify via OAuth 2.0
- Claim location via Google Places API
- Go live / end session toggle
- Skip song, block song, block artist
- Genre filter and explicit content toggle
- View active guest count

### Location & Discovery
- Nearby spots shown on map or list view
- Search for spots by name or area
- Geolocation-based spot suggestions
- Verified venue badges (applied for, manually approved)

---

## 6. Out of Scope (V1)

- Native mobile apps (iOS/Android) — web-first
- Tipping / pay-to-bump features
- User profiles, playlists, or social features
- Apple Music or other streaming service integration
- Chat or messaging between guests and DJ
- Analytics dashboard for venues
- Multi-room / multi-zone support
- Offline functionality

---

## 7. Technical Architecture

### Stack
- **Frontend:** Next.js 14 (App Router) + Tailwind CSS
- **Backend:** Next.js API routes + Edge Functions
- **Database:** Supabase (PostgreSQL + Realtime subscriptions)
- **Auth:** Supabase Auth (Google/Apple for guests, Spotify OAuth for hosts)
- **APIs:** Spotify Web API, Google Places API, browser Geolocation API
- **Real-time:** Supabase Realtime for live queue updates
- **Hosting:** Vercel

### Key Integrations

**Spotify Web API**
- Search tracks: `GET /v1/search`
- Get recommendations: `GET /v1/recommendations`
- Add to queue: `POST /v1/me/player/queue`
- Get playback state: `GET /v1/me/player`
- Requires host to have Spotify Premium for queue control

**Google Places API**
- Place search for venue claiming
- Autocomplete for location search
- Place details for address, coordinates, photos

### Data Model

**spots**
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| host_id | uuid | FK to users |
| name | text | Venue name |
| place_id | text | Google Places ID |
| lat / lng | float | Coordinates |
| is_live | boolean | Currently active |
| is_verified | boolean | Verified venue badge |
| settings | jsonb | Genre filters, blacklist, explicit toggle |
| created_at | timestamp | |

**sessions**
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| spot_id | uuid | FK to spots |
| started_at | timestamp | Session start |
| ended_at | timestamp | Session end |
| guest_count | int | Peak guests |

**queue_items**
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| session_id | uuid | FK to sessions |
| spotify_track_id | text | Spotify URI |
| track_name | text | Song title |
| artist_name | text | Artist |
| album_art_url | text | Cover image |
| is_explicit | boolean | Explicit flag |
| status | enum | queued / playing / played / skipped / blocked |
| added_by | uuid | FK to users (nullable for anon) |
| net_votes | int | Computed upvotes - downvotes |
| queued_to_spotify | boolean | Sent to Spotify queue |
| created_at | timestamp | |

**votes**
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| queue_item_id | uuid | FK to queue_items |
| user_id | uuid | Nullable (anon gets device fingerprint) |
| device_id | text | Fingerprint for anonymous users |
| vote | int | +1 or -1 |
| created_at | timestamp | |

**users**
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| email | text | |
| display_name | text | |
| spotify_access_token | text | Encrypted, hosts only |
| spotify_refresh_token | text | Encrypted, hosts only |
| role | enum | guest / host |
| created_at | timestamp | |

---

## 8. UI/UX Direction

- **Dark mode first** — matches the vibe of bars/venues and the screenshots
- **Spotify-inspired aesthetic** — dark backgrounds, green accents, clean card-based layout
- **Mobile-first responsive** — 90%+ usage will be on phones at venues
- **Minimal friction** — no signup wall, search and vote immediately
- **Real-time feel** — queue updates live, votes animate, currently playing pulses
- Key screens: Nearby Spots → Spot View (live queue) → Pick Songs → Queue with voting

---

## 9. Anonymous User Handling

Since accounts are optional, anonymous users need:
- Device fingerprinting (browser fingerprint or localStorage token) to enforce 5-song limit and prevent double-voting
- No persistent history or cross-session identity
- Prompt to create account for: request history, favorite spots, increased limits

---

## 10. Spotify Considerations

- **Host must have Spotify Premium** — free accounts can't control playback or queue
- **Token refresh** — Spotify tokens expire every hour; implement silent refresh via refresh token
- **Rate limits** — Spotify API is rate-limited; batch requests where possible
- **Playback control** — CrowdPlay doesn't play music itself; it manages the queue on the host's active Spotify session
- **Licensing** — Since the host plays music through their own Spotify account on their own device, CrowdPlay is a queue management tool, not a music streaming service

---

## 11. Success Metrics

- Number of spots created
- Number of active sessions per week
- Songs queued per session
- Guest-to-vote conversion rate
- Return host rate (hosts who go live more than once)
- Average session duration

---

## 12. Open Questions

- What's the threshold for auto-queuing? (Top voted? Minimum vote count?)
- How to handle ties in voting?
- Should there be a "now playing" notification push for guests?
- Verification process for venues — manual review or automated?
- How to handle when host's Spotify goes offline mid-session?
- Rate limiting strategy for anonymous users beyond device fingerprinting?

---

## 13. Future Considerations

- Native iOS/Android apps
- Tip the DJ / pay-to-bump monetization
- Venue analytics dashboard (peak hours, popular genres, crowd size)
- Premium venue tier (custom branding, priority support, advanced controls)
- Apple Music integration
- Social features (follow spots, share what you voted for)
- Event mode (one-time events vs permanent venues)
- DJ profiles and ratings
- Integration with POS systems for venue partnerships
- Playlist export (save tonight's crowd-picked playlist)
