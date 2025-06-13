// 主入口文件 - 统一管理所有模块（全局变量版本）
// 避免ES6模块，使用全局变量系统
// GlobalScope已在crypto.js中定义

// 延迟获取 core 中的公共工具函数
function getCoreUtils() {
  if (GlobalScope && GlobalScope.CoreUtils) {
    return GlobalScope.CoreUtils;
  }
  // 如果还没有初始化，返回一个临时的工具对象
  return {
    createElement: function(tag, className, attributes = {}, content = '') {
      if (typeof document === 'undefined') return null;
      const element = document.createElement(tag);
      if (className) element.className = className;
      Object.keys(attributes).forEach(key => {
        element.setAttribute(key, attributes[key]);
      });
      if (content) element.textContent = content;
      return element;
    },
    replaceEventHandler: function(selector, eventType, handler) {
      if (typeof document === 'undefined') return;
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        // 移除之前的事件监听器
        const oldHandler = element._eventHandlers?.[eventType];
        if (oldHandler) {
          element.removeEventListener(eventType, oldHandler);
        }
        
        // 添加新的事件监听器
        element.addEventListener(eventType, handler);
        
        // 保存引用以便后续移除
        element._eventHandlers = element._eventHandlers || {};
        element._eventHandlers[eventType] = handler;
      });
    },
    debounce: function(func, wait) {
      let timeout;
      return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
      };
    },
    throttle: function(func, limit) {
      let inThrottle;
      return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
          func.apply(context, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    }
  };
}

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

// 全局工具函数 - 扩展 core Utils，添加应用特定功能
const AppUtils = {
    // 格式化时间（应用特定功能）
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    },

    // 生成随机ID（应用特定功能）
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // 验证URL格式（应用特定功能）
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    },

    // 获取CoreUtils功能的代理方法
    getCoreUtils() {
        return getCoreUtils();
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
    GlobalScope.AppUtils = AppUtils;
    
    // 简化访问的别名（向后兼容）
    GlobalScope.Crypto = GlobalScope.CryptoManager;
    GlobalScope.TOTP = GlobalScope.TOTPGenerator;
    GlobalScope.WebDAV = GlobalScope.WebDAVClient;
    GlobalScope.Storage = GlobalScope.LocalStorageManager;
    GlobalScope.QRCode = GlobalScope.QRScanner;
    GlobalScope.Popup = GlobalScope.PopupManager;
    GlobalScope.Settings = GlobalScope.SettingManager;
})();
