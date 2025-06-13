// 设置页面的JavaScript代码 - 全局变量版本
// 使用全局变量导入模块（GlobalScope已在crypto.js中定义）

// 引用 core 中的公共工具函数（使用全局变量）
const CoreUtils = GlobalScope.CoreUtils;
// IconManager 已在 core/iconManager.js 中定义为全局常量，直接使用 GlobalScope.IconManager

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
            </header>
              <main class="settings-content">
                ${this.renderThemeSection()}
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
    }

    // 渲染加密设置区域
    renderEncryptionSection() {
        return `
            <section class="settings-section">
                <h2>加密设置</h2>
                <div class="form-group">
                    <label for="encryptionKey">自定义加密密钥</label>
                    <input type="password" id="encryptionKey" placeholder="留空使用简单加密">
                    <small>输入强密码以提供更高安全性</small>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="enableBiometric">
                        启用生物识别验证
                    </label>
                    <small>使用Windows Hello等进行身份验证</small>
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
        const account = document.getElementById('configAccount')?.value;
        const digits = document.getElementById('configDigits')?.value;
        const period = document.getElementById('configPeriod')?.value;

        if (!name || !secret) {
            this.showMessage('请填写配置名称和密钥', 'error');
            return;
        }

        try {
            const config = {
                name: name,
                secret: secret,
                issuer: issuer || '',
                account: account || '',
                digits: parseInt(digits) || 6,
                period: parseInt(period) || 30,
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
                this.resetSaveButton();
                await this.updateConfigList();
            } else {
                this.showMessage('添加失败: ' + result.message, 'error');
            }
        } catch (error) {
            this.showMessage('添加失败: ' + error.message, 'error');
        }
    }

    // 重置保存按钮状态
    resetSaveButton() {
        const saveButton = document.getElementById('saveConfig');
        if (saveButton) {
            saveButton.textContent = '保存';
            saveButton.onclick = () => this.saveNewConfig();
        }
    }    // 自动备份到云端
    async backupToCloud(config) {
        try {
            // 检查WebDAV是否已配置
            const webdavConfig = await this.getStorageData('webdavConfig');
            if (!webdavConfig || !webdavConfig.url || !webdavConfig.username || !webdavConfig.password) {
                console.log('WebDAV未配置，跳过自动备份');
                return;
            }

            if (this.webdavClient) {
                const backupResult = await this.webdavClient.addConfig(config);
                if (backupResult.success) {
                    this.showMessage('已自动备份到云端', 'info', 2000);
                } else {
                    console.warn('云端备份失败:', backupResult.message);
                    this.showMessage('云端备份失败，但本地已保存', 'warning', 3000);
                }
            } else {
                console.log('WebDAV客户端未初始化，跳过自动备份');
            }
        } catch (error) {
            console.warn('云端备份出错:', error);
            // 备份失败不影响主要功能
        }
    }clearConfigForm() {
        const fields = ['configName', 'configSecret', 'configIssuer', 'configAccount', 'configDigits', 'configPeriod'];
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                if (field.type === 'checkbox') {
                    field.checked = false;
                } else if (field.tagName === 'SELECT') {
                    field.selectedIndex = 0;
                } else {
                    field.value = fieldId === 'configDigits' ? '6' : (fieldId === 'configPeriod' ? '30' : '');
                }
            }
        });
    }    async exportConfigs() {
        try {
            const configs = await this.localStorageManager.getAllLocalConfigs();
            const dataStr = JSON.stringify(configs, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const exportFileDefaultName = `2fa-configs-${new Date().toISOString().split('T')[0]}.json`;
            
            const linkElement = CoreUtils.createElement('a', '', {
                href: dataUri,
                download: exportFileDefaultName
            });
            linkElement.click();
            
            this.showMessage('配置已导出', 'success');
        } catch (error) {
            this.showMessage('导出失败: ' + error.message, 'error');
        }
    }

    async importConfigs() {
        const input = CoreUtils.createElement('input', '', {
            type: 'file',
            accept: '.json'
        });
        
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
            // 检查WebDAV是否已配置
            const webdavConfig = await this.getStorageData('webdavConfig');
            if (!webdavConfig || !webdavConfig.url || !webdavConfig.username || !webdavConfig.password) {
                this.showMessage('请先在WebDAV同步设置中配置服务器地址、用户名和密码', 'warning');
                return;
            }

            if (!this.webdavClient) {
                this.showMessage('WebDAV客户端未初始化，请先保存WebDAV设置', 'warning');
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
            }        } catch (error) {
            console.error('备份到云端失败:', error);
            
            let errorMessage = '备份失败: ';
            
            // 根据不同的错误类型提供更具体的错误信息
            if (error.message === 'Failed to fetch') {
                errorMessage += '网络连接失败，请检查：\n' +
                              '1. WebDAV服务器地址是否正确\n' +
                              '2. 网络连接是否正常\n' +
                              '3. 服务器是否支持CORS跨域请求\n' +
                              '4. 防火墙是否阻止了连接';
            } else if (error.message.includes('401')) {
                errorMessage += 'WebDAV认证失败，请检查用户名和密码';
            } else if (error.message.includes('404')) {
                errorMessage += 'WebDAV服务器路径不存在，请检查服务器配置';
            } else if (error.message.includes('timeout')) {
                errorMessage += '连接超时，请检查网络或服务器状态';
            } else {
                errorMessage += error.message;
            }
            
            this.showMessage(errorMessage, 'error', 8000);
        }
    }    // 从云端恢复配置到本地
    async restoreFromCloud() {
        try {
            // 检查WebDAV是否已配置
            const webdavConfig = await this.getStorageData('webdavConfig');
            if (!webdavConfig || !webdavConfig.url || !webdavConfig.username || !webdavConfig.password) {
                this.showMessage('请先在WebDAV同步设置中配置服务器地址、用户名和密码', 'warning');
                return;
            }

            if (!this.webdavClient) {
                this.showMessage('WebDAV客户端未初始化，请先保存WebDAV设置', 'warning');
                return;
            }            // 使用Menu系统的确认对话框简化API
            const confirmed = await window.GlobalScope.Menu.confirm('从云端恢复会与本地配置合并，是否继续？');
            
            if (!confirmed) {
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
    }    async loadSettings() {
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
                
                // 如果有WebDAV配置，初始化WebDAV客户端
                if (config.url && config.username && config.password) {
                    this.webdavClient.setCredentials(config.url, config.username, config.password);
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
                if (document.getElementById('allowLocalStorage')) {
                    document.getElementById('allowLocalStorage').checked = config.useEncryptedStorage || false;
                }
            }

            // 加载并显示配置列表
            await this.updateConfigList();
        } catch (error) {
            console.error('加载设置失败:', error);
            this.showMessage('加载设置失败: ' + error.message, 'error');
        }
    }

    // 动态更新配置列表
    async updateConfigList() {
        const configListElement = document.getElementById('configList');
        if (!configListElement) return;

        try {
            const configs = await this.localStorageManager.getAllLocalConfigs();
            configListElement.innerHTML = this.renderConfigList(configs);
            this.attachConfigListEvents();
        } catch (error) {
            console.error('更新配置列表失败:', error);
            configListElement.innerHTML = '<p class="error-message">加载配置列表失败</p>';
        }
    }

    // 渲染配置列表
    renderConfigList(configs) {
        if (!configs || configs.length === 0) {
            return '<p class="empty-message">暂无配置</p>';
        }

        return configs.map((config, index) => `
            <div class="config-item" data-index="${index}">
                <div class="config-info">
                    <h4>${this.escapeHtml(config.name || '未知配置')}</h4>
                    <p class="config-issuer">${this.escapeHtml(config.issuer || '')}</p>
                    <p class="config-account">${this.escapeHtml(config.account || '')}</p>
                </div>
                <div class="config-actions">
                    <button class="btn btn-sm btn-secondary edit-config" data-index="${index}">编辑</button>
                    <button class="btn btn-sm btn-danger delete-config" data-index="${index}">删除</button>
                </div>
            </div>
        `).join('');
    }

    // 为配置列表附加事件监听器
    attachConfigListEvents() {
        // 编辑配置
        document.querySelectorAll('.edit-config').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.editConfig(index);
            });
        });

        // 删除配置
        document.querySelectorAll('.delete-config').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.deleteConfig(index);
            });
        });
    }

    // 编辑配置
    async editConfig(index) {
        try {
            const configs = await this.localStorageManager.getAllLocalConfigs();
            if (index >= 0 && index < configs.length) {
                const config = configs[index];
                this.showEditConfigModal(config, index);
            }
        } catch (error) {
            this.showMessage('获取配置失败: ' + error.message, 'error');
        }
    }    // 删除配置
    async deleteConfig(index) {
        // 使用Menu系统的确认对话框简化API
        const confirmed = await window.GlobalScope.Menu.confirm('确定要删除这个配置吗？');
        
        if (!confirmed) {
            return;
        }

        try {
            const configs = await this.localStorageManager.getAllLocalConfigs();
            if (index >= 0 && index < configs.length) {
                const result = await this.localStorageManager.deleteLocalConfig(configs[index].id);
                if (result.success) {
                    this.showMessage('配置已删除', 'success');
                    this.updateConfigList();
                } else {
                    this.showMessage('删除失败: ' + result.message, 'error');
                }
            }
        } catch (error) {
            this.showMessage('删除失败: ' + error.message, 'error');
        }
    }

    // 显示编辑配置模态框
    showEditConfigModal(config, index) {
        this.showAddConfigModal();
        
        // 预填充数据
        if (document.getElementById('configName')) {
            document.getElementById('configName').value = config.name || '';
        }
        if (document.getElementById('configSecret')) {
            document.getElementById('configSecret').value = config.secret || '';
        }
        if (document.getElementById('configIssuer')) {
            document.getElementById('configIssuer').value = config.issuer || '';
        }
        if (document.getElementById('configAccount')) {
            document.getElementById('configAccount').value = config.account || '';
        }
        if (document.getElementById('configDigits')) {
            document.getElementById('configDigits').value = config.digits || '6';
        }
        if (document.getElementById('configPeriod')) {
            document.getElementById('configPeriod').value = config.period || '30';
        }

        // 修改保存按钮为更新模式
        const saveButton = document.getElementById('saveConfig');
        if (saveButton) {
            saveButton.textContent = '更新';
            saveButton.onclick = () => this.updateExistingConfig(index);
        }
    }

    // 更新现有配置
    async updateExistingConfig(index) {
        const name = document.getElementById('configName')?.value;
        const secret = document.getElementById('configSecret')?.value;
        const issuer = document.getElementById('configIssuer')?.value;
        const account = document.getElementById('configAccount')?.value;
        const digits = document.getElementById('configDigits')?.value;
        const period = document.getElementById('configPeriod')?.value;

        if (!name || !secret) {
            this.showMessage('请填写配置名称和密钥', 'error');
            return;
        }

        try {
            const configs = await this.localStorageManager.getAllLocalConfigs();
            if (index >= 0 && index < configs.length) {
                const updatedConfig = {
                    ...configs[index],
                    name: name,
                    secret: secret,
                    issuer: issuer || '',
                    account: account || '',
                    digits: parseInt(digits) || 6,
                    period: parseInt(period) || 30,
                    type: 'totp'
                };

                const result = await this.localStorageManager.updateLocalConfig(configs[index].id, updatedConfig);
                if (result.success) {
                    this.showMessage('配置已更新', 'success');
                    this.hideAddConfigModal();
                    this.clearConfigForm();
                    this.updateConfigList();
                    
                    // 自动备份到云端
                    this.backupToCloud(updatedConfig);
                } else {
                    this.showMessage('更新失败: ' + result.message, 'error');
                }
            }
        } catch (error) {
            this.showMessage('更新失败: ' + error.message, 'error');
        }    }

    // 获取存储数据的通用方法
    async getStorageData(key) {
        try {
            const result = await chrome.storage.local.get([key]);
            return result[key];
        } catch (error) {
            console.error(`获取存储数据失败 (${key}):`, error);
            return null;
        }
    }    // 显示消息提示 - 使用Menu系统简化API
    showMessage(message, type = 'info', duration = 3000) {
        return window.GlobalScope.Menu.notify(message, type, duration);
    }

    // HTML转义函数
    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
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
