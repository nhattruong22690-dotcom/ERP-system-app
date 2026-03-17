const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Script này hỗ trợ tạo file latest.json cho Tauri Updater Manifest.
 * Bạn nên chạy script này sau khi đã build thành công ứng dụng tại máy (có kèm chữ ký).
 */

// Đọc tauri.conf.json để lấy thông tin version tự động
const tauriConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../src-tauri/tauri.conf.json'), 'utf8'));
const APP_VERSION = tauriConfig.version;
const REPO = 'nhattruong22690-dotcom/ERP-system-app';
const RELEASE_NOTES = `Xinh Group ERP v${APP_VERSION} Release`;

const nsisPath = path.join(__dirname, '../src-tauri/target/release/bundle/nsis');

function trySign(bundle) {
  const password = process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD;
  const keyPath = process.env.TAURI_SIGNING_PRIVATE_KEY_PATH;

  if (password && keyPath) {
    console.log(`✍️  Đang thử ký tên file: ${bundle}...`);
    try {
      execSync(`npx tauri signer sign -k "${keyPath}" "${path.join(nsisPath, bundle)}"`, {
        stdio: 'inherit',
        env: { ...process.env, TAURI_SIGNING_PRIVATE_KEY_PASSWORD: password }
      });
      return true;
    } catch (e) {
      console.error('❌ Lỗi khi ký tên phẩm:', e.message);
    }
  }
  return false;
}

function findArtifacts() {
  if (!fs.existsSync(nsisPath)) {
    console.error(`❌ Không tìm thấy thư mục build: ${nsisPath}`);
    return null;
  }

  let files = fs.readdirSync(nsisPath);
  
  // Tìm kiếm file bundle (.zip hoặc .exe) có chứa số version hiện tại
  const bundle = files.find(f => (f.endsWith('.exe') || f.endsWith('.zip')) && f.includes(APP_VERSION)) ||
                 files.find(f => f.endsWith('.zip')) || 
                 files.find(f => f.endsWith('.exe'));

  if (!bundle) return null;

  // Nếu thiếu file .sig, thử ký tên ngay bây giờ
  let sig = files.find(f => f.endsWith('.sig'));
  if (!sig) {
    if (trySign(bundle)) {
      files = fs.readdirSync(nsisPath); // Cập nhật lại danh sách file
      sig = files.find(f => f.endsWith('.sig'));
    }
  }

  if (bundle && sig) {
    return { bundle, sig };
  }

  return null;
}

function generate() {
  console.log('--- 🚀 Bắt đầu tạo Manifest ---');
  console.log(`📍 Thư mục kiểm tra: ${nsisPath}`);
  
  const artifacts = findArtifacts();
  if (!artifacts) {
    console.error('\n❌ LỖI: Không tìm thấy bộ đôi file build và chữ ký (.sig).');
    console.log('----------------------------------------------------');
    console.log('💡 Gợi ý xử lý:');
    console.log('Bạn hãy chạy bộ lệnh này để ký tên và tạo manifest:');
    console.log('   $env:TAURI_SIGNING_PRIVATE_KEY_PATH="C:\\Users\\PC\\.tauri\\erp-key.key"');
    console.log('   $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD="Mật khẩu của bạn"');
    console.log('   node scripts/generate-manifest.js');
    console.log('----------------------------------------------------');
    return;
  }

  const sigContent = fs.readFileSync(path.join(nsisPath, artifacts.sig), 'utf8').trim();
  
  const manifest = {
    version: APP_VERSION,
    notes: RELEASE_NOTES,
    pub_date: new Date().toISOString(),
    platforms: {
      'windows-x86_64': {
        signature: sigContent,
        url: `https://github.com/${REPO}/releases/latest/download/${artifacts.bundle}`
      }
    }
  };

  const outputPath = path.join(nsisPath, 'latest.json');
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`✅ Đã tạo thành công: ${outputPath}`);
  console.log(`📦 Artifact: ${artifacts.bundle}`);
  console.log(`🔑 Signature trích xuất: ${sigContent.substring(0, 20)}...`);
  console.log('\n👉 HÀNH ĐỘNG TIẾP THEO:');
  console.log(`1. Upload file "${artifacts.bundle}" lên GitHub Release.`);
  console.log('2. Upload file "latest.json" (vừa tạo) lên cùng mục Release Assets đó.');
}

generate();
