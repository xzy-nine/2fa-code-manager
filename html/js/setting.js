// 设置页面的JavaScript代码 - 全局变量版本
// 使用全局变量导入模块（GlobalScope已在crypto.js中定义）

// 从全局变量获取模块
const Crypto = GlobalScope.CryptoManager;
const WebDAV = GlobalScope.WebDAVClient;
const Storage = GlobalScope.LocalStorageManager;

// 使用全局工具函数（在main.js中定义）
// Utils 已经在全局作用域中可用，无需重新声明

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
            backupToCloudButton: document.getElementById('backupToCloud'),
            restoreFromCloudButton: document.getElementById('restoreFromCloud'),
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
        
        // 备份到云端
        this.elements.backupToCloudButton?.addEventListener('click', () => this.backupToCloud());
        
        // 从云端恢复
        this.elements.restoreFromCloudButton?.addEventListener('click', () => this.restoreFromCloud());
        
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
    }    async saveNewConfig() {
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

            // 优先保存到本地存储
            const result = await this.localStorageManager.addLocalConfig(config);
            if (result.success) {
                this.showMessage('配置已保存到本地', 'success');
                
                // 自动备份到云端（如果配置了WebDAV）
                this.backupToCloud(result.config);
                
                this.hideAddConfigModal();
                this.clearConfigForm();
            } else {
                this.showMessage('添加失败: ' + result.message, 'error');
            }
        } catch (error) {
            this.showMessage('添加失败: ' + error.message, 'error');
        }
    }

    // 自动备份到云端
    async backupToCloud(config) {
        try {
            if (this.webdavClient) {
                const backupResult = await this.webdavClient.addConfig(config);
                if (backupResult.success) {
                    this.showMessage('已自动备份到云端', 'info', 2000);
                } else {
                    console.warn('云端备份失败:', backupResult.message);
                    this.showMessage('云端备份失败，但本地已保存', 'warning', 3000);
                }
            }
        } catch (error) {
            console.warn('云端备份出错:', error);
            // 备份失败不影响主要功能
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
    }    // 备份本地配置到云端
    async backupToCloud() {
        try {
            if (!this.webdavClient) {
                this.showMessage('请先配置WebDAV服务器', 'warning');
                return;
            }

            this.showMessage('正在备份到云端...', 'info');
            
            // 获取所有本地配置
            const localConfigs = await this.localStorageManager.getAllLocalConfigs();
            
            if (localConfigs.length === 0) {
                this.showMessage('没有本地配置需要备份', 'info');
                return;
            }

            let successCount = 0;
            let failCount = 0;

            // 逐个备份配置
            for (const config of localConfigs) {
                try {
                    const result = await this.webdavClient.addConfig(config.config || config);
                    if (result.success) {
                        successCount++;
                    } else {
                        failCount++;
                        console.warn('备份配置失败:', config.name, result.message);
                    }
                } catch (error) {
                    failCount++;
                    console.error('备份配置出错:', config.name, error);
                }
            }

            if (failCount === 0) {
                this.showMessage(`成功备份 ${successCount} 个配置到云端`, 'success');
            } else {
                this.showMessage(`备份完成：成功 ${successCount} 个，失败 ${failCount} 个`, 'warning');
            }
        } catch (error) {
            this.showMessage('备份失败: ' + error.message, 'error');
        }
    }

    // 从云端恢复配置到本地
    async restoreFromCloud() {
        try {
            if (!this.webdavClient) {
                this.showMessage('请先配置WebDAV服务器', 'warning');
                return;
            }

            if (!confirm('从云端恢复会与本地配置合并，是否继续？')) {
                return;
            }

            this.showMessage('正在从云端恢复...', 'info');
            
            // 获取云端配置列表
            const cloudConfigs = await this.webdavClient.getConfigList();
            
            if (cloudConfigs.length === 0) {
                this.showMessage('云端没有配置可恢复', 'info');
                return;
            }

            // 获取本地现有配置，用于去重
            const localConfigs = await this.localStorageManager.getLocalConfigList();
            const localConfigNames = new Set(localConfigs.map(c => `${c.name}_${c.issuer || ''}`));

            let successCount = 0;
            let skipCount = 0;
            let failCount = 0;

            // 逐个恢复配置
            for (const cloudConfig of cloudConfigs) {
                try {
                    const configKey = `${cloudConfig.name}_${cloudConfig.issuer || ''}`;
                    
                    // 检查是否已存在
                    if (localConfigNames.has(configKey)) {
                        skipCount++;
                        continue;
                    }

                    // 获取完整的云端配置
                    const fullConfig = await this.webdavClient.getConfig(cloudConfig.id);
                    if (fullConfig.success) {
                        const result = await this.localStorageManager.addLocalConfig(fullConfig.config);
                        if (result.success) {
                            successCount++;
                            localConfigNames.add(configKey); // 避免重复
                        } else {
                            failCount++;
                        }
                    } else {
                        failCount++;
                    }
                } catch (error) {
                    failCount++;
                    console.error('恢复配置出错:', cloudConfig.name, error);
                }
            }

            const message = `恢复完成：新增 ${successCount} 个，跳过 ${skipCount} 个，失败 ${failCount} 个`;
            if (failCount === 0) {
                this.showMessage(message, 'success');
            } else {
                this.showMessage(message, 'warning');
            }
        } catch (error) {
            this.showMessage('恢复失败: ' + error.message, 'error');
        }
    }

    async syncToCloud() {
        // 保留旧方法，实际调用备份功能
        await this.backupToCloud();
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
            }        } catch (error) {
            console.error('加载设置失败:', error);
        }
    }

    showMessage(message, type = 'info', duration = 3000) {
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

        // 根据指定时间后自动移除
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.style.opacity = '0';
                setTimeout(() => {
                    if (messageDiv.parentNode) {
                        messageDiv.parentNode.removeChild(messageDiv);
                    }
                }, 300);
            }
        }, duration);}
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
    GlobalScope.SettingManager = SettingManager;
    GlobalScope.settingManager = settingManager;
})();
