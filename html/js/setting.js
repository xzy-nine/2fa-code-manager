// 设置页面的JavaScript代码 - 简化版本
// 该文件只负责初始化设置页面和协调各个模块

// 设置管理器类
class SettingManager {    constructor() {
        // 获取全局模块实例
        this.themeManager = window.themeManager || new GlobalScope.ThemeManager();
        this.webdavClient = window.webdavClient || new GlobalScope.WebDAVClient();
        this.cryptoManager = window.cryptoManager || new GlobalScope.CryptoManager();
        this.localStorageManager = window.localStorageManager || new GlobalScope.LocalStorageManager();
        this.deviceAuthenticator = window.deviceAuthenticator || new GlobalScope.DeviceAuthenticator();
        this.totpConfigManager = window.totpConfigManager || new GlobalScope.TOTPConfigManager();
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
        // 设置页面只负责基础渲染和初始化
        this.renderPage();
        this.initElements();
        this.initEventListeners();
        this.loadModules(); // 初始化并加载各个模块
        this.initScrollProgress(); // 初始化滚动进度
    }    // 加载所有模块的设置
    async loadModules() {
        try {
            // 如果是受限模式，只初始化设备验证器
            if (this.isRestrictedMode) {
                if (this.deviceAuthenticator) {
                    await this.deviceAuthenticator.initSettings();
                }
                this.setupRestrictedModeListeners();
                return;
            }
            
            // 正常模式，初始化所有模块
            if (this.themeManager) {
                await this.themeManager.initSettings();
            }
            
            if (this.webdavClient) {
                await this.webdavClient.initSettings();
            }
            
            if (this.cryptoManager) {
                await this.cryptoManager.initSettings();
            }
            
            if (this.localStorageManager) {
                await this.localStorageManager.initSettings();
            }
            
            if (this.deviceAuthenticator) {
                await this.deviceAuthenticator.initSettings();
            }
            
            if (this.totpConfigManager) {
                await this.totpConfigManager.initSettings();
            }
        } catch (error) {
            console.error('加载模块设置失败:', error);
            this.showMessage('加载设置失败: ' + error.message, 'error');
        }
    }
    
    // 设置受限模式的事件监听器
    setupRestrictedModeListeners() {
        // 监听全局安全状态变更
        document.addEventListener('globalSecurityStateChanged', (e) => {
            if (!e.detail.enabled) {
                // 验证器被关闭，重新加载页面显示所有设置
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            }
        });
        
        // 监听验证成功事件
        document.addEventListener('authenticationSuccessful', (e) => {
            // 验证成功，重新加载页面
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        });
    }// 初始化滚动进度指示器
    initScrollProgress() {
        const settingsContent = document.querySelector('.settings-content');
        if (!settingsContent) return;

        const updateScrollProgress = () => {
            const scrollTop = settingsContent.scrollTop;
            const scrollHeight = settingsContent.scrollHeight - settingsContent.clientHeight;
            const scrollProgress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
            
            document.documentElement.style.setProperty('--scroll-progress', `${scrollProgress}%`);
        };

        settingsContent.addEventListener('scroll', updateScrollProgress);
        updateScrollProgress(); // 初始化
    }    // 初始化事件监听器
    initEventListeners() {
        // 返回按钮
        document.getElementById('backButton')?.addEventListener('click', () => {
            window.close();
        });

        // 每个模块将自行添加自己的事件监听器
        // 设置页面无需处理具体模块的事件监听
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
    }    async saveLocalStorageSettings() {
        const allowLocalStorage = document.getElementById('allowLocalStorage')?.checked;

        try {
            await chrome.storage.local.set({
                localStorageConfig: {
                    useEncryptedStorage: allowLocalStorage || false
                }
            });
            this.showMessage('本地存储设置已保存', 'success');
        } catch (error) {
            this.showMessage('保存失败: ' + error.message, 'error');
        }
    }    // 主题设置功能
    async saveThemeSettings() {
        const theme = document.getElementById('themeSelect')?.value;
        const saveButton = document.getElementById('saveTheme');
        
        try {
            // 使用全局主题管理器
            if (window.themeManager) {
                await window.themeManager.saveTheme(theme || 'auto');
                this.showMessage('主题设置已保存', 'success');
                this.showSuccessAnimation(saveButton);
            } else {
                // 回退到原来的方法
                await chrome.storage.local.set({
                    themeConfig: {
                        theme: theme || 'auto'
                    }
                });
                this.showMessage('主题设置已保存', 'success');
                this.showSuccessAnimation(saveButton);
                this.applyTheme();
            }
        } catch (error) {
            this.showMessage('保存失败: ' + error.message, 'error');
            this.showErrorAnimation(saveButton);
        }
    }

