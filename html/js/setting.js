// 设置页面的JavaScript代码 - 全局变量版本
const CoreUtils = GlobalScope.CoreUtils;

// 从全局变量获取模块
const Crypto = GlobalScope.CryptoManager;
const WebDAV = GlobalScope.WebDAVClient;
const Storage = GlobalScope.LocalStorageManager;
const DeviceAuth = GlobalScope.DeviceAuthenticator;

// 使用全局工具函数（在main.js中定义）
// Utils 已经在全局作用域中可用，无需重新声明

// 设置管理器类
class SettingManager {
    constructor() {
        this.localStorageManager = new Storage();
        this.cryptoManager = new Crypto();
        this.webdavClient = new WebDAV();
        this.deviceAuthenticator = GlobalScope.deviceAuthenticator || new DeviceAuth();
        this.init();
    }    init() {
        // 等待DOM加载后初始化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initApp());
        } else {
            this.initApp();
        }
    }
    
    initApp() {
        this.renderPage();
        this.initElements();
        this.initEventListeners();
        this.loadSettings();
        this.initTheme(); // 初始化主题
        this.initScrollProgress(); // 初始化滚动进度
        this.initAnimations(); // 初始化动画
    }

    // 加载所有设置
    async loadSettings() {
        try {
            await this.loadWebDAVSettings();
            await this.loadEncryptionSettings();
            await this.loadLocalStorageSettings();
            await this.loadDeviceAuthSettings();
        } catch (error) {
            console.error('加载设置失败:', error);
            this.showMessage('加载设置失败: ' + error.message, 'error');
        }
    }

    // 加载WebDAV设置
    async loadWebDAVSettings() {
        try {
            const result = await chrome.storage.local.get(['webdavConfig']);
            const config = result.webdavConfig || {};
            
            // 设置表单值
            const urlInput = document.getElementById('webdavUrl');
            const usernameInput = document.getElementById('webdavUsername');
            const passwordInput = document.getElementById('webdavPassword');
            
            if (urlInput) urlInput.value = config.url || '';
            if (usernameInput) usernameInput.value = config.username || '';
            if (passwordInput) passwordInput.value = config.password || '';
        } catch (error) {
            console.error('加载WebDAV设置失败:', error);
        }
    }

    // 加载加密设置
    async loadEncryptionSettings() {
        try {
            const result = await chrome.storage.local.get(['encryptionConfig']);
            const config = result.encryptionConfig || {};
            
            // 设置表单值
            const enableCustomKeyCheckbox = document.getElementById('enableCustomKey');
            const customKeyInput = document.getElementById('customKey');
            
            if (enableCustomKeyCheckbox) {
                enableCustomKeyCheckbox.checked = config.useCustomKey || false;
            }
            if (customKeyInput) {
                customKeyInput.value = config.customKey || '';
                customKeyInput.style.display = config.useCustomKey ? 'block' : 'none';
            }
        } catch (error) {
            console.error('加载加密设置失败:', error);
        }
    }

    // 加载本地存储设置
    async loadLocalStorageSettings() {
        try {
            const result = await chrome.storage.local.get(['localStorageConfig']);
            const config = result.localStorageConfig || {};
            
            // 设置表单值
            const allowLocalStorageCheckbox = document.getElementById('allowLocalStorage');
            if (allowLocalStorageCheckbox) {
                allowLocalStorageCheckbox.checked = config.useEncryptedStorage || false;
            }
        } catch (error) {
            console.error('加载本地存储设置失败:', error);
        }
    }

    // 初始化滚动进度指示器
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
                document.body.classList.remove('theme-transition');            }, 500);
        });
    }

    // 初始化事件监听器
    initEventListeners() {
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
    }

    // 动态渲染页面内容
    renderPage() {
        const app = document.getElementById('app');
        if (!app) return;

        app.innerHTML = `
            <header class="header">
                <h1>设置</h1>
                <button id="backButton" class="back-button">返回</button>
            </header>              <main class="settings-content">
                ${this.renderThemeSection()}
                ${this.renderDeviceAuthSection()}
                ${this.renderWebDAVSection()}
                ${this.renderEncryptionSection()}
                ${this.renderLocalStorageSection()}
                ${this.renderConfigManagementSection()}
                ${this.renderAboutSection()}
            </main>
            
            ${this.renderAddConfigModal()}
        `;
    }    // 渲染WebDAV设置区域
    renderWebDAVSection() {
        return `
            <section class="settings-section">
                <h2>WebDAV同步设置</h2>
                <div class="info-box">
                    <p><strong>注意：</strong>要使用云端同步功能（备份到云端、从云端恢复），必须先配置WebDAV服务器信息。</p>
                </div>
                <div class="form-group">
                    <label for="webdavUrl">服务器地址</label>
                    <input type="url" id="webdavUrl" placeholder="https://your-server.com/webdav">
                </div>
                <div class="form-group">
                    <label for="webdavUsername">用户名</label>
                    <input type="text" id="webdavUsername" placeholder="用户名">
                </div>
                <div class="form-group">
                    <label for="webdavPassword">密码</label>
                    <input type="password" id="webdavPassword" placeholder="密码">
                </div>
                <button id="testWebdav" class="btn btn-secondary">测试连接</button>
                <button id="saveWebdav" class="btn btn-primary">保存WebDAV设置</button>
            </section>
        `;
    }    // 渲染加密设置区域
    renderEncryptionSection() {
        return `
            <section class="settings-section">
                <h2>加密设置</h2>
                <div class="form-group">
                    <label for="encryptionKey">自定义加密密钥</label>
                    <input type="password" id="encryptionKey" placeholder="留空使用简单加密">
                    <small>输入强密码以提供更高安全性</small>
                </div>
                <button id="saveEncryption" class="btn btn-primary">保存加密设置</button>
            </section>
        `;
    }

    // 渲染本地存储设置区域
    renderLocalStorageSection() {
        return `
            <section class="settings-section">
                <h2>本地存储设置</h2>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="allowLocalStorage">
                        启用加密本地存储
                    </label>
                    <small>使用与云端相同的加密算法保护本地配置，支持离线使用</small>
                </div>
                <button id="saveLocalStorage" class="btn btn-primary">保存本地存储设置</button>
            </section>
        `;
    }

    // 渲染配置管理区域
    renderConfigManagementSection() {
        return `
            <section class="settings-section">
                <h2>配置管理</h2>
                <div class="config-actions">
                    <button id="addConfig" class="btn btn-secondary">手动添加配置</button>
                    <button id="exportConfigs" class="btn btn-secondary">导出配置</button>
                    <button id="importConfigs" class="btn btn-secondary">导入配置</button>
                    <button id="backupToCloud" class="btn btn-primary">备份到云端</button>
                    <button id="restoreFromCloud" class="btn btn-info">从云端恢复</button>
                    <button id="validateConfigs" class="btn btn-warning">验证配置</button>
                </div>
                <div class="config-list" id="configList">
                    <!-- 配置列表将在这里动态生成 -->
                </div>
            </section>
        `;
    }

    // 渲染关于信息区域
    renderAboutSection() {
        return `
            <section class="settings-section">
                <h2>关于</h2>
                <div class="about-info">
                    <p><strong>2FA验证码管家</strong></p>
                    <p>版本: 1.0.0</p>
                    <p>一个功能强大的2FA验证码管理浏览器扩展</p>
                </div>
            </section>
        `;
    }

    // 渲染添加配置模态框
    renderAddConfigModal() {
        return `
            <div id="addConfigModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>添加2FA配置</h3>
                        <span class="close">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="configName">配置名称</label>
                            <input type="text" id="configName" placeholder="例如：GitHub">
                        </div>
                        <div class="form-group">
                            <label for="configSecret">密钥 (Secret)</label>
                            <input type="text" id="configSecret" placeholder="Base32编码的密钥">
                        </div>
                        <div class="form-group">
                            <label for="configIssuer">发行方</label>
                            <input type="text" id="configIssuer" placeholder="例如：GitHub">
                        </div>
                        <div class="form-group">
                            <label for="configAccount">账户</label>
                            <input type="text" id="configAccount" placeholder="例如：username@example.com">
                        </div>
                        <div class="form-group">
                            <label for="configDigits">验证码位数</label>
                            <select id="configDigits">
                                <option value="6">6位</option>
                                <option value="8">8位</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="configPeriod">更新周期(秒)</label>
                            <input type="number" id="configPeriod" value="30" min="15" max="300">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button id="saveConfig" class="btn btn-primary">保存</button>
                        <button id="cancelConfig" class="btn btn-secondary">取消</button>
                    </div>
                </div>
            </div>
        `;    }

    // 渲染设备验证器设置区域
    renderDeviceAuthSection() {
        return `
            <section class="settings-section">
                <h2>设备验证器设置</h2>
                <div class="info-box">
                    <p><strong>说明：</strong>启用设备验证器可以使用生物识别（指纹、面部识别等）或PIN码来保护您的2FA代码。</p>
                </div>
                <div class="form-group">
                    <div class="switch-group">
                        <label for="enableDeviceAuth">启用设备验证器</label>
                        <label class="switch">
                            <input type="checkbox" id="enableDeviceAuth">
                            <span class="slider"></span>
                        </label>
                    </div>
                    <small>启用后，查看2FA代码时需要通过设备验证</small>
                </div>
                
                <div id="deviceAuthDetails">
                    <div class="form-group">
                        <label for="deviceAuthTimeout">验证超时时间（分钟）</label>
                        <select id="deviceAuthTimeout">
                            <option value="5">5分钟</option>
                            <option value="15">15分钟</option>
                            <option value="30">30分钟</option>
                            <option value="60">1小时</option>
                        </select>
                        <small>验证成功后的有效时间，超时后需要重新验证</small>
                    </div>
                    
                    <div class="status-group">
                        <div class="status-item">
                            <label>设备验证器状态：</label>
                            <span id="deviceAuthStatus" class="status-text">检查中...</span>
                        </div>
                    </div>
                    
                    <div class="button-group">
                        <button id="testDeviceAuth" class="btn btn-secondary">测试设备验证</button>
                        <button id="resetCredentials" class="btn btn-warning">重置凭据</button>
                        <button id="saveDeviceAuth" class="btn btn-primary">保存设置</button>
                    </div>
                </div>
            </section>
        `;
    }

    // 渲染主题设置区域
    renderThemeSection() {
        return `
            <section class="settings-section">
                <h2>主题设置</h2>
                <div class="form-group">
                    <label for="themeSelect">选择主题</label>
                    <select id="themeSelect">
                        <option value="auto">跟随系统</option>
                        <option value="light">浅色模式</option>
                        <option value="dark">深色模式</option>
                    </select>
                    <small>选择您偏好的主题模式，"跟随系统"将根据系统设置自动切换</small>
                </div>
                <button id="saveTheme" class="btn btn-primary">保存主题设置</button>
            </section>
        `;
    }    initElements() {
        // 获取所有DOM元素        
        this.elements = {
            backButton: document.getElementById('backButton'),
            // 主题设置
            themeSelect: document.getElementById('themeSelect'),
            saveThemeButton: document.getElementById('saveTheme'),
            // WebDAV设置
            testWebdavButton: document.getElementById('testWebdav'),
            saveWebdavButton: document.getElementById('saveWebdav'),
            // 加密设置
            saveEncryptionButton: document.getElementById('saveEncryption'),
            // 本地存储设置
            saveLocalStorageButton: document.getElementById('saveLocalStorage'),
            // 配置管理
            addConfigButton: document.getElementById('addConfig'),
            exportConfigsButton: document.getElementById('exportConfigs'),
            importConfigsButton: document.getElementById('importConfigs'),
            backupToCloudButton: document.getElementById('backupToCloud'),
            restoreFromCloudButton: document.getElementById('restoreFromCloud'),
            validateConfigsButton: document.getElementById('validateConfigs'),
            // 添加配置模态框
            addConfigModal: document.getElementById('addConfigModal'),
            closeModal: document.querySelector('.close'),
            saveConfigButton: document.getElementById('saveConfig'),
            cancelConfigButton: document.getElementById('cancelConfig'),
            // 设备验证器设置
            enableDeviceAuth: document.getElementById('enableDeviceAuth'),
            testDeviceAuthButton: document.getElementById('testDeviceAuth'),
            resetCredentialsButton: document.getElementById('resetCredentials'),
            authTimeout: document.getElementById('authTimeout'),
            deviceSupportStatus: document.getElementById('deviceSupportStatus'),
            credentialStatus: document.getElementById('credentialStatus'),
            deviceAuthDetails: document.getElementById('deviceAuthDetails'),
            saveDeviceAuth: document.getElementById('saveDeviceAuth')
        };
    }

    initEventListeners() {
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
        this.elements.saveConfigButton?.addEventListener('click', () => this.saveNewConfig());        // 设备验证器设置已经在前面添加过事件监听器，此处不需要再添加
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
    }

    /**
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

    // 设备验证器相关方法
    
    async saveDeviceAuthSettings() {
        try {
            // 直接使用设备验证器实例保存设置
            await this.deviceAuthenticator.saveDeviceAuthSettings();
            
            // 为确保设置被正确保存，额外进行备份保存
            const enabledValue = this.elements.enableDeviceAuth?.checked || false;
            const timeoutValue = parseInt(this.elements.deviceAuthTimeout?.value || '15');
            
            // 直接同步到chrome.storage (额外备份)
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                // 直接设置单独的键值，使状态更易于检测
                await chrome.storage.local.set({
                    'device_auth_enabled': enabledValue
                });
                
                console.log('设置页面: 设备验证器状态已直接保存到chrome.storage:', enabledValue ? '启用' : '禁用');
                
                // 发送消息通知所有页面更新设备验证器状态
                if (chrome.runtime && chrome.runtime.sendMessage) {
                    try {
                        chrome.runtime.sendMessage({
                            action: 'deviceAuthSettingsChanged',
                            enabled: enabledValue,
                            timeout: timeoutValue
                        });
                        console.log('已发送设备验证器状态更新消息');
                    } catch (e) {
                        console.warn('发送消息失败:', e);
                    }
                }
            }
            
            this.showMessage('设备验证器设置已保存', 'success');
        } catch (error) {
            console.error('保存设备验证器设置失败:', error);
            this.showMessage('保存设置失败: ' + error.message, 'error');
        }
    }
    
    async testDeviceAuth() {
        try {
            // 使用设备验证器实例测试验证
            await this.deviceAuthenticator.testDeviceAuth();
        } catch (error) {
            console.error('测试设备验证失败:', error);
            this.showMessage('测试失败: ' + error.message, 'error');
        }
    }
    
    async resetDeviceCredentials() {
        try {
            // 使用设备验证器实例重置凭据
            await this.deviceAuthenticator.resetDeviceCredentials();
        } catch (error) {
            console.error('重置设备凭据失败:', error);
            this.showMessage('重置失败: ' + error.message, 'error');
        }
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
