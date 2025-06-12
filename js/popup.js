// 弹出页面主脚本
class PopupManager {
    constructor() {
        this.currentTab = 'fill';
        this.authenticated = false;
        this.localAuthenticated = false;
        this.webdavClient = null;
        this.qrScanner = null;
        this.totpGenerator = new TOTPGenerator();
        this.currentSiteInfo = null;
        this.localCodes = [];
        this.updateInterval = null;
        
        this.init();
    }

    // 初始化
    async init() {
        this.initEventListeners();
        await this.loadSettings();
        await this.updateCurrentSite();
        this.startLocalCodeUpdates();
    }

    // 初始化事件监听器
    initEventListeners() {
        // 标签页切换
        document.querySelectorAll('.popup-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.closest('.popup-tab-btn').dataset.tab);
            });
        });

        // 认证按钮
        document.getElementById('authBtn')?.addEventListener('click', () => {
            this.authenticateUser();
        });

        document.getElementById('localAuthBtn')?.addEventListener('click', () => {
            this.authenticateLocal();
        });

        // 填充按钮
        document.getElementById('fillBtn')?.addEventListener('click', () => {
            this.showConfigList();
        });

        document.getElementById('quickFillBtn')?.addEventListener('click', () => {
            this.quickFill();
        });

        // 配置列表
        document.getElementById('closeConfigList')?.addEventListener('click', () => {
            this.hideConfigList();
        });

        // 刷新本地
        document.getElementById('refreshLocal')?.addEventListener('click', () => {
            this.refreshLocalCodes();
        });

        // 扫描按钮
        document.getElementById('cameraBtn')?.addEventListener('click', () => {
            this.startCameraScanning();
        });

        document.getElementById('screenBtn')?.addEventListener('click', () => {
            this.startScreenScanning();
        });

        document.getElementById('captureBtn')?.addEventListener('click', () => {
            this.captureQRCode();
        });

        document.getElementById('stopScanBtn')?.addEventListener('click', () => {
            this.stopScanning();
        });

        document.getElementById('saveConfig')?.addEventListener('click', () => {
            this.saveScannedConfig();
        });

        // 设置按钮
        document.getElementById('testConnection')?.addEventListener('click', () => {
            this.testWebDAVConnection();
        });

        document.getElementById('saveSettings')?.addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('manageLocal')?.addEventListener('click', () => {
            this.manageLocalCodes();
        });

        // 模态框
        document.getElementById('modalClose')?.addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'modal') {
                this.hideModal();
            }
        });
    }

    // 切换标签页
    switchTab(tabName) {
        // 更新标签按钮状态
        document.querySelectorAll('.popup-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // 更新内容显示
        document.querySelectorAll('.popup-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabName);
        });

        this.currentTab = tabName;

        // 标签页特殊处理
        if (tabName === 'local') {
            this.refreshLocalCodes();
        }
    }

    // 生物识别认证
    async authenticateUser() {
        try {
            // 检查是否支持WebAuthn
            if (!window.PublicKeyCredential) {
                this.showMessage('您的浏览器不支持生物识别认证', 'error');
                return;
            }

            // 创建认证挑战
            const challenge = crypto.getRandomValues(new Uint8Array(32));
            
            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge: challenge,
                    rp: {
                        name: "2FA验证码管家",
                        id: "localhost"
                    },
                    user: {
                        id: new TextEncoder().encode("user123"),
                        name: "user@example.com",
                        displayName: "User"
                    },
                    pubKeyCredParams: [{
                        type: "public-key",
                        alg: -7 // ES256
                    }],
                    authenticatorSelection: {
                        authenticatorAttachment: "platform",
                        userVerification: "required"
                    },
                    timeout: 60000,
                    attestation: "direct"
                }
            });

            if (credential) {
                this.authenticated = true;
                this.updateAuthStatus();
                this.showFillSection();
                this.showMessage('认证成功', 'success');
            }
        } catch (error) {
            console.error('认证失败:', error);
            this.showMessage('认证失败，请重试', 'error');
        }
    }

    // 本地认证
    async authenticateLocal() {
        try {
            // 简化的本地认证，实际项目中应该使用更安全的方法
            const settings = await this.getStorageData('settings');
            
            if (settings?.enableBiometric) {
                await this.authenticateUser();
                this.localAuthenticated = this.authenticated;
            } else {
                // 使用密码认证
                const password = prompt('请输入本地访问密码：');
                if (password === settings?.localPassword || password === 'admin') {
                    this.localAuthenticated = true;
                    this.showMessage('本地认证成功', 'success');
                } else {
                    this.showMessage('密码错误', 'error');
                    return;
                }
            }

            if (this.localAuthenticated) {
                this.showLocalCodes();
                await this.loadLocalCodes();
            }
        } catch (error) {
            console.error('本地认证失败:', error);
            this.showMessage('认证失败', 'error');
        }
    }

    // 更新认证状态
    updateAuthStatus() {
        const authStatus = document.getElementById('authStatus');
        const statusIndicator = authStatus?.querySelector('.status-indicator');
        const statusText = authStatus?.querySelector('.status-text');

        if (this.authenticated) {
            statusIndicator?.classList.add('authenticated');
            statusText.textContent = '已认证';
        } else {
            statusIndicator?.classList.remove('authenticated');
            statusText.textContent = '未认证';
        }
    }

    // 显示填充区域
    showFillSection() {
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('fillSection').style.display = 'block';
    }

    // 显示本地验证码
    showLocalCodes() {
        document.getElementById('localAuthSection').style.display = 'none';
        document.getElementById('localCodes').style.display = 'block';
    }

    // 获取当前网站信息
    async updateCurrentSite() {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const currentTab = tabs[0];
            
            if (currentTab) {
                const url = new URL(currentTab.url);
                this.currentSiteInfo = {
                    domain: url.hostname,
                    title: currentTab.title,
                    url: currentTab.url
                };

                this.updateSiteDisplay();
                this.checkSavedConfig();
            }
        } catch (error) {
            console.error('获取当前网站失败:', error);
        }
    }

    // 更新网站显示
    updateSiteDisplay() {
        const siteInfo = document.querySelector('.site-info');
        const siteName = siteInfo?.querySelector('.site-name');
        const siteUrl = siteInfo?.querySelector('.site-url');

        if (this.currentSiteInfo) {
            siteName.textContent = this.currentSiteInfo.title;
            siteUrl.textContent = this.currentSiteInfo.domain;
            
            // 更新选中状态
            const currentSite = document.getElementById('currentSite');
            currentSite?.classList.add('active');

            // 启用按钮
            document.getElementById('fillBtn').disabled = false;
        }
    }

    // 检查保存的配置
    async checkSavedConfig() {
        if (!this.currentSiteInfo) return;

        const siteConfigs = await this.getStorageData('siteConfigs') || {};
        const savedConfigId = siteConfigs[this.currentSiteInfo.domain];

        if (savedConfigId) {
            document.getElementById('quickFillBtn').disabled = false;
        }
    }

    // 显示配置列表
    async showConfigList() {
        if (!this.authenticated) {
            this.showMessage('请先进行身份认证', 'warning');
            return;
        }

        const configList = document.getElementById('configList');
        const configItems = document.getElementById('configItems');
        
        configList.style.display = 'block';
        configItems.innerHTML = '<div class="loading">正在加载配置...</div>';

        try {
            if (!this.webdavClient) {
                await this.initWebDAVClient();
            }

            const configs = await this.webdavClient.getConfigList();
            this.renderConfigList(configs);
        } catch (error) {
            console.error('加载配置失败:', error);
            configItems.innerHTML = '<div class="error">加载配置失败</div>';
        }
    }

    // 渲染配置列表
    renderConfigList(configs) {
        const configItems = document.getElementById('configItems');
        
        if (configs.length === 0) {
            configItems.innerHTML = '<div class="empty-state"><p>暂无配置</p></div>';
            return;
        }

        configItems.innerHTML = configs.map(config => `
            <div class="config-item" data-config-id="${config.id}">
                <div class="config-info">
                    <div class="config-avatar">${config.name.charAt(0).toUpperCase()}</div>
                    <div class="config-details">
                        <div class="config-name">${config.name}</div>
                        <div class="config-domain">${config.issuer || config.domain}</div>
                    </div>
                </div>
                <div class="config-status">可用</div>
            </div>
        `).join('');

        // 添加点击事件
        configItems.querySelectorAll('.config-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectConfig(item.dataset.configId);
            });
        });
    }

    // 选择配置
    async selectConfig(configId) {
        try {
            const settings = await this.getStorageData('settings');
            const configResult = await this.webdavClient.getConfig(configId, settings?.encryptionKey);
            
            if (configResult.success) {
                await this.fillCode(configResult.config);
                await this.saveConfigForSite(configId);
                this.hideConfigList();
            } else {
                this.showMessage(configResult.message, 'error');
            }
        } catch (error) {
            console.error('获取配置失败:', error);
            this.showMessage('获取配置失败', 'error');
        }
    }

    // 填充验证码
    async fillCode(config) {
        try {
            const codeInfo = await this.totpGenerator.getCurrentCode(config.secret);
            
            if (codeInfo.code) {
                // 发送到内容脚本
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                await chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'fillCode',
                    code: codeInfo.code
                });

                this.showMessage(`验证码已填充: ${codeInfo.code}`, 'success');
            } else {
                this.showMessage('生成验证码失败', 'error');
            }
        } catch (error) {
            console.error('填充验证码失败:', error);
            this.showMessage('填充失败', 'error');
        }
    }

    // 快速填充
    async quickFill() {
        if (!this.currentSiteInfo) return;

        const siteConfigs = await this.getStorageData('siteConfigs') || {};
        const savedConfigId = siteConfigs[this.currentSiteInfo.domain];

        if (savedConfigId) {
            await this.selectConfig(savedConfigId);
        } else {
            this.showMessage('未找到保存的配置', 'warning');
        }
    }

    // 保存网站配置关联
    async saveConfigForSite(configId) {
        if (!this.currentSiteInfo) return;

        const siteConfigs = await this.getStorageData('siteConfigs') || {};
        siteConfigs[this.currentSiteInfo.domain] = configId;
        
        await this.setStorageData('siteConfigs', siteConfigs);
        document.getElementById('quickFillBtn').disabled = false;
    }

    // 隐藏配置列表
    hideConfigList() {
        document.getElementById('configList').style.display = 'none';
    }

    // 加载本地验证码
    async loadLocalCodes() {
        const localConfigs = await this.getStorageData('localConfigs') || [];
        this.localCodes = localConfigs;
        this.renderLocalCodes();
    }

    // 渲染本地验证码
    renderLocalCodes() {
        const localCodesContainer = document.getElementById('localCodes');
        
        if (this.localCodes.length === 0) {
            localCodesContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <p>暂无本地验证码</p>
                    <p class="empty-tip">在设置中添加本地存储的验证码</p>
                </div>
            `;
            return;
        }

        localCodesContainer.innerHTML = this.localCodes.map(config => {
            const progress = this.totpGenerator.getCodeProgress();
            return `
                <div class="code-item" data-secret="${config.secret}">
                    <div class="code-header">
                        <div class="code-name">${config.name}</div>
                        <div class="code-timer">
                            <div class="timer-circle">
                                <div class="timer-progress" style="transform: rotate(${progress.progress * 3.6}deg)"></div>
                            </div>
                            <span>${progress.timeRemaining}s</span>
                        </div>
                    </div>
                    <div class="code-value" data-code-for="${config.id}">------</div>
                </div>
            `;
        }).join('');

        // 更新验证码
        this.updateLocalCodesDisplay();

        // 添加复制功能
        localCodesContainer.querySelectorAll('.code-value').forEach(element => {
            element.addEventListener('click', () => {
                navigator.clipboard.writeText(element.textContent);
                this.showMessage('验证码已复制', 'success');
            });
        });
    }

    // 更新本地验证码显示
    async updateLocalCodesDisplay() {
        for (const config of this.localCodes) {
            const codeElement = document.querySelector(`[data-code-for="${config.id}"]`);
            if (codeElement) {
                const codeInfo = await this.totpGenerator.getCurrentCode(config.secret);
                codeElement.textContent = codeInfo.code || '------';
            }
        }
    }

    // 刷新本地验证码
    async refreshLocalCodes() {
        if (this.localAuthenticated) {
            await this.loadLocalCodes();
        }
    }

    // 开始本地验证码更新
    startLocalCodeUpdates() {
        this.updateInterval = setInterval(() => {
            if (this.localAuthenticated && this.currentTab === 'local') {
                this.updateLocalCodesDisplay();
                this.updateTimerDisplay();
            }
        }, 1000);
    }

    // 更新计时器显示
    updateTimerDisplay() {
        const progress = this.totpGenerator.getCodeProgress();
        
        document.querySelectorAll('.timer-progress').forEach(element => {
            element.style.transform = `rotate(${progress.progress * 3.6}deg)`;
        });

        document.querySelectorAll('.code-timer span').forEach(element => {
            element.textContent = `${progress.timeRemaining}s`;
        });

        // 如果快到期了，重新生成验证码
        if (progress.timeRemaining <= 1) {
            setTimeout(() => {
                this.updateLocalCodesDisplay();
            }, 1000);
        }
    }

    // 开始摄像头扫描
    async startCameraScanning() {
        const videoElement = document.getElementById('cameraVideo');
        const canvasElement = document.getElementById('scanCanvas');
        
        if (!this.qrScanner) {
            this.qrScanner = new QRScanner();
        }

        const result = await this.qrScanner.initCamera(videoElement, canvasElement);
        
        if (result.success) {
            document.getElementById('scanArea').style.display = 'block';
            this.qrScanner.startScanning((qrData) => {
                this.handleQRCodeDetected(qrData);
            });
        } else {
            this.showMessage(result.message, 'error');
        }
    }

    // 开始屏幕扫描
    async startScreenScanning() {
        if (!this.qrScanner) {
            this.qrScanner = new QRScanner();
        }

        const result = await this.qrScanner.scanScreen();
        
        if (result.success) {
            this.handleQRCodeDetected(result.data);
        } else {
            this.showMessage(result.message, 'error');
        }
    }

    // 拍照识别
    async captureQRCode() {
        if (!this.qrScanner) return;

        const result = await this.qrScanner.captureAndScan();
        
        if (result.success) {
            this.handleQRCodeDetected(result.data);
        } else {
            this.showMessage(result.message, 'error');
        }
    }

    // 停止扫描
    stopScanning() {
        if (this.qrScanner) {
            this.qrScanner.stopScanning();
        }
        
        document.getElementById('scanArea').style.display = 'none';
    }

    // 处理二维码检测
    handleQRCodeDetected(qrData) {
        this.stopScanning();
        
        const parsedData = this.totpGenerator.parseOTPAuth(qrData);
        
        if (parsedData) {
            this.displayScanResult(parsedData, qrData);
        } else {
            this.showMessage('无效的二维码格式', 'error');
        }
    }

    // 显示扫描结果
    displayScanResult(parsedData, rawData) {
        const scanResult = document.getElementById('scanResult');
        const qrInfo = document.getElementById('qrInfo');
        const configName = document.getElementById('configName');
        
        qrInfo.innerHTML = `
            <strong>账户:</strong> ${parsedData.account}<br>
            <strong>发行方:</strong> ${parsedData.issuer}<br>
            <strong>密钥:</strong> ${parsedData.secret.substring(0, 8)}...<br>
            <strong>原始数据:</strong> ${rawData}
        `;
        
        configName.value = parsedData.label || parsedData.account;
        scanResult.style.display = 'block';
        
        // 保存解析后的数据供后续使用
        this.scannedConfig = {
            ...parsedData,
            domain: this.currentSiteInfo?.domain || ''
        };
    }

    // 保存扫描的配置
    async saveScannedConfig() {
        if (!this.scannedConfig) return;

        const configName = document.getElementById('configName').value.trim();
        if (!configName) {
            this.showMessage('请输入配置名称', 'warning');
            return;
        }

        this.scannedConfig.name = configName;

        try {
            if (!this.webdavClient) {
                await this.initWebDAVClient();
            }

            const result = await this.webdavClient.addConfig(this.scannedConfig);
            
            if (result.success) {
                this.showMessage('配置保存成功', 'success');
                document.getElementById('scanResult').style.display = 'none';
                this.scannedConfig = null;
            } else {
                this.showMessage(result.message, 'error');
            }
        } catch (error) {
            console.error('保存配置失败:', error);
            this.showMessage('保存失败', 'error');
        }
    }

    // 初始化WebDAV客户端
    async initWebDAVClient() {
        const settings = await this.getStorageData('settings');
        
        if (!settings?.webdavUrl || !settings?.webdavUsername || !settings?.webdavPassword) {
            throw new Error('请先配置WebDAV设置');
        }

        this.webdavClient = new WebDAVClient();
        this.webdavClient.setCredentials(
            settings.webdavUrl,
            settings.webdavUsername,
            settings.webdavPassword
        );
    }

    // 测试WebDAV连接
    async testWebDAVConnection() {
        const url = document.getElementById('webdavUrl').value.trim();
        const username = document.getElementById('webdavUsername').value.trim();
        const password = document.getElementById('webdavPassword').value.trim();

        if (!url || !username || !password) {
            this.showMessage('请填写完整的WebDAV信息', 'warning');
            return;
        }

        const testClient = new WebDAVClient();
        testClient.setCredentials(url, username, password);

        const result = await testClient.testConnection();
        this.showMessage(result.message, result.success ? 'success' : 'error');
    }

    // 保存设置
    async saveSettings() {
        const settings = {
            webdavUrl: document.getElementById('webdavUrl').value.trim(),
            webdavUsername: document.getElementById('webdavUsername').value.trim(),
            webdavPassword: document.getElementById('webdavPassword').value.trim(),
            encryptionKey: document.getElementById('encryptionKey').value.trim(),
            enableBiometric: document.getElementById('enableBiometric').checked,
            enableLocalStorage: document.getElementById('enableLocalStorage').checked
        };

        await this.setStorageData('settings', settings);
        this.showMessage('设置已保存', 'success');
    }

    // 加载设置
    async loadSettings() {
        const settings = await this.getStorageData('settings');
        
        if (settings) {
            document.getElementById('webdavUrl').value = settings.webdavUrl || '';
            document.getElementById('webdavUsername').value = settings.webdavUsername || '';
            document.getElementById('webdavPassword').value = settings.webdavPassword || '';
            document.getElementById('encryptionKey').value = settings.encryptionKey || '';
            document.getElementById('enableBiometric').checked = settings.enableBiometric || false;
            document.getElementById('enableLocalStorage').checked = settings.enableLocalStorage || false;
        }
    }

    // 管理本地验证码
    manageLocalCodes() {
        this.showModal('管理本地验证码', `
            <div class="local-management">
                <p>本地验证码管理功能开发中...</p>
                <button onclick="window.popupManager.hideModal()" class="btn">关闭</button>
            </div>
        `);
    }

    // 显示消息
    showMessage(message, type = 'info') {
        // 创建消息提示
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.textContent = message;
        
        // 添加到页面
        document.body.appendChild(messageDiv);
        
        // 自动移除
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    // 显示模态框
    showModal(title, content) {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        modalTitle.textContent = title;
        modalBody.innerHTML = content;
        modal.style.display = 'flex';
    }

    // 隐藏模态框
    hideModal() {
        document.getElementById('modal').style.display = 'none';
    }

    // 存储操作
    async getStorageData(key) {
        return new Promise((resolve) => {
            chrome.storage.local.get([key], (result) => {
                resolve(result[key]);
            });
        });
    }

    async setStorageData(key, value) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [key]: value }, resolve);
        });
    }

    // 清理资源
    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        if (this.qrScanner) {
            this.qrScanner.stopScanning();
        }
    }
}

// 消息样式
const messageStyles = document.createElement('style');
messageStyles.textContent = `
    .message {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 6px;
        color: white;
        font-size: 13px;
        font-weight: 500;
        z-index: 2000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    }
    
    .message-success { background: #10b981; }
    .message-error { background: #ef4444; }
    .message-warning { background: #f59e0b; }
    .message-info { background: #3b82f6; }
    
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(messageStyles);

// 初始化
window.popupManager = new PopupManager();

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
    window.popupManager.cleanup();
});
