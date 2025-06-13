// 主入口文件 - 统一管理所有模块
// 自动初始化并导出所有功能

import { CryptoManager } from './crypto.js';
import { TOTPGenerator } from './totp.js';
import { WebDAVClient } from './webdav.js';
import { LocalStorageManager } from './local-storage.js';
import { QRScanner } from './qr-scanner.js';
import { PopupManager } from './popup.js';
import { SettingManager } from './setting.js';

// 版本信息
export const VERSION = '2.0.0';
export const BUILD_DATE = new Date().toISOString();

// 模块初始化配置
export const ModuleConfig = {
    crypto: {
        defaultKeyLength: 256,
        algorithm: 'AES-GCM'
    },
    totp: {
        timeStep: 30,
        digits: 6,
        algorithm: 'SHA1'
    },
    storage: {
        maxEntries: 1000,
        encryptByDefault: true
    },
    webdav: {
        timeout: 10000,
        retryAttempts: 3
    }
};

// 全局工具函数
export const Utils = {
    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // 节流函数
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // 格式化时间
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    },

    // 生成随机ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // 验证URL格式
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
};

// 应用程序主类
class App {
    constructor() {
        this.managers = {};
        this.initialized = false;
    }

    // 初始化应用程序
    async init() {
        if (this.initialized) return;

        try {
            // 初始化核心管理器
            this.managers.crypto = new CryptoManager();
            this.managers.totp = new TOTPGenerator();
            this.managers.webdav = new WebDAVClient();
            this.managers.localStorage = new LocalStorageManager();
            this.managers.qrScanner = new QRScanner();

            this.initialized = true;
            console.log('App core modules initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app core modules:', error);
            throw error;
        }
    }

    // 获取管理器实例
    getManager(name) {
        return this.managers[name];
    }

    // 获取工具函数
    getUtils() {
        return Utils;
    }

    // 获取配置
    getConfig() {
        return ModuleConfig;
    }

    // 初始化弹出页面
    async initPopup() {
        await this.init();
        if (!this.managers.popup) {
            console.log('Initializing popup manager...');
            this.managers.popup = new PopupManager();
        }
        return this.managers.popup;
    }

    // 初始化设置页面
    async initSettings() {
        await this.init();
        if (!this.managers.settings) {
            console.log('Initializing settings manager...');
            this.managers.settings = new SettingManager();
        }
        return this.managers.settings;
    }
}

// 创建全局应用实例
const app = new App();

// 自动检测页面类型并初始化相应管理器
document.addEventListener('DOMContentLoaded', async () => {
    const currentPage = window.location.pathname;
    console.log('Current page:', currentPage);
    
    try {
        if (currentPage.includes('popup.html')) {
            console.log('Initializing popup page...');
            await app.initPopup();
        } else if (currentPage.includes('setting.html')) {
            console.log('Initializing settings page...');
            await app.initSettings();
        }
    } catch (error) {
        console.error('Failed to initialize page:', error);
    }
});

// 导出应用实例和相关类供其他模块使用
export default app;

// 核心管理器类
export { 
    CryptoManager as Crypto,
    TOTPGenerator as TOTP,
    WebDAVClient as WebDAV,
    LocalStorageManager as Storage,
    QRScanner as QRCode,
    PopupManager as Popup,
    SettingManager as Settings
};

// 工具和配置
export { Utils, ModuleConfig as Config, VERSION };
