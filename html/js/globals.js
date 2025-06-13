// 全局变量管理文件
// 用于Service Worker环境统一管理全局变量

// 检测环境并创建统一的全局对象访问方式
const GlobalScope = (() => {
    if (typeof globalThis !== 'undefined') return globalThis;
    if (typeof window !== 'undefined') return window;
    if (typeof self !== 'undefined') return self;
    if (typeof global !== 'undefined') return global;
    throw new Error('无法确定全局作用域');
})();

// Service Worker专用的模块访问器
const Modules = {
    // 获取加密管理器
    getCrypto() {
        return GlobalScope.CryptoManager ? new GlobalScope.CryptoManager() : null;
    },
    
    // 获取TOTP生成器
    getTOTP() {
        return GlobalScope.TOTPGenerator ? new GlobalScope.TOTPGenerator() : null;
    },
    
    // 获取本地存储管理器
    getStorage() {
        return GlobalScope.LocalStorageManager ? new GlobalScope.LocalStorageManager() : null;
    },
    
    // 获取WebDAV客户端
    getWebDAV() {
        return GlobalScope.WebDAVClient ? new GlobalScope.WebDAVClient() : null;
    },
    
    // 获取QR扫描器
    getQRScanner() {
        return GlobalScope.QRScanner ? new GlobalScope.QRScanner() : null;
    },
    
    // 获取弹窗管理器
    getPopup() {
        return GlobalScope.PopupManager ? new GlobalScope.PopupManager() : null;
    },
    
    // 获取设置管理器
    getSettings() {
        return GlobalScope.SettingManager ? new GlobalScope.SettingManager() : null;
    },
    
    // 检查模块是否可用
    isAvailable(moduleName) {
        const moduleMap = {
            'crypto': 'CryptoManager',
            'totp': 'TOTPGenerator', 
            'storage': 'LocalStorageManager',
            'webdav': 'WebDAVClient',
            'qrScanner': 'QRScanner',
            'popup': 'PopupManager',
            'settings': 'SettingManager'
        };
        
        const globalName = moduleMap[moduleName];
        return globalName && typeof GlobalScope[globalName] === 'function';
    },
    
    // 获取所有可用模块
    getAvailable() {
        const modules = {};
        
        if (this.isAvailable('crypto')) modules.crypto = this.getCrypto();
        if (this.isAvailable('totp')) modules.totp = this.getTOTP();
        if (this.isAvailable('storage')) modules.storage = this.getStorage();
        if (this.isAvailable('webdav')) modules.webdav = this.getWebDAV();
        if (this.isAvailable('qrScanner')) modules.qrScanner = this.getQRScanner();
        if (this.isAvailable('popup')) modules.popup = this.getPopup();
        if (this.isAvailable('settings')) modules.settings = this.getSettings();
        
        return modules;
    }
};

// 全局暴露Modules对象
GlobalScope.Modules = Modules;

// 向后兼容的直接类访问（用于Service Worker）
if (typeof importScripts === 'function') {
    // 这是Service Worker环境
    console.log('Service Worker environment detected, global classes available');
}
