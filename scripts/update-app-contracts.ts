import { google } from 'googleapis';
import { readFileSync } from 'fs';

// Load env vars from credentials file directly
const credsFile = readFileSync('/Users/bill/Documents/Development/ZaddyTools/claude-code-stuff-f08ac6751781.json', 'utf-8');
const creds = JSON.parse(credsFile);

const SPREADSHEET_ID = '1hhxhk7yiAwqDrjwc2Sj_Jmqtu3wmtQoGmUfgqUZbZgE';
const SHEET_NAME = 'AbstractApps';

// Contract addresses mapped by app name (lowercase for matching)
const APP_CONTRACTS: Record<string, string[]> = {
  // OpenSea contracts
  'opensea': [
    '0x0000000000000068F116a894984e2DB1123eB395', // Seaport 1.6
    '0x8de9c5a032463c561423387a9648c5c7bcc5bc90', // Fees
    '0x18c2e87d183c5338a9142f97db176f3832b1d6de', // Payments
    '0x5b3256965e7c3cf26e11fcaf296dfc8807c01073', // Wallet
    '0x34ba0f2379bf9b81d09f7259892e26a8b0885095', // Fees 2
    '0x9b814233894cd227f561b78cc65891aa55c62ad2', // Royalties Distributor
  ],

  // Aborean Finance contracts
  'aborean': [
    '0x4c68e4102c0f120cce9f08625bd12079806b7c4d', // ABX Token
    '0xe8142d2f82036b6fc1e79e4ae85cf53fbffdc998', // Router
    '0xc0f53703e9f4b79fa2fb09a2aeba487fa97729c9', // Voter
    '0x58564fcfc5a0c57887efc0bedec3eb5ec37f1626', // Minter
    '0x27b04370d8087e714a9f557c1eff7901cea6bb63', // Voting Escrow
    '0xb037cbbd1208fbc58d3cac91a22e55d7727ac2bf', // CLGauge
    '0x36cbf77d8f8355d7a077d670c29e290e41367072', // Rewards Distributor
    '0x29bfed845b1c10e427766b21d4533800b6f4e111', // Gauge Factory
    '0x5927e0c4b307af16260327de3276ce17d8a4ab49', // Factory Registry
    '0xd29d05bffb2f0afbb76ed217d726ff5922253086', // Airdrop Distributor
    '0xf0361d1ad99971791c002e9c281b18739e9abad8', // CL Gauge Factory
  ],

  // Relay contracts
  'relay': [
    '0xf70da97812cb96acdf810712aa562db8dfa3dbef', // Solver
    '0xf3d63166f0ca56c3c1a3508fce03ff0cf3fb691e', // Deployer
    '0x4cd00e387622c35bddb9b4c962c136462338bc31', // Depository
  ],

  // Roach Racing Club contracts
  'roach racing': [
    '0xb0917812575b6787c3de95231015eed6bb895a81', // Main Token (ERC-1155)
    '0xa0f69095d2b31e9795e9923cd2a66fa911ccd3cf', // Loot Boxes (ROACHBOX)
    '0x5d59bd510fd9939ea673adb2b3834c1b73340c7e', // Deployer
    '0x00000ef80626c6406ec0bf9720e2e81c066396c0', // Roach Racing 1
  ],

  // Jumper (LI.FI) contracts
  'jumper': [
    '0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae', // LI.FI Diamond
  ],

  // Magic Eden (shares Seaport)
  'magic eden': [
    '0x0000000000000068F116a894984e2DB1123eB395', // Seaport 1.6 (shared)
    '0xDF3969A315e3fC15B89A2752D0915cc76A5bd82D', // Seaport alternate
    '0x3203c3f64312AF9344e42EF8Aa45B97C9DFE4594', // Transfer Validator
  ],

  // OKX contracts
  'okx': [
    '0x3b3ae790df4f312e745d270119c6052904fb6790', // DEX Aggregation Router
  ],

  // Well-known tokens/contracts
  'weth': ['0x3439153EB7AF838Ad19d56E1571FBD09333C2809'],
  'usdc': ['0x84A71ccD554Cc1b02749b35d22F684CC8ec987e1'],
  'usdt': ['0x0709F39376dEEe2A2dfC94A58EdEb2Eb9DF012bD'],
  'pengu': ['0x9ebe3a824ca958e4b3da772d2065518f009cba62'],

  // Pudgy Penguins related
  'pudgy': ['0x821688558Ba398b732731f37B3D39eA42016b1e3'], // Abstract Pudgy Penguins NFT

  // Uniswap
  'uniswap': [
    '0x566d7510dEE58360a64C9827257cF6D0Dc43985E', // V2 Factory
    '0xad1eCa41E6F772bE3cb5A48A6141f9bcc1AF9F7c', // V2 Router
  ],

  // Abstract native
  'abstract badges': ['0xbc176ac2373614f9858a118917d83b139bcb3f8c'],
};

async function main() {
  // Auth with Google Sheets
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // First, read current data to get app names
  console.log('Reading current app data...');
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:J`,
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) {
    console.log('No data found in sheet');
    return;
  }

  // Header is first row
  const header = rows[0];

  // Check if Contracts column exists
  let contractsColIndex = header.indexOf('Contracts');
  if (contractsColIndex === -1) {
    // Add Contracts column header
    contractsColIndex = header.length;
    header.push('Contracts');
    console.log('Adding Contracts column...');
  }

  // Update each row with matching contracts
  let updatedCount = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const appName = (row[1] || '').toLowerCase(); // Name is column B (index 1)

    // Find matching contracts
    let contracts: string[] = [];
    for (const [key, addrs] of Object.entries(APP_CONTRACTS)) {
      if (appName.includes(key) || key.includes(appName)) {
        contracts = [...contracts, ...addrs];
      }
    }

    // Remove duplicates
    contracts = Array.from(new Set(contracts));

    // Ensure row has enough columns
    while (row.length <= contractsColIndex) {
      row.push('');
    }

    if (contracts.length > 0) {
      row[contractsColIndex] = contracts.join(', ');
      updatedCount++;
      console.log(`  ${row[1]}: ${contracts.length} contracts`);
    }
  }

  // Clear the contracts column first
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!J:J`,
  });

  // Write back all data including contracts column
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: rows,
    },
  });

  console.log(`\nUpdated ${updatedCount} apps with contract addresses`);
}

main().catch(console.error);
