const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Script này hỗ trợ tạo file latest.json cho Tauri Updater Manifest.
 * Bạn nên chạy script này sau khi đã build thành công ứng dụng tại máy (có kèm chữ ký).
 */

const APP_VERSION = '0.1.16'; // Cập nhật version này khớp với tauri.conf.json
const REPO = 'nhattruong22690-dotcom/ERP-system-app';
const RELEASE_NOTES = `Xinh Group ERP v${APP_VERSION} Release`;

const nsisPath = path.join(__dirname, '../src-tauri/target/release/bundle/nsis');

function findArtifacts() {
  if (!fs.existsSync(nsisPath)) {
    console.error(`❌ Không tìm thấy thư mục build: ${nsisPath}`);
    return null;
  }

  const files = fs.readdirSync(nsisPath);
  console.log('📂 Các file tìm thấy trong thư mục build:');
  files.forEach(f => console.log(`  - ${f}`));
  
  // Tìm kiếm file bundle (.zip hoặc .exe)
  // Ưu tiên .zip cho updater, sau đó là .exe không phải setup
  const bundle = files.find(f => f.endsWith('.zip')) || 
                 files.find(f => f.endsWith('.exe') && !f.includes('setup')) ||
                 files.find(f => f.endsWith('.exe')); // Chấp nhận cả setup nếu không còn gì khác

  // Tìm kiếm bất kỳ file .sig nào
  const sig = files.find(f => f.endsWith('.sig'));

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
    console.log('💡 Nguyên nhân có thể là:');
    console.log('1. Bạn chưa nạp Private Key vào môi trường (env).');
    console.log('2. Lệnh build chưa thực sự ký tên sản phẩm.');
    console.log('\n🔧 CÁCH KHẮC PHỤC:');
    console.log('Hãy chạy lệnh này để kiểm tra xem Private Key đã có chưa:');
    console.log('   dir env:TAURI_SIGNING_PRIVATE_KEY');
    console.log('\nNếu không thấy, hãy nạp lại Key và Mật khẩu, sau đó chạy lại Build.');
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