    applyTheme() {
        if (window.themeManager) {
            // 使用全局主题管理器
            const themeSelect = document.getElementById('themeSelect');
            const selectedTheme = themeSelect?.value || 'auto';
            window.themeManager.saveTheme(selectedTheme);
        } else {
            // 回退到原来的方法
            const themeSelect = document.getElementById('themeSelect');
            const selectedTheme = themeSelect?.value || 'auto';
            const body = document.body;
            
            // 移除所有主题类
            body.classList.remove('dark-mode', 'light-mode');
            
            switch (selectedTheme) {
                case 'dark':
                    body.classList.add('dark-mode');
                    break;
                case 'light':
                    body.classList.add('light-mode');
                    break;
                case 'auto':
                default:
                    // 跟随系统设置，不添加额外类，依赖CSS媒体查询
                    break;
            }
            
            // 保存当前主题到localStorage以便其他页面使用
            try {
                localStorage.setItem('theme-preference', selectedTheme);
            } catch (error) {
                console.warn('无法保存主题偏好到localStorage:', error);
            }
        }
    }

    async initTheme() {
        try {
            if (window.themeManager) {
                // 使用全局主题管理器
                const currentTheme = window.themeManager.getCurrentTheme();
                const themeSelect = document.getElementById('themeSelect');
                if (themeSelect) {
                    themeSelect.value = currentTheme;
                }
            } else {
                // 回退到原来的方法
                const result = await chrome.storage.local.get(['themeConfig']);
                const savedTheme = result.themeConfig?.theme || 'auto';
                
                // 设置选择框的值
                const themeSelect = document.getElementById('themeSelect');
                if (themeSelect) {
                    themeSelect.value = savedTheme;
                }
                
                // 应用主题
                this.applyTheme();
            }
        } catch (error) {
            console.warn('无法加载主题设置:', error);
            // 尝试从localStorage获取
            try {
                const localTheme = localStorage.getItem('theme-preference') || 'auto';
                const themeSelect = document.getElementById('themeSelect');
                if (themeSelect) {
                    themeSelect.value = localTheme;
                }
                this.applyTheme();
            } catch (localError) {
                console.warn('无法从localStorage加载主题设置:', localError);
            }        }
    }

    // 初始化动画
    initAnimations() {
        // 为设置分组添加延迟动画
        const sections = document.querySelectorAll('.settings-section');
        sections.forEach((section, index) => {
            section.style.animationDelay = `${index * 0.1}s`;
        });

        // 监听主题变化，添加过渡效果
        document.addEventListener('themeChanged', () => {
            document.body.classList.add('theme-transition');
            setTimeout(() => {
                document.body.classList.remove('theme-transition');
            }, 500);
        });
    }    // 动态渲染页面内容
    renderPage() {
        const app = document.getElementById('app');
        if (!app) return;

        // 先检查是否需要显示受限访问界面
        if (this.deviceAuthenticator && this.deviceAuthenticator.shouldRestrictAccess()) {
            // 只显示设备验证器控制和验证按钮
            this.renderRestrictedPage(app);
            this.isRestrictedMode = true;
            return;
        }
        
        // 正常模式，渲染完整设置页面
        this.renderFullSettingsPage(app);
    }
    
    // 渲染受限访问页面
    renderRestrictedPage(app) {
        app.innerHTML = `
            <header class="header">
                <h1>设置 - 安全验证</h1>
                <button id="backButton" class="back-button">返回</button>
            </header>
            <main class="settings-content restricted">
                <div id="device-auth-settings"></div>
            </main>
        `;
        
        // 使用设备验证器渲染受限UI
        const deviceAuthContainer = document.getElementById('device-auth-settings');
        if (deviceAuthContainer && this.deviceAuthenticator) {
            this.deviceAuthenticator.renderRestrictedUI(deviceAuthContainer);
        }
    }
    
