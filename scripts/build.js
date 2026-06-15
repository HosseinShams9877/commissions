#!/usr/bin/env node

/**
 * Cross-platform build script for Commission Calculator
 * Works on both Windows and Linux/macOS
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const isWindows = process.platform === 'win32';

function run(cmd, label) {
  console.log(`\n[${label}] ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit', shell: true });
  } catch (err) {
    console.error(`\n[خطا] ${label} ناموفق بود`);
    process.exit(1);
  }
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`[خطا] پوشه ${src} وجود ندارد`);
    process.exit(1);
  }

  if (isWindows) {
    // Use xcopy on Windows
    const srcNorm = src.replace(/\//g, '\\');
    const destNorm = dest.replace(/\//g, '\\');
    fs.mkdirSync(dest, { recursive: true });
    run(`xcopy "${srcNorm}" "${destNorm}" /E /I /Y /Q`, 'کپی فایل‌ها');
  } else {
    run(`cp -r ${src} ${dest}`, 'کپی فایل‌ها');
  }
}

console.log('========================================');
console.log('  محاسبه‌گر پورسانت - بیلد');
console.log('========================================\n');

// Step 1: Next.js build
console.log('[1/3] بیلد Next.js...');
run('npx next build', 'Next.js Build');

// Step 2: Copy static files to standalone
const standaloneDir = path.join('.next', 'standalone');
const staticSrc = path.join('.next', 'static');
const staticDest = path.join(standaloneDir, '.next', 'static');
const publicSrc = 'public';
const publicDest = path.join(standaloneDir, 'public');

if (!fs.existsSync(standaloneDir)) {
  console.error('[خطا] پوشه .next/standalone وجود ندارد. آیا output: "standalone" در next.config.ts تنظیم شده؟');
  process.exit(1);
}

console.log('\n[2/3] کپی فایل‌های استاتیک...');
copyDir(staticSrc, staticDest);

console.log('\n[3/3] کپی فایل‌های پابلیک...');
copyDir(publicSrc, publicDest);

console.log('\n========================================');
console.log('  بیلد Next.js با موفقیت انجام شد!');
console.log('========================================\n');
