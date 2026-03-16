const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const apiPath = path.join(__dirname, '..', 'app', 'api');
const hiddenApiPath = path.join(__dirname, '..', 'app', '_api_hidden');

let hidden = false;

try {
  // Hide API routes (Next.js static export fails on API routes)
  if (fs.existsSync(apiPath)) {
    console.log('Hiding API routes for Tauri static export...');
    fs.renameSync(apiPath, hiddenApiPath);
    hidden = true;
  }

  console.log('Running Next.js build (static export mode)...');
  execSync('npm run build', { 
    stdio: 'inherit', 
    shell: true, 
    env: { ...process.env, IS_TAURI: 'true' } 
  });

  console.log('Next.js build successful! Checking for "out" folder...');
  if (fs.existsSync(path.join(__dirname, '..', 'out'))) {
    console.log('Static "out" directory found.');
  } else {
    throw new Error('Build succeeded but "out" directory is missing. Check next.config.ts output: "export"');
  }

} catch (error) {
  console.error('\n--- TAURI BUILD HELPER ERROR ---');
  console.error('Error during Next.js build process.');
  if (error.message) console.error('Message:', error.message);
  process.exit(1);
} finally {
  // Always restore API routes
  if (hidden && fs.existsSync(hiddenApiPath)) {
    console.log('Restoring API routes...');
    fs.renameSync(hiddenApiPath, apiPath);
  }
}