    // 渲染完整设置页面
    renderFullSettingsPage(app) {
        app.innerHTML = `
            <header class="header">
                <h1>设置</h1>
                <button id="backButton" class="back-button">返回</button>
            </header>
            <main class="settings-content">
                <div id="theme-settings"></div>
                <div id="device-auth-settings"></div>
                <div id="webdav-settings"></div>
                <div id="encryption-settings"></div>
                <div id="local-storage-settings"></div>
                <div id="config-management-settings"></div>
                <div id="about-section">
                    <section class="settings-section">
                        <h2>关于</h2>
                        <div class="about-info">
                            <p><strong>2FA验证码管家</strong></p>
                            <p>版本: 1.0.0</p>
                            <p>一个功能强大的2FA验证码管理浏览器扩展</p>
                        </div>
                    </section>
                </div>
            </main>
            <div id="modals-container"></div>
        `;
    }// 初始化元素 - 简化版
    initElements() {
        // 设置页面只负责最基本的元素引用
        // 各个模块负责初始化和管理自己的DOM元素
        this.elements = this.elements || {};
        this.elements.backButton = document.getElementById('backButton');
    }    initEventListeners() {
        // 返回按钮
        this.elements.backButton?.addEventListener('click', () => {
            window.close();
        });

        // 主题设置
        this.elements.saveThemeButton?.addEventListener('click', () => this.saveThemeSettings());
        this.elements.themeSelect?.addEventListener('change', () => this.applyTheme());

        // 设备验证器设置
        this.elements.enableDeviceAuth?.addEventListener('change', (e) => this.toggleDeviceAuth(e.target.checked));
        this.elements.testDeviceAuth?.addEventListener('click', () => this.testDeviceAuth());
        this.elements.resetCredentials?.addEventListener('click', () => this.resetDeviceCredentials());
        this.elements.saveDeviceAuth?.addEventListener('click', () => this.saveDeviceAuthSettings());

        // 测试WebDAV连接
        this.elements.testWebdavButton?.addEventListener('click', () => this.testWebDAVConnection());
        
        // 保存WebDAV设置
        this.elements.saveWebdavButton?.addEventListener('click', () => this.saveWebDAVSettings());
        
        // 保存加密设置
        this.elements.saveEncryptionButton?.addEventListener('click', () => this.saveEncryptionSettings());
        
        // 保存本地存储设置
        this.elements.saveLocalStorageButton?.addEventListener('click', () => this.saveLocalStorageSettings());
        
        // TOTP配置管理事件由TOTPConfigManager自己处理
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
    }    async saveLocalStorageSettings() {
        const allowLocalStorage = document.getElementById('allowLocalStorage')?.checked;

        try {
            await chrome.storage.local.set({
                localStorageConfig: {
                    useEncryptedStorage: allowLocalStorage || false
                }
            });
            this.showMessage('本地存储设置已保存', 'success');
        } catch (error) {
            this.showMessage('保存失败: ' + error.message, 'error');
        }
    }    // 主题设置功能
    async saveThemeSettings() {
        const theme = document.getElementById('themeSelect')?.value;
        const saveButton = document.getElementById('saveTheme');
        
        try {
            // 使用全局主题管理器
            if (window.themeManager) {
                await window.themeManager.saveTheme(theme || 'auto');
                this.showMessage('主题设置已保存', 'success');
                this.showSuccessAnimation(saveButton);
            } else {
                // 回退到原来的方法
                await chrome.storage.local.set({
                    themeConfig: {
                        theme: theme || 'auto'
                    }
                });
                this.showMessage('主题设置已保存', 'success');
                this.showSuccessAnimation(saveButton);
                this.applyTheme();
            }
        } catch (error) {
            this.showMessage('保存失败: ' + error.message, 'error');
            this.showErrorAnimation(saveButton);
        }
    }

    applyTheme() {
        if (window.themeManager) {
            // 使用全局主题管理器
            const themeSelect = document.getElementById('themeSelect');
            const selectedTheme = themeSelect?.value || 'auto';
            window.themeManager.saveTheme(selectedTheme);
        } else {
            // 回退到原来的方法
            const themeSelect = document.getElementById('themeSelect');
            const selectedTheme = themeSelect?.value || 'auto';
            const body = document.body;
            
            // 移除所有主题类
            body.classList.remove('dark-mode', 'light-mode');
            
            switch (selectedTheme) {
                case 'dark':
                    body.classList.add('dark-mode');
                    break;
                case 'light':
                    body.classList.add('light-mode');
                    break;
                case 'auto':
                default:
                    // 跟随系统设置，不添加额外类，依赖CSS媒体查询
                    break;
            }
            
            // 保存当前主题到localStorage以便其他页面使用
            try {
                localStorage.setItem('theme-preference', selectedTheme);
            } catch (error) {
                console.warn('无法保存主题偏好到localStorage:', error);
            }
        }
    }

