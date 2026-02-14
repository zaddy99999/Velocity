#!/usr/bin/env node

/**
 * Find and fetch missing user IDs from the all-users.json file
 * Usage: node fetch-missing-users.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ALL_USERS_FILE = path.join(DATA_DIR, 'all-users.json');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUTPUT_FILE = path.join(DATA_DIR, `users-missing-${timestamp}.json`);
const MAX_ID = 2000000;
const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES = 100;

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

async function main() {
  console.log('Loading existing users...');
  const existingUsers = JSON.parse(fs.readFileSync(ALL_USERS_FILE, 'utf8'));

  // Build set of existing IDs
  const existingIds = new Set(existingUsers.map(u => parseInt(u.id)));
  console.log(`Found ${existingIds.size} existing users`);

  // Find missing IDs
  const missingIds = [];
  for (let id = 1; id <= MAX_ID; id++) {
    if (!existingIds.has(id)) {
      missingIds.push(id);
    }
  }
  console.log(`Found ${missingIds.length} missing IDs to check`);

  // Fetch missing users
  const foundUsers = [];
  let processed = 0;
  let found = 0;

  for (let i = 0; i < missingIds.length; i += BATCH_SIZE) {
    const batch = missingIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(id => fetchUser(id)));

    for (const user of results) {
      if (user) {
        foundUsers.push(user);
        found++;
      }
    }

    processed += batch.length;
    const percent = ((processed / missingIds.length) * 100).toFixed(1);
    process.stdout.write(`\rProgress: ${percent}% (${found} users found from ${processed} checked)`);

    if (i + BATCH_SIZE < missingIds.length) {
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES));
    }
  }

  console.log(`\n\nDone! Found ${foundUsers.length} additional users from ${missingIds.length} missing IDs.`);

  if (foundUsers.length > 0) {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(foundUsers, null, 2));
    console.log(`Saved to ${OUTPUT_FILE}`);

    // Show tier distribution of recovered users
    const tierNames = ['', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Obsidian', 'Ethereal'];
    const tierCounts = {};
    for (const user of foundUsers) {
      const tierName = tierNames[user.tier] || `Tier ${user.tier}`;
      tierCounts[tierName] = (tierCounts[tierName] || 0) + 1;
    }
    console.log('\nTier Distribution of recovered users:');
    for (const [tier, count] of Object.entries(tierCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${tier}: ${count}`);
    }
  } else {
    console.log('No additional users found - these IDs are truly empty/deleted.');
  }
}

main().catch(console.error);
