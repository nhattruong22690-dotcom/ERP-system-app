const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const apiPath = path.join(__dirname, '../app/api');
const backupApiPath = path.join(__dirname, '../app/_api_temp');
const trackingPath = path.join(__dirname, '../app/tracking');
const backupTrackingPath = path.join(__dirname, '../app/_tracking_temp');
const nextCachePath = path.join(__dirname, '../.next');

function hideRoutes() {
    if (fs.existsSync(apiPath)) {
        console.log('Hiding API routes for static export...');
        fs.renameSync(apiPath, backupApiPath);
    }
    
    if (fs.existsSync(trackingPath)) {
        console.log('Hiding tracking routes for static export...');
        fs.renameSync(trackingPath, backupTrackingPath);
    }
    
    if (fs.existsSync(nextCachePath)) {
        console.log('Clearing Next.js cache...');
        fs.rmSync(nextCachePath, { recursive: true, force: true });
    }
}

function restoreRoutes() {
    if (fs.existsSync(backupApiPath)) {
        console.log('Restoring API routes...');
        fs.renameSync(backupApiPath, apiPath);
    }
    
    if (fs.existsSync(backupTrackingPath)) {
        console.log('Restoring tracking routes...');
        fs.renameSync(backupTrackingPath, trackingPath);
    }
}

async function build() {
    try {
        hideRoutes();
        
        console.log('Building Next.js static export...');
        execSync('npx next build', {
            stdio: 'inherit',
            env: { ...process.env, IS_ELECTRON: 'true' }
        });
        
    } catch (err) {
        console.error('Static export failed', err);
        process.exitCode = 1;
    } finally {
        restoreRoutes();
    }
}

build();
