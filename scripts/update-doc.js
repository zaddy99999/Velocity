const { google } = require('googleapis');
const fs = require('fs');

const creds = JSON.parse(fs.readFileSync('/Users/bill/Documents/Development/ZaddyTools/claude-code-stuff-f08ac6751781.json', 'utf8'));

const auth = new google.auth.JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ['https://www.googleapis.com/auth/documents'],
});

const docs = google.docs({ version: 'v1', auth });
const documentId = '1XrUz35-x1OJSfy2byoBGJdO9ba4_cWOtF0lh3ANgOb8';

async function updateDoc() {
  // First, get the document to find the end index
  const doc = await docs.documents.get({ documentId });
  const endIndex = doc.data.body.content[doc.data.body.content.length - 1].endIndex;

  // Delete all existing content (except the first character which is required)
  const requests = [];

  if (endIndex > 2) {
    requests.push({
      deleteContentRange: {
        range: {
          startIndex: 1,
          endIndex: endIndex - 1,
        },
      },
    });
  }

  const today = new Date().toISOString().split('T')[0];

  // Professional document content
  const content = `ABSTRACT PORTAL API
Complete Reference Documentation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

QUICK START: WHAT CAN YOU DO WITH THIS API?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This section is for non-technical users who want to understand what data is available.

🔍 USER INFORMATION YOU CAN LOOK UP:
─────────────────────────────────────
• Display name and bio/description
• Profile picture
• Wallet address
• Tier level (Bronze → Silver → Gold → Platinum → Diamond → Obsidian → Ethereal)
• All badges earned (regular, flash, and secret badges)
• Equipped cosmetic items (avatars and banners)
• Whether they have streaming access
• Whether they completed the welcome tour

📱 APP/PROJECT INFORMATION:
─────────────────────────────────────
• App name, description, and logo
• Category (Gaming, DeFi, NFT, Social, etc.)
• Official website, Twitter, Discord links
• Smart contract addresses
• Total number of users
• Total transactions processed
• Trading volume
• Daily active users

💡 EXAMPLE USE CASES:
─────────────────────────────────────
• Build a leaderboard showing top users by tier
• Create a directory of Abstract ecosystem apps
• Track user engagement and badge collection
• Analyze which apps have the most users/volume
• Display user profiles on external websites
• Export wallet lists for each tier level

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OVERVIEW

Base URL: https://backend.portal.abs.xyz/api

The Abstract Portal API provides programmatic access to user profiles, app data, and platform statistics on the Abstract blockchain.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 1: USER ENDPOINTS

1.1 Get User by ID
━━━━━━━━━━━━━━━━━━
Endpoint:   GET /user/{id}
Example:    GET /user/12345

1.2 Get User by Wallet Address
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Endpoint:   GET /user/address/{walletAddress}
Example:    GET /user/address/0x1234...abcd

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 2: USER RESPONSE FIELDS

2.1 Profile Information
━━━━━━━━━━━━━━━━━━━━━━━
Field                   Type        Description
─────────────────────────────────────────────────────────────
id                      number      Unique user identifier
name                    string      Display name
description             string      User bio/description
walletAddress           string      Ethereum address (lowercase)
profilePictureUrl       string      Custom avatar image URL

2.2 Cosmetic Items
━━━━━━━━━━━━━━━━━━
Field                   Type        Description
─────────────────────────────────────────────────────────────
avatar                  object      Equipped avatar
  ├─ tier               number      Avatar tier level
  ├─ key                string      Asset identifier
  ├─ season             number      Season number
  └─ assetType          string      Type of asset
banner                  object      Equipped banner
  ├─ tier               number      Banner tier level
  ├─ key                string      Asset identifier
  ├─ season             number      Season number
  └─ assetType          string      Type of asset

2.3 Tier Information
━━━━━━━━━━━━━━━━━━━━
Field                   Type        Description
─────────────────────────────────────────────────────────────
tier                    number      Main tier (1-7)
tierV2                  number      Sub-tier (1-21)
lastTierSeen            number      Last tier viewed in UI

Tier Mapping:
  1 = Bronze       5 = Diamond
  2 = Silver       6 = Obsidian
  3 = Gold         7 = Ethereal
  4 = Platinum

TierV2 Mapping: Every 3 sub-tiers = 1 main tier
  1-3 = Bronze, 4-6 = Silver, 7-9 = Gold, etc.

2.4 Status Flags
━━━━━━━━━━━━━━━━
Field                   Type        Description
─────────────────────────────────────────────────────────────
hasStreamingAccess      boolean     User has streaming access
hasCompletedWelcomeTour boolean     Completed onboarding

2.5 Badges Array
━━━━━━━━━━━━━━━━
Field                   Type        Description
─────────────────────────────────────────────────────────────
badges[]                array       List of earned badges
  ├─ id                 number      Badge identifier
  ├─ type               string      "regular", "flash", or "secret"
  ├─ name               string      Display name
  ├─ icon               string      Icon key
  ├─ description        string      Badge description
  ├─ requirement        string      How to earn
  ├─ url                string      External link (flash only)
  ├─ timeStart          string      Start time (flash only)
  ├─ timeEnd            string      End time (flash only)
  └─ claimed            boolean     Whether badge is claimed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 3: APP ENDPOINTS

3.1 List All Apps
━━━━━━━━━━━━━━━━━
Endpoint:   GET /apps
Returns:    Array of all registered applications

3.2 Get App by ID
━━━━━━━━━━━━━━━━━
Endpoint:   GET /apps/{appId}
Example:    GET /apps/gigaverse
Returns:    Detailed app information

3.3 Get App Statistics
━━━━━━━━━━━━━━━━━━━━━━
Endpoint:   GET /apps/{appId}/stats
Example:    GET /apps/gigaverse/stats
Returns:    Usage statistics for the app

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 4: APP RESPONSE FIELDS

4.1 Basic Information
━━━━━━━━━━━━━━━━━━━━━
Field                   Type        Description
─────────────────────────────────────────────────────────────
id                      string      Unique app identifier (slug)
name                    string      Display name
description             string      App description
logo                    string      Logo image URL
category                string      App category
status                  string      Current status

4.2 Links & Social
━━━━━━━━━━━━━━━━━━
Field                   Type        Description
─────────────────────────────────────────────────────────────
websiteUrl              string      Official website
twitterUrl              string      Twitter/X profile
discordUrl              string      Discord server
documentationUrl        string      Docs/guides

4.3 Technical Details
━━━━━━━━━━━━━━━━━━━━━
Field                   Type        Description
─────────────────────────────────────────────────────────────
contractAddresses       array       Smart contract addresses
launchDate              string      Launch date (ISO format)
chainId                 number      Blockchain chain ID

4.4 Statistics
━━━━━━━━━━━━━━
Field                   Type        Description
─────────────────────────────────────────────────────────────
userCount               number      Total users
transactionCount        number      Total transactions
totalVolume             number      Total volume (USD)
dailyActiveUsers        number      24h active users

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 5: EXAMPLE RESPONSES

5.1 User Response Example
━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "id": 12345,
  "name": "AbstractUser",
  "description": "Building on Abstract",
  "walletAddress": "0x1234567890abcdef...",
  "tier": 4,
  "tierV2": 12,
  "hasStreamingAccess": true,
  "badges": [
    {
      "id": 1,
      "type": "regular",
      "name": "Early Adopter",
      "claimed": true
    }
  ]
}

5.2 App Response Example
━━━━━━━━━━━━━━━━━━━━━━━━
{
  "id": "gigaverse",
  "name": "Gigaverse",
  "description": "The ultimate gaming metaverse",
  "logo": "https://...",
  "category": "Gaming",
  "websiteUrl": "https://gigaverse.io",
  "contractAddresses": ["0xabc...", "0xdef..."],
  "userCount": 50000,
  "transactionCount": 1250000
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NOTES

• All endpoints return JSON responses
• Wallet addresses are always lowercase
• Rate limiting may apply to high-volume requests
• Authentication is not required for public endpoints

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Document Version: 1.0
Last Updated: ${today}
`;

  // Insert new content
  requests.push({
    insertText: {
      location: { index: 1 },
      text: content,
    },
  });

  // Execute the requests
  await docs.documents.batchUpdate({
    documentId,
    requestBody: { requests },
  });

  console.log('Document updated successfully!');
}

updateDoc().catch(err => console.error('Error:', err.message));
