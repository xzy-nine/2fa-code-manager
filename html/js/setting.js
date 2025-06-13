// 设置页面的JavaScript代码 - 全局变量版本
// 使用全局变量导入模块（GlobalScope已在crypto.js中定义）

// 引用 core 中的公共工具函数（使用全局变量）
const CoreUtils = GlobalScope.CoreUtils;
// IconManager 已在 core/iconManager.js 中定义为全局常量，直接使用 GlobalScope.IconManager

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
    }

    init() {
        // 等待DOM加载后初始化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initApp());
        } else {
            this.initApp();
        }
    }    initApp() {
        this.renderPage();
        this.initElements();
        this.initEventListeners();
        this.loadSettings();
        this.initTheme(); // 初始化主题
        this.initScrollProgress(); // 初始化滚动进度
        this.initAnimations(); // 初始化动画
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
            // 设备验证器设置
            enableDeviceAuth: document.getElementById('enableDeviceAuth'),
            deviceAuthDetails: document.getElementById('deviceAuthDetails'),
            deviceSupportStatus: document.getElementById('deviceSupportStatus'),
            credentialStatus: document.getElementById('credentialStatus'),
            testDeviceAuth: document.getElementById('testDeviceAuth'),
            resetCredentials: document.getElementById('resetCredentials'),
            authTimeout: document.getElementById('authTimeout'),
            saveDeviceAuth: document.getElementById('saveDeviceAuth'),
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
            cancelConfigButton: document.getElementById('cancelConfig')
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
            }
        }
    }

    // 渲染设备验证器设置区域
    renderDeviceAuthSection() {
        return `            <section class="settings-section">
                <h2>设备验证器设置</h2>
                <div class="info-box">
                    <p><strong>设备验证器</strong>允许您使用生物识别验证（如Windows Hello、指纹或面部识别）来保护您的2FA验证码。</p>
                    <p><strong>注意：</strong>关闭此开关只会暂停功能，不会删除已注册的凭据。重新启用时将继续使用现有凭据。</p>
                </div>
                
                <div class="device-auth-settings">
                    <div class="form-group">
                        <label class="toggle-switch">
                            <input type="checkbox" id="enableDeviceAuth">
                            <span class="slider"></span>
                            <span class="label-text">启用设备验证器</span>
                        </label>
                        <small>使用Windows Hello等生物识别验证访问验证码（关闭开关不会删除凭据）</small>
                    </div>
                    
                    <div id="deviceAuthDetails" class="device-auth-details" style="display: none;">
                        <div class="auth-status-card">
                            <h4>设备支持状态</h4>
                            <div id="deviceSupportStatus" class="status-info">
                                <div class="loading">检查设备支持情况...</div>
                            </div>
                        </div>
                        
                        <div class="auth-credentials-card">
                            <h4>认证凭据管理</h4>
                            <div id="credentialStatus" class="status-info">
                                <div class="loading">检查凭据状态...</div>
                            </div>                            <div class="credential-actions">
                                <button id="testDeviceAuth" class="btn btn-secondary">测试验证</button>
                                <button id="resetCredentials" class="btn btn-warning" title="完全删除已注册的生物识别信息，需要重新注册">重置凭据</button>
                            </div>
                            <div class="credential-note">
                                <small><strong>提示：</strong>重置凭据将完全删除生物识别信息，仅在遇到问题时使用。简单开关功能不会删除凭据。</small>
                            </div>
                        </div>
                        
                        <div class="auth-settings-card">
                            <h4>验证设置</h4>
                            <div class="form-group">
                                <label for="authTimeout">认证有效期（分钟）</label>
                                <select id="authTimeout">
                                    <option value="5">5分钟</option>
                                    <option value="15" selected>15分钟</option>
                                    <option value="30">30分钟</option>
                                    <option value="60">1小时</option>
                                </select>
                                <small>认证成功后的有效时间，过期需要重新验证</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="button-group">
                    <button id="saveDeviceAuth" class="btn btn-primary">保存设备验证器设置</button>
                </div>
            </section>
        `;
    }

    initElements() {
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
            credentialStatus: document.getElementById('credentialStatus')
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
        this.elements.saveConfigButton?.addEventListener('click', () => this.saveNewConfig());

        // 设备验证器设置
        this.elements.enableDeviceAuth?.addEventListener('change', () => this.toggleDeviceAuthSettings());
        this.elements.testDeviceAuthButton?.addEventListener('click', () => this.testDeviceAuth());
        this.elements.resetCredentialsButton?.addEventListener('click', () => this.resetCredentials());
        this.elements.authTimeout?.addEventListener('change', () => this.saveDeviceAuthSettings());
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
    }

    // 设备验证器相关方法
    
    // 加载设备验证器设置
    async loadDeviceAuthSettings() {
        try {
            // 从设备验证器获取当前状态
            const status = this.deviceAuthenticator.getStatus();
            
            // 更新UI
            if (this.elements.enableDeviceAuth) {
                this.elements.enableDeviceAuth.checked = status.enabled;
            }
            
            // 显示或隐藏详细设置
            this.toggleDeviceAuthDetails(status.enabled);
            
            // 更新设备支持状态
            await this.updateDeviceSupportStatus();
            
            // 更新凭据状态
            this.updateCredentialStatus();
            
            // 加载认证超时设置
            const authTimeout = localStorage.getItem('device_auth_timeout') || '15';
            if (this.elements.authTimeout) {
                this.elements.authTimeout.value = authTimeout;
            }
            
        } catch (error) {
            console.error('加载设备验证器设置失败:', error);
            this.showMessage('加载设备验证器设置失败', 'error');
        }
    }
    
    // 切换设备验证器启用状态
    async toggleDeviceAuth(enabled) {
        try {
            if (enabled) {
                // 检查设备支持
                const supported = await this.deviceAuthenticator.checkSupport();
                if (!supported) {
                    this.showMessage('设备不支持生物识别验证', 'error');
                    this.elements.enableDeviceAuth.checked = false;
                    return;
                }
                
                await this.deviceAuthenticator.enable();
                this.showMessage('设备验证器已启用', 'success');
            } else {
                await this.deviceAuthenticator.disable();
                this.showMessage('设备验证器已禁用', 'success');
            }
            
            // 更新详细设置显示
            this.toggleDeviceAuthDetails(enabled);
            
            // 更新状态显示
            await this.updateDeviceSupportStatus();
            this.updateCredentialStatus();
            
        } catch (error) {
            console.error('切换设备验证器状态失败:', error);
            this.showMessage('操作失败: ' + error.message, 'error');
            // 恢复复选框状态
            this.elements.enableDeviceAuth.checked = !enabled;
        }
    }
    
    // 显示或隐藏设备验证器详细设置
    toggleDeviceAuthDetails(show) {
        if (this.elements.deviceAuthDetails) {
            this.elements.deviceAuthDetails.style.display = show ? 'block' : 'none';
        }
    }
    
    // 更新设备支持状态显示
    async updateDeviceSupportStatus() {
        if (!this.elements.deviceSupportStatus) return;
        
        try {
            const authInfo = await this.deviceAuthenticator.getAuthenticatorInfo();
            
            let statusHtml = '';
            if (authInfo.supported) {
                statusHtml = `
                    <div class="status-item status-success">
                        <span class="status-icon">✓</span>
                        <span>浏览器支持WebAuthn</span>
                    </div>
                    <div class="status-item ${authInfo.platformSupport ? 'status-success' : 'status-error'}">
                        <span class="status-icon">${authInfo.platformSupport ? '✓' : '✗'}</span>
                        <span>平台认证器${authInfo.platformSupport ? '可用' : '不可用'}</span>
                    </div>
                    <div class="status-item ${authInfo.conditionalSupport ? 'status-success' : 'status-warning'}">
                        <span class="status-icon">${authInfo.conditionalSupport ? '✓' : '!'}</span>
                        <span>条件式中介${authInfo.conditionalSupport ? '支持' : '不支持'}</span>
                    </div>
                `;
            } else {
                statusHtml = `
                    <div class="status-item status-error">
                        <span class="status-icon">✗</span>
                        <span>设备不支持生物识别验证</span>
                    </div>
                    <div class="status-note">
                        <p><strong>原因：</strong>${authInfo.reason || '未知错误'}</p>
                    </div>
                `;
            }
            
            this.elements.deviceSupportStatus.innerHTML = statusHtml;
            
        } catch (error) {
            console.error('更新设备支持状态失败:', error);
            this.elements.deviceSupportStatus.innerHTML = `
                <div class="status-item status-error">
                    <span class="status-icon">✗</span>
                    <span>检查设备支持时出错</span>
                </div>
            `;
        }
    }
    
    // 更新凭据状态显示
    updateCredentialStatus() {
        if (!this.elements.credentialStatus) return;
        
        const status = this.deviceAuthenticator.getStatus();
        
        let statusHtml = '';
        if (status.hasCredential) {
            statusHtml = `
                <div class="status-item status-success">
                    <span class="status-icon">✓</span>
                    <span>设备凭据已注册</span>
                </div>
                <div class="status-item ${status.isValid ? 'status-success' : 'status-warning'}">
                    <span class="status-icon">${status.isValid ? '✓' : '!'}</span>
                    <span>认证状态：${status.isValid ? '有效' : '已过期'}</span>
                </div>
            `;
            
            if (status.lastAuthTime) {
                const lastAuth = new Date(parseInt(status.lastAuthTime));
                statusHtml += `
                    <div class="status-item status-info">
                        <span class="status-icon">ℹ</span>
                        <span>最后验证：${lastAuth.toLocaleString()}</span>
                    </div>
                `;
            }        } else {
            statusHtml = `
                <div class="status-item status-info">
                    <span class="status-icon">ℹ</span>
                    <span>尚未注册设备凭据</span>
                </div>
                <div class="status-note">
                    <p>首次使用设备验证器时将自动注册设备凭据</p>
                    <p><strong>注意：</strong>关闭设备验证器开关不会删除已注册的凭据，只是暂停功能</p>
                </div>
            `;
        }
        
        this.elements.credentialStatus.innerHTML = statusHtml;
    }
    
    // 测试设备验证
    async testDeviceAuth() {
        try {
            this.showMessage('正在进行设备验证测试...', 'info');
            
            const result = await this.deviceAuthenticator.authenticate();
            
            if (result.success) {
                this.showMessage('设备验证测试成功！', 'success');
                // 更新凭据状态显示
                this.updateCredentialStatus();
            } else {
                this.showMessage('设备验证测试失败: ' + result.error, 'error');
            }
            
        } catch (error) {
            console.error('设备验证测试失败:', error);
            this.showMessage('设备验证测试过程中出现错误: ' + error.message, 'error');
        }
    }
      // 重置设备凭据
    async resetDeviceCredentials() {
        try {
            const confirmed = confirm(
                '确定要重置设备凭据吗？\n\n' +
                '这将清除所有已注册的生物识别信息，下次使用时需要重新注册。\n\n' +
                '注意：如果您只是想临时关闭设备验证器，请使用上方的开关按钮，' +
                '这样不会清除凭据，重新启用时可以直接使用。'
            );
            if (!confirmed) return;
            
            this.deviceAuthenticator.resetCredentials();
            this.showMessage('设备凭据已重置，下次启用设备验证器时将重新注册', 'success');
            
            // 更新凭据状态显示
            this.updateCredentialStatus();
            
        } catch (error) {
            console.error('重置设备凭据失败:', error);
            this.showMessage('重置设备凭据失败: ' + error.message, 'error');
        }
    }
    
    // 保存设备验证器设置
    async saveDeviceAuthSettings() {
        try {
            // 保存认证超时设置
            const authTimeout = this.elements.authTimeout?.value || '15';
            localStorage.setItem('device_auth_timeout', authTimeout);
            
            // 保存其他设置（设备验证器的启用状态已经在切换时保存了）
            const config = {
                enabled: this.deviceAuthenticator.isEnabled,
                authTimeout: parseInt(authTimeout),
                lastSaved: Date.now()
            };
            
            await chrome.storage.local.set({ deviceAuthConfig: config });
            
            this.showMessage('设备验证器设置已保存', 'success');
            
        } catch (error) {
            console.error('保存设备验证器设置失败:', error);
            this.showMessage('保存设备验证器设置失败: ' + error.message, 'error');
        }
    }

    // ...existing code...
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
