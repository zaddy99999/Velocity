import { google } from 'googleapis';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

// Load env vars from credentials file directly
const credsFile = readFileSync('/Users/bill/Documents/Development/ZaddyTools/claude-code-stuff-f08ac6751781.json', 'utf-8');
const creds = JSON.parse(credsFile);

const SPREADSHEET_ID = '1hhxhk7yiAwqDrjwc2Sj_Jmqtu3wmtQoGmUfgqUZbZgE';
const SHEET_NAME = 'AbstractApps';

interface AbstractApp {
  id: string;
  name: string;
  description: string;
  icon: string;
  banner: string;
  link: string;
  categories: { category: string }[];
  spotlight: string;
  socials: Record<string, string>;
}

async function main() {
  // Fetch all apps from Abstract Portal API using curl
  console.log('Fetching apps from Abstract Portal API...');
  const curlResult = execSync('curl -s "https://backend.portal.abs.xyz/api/app?limit=100"').toString();
  const data = JSON.parse(curlResult);
  const apps: AbstractApp[] = data.items;

  console.log(`Found ${apps.length} apps`);

  // Prepare rows
  const header = ['ID', 'Name', 'Description', 'Icon', 'Banner', 'Link', 'Categories', 'Spotlight', 'Socials'];
  const rows = apps.map(app => [
    app.id,
    app.name,
    (app.description || '').replace(/\r?\n/g, ' ').substring(0, 500),
    app.icon || '',
    app.banner || '',
    app.link || '',
    app.categories.map(c => c.category).join(', '),
    app.spotlight || '',
    Object.entries(app.socials || {}).map(([k, v]) => `${k}: ${v}`).join(', ')
  ]);

  // Auth with Google Sheets
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Clear existing data and write new data
  console.log('Writing to Google Sheets...');

  // First, try to create the sheet if it doesn't exist
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          addSheet: {
            properties: {
              title: SHEET_NAME,
            },
          },
        }],
      },
    });
    console.log(`Created new sheet: ${SHEET_NAME}`);
  } catch (e: any) {
    if (e.message?.includes('already exists')) {
      console.log('Sheet already exists, clearing data...');
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:I`,
      });
    } else {
      console.log('Sheet may already exist, continuing...');
    }
  }

  // Write header + data
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [header, ...rows],
    },
  });

  console.log(`Successfully wrote ${rows.length} apps to sheet "${SHEET_NAME}"`);
}

main().catch(console.error);
