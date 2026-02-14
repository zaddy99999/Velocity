#!/usr/bin/env node

/**
 * Fetch Abstract Portal users by ID range
 * Usage: node fetch-abstract-users.js <startId> <endId> <outputFile>
 * Example: node fetch-abstract-users.js 1 100000 users-1-100000.json
 */

const fs = require('fs');
const path = require('path');

const START_ID = parseInt(process.argv[2]) || 1;
const END_ID = parseInt(process.argv[3]) || 10000;
const OUTPUT_FILE = process.argv[4] || `users-${START_ID}-${END_ID}.json`;
const BATCH_SIZE = 50; // Concurrent requests
const DELAY_BETWEEN_BATCHES = 100; // ms

async function fetchUser(id) {
  try {
    const response = await fetch(`https://backend.portal.abs.xyz/api/user/${id}`, {
      headers: {
        'accept': 'application/json',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.user) return null;

    return {
      id: data.user.id,
      wallet: data.user.walletAddress,
      name: data.user.name,
      tier: data.user.tier,
      tierV2: data.user.tierV2,
      badges: data.user.badges?.length || 0,
      streaming: data.user.hasStreamingAccess || false
    };
  } catch (e) {
    return null;
  }
}

async function fetchBatch(ids) {
  return Promise.all(ids.map(id => fetchUser(id)));
}

async function main() {
  console.log(`Fetching users ${START_ID} to ${END_ID}...`);

  const users = [];
  const totalUsers = END_ID - START_ID + 1;
  let processed = 0;
  let found = 0;

  // Process in batches
  for (let batchStart = START_ID; batchStart <= END_ID; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, END_ID);
    const ids = [];
    for (let i = batchStart; i <= batchEnd; i++) {
      ids.push(i);
    }

    const results = await fetchBatch(ids);

    for (const user of results) {
      if (user) {
        users.push(user);
        found++;
      }
    }

    processed += ids.length;
    const percent = ((processed / totalUsers) * 100).toFixed(1);
    process.stdout.write(`\rProgress: ${percent}% (${found} users found)`);

    // Small delay to avoid rate limiting
    if (batchStart + BATCH_SIZE <= END_ID) {
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES));
    }
  }

  console.log(`\nDone! Found ${users.length} users.`);

  // Save to file
  const outputPath = path.join(__dirname, '..', 'data', OUTPUT_FILE);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(users, null, 2));
  console.log(`Saved to ${outputPath}`);

  // Print tier distribution
  const tierCounts = {};
  for (const user of users) {
    const tierName = ['', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Obsidian', 'Ethereal'][user.tier] || `Tier ${user.tier}`;
    tierCounts[tierName] = (tierCounts[tierName] || 0) + 1;
  }
  console.log('\nTier Distribution:');
  for (const [tier, count] of Object.entries(tierCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${tier}: ${count}`);
  }
}

main().catch(console.error);
