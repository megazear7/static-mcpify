import { execFileSync } from 'node:child_process';

const token = process.env.CONTENTFUL_API_TOKEN;
const spaceId = process.env.SPACE_ID;

if ((token && !spaceId) || (!token && spaceId)) {
  console.error('Set both CONTENTFUL_API_TOKEN and SPACE_ID to rebuild this starter from Contentful.');
  process.exit(1);
}

if (!token && !spaceId) {
  console.log('No Contentful credentials detected. Deploying the checked-in sample content.');
  console.log('Add CONTENTFUL_API_TOKEN and SPACE_ID in Netlify to rebuild from your own space.');
  process.exit(0);
}

console.log('Detected Contentful credentials. Rebuilding checked-in sample content from your space...');
execFileSync('npx', ['smcp', 'build', '--output', '.'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
