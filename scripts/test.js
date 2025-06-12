#!/usr/bin/env node

// 简单的测试脚本
const fs = require('fs');
const path = require('path');

if (process.env.CI || process.env.GITHUB_ACTIONS) {
    console.log('Running tests...\n');
}

// 测试配置
const tests = [
    {
        name: 'Crypto Module Test',
        test: testCryptoModule
    },
    {
        name: 'TOTP Module Test',
        test: testTOTPModule
    },
    {
        name: 'WebDAV Module Test',
        test: testWebDAVModule
    },
    {
        name: 'File Structure Test',
        test: testFileStructure
    }
];

// 运行所有测试
async function runTests() {
    let passed = 0;
    let failed = 0;    for (const test of tests) {
        try {
            if (process.env.CI || process.env.GITHUB_ACTIONS) {
                console.log(`Running test: ${test.name}`);
            }
            await test.test();
            if (process.env.CI || process.env.GITHUB_ACTIONS) {
                console.log(`✅ ${test.name} - passed\n`);
            }
            passed++;
        } catch (error) {
            if (process.env.CI || process.env.GITHUB_ACTIONS) {
                console.error(`❌ ${test.name} - failed: ${error.message}\n`);
            }
            failed++;
        }
    }

    if (process.env.CI || process.env.GITHUB_ACTIONS) {
        console.log('Test Results:');
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Total: ${passed}/${passed + failed}`);
    }

    if (failed > 0) {
        process.exit(1);
    }
}

// 测试加密模块
function testCryptoModule() {
    const cryptoPath = path.join(__dirname, '..', 'js', 'crypto.js');
    if (!fs.existsSync(cryptoPath)) {
        throw new Error('crypto.js 文件不存在');
    }

    const content = fs.readFileSync(cryptoPath, 'utf-8');
    
    // 检查关键类和方法
    const requiredElements = [
        'class CryptoManager',
        'async encrypt',
        'async decrypt',
        'generateKey',
        'simpleEncrypt',
        'simpleDecrypt'
    ];

    for (const element of requiredElements) {
        if (!content.includes(element)) {
            throw new Error(`缺少必需的元素: ${element}`);
        }
    }
}

// 测试TOTP模块
function testTOTPModule() {
    const totpPath = path.join(__dirname, '..', 'js', 'totp.js');
    if (!fs.existsSync(totpPath)) {
        throw new Error('totp.js 文件不存在');
    }

    const content = fs.readFileSync(totpPath, 'utf-8');
    
    const requiredElements = [
        'class TOTPGenerator',
        'async generateTOTP',
        'base32Decode',
        'parseOTPAuth',
        'getCurrentCode'
    ];

    for (const element of requiredElements) {
        if (!content.includes(element)) {
            throw new Error(`缺少必需的元素: ${element}`);
        }
    }
}

// 测试WebDAV模块
function testWebDAVModule() {
    const webdavPath = path.join(__dirname, '..', 'js', 'webdav.js');
    if (!fs.existsSync(webdavPath)) {
        throw new Error('webdav.js 文件不存在');
    }

    const content = fs.readFileSync(webdavPath, 'utf-8');
    
    const requiredElements = [
        'class WebDAVClient',
        'async testConnection',
        'async uploadFile',
        'async downloadFile',
        'getConfigList'
    ];

    for (const element of requiredElements) {
        if (!content.includes(element)) {
            throw new Error(`缺少必需的元素: ${element}`);
        }
    }
}

// 测试文件结构
function testFileStructure() {
    const requiredFiles = [
        'manifest.json',
        'html/popup.html',
        'css/popup.css',
        'js/popup.js',
        'js/background.js',
        'js/content.js',
        'js/crypto.js',
        'js/totp.js',
        'js/webdav.js',
        'js/qr-scanner.js',
        'favicon.png'
    ];

    for (const file of requiredFiles) {
        const filePath = path.join(__dirname, '..', file);
        if (!fs.existsSync(filePath)) {
            throw new Error(`必需文件不存在: ${file}`);
        }
    }

    // 检查HTML文件的基本结构
    const htmlPath = path.join(__dirname, '..', 'html', 'popup.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    
    const htmlRequirements = [
        '<!DOCTYPE html>',
        '<html',
        '<head>',
        '<body>',
        'popup-container',
        'popup-tabs'
    ];

    for (const requirement of htmlRequirements) {
        if (!htmlContent.includes(requirement)) {
            throw new Error(`HTML文件缺少必需元素: ${requirement}`);
        }
    }
}

// 运行测试
runTests().catch(error => {
    if (process.env.CI || process.env.GITHUB_ACTIONS) {
        console.error('Test execution failed:', error);
    }
    process.exit(1);
});
