// Background Service Worker 入口文件
// Service Worker环境不支持ES6模块，需要使用importScripts

// 导入所有需要的脚本 - 这些脚本将通过全局变量暴露类
// 首先导入依赖库
importScripts('./lib/otpauth.umd.min.js');

// 然后导入基础模块（按依赖顺序）
importScripts('./crypto.js');
importScripts('./totp.js');
importScripts('./local-storage.js');
importScripts('./webdav.js');

// 最后导入全局变量管理器
importScripts('./globals.js');

// 统一的后台服务管理器
class BackgroundManager {
    constructor() {
        try {
            console.log('开始初始化BackgroundManager...');
            
            // 检查必需的库是否已加载
            if (typeof OTPAuth === 'undefined') {
                throw new Error('OTPAuth库未加载');
            }
            
            if (typeof GlobalScope === 'undefined') {
                throw new Error('GlobalScope未定义');
            }
            
            if (typeof Modules === 'undefined') {
                throw new Error('Modules模块管理器未定义');
            }
            
            // 使用全局变量创建模块实例
            this.crypto = Modules.getCrypto();
            this.totp = Modules.getTOTP();
            this.storage = Modules.getStorage();
            this.webdav = Modules.getWebDAV();
            
            console.log('模块实例创建完成:', {
                crypto: !!this.crypto,
                totp: !!this.totp,
                storage: !!this.storage,
                webdav: !!this.webdav
            });
            
            this.init();
        } catch (error) {
            console.error('BackgroundManager初始化失败:', error);
            throw error;
        }
    }

    async init() {
        console.log('Background service initialized');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // 安装事件
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstall(details);
        });

        // 消息处理
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // 保持消息通道开放
        });

        // 上下文菜单
        this.setupContextMenu();
    }

    handleInstall(details) {
        console.log('Extension installed/updated:', details);
        
        if (details.reason === 'install') {
            // 首次安装
            this.setupDefaultSettings();
        } else if (details.reason === 'update') {
            // 更新
            console.log('Extension updated from', details.previousVersion);
        }
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case 'generateTOTP':
                    const code = await this.totp.generateTOTP(message.secret);
                    sendResponse({ success: true, code });
                    break;
                
                case 'encryptData':
                    const encrypted = await this.crypto.encrypt(message.data, message.key);
                    sendResponse({ success: true, encrypted });
                    break;
                
                case 'decryptData':
                    const decrypted = await this.crypto.decrypt(message.data, message.key);
                    sendResponse({ success: true, decrypted });
                    break;
                
                case 'syncData':
                    await this.syncWithWebDAV();
                    sendResponse({ success: true });
                    break;
                
                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Background message handler error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    setupContextMenu() {
        chrome.contextMenus.removeAll(() => {
            chrome.contextMenus.create({
                id: 'fill-2fa-code',
                title: '填充2FA验证码',
                contexts: ['editable']
            });
        });

        chrome.contextMenus.onClicked.addListener((info, tab) => {
            if (info.menuItemId === 'fill-2fa-code') {
                this.fillTOTPCode(tab);
            }
        });
    }

    async fillTOTPCode(tab) {
        try {
            // 获取当前网站的TOTP配置
            const configs = await this.storage.getAllConfigs();
            const currentDomain = new URL(tab.url).hostname;
            
            const matchingConfig = configs.find(config => 
                config.domain === currentDomain || 
                config.url.includes(currentDomain)
            );

            if (matchingConfig) {
                const code = await this.totp.generateTOTP(matchingConfig.secret);
                
                // 发送到content script执行填充
                chrome.tabs.sendMessage(tab.id, {
                    action: 'fillCode',
                    code: code
                });
            }
        } catch (error) {
            console.error('Failed to fill TOTP code:', error);
        }
    }

    async setupDefaultSettings() {
        // 设置默认配置
        const defaultSettings = {
            encryption: {
                enabled: true,
                algorithm: 'AES-GCM'
            },
            sync: {
                enabled: false,
                autoSync: false
            },
            ui: {
                theme: 'auto',
                showNotifications: true
            }
        };

        await this.storage.setSettings(defaultSettings);
    }

    async syncWithWebDAV() {
        // WebDAV同步逻辑
        const settings = await this.storage.getSettings();
        if (settings.sync.enabled && settings.webdav) {
            // 执行同步
            console.log('Syncing with WebDAV...');
            // 具体同步逻辑
        }
    }
}

// 全局错误处理
self.addEventListener('error', (event) => {
    console.error('Service Worker全局错误:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('Service Worker未处理的Promise拒绝:', event.reason);
});

// 创建后台管理器实例
try {
    const backgroundManager = new BackgroundManager();
    console.log('BackgroundManager实例创建成功');
} catch (error) {
    console.error('BackgroundManager实例创建失败:', error);
}