    async initTheme() {
        try {
            if (window.themeManager) {
                // 使用全局主题管理器
                const currentTheme = window.themeManager.getCurrentTheme();
                const themeSelect = document.getElementById('themeSelect');
                if (themeSelect) {
                    themeSelect.value = currentTheme;
                }
            } else {
                // 回退到原来的方法
                const result = await chrome.storage.local.get(['themeConfig']);
                const savedTheme = result.themeConfig?.theme || 'auto';
                
                // 设置选择框的值
                const themeSelect = document.getElementById('themeSelect');
                if (themeSelect) {
                    themeSelect.value = savedTheme;
                }
                
                // 应用主题
                this.applyTheme();
            }
        } catch (error) {
            console.warn('无法加载主题设置:', error);
            // 尝试从localStorage获取
            try {
                const localTheme = localStorage.getItem('theme-preference') || 'auto';
                const themeSelect = document.getElementById('themeSelect');
                if (themeSelect) {
                    themeSelect.value = localTheme;
                }
                this.applyTheme();
            } catch (localError) {
                console.warn('无法从localStorage加载主题设置:', localError);
            }
        }
    }    // 设备验证器相关方法
    
    // 加载设备验证器设置 - 仅初始化UI，具体加载逻辑已移到DeviceAuthenticator类
    async loadDeviceAuthSettings() {
        try {
            // 标记页面类型，方便设备验证器识别
            document.body.id = document.body.id || 'authenticator-settings';
            
            // 设备验证器将会自动初始化UI
            console.log('设备验证器设置由DeviceAuthenticator类处理');
        } catch (error) {
            console.error('加载设备验证器设置失败:', error);
            this.showMessage('加载设备验证器设置失败', 'error');
        }
    }    /**
     * 显示消息提示
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型（success, error, info, warning）
     * @param {number} duration - 消息显示持续时间（毫秒）
     */
    showMessage(message, type = 'info', duration = 3000) {
        // 创建或获取消息容器
        let messageContainer = document.getElementById('message-container');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'message-container';
            messageContainer.style.position = 'fixed';
            messageContainer.style.top = '20px';
            messageContainer.style.right = '20px';
            messageContainer.style.zIndex = '9999';
            document.body.appendChild(messageContainer);
        }
        
        // 创建新消息元素
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.style.padding = '10px 15px';
        messageElement.style.margin = '5px 0';
        messageElement.style.borderRadius = '5px';
        messageElement.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        messageElement.style.transition = 'all 0.3s ease';
        messageElement.style.opacity = '0';
        messageElement.style.transform = 'translateY(-20px)';
        
        // 根据类型设置颜色
        switch (type) {
            case 'success':
                messageElement.style.backgroundColor = '#4CAF50';
                messageElement.style.color = 'white';
                break;
            case 'error':
                messageElement.style.backgroundColor = '#F44336';
                messageElement.style.color = 'white';
                break;
            case 'warning':
                messageElement.style.backgroundColor = '#FF9800';
                messageElement.style.color = 'white';
                break;
            case 'info':
            default:
                messageElement.style.backgroundColor = '#2196F3';
                messageElement.style.color = 'white';
                break;
        }
        
        // 设置消息内容
        messageElement.textContent = message;
        
        // 添加到容器
        messageContainer.appendChild(messageElement);
        
        // 显示消息（使用setTimeout以确保DOM更新后应用动画）
        setTimeout(() => {
            messageElement.style.opacity = '1';
            messageElement.style.transform = 'translateY(0)';
        }, 10);
        
        // 设置消息自动消失
        setTimeout(() => {
            messageElement.style.opacity = '0';
            messageElement.style.transform = 'translateY(-20px)';
            
            // 等待动画结束后移除元素
            setTimeout(() => {
                messageContainer.removeChild(messageElement);
                
                // 如果没有更多消息，移除容器
                if (messageContainer.children.length === 0) {
                    document.body.removeChild(messageContainer);
                }
            }, 300);
        }, duration);
    }
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
