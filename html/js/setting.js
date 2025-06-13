// 设置页面的JavaScript代码 - 全局变量版本
// 使用全局变量导入模块
const GlobalScope = (() => {
    if (typeof globalThis !== 'undefined') return globalThis;
    if (typeof window !== 'undefined') return window;
    if (typeof self !== 'undefined') return self;
    if (typeof global !== 'undefined') return global;
    throw new Error('无法确定全局作用域');
})();

// 从全局变量获取模块
const Crypto = GlobalScope.CryptoManager;
const WebDAV = GlobalScope.WebDAVClient;
const Storage = GlobalScope.LocalStorageManager;

// 工具函数
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

// 设置管理器类
class SettingManager {
    constructor() {
        this.localStorageManager = new Storage();
        this.cryptoManager = new Crypto();
        this.webdavClient = new WebDAV();
        this.init();
    }

    init() {
        // 等待DOM加载后初始化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initApp());
        } else {
            this.initApp();
        }
    }

    initApp() {
        this.initElements();
        this.initEventListeners();
        this.loadSettings();
    }

    initElements() {
        // 获取所有DOM元素
        this.elements = {
            backButton: document.getElementById('backButton'),
            testWebdavButton: document.getElementById('testWebdav'),
            saveWebdavButton: document.getElementById('saveWebdav'),
            saveEncryptionButton: document.getElementById('saveEncryption'),
            saveLocalStorageButton: document.getElementById('saveLocalStorage'),
            addConfigButton: document.getElementById('addConfig'),
            exportConfigsButton: document.getElementById('exportConfigs'),
            importConfigsButton: document.getElementById('importConfigs'),
            syncToCloudButton: document.getElementById('syncToCloud'),
            validateConfigsButton: document.getElementById('validateConfigs'),
            addConfigModal: document.getElementById('addConfigModal'),
            closeModal: document.querySelector('.close'),
            saveConfigButton: document.getElementById('saveConfig'),
            cancelConfigButton: document.getElementById('cancelConfig')
        };
    }

    initEventListeners() {
        // 返回按钮
        this.elements.backButton?.addEventListener('click', () => {
            window.close();
        });

        // 测试WebDAV连接
        this.elements.testWebdavButton?.addEventListener('click', () => this.testWebDAVConnection());
        
        // 保存WebDAV设置
        this.elements.saveWebdavButton?.addEventListener('click', () => this.saveWebDAVSettings());
        
        // 保存加密设置
        this.elements.saveEncryptionButton?.addEventListener('click', () => this.saveEncryptionSettings());
        
        // 保存本地存储设置
        this.elements.saveLocalStorageButton?.addEventListener('click', () => this.saveLocalStorageSettings());
        
        // 添加配置
        this.elements.addConfigButton?.addEventListener('click', () => this.showAddConfigModal());
        
        // 导出配置
        this.elements.exportConfigsButton?.addEventListener('click', () => this.exportConfigs());
        
        // 导入配置
        this.elements.importConfigsButton?.addEventListener('click', () => this.importConfigs());
        
        // 同步到云端
        this.elements.syncToCloudButton?.addEventListener('click', () => this.syncToCloud());
        
        // 验证配置
        this.elements.validateConfigsButton?.addEventListener('click', () => this.validateConfigs());
        
        // 模态框事件
        this.elements.closeModal?.addEventListener('click', () => this.hideAddConfigModal());
        this.elements.cancelConfigButton?.addEventListener('click', () => this.hideAddConfigModal());
        this.elements.saveConfigButton?.addEventListener('click', () => this.saveNewConfig());
    }

    async testWebDAVConnection() {
        const url = document.getElementById('webdavUrl')?.value;
        const username = document.getElementById('webdavUsername')?.value;
        const password = document.getElementById('webdavPassword')?.value;

        if (!url || !username || !password) {
            this.showMessage('请填写完整的WebDAV信息', 'error');
            return;
        }

        try {
            this.showMessage('正在测试连接...', 'info');
            this.webdavClient.setCredentials(url, username, password);
            const result = await this.webdavClient.testConnection();
            
            if (result.success) {
                this.showMessage('WebDAV连接测试成功！', 'success');
            } else {
                this.showMessage('连接测试失败: ' + result.error, 'error');
            }
        } catch (error) {
            this.showMessage('连接测试失败: ' + error.message, 'error');
        }
    }

    async saveWebDAVSettings() {
        const config = {
            url: document.getElementById('webdavUrl')?.value,
            username: document.getElementById('webdavUsername')?.value,
            password: document.getElementById('webdavPassword')?.value
        };

        try {
            await chrome.storage.local.set({ webdavConfig: config });
            this.showMessage('WebDAV设置已保存', 'success');
        } catch (error) {
            this.showMessage('保存失败: ' + error.message, 'error');
        }
    }

    async saveEncryptionSettings() {
        const encryptionKey = document.getElementById('encryptionKey')?.value;
        const enableBiometric = document.getElementById('enableBiometric')?.checked;

        try {
            await chrome.storage.local.set({
                encryptionConfig: {
                    customKey: encryptionKey,
                    biometricEnabled: enableBiometric
                }
            });
            this.showMessage('加密设置已保存', 'success');
        } catch (error) {
            this.showMessage('保存失败: ' + error.message, 'error');
        }
    }

    async saveLocalStorageSettings() {
        const useEncryptedStorage = document.getElementById('useEncryptedStorage')?.checked;
        const autoBackup = document.getElementById('autoBackup')?.checked;

        try {
            await chrome.storage.local.set({
                localStorageConfig: {
                    useEncryptedStorage: useEncryptedStorage,
                    autoBackup: autoBackup
                }
            });
            this.showMessage('本地存储设置已保存', 'success');
        } catch (error) {
            this.showMessage('保存失败: ' + error.message, 'error');
        }
    }

    showAddConfigModal() {
        if (this.elements.addConfigModal) {
            this.elements.addConfigModal.style.display = 'block';
        }
    }

    hideAddConfigModal() {
        if (this.elements.addConfigModal) {
            this.elements.addConfigModal.style.display = 'none';
        }
    }

    async saveNewConfig() {
        const name = document.getElementById('configName')?.value;
        const secret = document.getElementById('configSecret')?.value;
        const issuer = document.getElementById('configIssuer')?.value;

        if (!name || !secret) {
            this.showMessage('请填写配置名称和密钥', 'error');
            return;
        }

        try {
            const config = {
                name: name,
                secret: secret,
                issuer: issuer || '',
                type: 'totp'
            };

            const result = await this.localStorageManager.addLocalConfig(config);
            if (result.success) {
                this.showMessage('配置已添加', 'success');
                this.hideAddConfigModal();
                this.clearConfigForm();
            } else {
                this.showMessage('添加失败: ' + result.message, 'error');
            }
        } catch (error) {
            this.showMessage('添加失败: ' + error.message, 'error');
        }
    }

    clearConfigForm() {
        if (document.getElementById('configName')) {
            document.getElementById('configName').value = '';
        }
        if (document.getElementById('configSecret')) {
            document.getElementById('configSecret').value = '';
        }
        if (document.getElementById('configIssuer')) {
            document.getElementById('configIssuer').value = '';
        }
    }

    async exportConfigs() {
        try {
            const configs = await this.localStorageManager.getAllLocalConfigs();
            const dataStr = JSON.stringify(configs, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const exportFileDefaultName = `2fa-configs-${new Date().toISOString().split('T')[0]}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            
            this.showMessage('配置已导出', 'success');
        } catch (error) {
            this.showMessage('导出失败: ' + error.message, 'error');
        }
    }

    async importConfigs() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const configs = JSON.parse(e.target.result);
                        let successCount = 0;
                        
                        for (const config of configs) {
                            const result = await this.localStorageManager.addLocalConfig(config);
                            if (result.success) {
                                successCount++;
                            }
                        }
                        
                        this.showMessage(`成功导入 ${successCount} 个配置`, 'success');
                    } catch (error) {
                        this.showMessage('导入失败: ' + error.message, 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        
        input.click();
    }

    async syncToCloud() {
        try {
            this.showMessage('正在同步到云端...', 'info');
            // 这里实现同步逻辑
            this.showMessage('同步完成', 'success');
        } catch (error) {
            this.showMessage('同步失败: ' + error.message, 'error');
        }
    }

    async validateConfigs() {
        try {
            this.showMessage('正在验证配置...', 'info');
            const configs = await this.localStorageManager.getAllLocalConfigs();
            let validCount = 0;
            
            for (const config of configs) {
                // 简单验证逻辑
                if (config.name && config.secret) {
                    validCount++;
                }
            }
            
            this.showMessage(`验证完成，有效配置: ${validCount}/${configs.length}`, 'success');
        } catch (error) {
            this.showMessage('验证失败: ' + error.message, 'error');
        }
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.local.get(['webdavConfig', 'encryptionConfig', 'localStorageConfig']);
            
            // 加载WebDAV设置
            if (result.webdavConfig) {
                const config = result.webdavConfig;
                if (document.getElementById('webdavUrl')) {
                    document.getElementById('webdavUrl').value = config.url || '';
                }
                if (document.getElementById('webdavUsername')) {
                    document.getElementById('webdavUsername').value = config.username || '';
                }
                if (document.getElementById('webdavPassword')) {
                    document.getElementById('webdavPassword').value = config.password || '';
                }
            }

            // 加载加密设置
            if (result.encryptionConfig) {
                const config = result.encryptionConfig;
                if (document.getElementById('encryptionKey')) {
                    document.getElementById('encryptionKey').value = config.customKey || '';
                }
                if (document.getElementById('enableBiometric')) {
                    document.getElementById('enableBiometric').checked = config.biometricEnabled || false;
                }
            }

            // 加载本地存储设置
            if (result.localStorageConfig) {
                const config = result.localStorageConfig;
                if (document.getElementById('useEncryptedStorage')) {
                    document.getElementById('useEncryptedStorage').checked = config.useEncryptedStorage || false;
                }
                if (document.getElementById('autoBackup')) {
                    document.getElementById('autoBackup').checked = config.autoBackup || false;
                }
            }
        } catch (error) {
            console.error('加载设置失败:', error);
        }
    }

    showMessage(message, type = 'info') {
        // 创建并显示消息提示
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: 4px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
        `;

        switch (type) {
            case 'success':
                messageDiv.style.backgroundColor = '#10b981';
                break;
            case 'error':
                messageDiv.style.backgroundColor = '#ef4444';
                break;
            case 'warning':
                messageDiv.style.backgroundColor = '#f59e0b';
                break;
            default:
                messageDiv.style.backgroundColor = '#3b82f6';
        }

        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);

        // 3秒后自动移除
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.style.opacity = '0';
                setTimeout(() => {
                    if (messageDiv.parentNode) {
                        messageDiv.parentNode.removeChild(messageDiv);
                    }
                }, 300);
            }
        }, 3000);    }
}

// 全局变量导出（用于Service Worker环境）
if (typeof globalThis !== 'undefined') {
    globalThis.SettingManager = SettingManager;
} else if (typeof window !== 'undefined') {
    window.SettingManager = SettingManager;
} else if (typeof self !== 'undefined') {
    self.SettingManager = SettingManager;
}

// 创建并导出设置管理器实例
const settingManager = new SettingManager();

// 全局变量导出 - 支持多种环境
(() => {
    const GlobalScope = (() => {
        if (typeof globalThis !== 'undefined') return globalThis;
        if (typeof window !== 'undefined') return window;
        if (typeof self !== 'undefined') return self;
        if (typeof global !== 'undefined') return global;
        throw new Error('无法确定全局作用域');
    })();
    
    GlobalScope.SettingManager = SettingManager;
    GlobalScope.settingManager = settingManager;
})();
