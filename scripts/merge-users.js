#!/usr/bin/env node

/**
 * Merge all user JSON files into one and calculate stats
 * Usage: node merge-users.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'all-users.json');
const STATS_FILE = path.join(DATA_DIR, 'tier-stats.json');

function main() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('users-') && f.endsWith('.json'));

  console.log(`Found ${files.length} user files to merge...`);

  const allUsers = [];
  const seenIds = new Set();

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const users = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    for (const user of users) {
      if (!seenIds.has(user.id)) {
        seenIds.add(user.id);
        allUsers.push(user);
      }
    }
    console.log(`  ${file}: ${users.length} users`);
  }

  console.log(`\nTotal unique users: ${allUsers.length}`);

  // Sort by ID
  allUsers.sort((a, b) => parseInt(a.id) - parseInt(b.id));

  // Save merged file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allUsers, null, 2));
  console.log(`Saved merged file to ${OUTPUT_FILE}`);

  // Calculate tier distribution
  const tierNames = ['', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Obsidian', 'Ethereal'];
  const tierCounts = {};
  const subTierCounts = {};

  for (const user of allUsers) {
    const tierName = tierNames[user.tier] || `Tier ${user.tier}`;
    tierCounts[tierName] = (tierCounts[tierName] || 0) + 1;

    // Sub-tier (e.g., "Platinum 1")
    const subLevel = ((user.tierV2 - 1) % 3) + 1;
    const subTierName = `${tierName} ${subLevel}`;
    subTierCounts[subTierName] = (subTierCounts[subTierName] || 0) + 1;
  }

  const stats = {
    totalUsers: allUsers.length,
    lastUpdated: new Date().toISOString(),
    tiers: tierCounts,
    subTiers: subTierCounts
  };

  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
  console.log(`Saved stats to ${STATS_FILE}`);

  // Print tier distribution
  console.log('\n=== TIER DISTRIBUTION ===');
  for (let i = 1; i <= 7; i++) {
    const name = tierNames[i];
    const count = tierCounts[name] || 0;
    const percent = ((count / allUsers.length) * 100).toFixed(2);
    console.log(`${name.padEnd(10)}: ${count.toLocaleString().padStart(10)} (${percent}%)`);
  }

  console.log('\n=== SUB-TIER DISTRIBUTION ===');
  for (let tier = 1; tier <= 7; tier++) {
    for (let sub = 1; sub <= 3; sub++) {
      const name = `${tierNames[tier]} ${sub}`;
      const count = subTierCounts[name] || 0;
      if (count > 0) {
        console.log(`${name.padEnd(12)}: ${count.toLocaleString().padStart(10)}`);
      }
    }
  }
}

main();
