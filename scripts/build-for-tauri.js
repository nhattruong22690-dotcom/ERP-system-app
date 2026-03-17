const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const apiPath = path.join(__dirname, '..', 'app', 'api');
const hiddenApiPath = path.join(__dirname, '..', 'app', '_api_hidden');
const trackingPath = path.join(__dirname, '..', 'app', 'tracking');
const hiddenTrackingPath = path.join(__dirname, '..', 'app', '_tracking_hidden');

let hidden = false;

// Load environment variables from .env or .env.local if missing
const envPaths = ['.env.local', '.env'];
for (const envPath of envPaths) {
  const fullPath = path.join(__dirname, '..', envPath);
  if (fs.existsSync(fullPath)) {
    const envContent = fs.readFileSync(fullPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length === 2) {
        const key = parts[0].trim();
        const value = parts[1].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = value;
      }
    });
  }
}

try {
  console.log('--- TAURI BUILD DIAGNOSTICS ---');
  console.log('IS_TAURI:', process.env.IS_TAURI);
  console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'PRESENT (starts with ' + process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 8) + '...)' : 'MISSING');
  console.log('SUPABASE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'PRESENT' : 'MISSING');
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('CRITICAL ERROR: Supabase environment variables are missing.');
    console.log('💡 Gợi ý: Hãy đảm bảo bạn có file .env.local hoặc .env chứa đầy đủ NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  // Clear .next cache to avoid stale type validation errors for hidden routes
  const nextCachePath = path.join(__dirname, '..', '.next');
  if (fs.existsSync(nextCachePath)) {
    console.log('Clearing .next cache...');
    fs.rmSync(nextCachePath, { recursive: true, force: true });
  }

  // Hide API and Tracking routes (Next.js static export fails on API routes and dynamic routes)
  if (fs.existsSync(apiPath)) {
    console.log('Hiding API routes for Tauri static export...');
    fs.renameSync(apiPath, hiddenApiPath);
    hidden = true;
  }
  
  let trackingHidden = false;
  if (fs.existsSync(trackingPath)) {
    console.log('Hiding Tracking routes for Tauri static export...');
    fs.renameSync(trackingPath, hiddenTrackingPath);
    trackingHidden = true;
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
  
  if (typeof trackingHidden !== 'undefined' && trackingHidden && fs.existsSync(hiddenTrackingPath)) {
    console.log('Restoring Tracking routes...');
    fs.renameSync(hiddenTrackingPath, trackingPath);
  }
}
