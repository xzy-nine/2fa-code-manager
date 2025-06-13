// 主入口文件 - 统一管理所有模块（全局变量版本）
// 避免ES6模块，使用全局变量系统

// 获取全局作用域
const GlobalScope = (() => {
    if (typeof globalThis !== 'undefined') return globalThis;
    if (typeof window !== 'undefined') return window;
    if (typeof self !== 'undefined') return self;
    if (typeof global !== 'undefined') return global;
    throw new Error('无法确定全局作用域');
})();

// 版本信息
const VERSION = '2.0.0';
const BUILD_DATE = new Date().toISOString();

// 模块初始化配置
const ModuleConfig = {
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
const Utils = {
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
            // 检查模块是否已加载
            if (!GlobalScope.CryptoManager) {
                throw new Error('CryptoManager not loaded');
            }
            if (!GlobalScope.TOTPGenerator) {
                throw new Error('TOTPGenerator not loaded');
            }
            if (!GlobalScope.WebDAVClient) {
                throw new Error('WebDAVClient not loaded');
            }
            if (!GlobalScope.LocalStorageManager) {
                throw new Error('LocalStorageManager not loaded');
            }
            if (!GlobalScope.QRScanner) {
                throw new Error('QRScanner not loaded');
            }

            // 初始化核心管理器
            this.managers.crypto = new GlobalScope.CryptoManager();
            this.managers.totp = new GlobalScope.TOTPGenerator();
            this.managers.webdav = new GlobalScope.WebDAVClient();
            this.managers.localStorage = new GlobalScope.LocalStorageManager();
            this.managers.qrScanner = new GlobalScope.QRScanner();

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
            // 使用已经创建的实例而不是新建实例
            this.managers.popup = GlobalScope.popupManager;
        }
        return this.managers.popup;
    }

    // 初始化设置页面
    async initSettings() {
        await this.init();
        if (!this.managers.settings) {
            console.log('Initializing settings manager...');
            // 使用已经创建的实例而不是新建实例
            this.managers.settings = GlobalScope.settingManager;
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

// 全局导出所有模块和实例
(() => {
    // 核心应用
    GlobalScope.App = App;
    GlobalScope.app = app;
    
    // 版本和配置
    GlobalScope.VERSION = VERSION;
    GlobalScope.BUILD_DATE = BUILD_DATE;
    GlobalScope.ModuleConfig = ModuleConfig;
    GlobalScope.Config = ModuleConfig; // 别名
    
    // 工具函数
    GlobalScope.Utils = Utils;
    
    // 简化访问的别名（向后兼容）
    GlobalScope.Crypto = GlobalScope.CryptoManager;
    GlobalScope.TOTP = GlobalScope.TOTPGenerator;
    GlobalScope.WebDAV = GlobalScope.WebDAVClient;
    GlobalScope.Storage = GlobalScope.LocalStorageManager;
    GlobalScope.QRCode = GlobalScope.QRScanner;
    GlobalScope.Popup = GlobalScope.PopupManager;
    GlobalScope.Settings = GlobalScope.SettingManager;
})();
