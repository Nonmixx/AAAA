import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.log("Error: .env.local not found.");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const pageId = envVars['META_FACEBOOK_PAGE_ID'];
const accessToken = envVars['META_ACCESS_TOKEN'];
const baseUrl = envVars['META_GRAPH_API_BASE'] || 'https://graph.facebook.com';

if (!pageId || !accessToken || pageId.includes('replace-with') || accessToken.includes('replace-with')) {
  console.log("Error: Facebook credentials not properly configured in .env.local");
  process.exit(1);
}

async function testConnection() {
  try {
    const response = await fetch(`${baseUrl}/${pageId}?access_token=${accessToken}`);
    const data = await response.json();
    if (response.ok) {
      console.log(`Success: Successfully connected to Facebook Page: ${data.name || pageId}`);
    } else {
      console.log(`Failed: ${data.error?.message || response.statusText}`);
    }
  } catch (error) {
    console.log(`Error testing connection: ${error.message}`);
  }
}

testConnection();
