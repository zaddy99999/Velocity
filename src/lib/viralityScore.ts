import { ChannelDisplayData } from './types';

export type ViralityGrade = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';

export interface ViralityScore {
  grade: ViralityGrade;
  color: string;
  score: number; // 0-100
}

const GRADE_COLORS: Record<ViralityGrade, string> = {
  'A+': '#00FF88', // bright green
  'A': '#00DD77',  // green
  'B+': '#88DD00', // yellow-green
  'B': '#DDDD00',  // yellow
  'C+': '#FFAA00', // orange
  'C': '#FF7700',  // dark orange
  'D': '#FF4444',  // red
  'F': '#AA2222',  // dark red
};

function getGradeFromScore(score: number): ViralityGrade {
  if (score >= 95) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 75) return 'B+';
  if (score >= 65) return 'B';
  if (score >= 55) return 'C+';
  if (score >= 45) return 'C';
  if (score >= 30) return 'D';
  return 'F';
}

// Calculate percentile rank within the dataset
function getPercentile(value: number, allValues: number[]): number {
  if (allValues.length === 0 || value === 0) return 0;
  const sorted = [...allValues].filter(v => v > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const rank = sorted.findIndex(v => v >= value);
  if (rank === -1) return 100;
  return (rank / sorted.length) * 100;
}

export function calculateViralityScores(channels: ChannelDisplayData[]): Map<string, ViralityScore> {
  const scores = new Map<string, ViralityScore>();

  // Separate channels by category for separate scaling
  const web2Channels = channels.filter(ch => ch.category === 'web2');
  const web3Channels = channels.filter(ch => ch.category === 'web3');

  // Get values for each category separately
  const web2Views = web2Channels.map(ch => ch.totalViews);
  const web2Followers = web2Channels.map(ch => ch.tiktokFollowers || 0);
  const web2Likes = web2Channels.map(ch => ch.tiktokLikes || 0);

  const web3Views = web3Channels.map(ch => ch.totalViews);
  const web3Followers = web3Channels.map(ch => ch.tiktokFollowers || 0);
  const web3Likes = web3Channels.map(ch => ch.tiktokLikes || 0);

  for (const channel of channels) {
    // Use the appropriate category's data for percentile calculation
    const isWeb2 = channel.category === 'web2';
    const categoryViews = isWeb2 ? web2Views : web3Views;
    const categoryFollowers = isWeb2 ? web2Followers : web3Followers;
    const categoryLikes = isWeb2 ? web2Likes : web3Likes;

    // Calculate percentile within the same category
    const viewsPercentile = getPercentile(channel.totalViews, categoryViews);
    const followersPercentile = getPercentile(channel.tiktokFollowers || 0, categoryFollowers);
    const likesPercentile = getPercentile(channel.tiktokLikes || 0, categoryLikes);

    // Weight the scores (GIPHY views weighted more since everyone has it)
    // If they have TikTok, factor that in
    let compositeScore: number;
    const hasTikTok = (channel.tiktokFollowers || 0) > 0 || (channel.tiktokLikes || 0) > 0;

    if (hasTikTok) {
      // 50% GIPHY, 25% TikTok followers, 25% TikTok likes
      compositeScore = (viewsPercentile * 0.5) + (followersPercentile * 0.25) + (likesPercentile * 0.25);
    } else {
      // Only GIPHY data available
      compositeScore = viewsPercentile;
    }

    const grade = getGradeFromScore(compositeScore);

    scores.set(channel.channelUrl, {
      grade,
      color: GRADE_COLORS[grade],
      score: Math.round(compositeScore),
    });
  }

  return scores;
}

export function getViralityScore(
  channel: ChannelDisplayData,
  allChannels: ChannelDisplayData[]
): ViralityScore {
  const scores = calculateViralityScores(allChannels);
  return scores.get(channel.channelUrl) || { grade: 'F', color: GRADE_COLORS['F'], score: 0 };
}
