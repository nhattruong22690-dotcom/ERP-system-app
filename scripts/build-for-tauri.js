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

  console.log('Running Next.js build...');
  execSync('npm run build', { 
    stdio: 'inherit', 
    shell: true, 
    env: { ...process.env, IS_TAURI: 'true' } 
  });

  console.log('Next.js build successful!');

} catch (error) {
  console.error('Next.js build failed.');
  process.exit(1);
} finally {
  // Always restore API routes
  if (hidden && fs.existsSync(hiddenApiPath)) {
    console.log('Restoring API routes...');
    fs.renameSync(hiddenApiPath, apiPath);
  }
}
