// ES6模块化架构 - 核心入口文件
// 统一导出所有功能模块

// 核心功能模块
export { CryptoManager } from './crypto.js';
export { TOTPGenerator } from './totp.js';
export { WebDAVClient } from './webdav.js';
export { LocalStorageManager } from './local-storage.js';
export { QRScanner } from './qr-scanner.js';

// 页面管理模块
export { PopupManager } from './popup.js';
export { SettingManager } from './setting.js';

// 后台脚本模块（如果需要）
export { default as backgroundScript } from './background.js';
export { default as contentScript } from './content.js';

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

// 默认导出主要管理器类
export default {
    CryptoManager,
    TOTPGenerator,
    WebDAVClient,
    LocalStorageManager,
    QRScanner,
    PopupManager,
    SettingManager,
    Utils,
    ModuleConfig,
    VERSION
};
