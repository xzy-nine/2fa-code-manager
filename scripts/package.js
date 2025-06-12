#!/usr/bin/env node

// 打包脚本
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packageInfo = require('../package.json');

console.log('📦 开始打包扩展...\n');

// 创建打包目录
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// 需要打包的文件和目录
const filesToPackage = [
    'manifest.json',
    'favicon.png',
    'html/',
    'css/',
    'js/'
];

// 需要排除的文件
const excludeFiles = [
    'test-page.html',
    'package.json',
    'package-lock.json',
    'README.md',
    'scripts/',
    'node_modules/',
    '.git/',
    '.gitignore',
    'dist/'
];

function copyRecursive(src, dest) {
    const stat = fs.statSync(src);
    
    if (stat.isDirectory()) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        
        const files = fs.readdirSync(src);
        files.forEach(file => {
            const srcPath = path.join(src, file);
            const destPath = path.join(dest, file);
            copyRecursive(srcPath, destPath);
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

function cleanDist() {
    console.log('🧹 清理打包目录...');
    if (fs.existsSync(distDir)) {
        fs.rmSync(distDir, { recursive: true });
    }
    fs.mkdirSync(distDir, { recursive: true });
}

function copyFiles() {
    console.log('📂 复制文件...');
    
    const baseDir = path.join(__dirname, '..');
    
    for (const item of filesToPackage) {
        const srcPath = path.join(baseDir, item);
        const destPath = path.join(distDir, item);
        
        if (fs.existsSync(srcPath)) {
            console.log(`  复制: ${item}`);
            copyRecursive(srcPath, destPath);
        } else {
            console.warn(`  ⚠️  文件不存在: ${item}`);
        }
    }
}

function validatePackage() {
    console.log('✅ 验证打包结果...');
    
    // 检查必需文件
    const requiredFiles = [
        'manifest.json',
        'html/popup.html',
        'css/popup.css',
        'js/popup.js',
        'js/background.js'
    ];
    
    for (const file of requiredFiles) {
        const filePath = path.join(distDir, file);
        if (!fs.existsSync(filePath)) {
            throw new Error(`打包后缺少必需文件: ${file}`);
        }
    }
    
    // 验证manifest
    const manifestPath = path.join(distDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    
    if (!manifest.name || !manifest.version) {
        throw new Error('manifest.json 缺少必需字段');
    }
    
    console.log(`  ✅ 扩展名称: ${manifest.name}`);
    console.log(`  ✅ 版本: ${manifest.version}`);
}

function generateZip() {
    console.log('🗜️  生成ZIP文件...');
    
    const zipName = `${packageInfo.name}-v${packageInfo.version}.zip`;
    const zipPath = path.join(path.dirname(distDir), zipName);
    
    try {
        // 使用PowerShell压缩（Windows）
        const command = `Compress-Archive -Path "${distDir}\\*" -DestinationPath "${zipPath}" -Force`;
        execSync(command, { shell: 'powershell.exe' });
        
        const stats = fs.statSync(zipPath);
        const fileSize = (stats.size / 1024).toFixed(2);
        
        console.log(`  ✅ ZIP文件已生成: ${zipName}`);
        console.log(`  📏 文件大小: ${fileSize} KB`);
        
        return zipPath;
    } catch (error) {
        console.error('❌ 生成ZIP文件失败:', error.message);
        throw error;
    }
}

function generateManifest() {
    console.log('📋 生成发布清单...');
    
    const manifest = {
        name: packageInfo.name,
        version: packageInfo.version,
        description: packageInfo.description,
        author: packageInfo.author,
        buildDate: new Date().toISOString(),
        files: []
    };
    
    // 收集所有文件信息
    function collectFiles(dir, basePath = '') {
        const files = fs.readdirSync(dir);
        
        files.forEach(file => {
            const filePath = path.join(dir, file);
            const relativePath = path.join(basePath, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
                collectFiles(filePath, relativePath);
            } else {
                manifest.files.push({
                    path: relativePath.replace(/\\/g, '/'),
                    size: stat.size,
                    modified: stat.mtime.toISOString()
                });
            }
        });
    }
    
    collectFiles(distDir);
    
    const manifestPath = path.join(path.dirname(distDir), 'build-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    console.log(`  ✅ 发布清单已生成: build-manifest.json`);
    console.log(`  📊 包含文件: ${manifest.files.length} 个`);
}

async function main() {
    try {
        cleanDist();
        copyFiles();
        validatePackage();
        const zipPath = generateZip();
        generateManifest();
        
        console.log('\n🎉 打包完成！');
        console.log('📁 输出目录:', distDir);
        console.log('📦 ZIP文件:', path.basename(zipPath));
        
    } catch (error) {
        console.error('\n❌ 打包失败:', error.message);
        process.exit(1);
    }
}

main();
