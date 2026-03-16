const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const apiPath = path.join(__dirname, '..', 'app', 'api');
const hiddenApiPath = path.join(__dirname, '..', 'app', '_api_hidden');
const nextPath = path.join(__dirname, '..', '.next');
const outPath = path.join(__dirname, '..', 'out');

let hidden = false;

try {
  // Clear pre-existing artifacts
  if (fs.existsSync(nextPath)) {
    console.log('Clearing .next cache...');
    fs.rmSync(nextPath, { recursive: true, force: true });
  }
  if (fs.existsSync(outPath)) {
    console.log('Clearing existing out directory...');
    fs.rmSync(outPath, { recursive: true, force: true });
  }

  // Hide API routes (Next.js static export fails on API routes)
  if (fs.existsSync(apiPath)) {
    console.log('Hiding API routes for Tauri static export...');
    fs.renameSync(apiPath, hiddenApiPath);
    hidden = true;
  }

  console.log('Starting Tauri build process...');
  // Running through npx tauri build which will trigger beforeBuildCommand (npm run build)
  execSync('npx tauri build', { 
    stdio: 'inherit', 
    shell: true, 
    env: { ...process.env, IS_TAURI: 'true' } 
  });

  console.log('Tauri build successful!');

} catch (error) {
  console.error('Build process failed at some step.');
  process.exit(1);
} finally {
  // Always restore API routes
  if (hidden && fs.existsSync(hiddenApiPath)) {
    console.log('Restoring API routes...');
    fs.renameSync(hiddenApiPath, apiPath);
  }
}
