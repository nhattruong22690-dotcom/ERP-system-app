const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(command) {
    console.log(`> ${command}`);
    try {
        return execSync(command, { stdio: 'inherit', encoding: 'utf-8' });
    } catch (e) {
        console.error(`Error executing: ${command}`);
        process.exit(1);
    }
}

const packagePath = path.join(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// 1. Bump version (patch)
const currentVersion = pkg.version;
const parts = currentVersion.split('.').map(Number);
parts[2] += 1; // Patch bump
const newVersion = parts.join('.');

console.log(`Releasing version ${newVersion} (from ${currentVersion})...`);

// Update package.json
pkg.version = newVersion;
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');

// 2. Git operations
run('git add .');
run(`git commit -m "chore: release v${newVersion}"`);
run(`git tag v${newVersion}`);
run('git push origin main');
run(`git push origin v${newVersion}`);

console.log(`\n🎉 Release v${newVersion} pushed successfully!`);
console.log('GitHub Actions will now build and publish the Electron app.');
