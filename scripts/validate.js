#!/usr/bin/env node

// 验证manifest.json文件
const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'manifest.json');

try {
    // 检查文件是否存在
    if (!fs.existsSync(manifestPath)) {
        console.error('❌ manifest.json 文件不存在');
        process.exit(1);
    }

    // 读取并解析manifest文件
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    // 验证必需字段
    const requiredFields = ['manifest_version', 'name', 'version', 'description'];
    const missingFields = requiredFields.filter(field => !manifest[field]);

    if (missingFields.length > 0) {
        console.error('❌ manifest.json 缺少必需字段:', missingFields.join(', '));
        process.exit(1);
    }

    // 验证manifest版本
    if (manifest.manifest_version !== 3) {
        console.warn('⚠️  建议使用 Manifest V3');
    }

    // 检查权限
    if (!manifest.permissions || manifest.permissions.length === 0) {
        console.warn('⚠️  未定义任何权限');
    }

    // 检查图标文件
    if (manifest.icons) {
        Object.values(manifest.icons).forEach(iconPath => {
            const fullPath = path.join(__dirname, '..', iconPath);
            if (!fs.existsSync(fullPath)) {
                console.warn(`⚠️  图标文件不存在: ${iconPath}`);
            }
        });
    }

    // 检查HTML文件
    if (manifest.action && manifest.action.default_popup) {
        const popupPath = path.join(__dirname, '..', manifest.action.default_popup);
        if (!fs.existsSync(popupPath)) {
            console.error(`❌ 弹出页面文件不存在: ${manifest.action.default_popup}`);
            process.exit(1);
        }
    }

    // 检查脚本文件
    if (manifest.background && manifest.background.service_worker) {
        const workerPath = path.join(__dirname, '..', manifest.background.service_worker);
        if (!fs.existsSync(workerPath)) {
            console.error(`❌ Service Worker文件不存在: ${manifest.background.service_worker}`);
            process.exit(1);
        }
    }

    if (manifest.content_scripts) {
        manifest.content_scripts.forEach((script, index) => {
            script.js?.forEach(jsFile => {
                const jsPath = path.join(__dirname, '..', jsFile);
                if (!fs.existsSync(jsPath)) {
                    console.error(`❌ 内容脚本文件不存在: ${jsFile}`);
                    process.exit(1);
                }
            });
        });
    }

    console.log('✅ manifest.json 验证通过');
    console.log(`📋 扩展名称: ${manifest.name}`);
    console.log(`🔢 版本: ${manifest.version}`);
    console.log(`📝 描述: ${manifest.description}`);
    
} catch (error) {
    console.error('❌ 验证失败:', error.message);
    process.exit(1);
}
