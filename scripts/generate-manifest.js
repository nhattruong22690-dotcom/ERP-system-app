const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Script này hỗ trợ tạo file latest.json cho Tauri Updater Manifest.
 * Bạn nên chạy script này sau khi đã build thành công ứng dụng tại máy (có kèm chữ ký).
 */

const APP_VERSION = '0.1.15'; // Cập nhật version này khớp với tauri.conf.json
const REPO = 'nhattruong22690-dotcom/ERP-system-app';
const RELEASE_NOTES = `Xinh Group ERP v${APP_VERSION} Release`;

const nsisPath = path.join(__dirname, '../src-tauri/target/release/bundle/nsis');

function findArtifacts() {
  if (!fs.existsSync(nsisPath)) {
    console.error(`❌ Không tìm thấy thư mục build: ${nsisPath}`);
    return null;
  }

  const files = fs.readdirSync(nsisPath);
  
  // Ưu tiên tìm file .zip (chuẩn cho updater)
  const bundle = files.find(f => f.endsWith('.nsis.zip'));
  const sig = files.find(f => f.endsWith('.nsis.zip.sig'));

  if (bundle && sig) {
    return { bundle, sig };
  }

  // Fallback tìm file .exe
  const exe = files.find(f => f.endsWith('.exe') && !f.includes('setup'));
  const exeSig = files.find(f => f.endsWith('.exe.sig'));

  if (exe && exeSig) {
    return { bundle: exe, sig: exeSig };
  }

  return null;
}

function generate() {
  console.log('--- 🚀 Bắt đầu tạo Manifest ---');
  
  const artifacts = findArtifacts();
  if (!artifacts) {
    console.error('❌ Không tìm thấy file build (.zip/.exe) và chữ ký (.sig) tương ứng.');
    console.log('💡 Gợi ý: Hãy đảm bảo bạn đã chạy "npm run build:tauri" và có khóa ký hợp lệ.');
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
