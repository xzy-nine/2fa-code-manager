#!/usr/bin/env node

// 验证manifest.json文件
const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'manifest.json');

try {
    // 检查文件是否存在
    if (!fs.existsSync(manifestPath)) {
        if (process.env.CI || process.env.GITHUB_ACTIONS) {
            console.error('manifest.json file not found');
        }
        process.exit(1);
    }

    // 读取并解析manifest文件
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    // 验证必需字段
    const requiredFields = ['manifest_version', 'name', 'version', 'description'];
    const missingFields = requiredFields.filter(field => !manifest[field]);    if (missingFields.length > 0) {
        if (process.env.CI || process.env.GITHUB_ACTIONS) {
            console.error('manifest.json missing required fields:', missingFields.join(', '));
        }
        process.exit(1);
    }    // 验证manifest版本
    if (manifest.manifest_version !== 3) {
        if (process.env.CI || process.env.GITHUB_ACTIONS) {
            console.warn('Recommend using Manifest V3');
        }
    }

    // 检查权限
    if (!manifest.permissions || manifest.permissions.length === 0) {
        if (process.env.CI || process.env.GITHUB_ACTIONS) {
            console.warn('No permissions defined');
        }
    }    // 检查图标文件
    if (manifest.icons) {
        Object.values(manifest.icons).forEach(iconPath => {
            const fullPath = path.join(__dirname, '..', iconPath);
            if (!fs.existsSync(fullPath)) {
                if (process.env.CI || process.env.GITHUB_ACTIONS) {
                    console.warn(`Icon file not found: ${iconPath}`);
                }
            }
        });
    }    // 检查HTML文件
    if (manifest.action && manifest.action.default_popup) {
        const popupPath = path.join(__dirname, '..', manifest.action.default_popup);
        if (!fs.existsSync(popupPath)) {
            if (process.env.CI || process.env.GITHUB_ACTIONS) {
                console.error(`Popup file not found: ${manifest.action.default_popup}`);
            }
            process.exit(1);
        }
    }    // 检查脚本文件
    if (manifest.background && manifest.background.service_worker) {
        const workerPath = path.join(__dirname, '..', manifest.background.service_worker);
        if (!fs.existsSync(workerPath)) {
            if (process.env.CI || process.env.GITHUB_ACTIONS) {
                console.error(`Service Worker file not found: ${manifest.background.service_worker}`);
            }
            process.exit(1);
        }
    }    if (manifest.content_scripts) {
        manifest.content_scripts.forEach((script, index) => {
            script.js?.forEach(jsFile => {
                const jsPath = path.join(__dirname, '..', jsFile);
                if (!fs.existsSync(jsPath)) {
                    if (process.env.CI || process.env.GITHUB_ACTIONS) {
                        console.error(`Content script file not found: ${jsFile}`);
                    }
                    process.exit(1);
                }
            });
        });
    }

    if (process.env.CI || process.env.GITHUB_ACTIONS) {
        console.log('Manifest validation passed');
        console.log(`Extension name: ${manifest.name}`);
        console.log(`Version: ${manifest.version}`);
        console.log(`Description: ${manifest.description}`);
    }
    
} catch (error) {
    if (process.env.CI || process.env.GITHUB_ACTIONS) {
        console.error('Validation failed:', error.message);
    }
    process.exit(1);
}
