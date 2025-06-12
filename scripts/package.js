#!/usr/bin/env node

// 打包脚本
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packageInfo = require('../package.json');

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
    'package.json',
    'package-lock.json',
    'README.md',
    'CHANGELOG.md',
    'DEVELOPMENT.md',
    'INSTALL.md',
    'PROJECT-SUMMARY.md',
    'WORKFLOW.md',
    'scripts/',
    'node_modules/',
    '.git/',
    '.github/',
    '.gitignore',
    'dist/',
    'build-manifest.json',
    '*.zip'
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
    if (fs.existsSync(distDir)) {
        fs.rmSync(distDir, { recursive: true });
    }
    fs.mkdirSync(distDir, { recursive: true });
}

function copyFiles() {
    const baseDir = path.join(__dirname, '..');
    
    for (const item of filesToPackage) {
        const srcPath = path.join(baseDir, item);
        const destPath = path.join(distDir, item);
        
        if (fs.existsSync(srcPath)) {
            copyRecursive(srcPath, destPath);
        }
    }
}

function validatePackage() {
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
}

function generateZip() {
    const zipName = `${packageInfo.name}-v${packageInfo.version}.zip`;
    const zipPath = path.join(path.dirname(distDir), zipName);
    
    try {
        // 使用PowerShell压缩（Windows）
        const command = `Compress-Archive -Path "${distDir}\\*" -DestinationPath "${zipPath}" -Force`;
        execSync(command, { shell: 'powershell.exe' });
        
        return zipPath;
    } catch (error) {
        throw new Error(`生成ZIP文件失败: ${error.message}`);
    }
}

function generateManifest() {
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
}

async function main() {
    try {
        cleanDist();
        copyFiles();
        validatePackage();
        const zipPath = generateZip();
        generateManifest();
        
        // 只在CI/CD环境中输出结果信息
        if (process.env.CI || process.env.GITHUB_ACTIONS) {
            console.log('Package completed successfully');
            console.log(`Output directory: ${distDir}`);
            console.log(`ZIP file: ${path.basename(zipPath)}`);
        }
        
    } catch (error) {
        if (process.env.CI || process.env.GITHUB_ACTIONS) {
            console.error('Package failed:', error.message);
        }
        process.exit(1);
    }
}

main();
