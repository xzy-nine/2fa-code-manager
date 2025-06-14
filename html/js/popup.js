// 弹出页面主脚本
// 使用全局变量导入模块（GlobalScope已在crypto.js中定义）

// GlobalScope 已在 crypto.js 中定义，这里直接使用

// 从全局变量获取模块
const Crypto = GlobalScope.CryptoManager;
const TOTP = GlobalScope.TOTPGenerator;
const WebDAV = GlobalScope.WebDAVClient;
const Storage = GlobalScope.LocalStorageManager;
const QRCode = GlobalScope.QRScanner;
const DeviceAuth = GlobalScope.DeviceAuthenticator;

// 引用 core 中的公共工具函数（使用全局变量）
// 延迟获取 CoreUtils 以确保模块已经加载
const getPopupCoreUtils = () => {
    // 首先尝试从 GlobalScope 获取
    if (GlobalScope && GlobalScope.CoreUtils) {
        return GlobalScope.CoreUtils;
    }
    
    // 如果 GlobalScope.CoreUtils 不可用，尝试从 window 获取
    if (typeof window !== 'undefined' && window.GlobalScope && window.GlobalScope.CoreUtils) {
        return window.GlobalScope.CoreUtils;
    }
    
    // 最后的备选方案，检查全局 Utils 变量
    if (typeof Utils !== 'undefined') {
        return Utils;
    }
    
    return null;
};
const getPopupMenu = () => {
    if (GlobalScope && GlobalScope.Menu) {
        return GlobalScope.Menu;
    }
    if (typeof window !== 'undefined' && window.GlobalScope && window.GlobalScope.Menu) {
        return window.GlobalScope.Menu;
    }
    return null;
};

// 使用全局工具函数（在main.js中定义）
// Utils 已经在全局作用域中可用，无需重新声明

class PopupManager {
    constructor() {
        this.currentTab = 'fill';
        this.authenticated = false;
        this.localAuthenticated = false;
        this.deviceAuthEnabled = false; // 新增：设备验证器是否启用
        this.webdavClient = null;
        this.qrScanner = null;        this.totpGenerator = new TOTP();
        this.localStorageManager = new Storage();
        this.deviceAuthenticator = GlobalScope.deviceAuthenticator || new DeviceAuth();
        this.currentSiteInfo = null;
        this.localCodes = [];
        this.updateInterval = null;
        
        // 创建统一的TOTP配置管理器实例
        this.totpConfigManager = new GlobalScope.TOTPConfigManager();
        
        // 等待模块加载完成后再初始化
        this.waitForModulesAndInit();
    }

    // 等待必要模块加载
    async waitForModulesAndInit() {
        let attempts = 0;
        const maxAttempts = 50; // 最多等待5秒
        
        while (attempts < maxAttempts) {
            const coreUtils = getPopupCoreUtils();
            if (coreUtils) {
                console.log('CoreUtils loaded successfully');
                break;
            }
            
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (attempts >= maxAttempts) {
            console.warn('CoreUtils not loaded after waiting, continuing with fallback');
        }
        
        this.init();    }
    
    // 初始化
    async init() {
        this.initEventListeners();
        // 首先检查设备验证器是否启用
        await this.checkDeviceAuthStatus();
        // 首先尝试恢复认证状态
        this.restoreAuthenticationState();
        await this.loadSettings();
          // 修改：先加载本地验证码，然后再更新当前站点
        if (this.authenticated || this.localAuthenticated) {
            await this.initializeTOTPManager();
        }
        
        await this.updateCurrentSite();
        this.startLocalCodeUpdates();
        // 同步认证状态
        this.syncAuthenticationStates();
        // 检查WebAuthn支持情况
        this.updateAuthButtonStates();
        // 重新加载设备验证器设置以确保获取最新状态
        await this.reloadDeviceAuthSettings();
        // 根据设备验证器状态控制界面显示
        this.updateUIBasedOnDeviceAuth();
        
        // 监听来自其他页面的消息
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                if (message.action === 'deviceAuthSettingsChanged') {
                    console.log('收到设备验证器设置变更消息:', message);
                    // 重新加载设备验证器设置
                    this.reloadDeviceAuthSettings();
                    sendResponse({ received: true });
                }
                return true; // 保持消息通道开启以便异步回复
            });
        }
        
        // 监听全局安全状态变更
        document.addEventListener('globalSecurityStateChanged', (e) => {
            console.log('收到全局安全状态变更事件:', e.detail);
            if (!e.detail.enabled) {
                // 安全验证器被关闭，清除认证状态
                this.authenticated = false;
                this.localAuthenticated = false;
                this.updateAuthStatus();
                this.updateLocalAuthStatus();
            }
            // 重新检查设备验证器状态
            this.checkDeviceAuthStatus().then(() => {
                this.updateUIBasedOnDeviceAuth();
            });
        });
        
        // 监听认证状态清除事件
        document.addEventListener('clearAllAuthenticationStates', (e) => {
            console.log('收到清除所有认证状态事件');
            this.authenticated = false;
            this.localAuthenticated = false;
            this.updateAuthStatus();
            this.updateLocalAuthStatus();
            this.updateUIBasedOnDeviceAuth();
        });
        
        // 监听设备认证成功事件
        document.addEventListener('deviceAuthSuccess', (e) => {
            console.log('收到设备认证成功事件:', e.detail);
            if (e.detail.authenticated) {
                this.updateUIBasedOnDeviceAuth();
            }
        });
    }

    // 初始化事件监听器
    initEventListeners() {
        // 标签页切换
        document.querySelectorAll('.popup-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.getAttribute('data-tab');
                this.switchTab(tabName);
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

        // 打开设置按钮
        document.getElementById('openSettings')?.addEventListener('click', () => {
            this.openSettings();
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

        // 窗口关闭前保存认证状态
        window.addEventListener('beforeunload', () => {
            if (this.authenticated || this.localAuthenticated) {
                this.saveAuthenticationState();
            }
        });
    }    // 切换标签页
    switchTab(tabName) {
        // 如果设备验证器未启用，不允许切换标签页
        if (!this.deviceAuthEnabled) {
            return;
        }
        
        // 如果未认证，不允许切换到其他标签页
        if (!this.authenticated && !this.localAuthenticated) {
            this.showMessage('请先完成设备密钥验证', 'warning');
            return;
        }
        
        // 更新标签按钮状态
        document.querySelectorAll('.popup-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

        // 更新内容显示
        document.querySelectorAll('.popup-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName)?.classList.add('active');

        this.currentTab = tabName;        // 标签页特殊处理
        if (tabName === 'local') {
            // 如果填充页已经认证，直接同步到本地页
            if (this.authenticated) {
                this.localAuthenticated = true;
                this.showLocalCodes();
                this.initializeTOTPManager();
            } else {
                // 显示认证界面
                document.getElementById('localAuthSection').style.display = 'block';
                document.getElementById('localCodes').style.display = 'none';
            }
        }
    }
    
    // 设备密钥认证
    async authenticateUser() {
        try {
            this.showMessage('正在启动设备密钥验证...', 'info');
            
            // 使用Web Authentication API进行设备密钥认证
            const result = await this.performBiometricAuth();
            
            if (result.success) {
                this.authenticated = true;
                // 同步本地认证状态
                this.localAuthenticated = true;
                this.updateAuthStatus();
                this.showFillSection();
                // 如果本地标签页也需要更新
                this.updateLocalAuthStatus();
                // 保存认证状态
                this.saveAuthenticationState();
                // 显示所有标签页
                this.showAllTabs();
                this.showMessage('设备密钥验证成功！', 'success');
            } else {
                this.showMessage('设备密钥验证失败: ' + result.error, 'error');
            }
        } catch (error) {
            this.showMessage('设备密钥验证过程中出现错误: ' + error.message, 'error');
        }    }
    
    // 本地设备密钥认证
    async authenticateLocal() {
        try {            // 如果填充页面已经认证，直接使用该状态
            if (this.authenticated) {
                this.localAuthenticated = true;
                this.showLocalCodes();
                await this.initializeTOTPManager();
                this.showMessage('本地验证码已解锁！', 'success');
                return;
            }
            
            this.showMessage('正在启动设备密钥验证...', 'info');
            
            const result = await this.performBiometricAuth();
              if (result.success) {
                this.localAuthenticated = true;                // 同步填充页认证状态
                this.authenticated = true; 
                this.updateAuthStatus();
                this.showLocalCodes();
                await this.initializeTOTPManager();
                // 保存认证状态
                this.saveAuthenticationState();
                // 显示所有标签页
                this.showAllTabs();
                this.showMessage('设备密钥验证成功，本地验证码已解锁！', 'success');
            } else {
                this.showMessage('设备密钥验证失败: ' + result.error, 'error');
            }
        } catch (error) {
            this.showMessage('设备密钥验证过程中出现错误: ' + error.message, 'error');
        }
    }// 执行设备密钥认证 - 使用设备验证器
    async performBiometricAuth() {
        try {
            if (!this.deviceAuthenticator.isEnabled) {
                return { 
                    success: false, 
                    error: '设备验证器未启用，请在设置中启用生物识别验证' 
                };
            }

            // 检查是否已有凭据，避免显示错误的"首次使用"提示
            const hasCredential = this.deviceAuthenticator.credentialId !== null;
            
            if (!hasCredential) {
                this.showMessage('首次使用，正在注册设备密钥...', 'info');
            } else {
                this.showMessage('正在进行设备验证...', 'info');
            }
            
            const result = await this.deviceAuthenticator.authenticate();
            
            if (result.success) {
                this.showMessage('设备密钥验证成功，正在验证...', 'info');
            }
            
            return result;

        } catch (error) {
            console.error('设备密钥认证错误:', error);
            return { success: false, error: `认证失败: ${error.message}` };
        }
    }// 注册WebAuthn凭据

    // 更新认证状态
    updateAuthStatus() {
        const authStatus = document.getElementById('authStatus');
        const statusIndicator = authStatus?.querySelector('.status-indicator');
        const statusText = authStatus?.querySelector('.status-text');

        if (this.authenticated) {
            statusIndicator?.classList.add('authenticated');
            if (statusText) statusText.textContent = '已认证';
        } else {
            statusIndicator?.classList.remove('authenticated');
            if (statusText) statusText.textContent = '未认证';
        }
    }

    // 更新本地认证状态显示
    updateLocalAuthStatus() {        // 如果已经认证且当前在本地标签页，自动显示本地验证码
        if (this.authenticated && this.localAuthenticated && this.currentTab === 'local') {
            this.showLocalCodes();
            this.initializeTOTPManager();
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
            if (tabs.length > 0) {
                const url = new URL(tabs[0].url);
                this.currentSiteInfo = {
                    domain: url.hostname,
                    url: tabs[0].url,
                    title: tabs[0].title
                };
                this.updateSiteDisplay();
                await this.checkSavedConfig();
            }
        } catch (error) {
            console.error('获取当前网站信息失败:', error);
        }
    }

    // 更新网站显示
    updateSiteDisplay() {
        const siteInfo = document.querySelector('.site-info');
        const siteName = siteInfo?.querySelector('.site-name');
        const siteUrl = siteInfo?.querySelector('.site-url');

        if (this.currentSiteInfo) {
            if (siteName) siteName.textContent = this.currentSiteInfo.title || this.currentSiteInfo.domain;
            if (siteUrl) siteUrl.textContent = this.currentSiteInfo.domain;
            document.getElementById('currentSite')?.classList.add('active');
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
            this.showMessage('请先进行身份验证', 'warning');
            return;
        }

        const configList = document.getElementById('configList');
        const configItems = document.getElementById('configItems');
        
        configList.style.display = 'block';
        configItems.innerHTML = '<div class="loading">正在加载配置...</div>';

        try {
            // 从WebDAV或本地存储加载配置
            const configs = await this.loadConfigs();
            this.renderConfigList(configs);
        } catch (error) {
            configItems.innerHTML = '<div class="empty-state"><p>加载配置失败</p></div>';
            this.showMessage('加载配置失败: ' + error.message, 'error');
        }    }
    
    // 加载配置
    async loadConfigs() {
        // 优先从本地存储加载，云端作为备份和合并源
        try {
            // 先从本地存储加载
            const localConfigs = await this.localStorageManager.getLocalConfigList();
            
            // 如果配置了WebDAV，尝试从云端获取备份配置进行合并
            if (this.webdavClient) {
                try {
                    const cloudConfigs = await this.webdavClient.getConfigList();
                    
                    // 合并本地和云端配置，本地优先，去重
                    const mergedConfigs = [...localConfigs];
                    cloudConfigs.forEach(cloudConfig => {
                        // 检查本地是否已存在相同配置（通过ID或名称+发行方匹配）
                        const exists = localConfigs.some(localConfig => 
                            localConfig.id === cloudConfig.id || 
                            (localConfig.name === cloudConfig.name && localConfig.issuer === cloudConfig.issuer)
                        );
                        if (!exists) {
                            // 标记为云端配置，便于用户识别
                            mergedConfigs.push({...cloudConfig, source: 'cloud'});
                        }
                    });
                    
                    return mergedConfigs;
                } catch (error) {
                    console.warn('从WebDAV获取备份配置失败:', error);
                    // 云端获取失败时仍返回本地配置
                    return localConfigs;
                }
            }
            
            return localConfigs;
        } catch (error) {
            console.error('加载配置失败:', error);
            return [];
        }
    }

    // 渲染配置列表
    renderConfigList(configs) {
        const configItems = document.getElementById('configItems');
        
        if (configs.length === 0) {
            configItems.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <p>暂无配置</p>
                    <p class="empty-tip">请在设置中添加或同步配置</p>
                </div>
            `;
            return;
        }        configItems.innerHTML = configs.map(config => {
            const sourceIcon = config.source === 'cloud' ? '☁️' : '💾';
            const sourceTitle = config.source === 'cloud' ? '云端备份' : '本地存储';
            
            return `
                <div class="config-item" data-config-id="${config.id}">
                    <div class="config-info">
                        <div class="config-avatar">${config.name.charAt(0).toUpperCase()}</div>
                        <div class="config-details">
                            <div class="config-name">
                                ${config.name}
                                <span class="config-source" title="${sourceTitle}">${sourceIcon}</span>
                            </div>
                            <div class="config-domain">${config.issuer || config.domain || ''}</div>
                        </div>
                    </div>
                    <div class="config-status">可用</div>
                </div>
            `;
        }).join('');

        // 添加点击事件
        configItems.querySelectorAll('.config-item').forEach(item => {
            item.addEventListener('click', () => {
                const configId = item.getAttribute('data-config-id');
                this.selectConfig(configId);
            });
        });
    }    // 选择配置
    async selectConfig(configId) {
        try {
            let config = null;
            
            // 根据配置类型从不同存储获取
            if (configId.startsWith('local_')) {
                const result = await this.localStorageManager.getLocalConfig(configId);
                if (result.success) {
                    config = result.config;
                }
            } else {
                // 云端配置
                if (this.webdavClient) {
                    const encryptionKey = await this.localStorageManager.getEncryptionKey();
                    const result = await this.webdavClient.getConfig(configId, encryptionKey);
                    if (result.success) {
                        config = result.config;
                    }
                }
            }
            
            if (config) {
                await this.fillCode(config);
                this.hideConfigList();
                
                // 保存配置关联
                await this.saveConfigForSite(configId);
            } else {
                this.showMessage('无法获取配置信息', 'error');
            }
        } catch (error) {
            this.showMessage('填充验证码失败: ' + error.message, 'error');
        }
    }    // 填充验证码
    async fillCode(config) {
        try {
            const code = await this.totpGenerator.generateTOTP(config.secret);
            
            if (!code) {
                throw new Error('生成验证码失败');
            }
            
            // 发送消息给content script进行填充
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0) {
                await chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'fillCode',
                    code: code
                });
                
                this.showMessage(`验证码 ${code} 已填充`, 'success');
            }
        } catch (error) {
            this.showMessage('填充失败: ' + error.message, 'error');
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
            this.showConfigList();
        }
    }

    // 保存网站配置关联
    async saveConfigForSite(configId) {
        if (!this.currentSiteInfo) return;

        const siteConfigs = await this.getStorageData('siteConfigs') || {};
        siteConfigs[this.currentSiteInfo.domain] = configId;
        
        await this.setStorageData('siteConfigs', siteConfigs);
        document.getElementById('quickFillBtn').disabled = false;    }

    // 隐藏配置列表
    hideConfigList() {
        document.getElementById('configList').style.display = 'none';
    }

    // 开始本地验证码更新
    startLocalCodeUpdates() {
        // 由统一的TOTP管理器处理验证码更新
        // 这里只需要确保在切换到本地标签页时初始化管理器
        if (this.localAuthenticated && this.currentTab === 'local') {
            this.initializeTOTPManager();
        }
    }

    // 开始摄像头扫描
    async startCameraScanning() {
        const videoElement = document.getElementById('cameraVideo');
        const canvasElement = document.getElementById('scanCanvas');
        
        if (!videoElement || !canvasElement) {
            this.showMessage('页面元素未找到，请刷新页面重试', 'error');
            return;
        }
        
        if (!this.qrScanner) {
            this.qrScanner = new QRCode();
        }

        this.showMessage('正在启动摄像头...', 'info');

        const result = await this.qrScanner.initCamera(videoElement, canvasElement);
        
        if (result.success) {
            document.getElementById('scanArea').style.display = 'block';
            document.querySelector('.scan-options').style.display = 'none';
              // 开始检测二维码
            this.qrScanner.startScanning((qrData) => {
                this.handleQRCodeDetected(qrData);
            });
            
            this.showMessage('摄像头已启动，请将二维码放入扫描框内', 'success');
        } else {
            this.showMessage('摄像头启动失败: ' + result.message, 'error');
            
            // 如果是权限问题，提供备选方案
            if (result.message.includes('权限') || result.message.includes('SecurityError')) {
                this.showCameraPermissionHelp();
            }
        }
    }// 开始屏幕扫描
    async startScreenScanning() {        
        try {
            console.log('开始屏幕扫描...');
            
            if (!this.qrScanner) {
                this.qrScanner = new QRCode();
            }

            this.showMessage('正在请求屏幕录制权限...', 'info');
            const result = await this.qrScanner.scanScreen();
            
            console.log('屏幕扫描结果:', result);
            
            if (result.success) {
                this.showMessage('屏幕扫描成功！', 'success');
                this.handleQRCodeDetected(result.data);
            } else {
                this.showMessage('屏幕扫描失败: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('屏幕扫描出错:', error);
            this.showMessage('屏幕扫描出错: ' + error.message, 'error');
        }
    }

    // 拍照识别
    async captureQRCode() {
        if (!this.qrScanner) return;

        const result = await this.qrScanner.captureAndScan();
        if (result.success) {
            this.handleQRCodeDetected(result.data);
        } else {
            this.showMessage('识别失败', 'error');
        }
    }    // 停止扫描
    stopScanning() {
        if (this.qrScanner) {
            this.qrScanner.stopScanning();
        }
        
        document.getElementById('scanArea').style.display = 'none';
        document.getElementById('scanResult').style.display = 'none';
        document.querySelector('.scan-options').style.display = 'block';
    }// 处理二维码检测
    handleQRCodeDetected(qrData) {
        try {
            console.log('检测到二维码数据:', qrData);
            
            if (!qrData || typeof qrData !== 'string') {
                throw new Error('无效的二维码数据');
            }
            
            const parsedData = this.parseQRData(qrData);
            console.log('解析后的数据:', parsedData);
            
            this.displayScanResult(parsedData, qrData);
        } catch (error) {
            console.error('二维码处理失败:', error);
            this.showMessage('二维码解析失败: ' + error.message, 'error');
        }
    }    // 解析二维码数据
    parseQRData(qrData) {
        console.log('开始解析二维码:', qrData);
        
        if (!qrData || typeof qrData !== 'string') {
            throw new Error('二维码数据无效');
        }
        
        if (qrData.startsWith('otpauth://totp/')) {
            try {
                const url = new URL(qrData);
                console.log('URL解析成功:', url);
                
                const pathParts = url.pathname.slice(1).split(':');
                const secret = url.searchParams.get('secret');
                
                if (!secret) {
                    throw new Error('二维码中缺少密钥信息');
                }
                
                const parsedData = {
                    type: 'totp',
                    issuer: url.searchParams.get('issuer') || pathParts[0] || '',
                    account: pathParts[1] || '',
                    secret: secret,
                    digits: parseInt(url.searchParams.get('digits')) || 6,
                    period: parseInt(url.searchParams.get('period')) || 30
                };
                
                console.log('TOTP解析完成:', parsedData);
                return parsedData;
            } catch (urlError) {
                console.error('URL解析失败:', urlError);
                throw new Error('二维码格式错误: ' + urlError.message);
            }
        }
        
        throw new Error('不支持的二维码格式，仅支持TOTP认证二维码');
    }

    // 显示扫描结果
    displayScanResult(parsedData, rawData) {
        const qrInfo = document.getElementById('qrInfo');
        const scanResult = document.getElementById('scanResult');
        
        qrInfo.innerHTML = `
            <div><strong>类型:</strong> ${parsedData.type.toUpperCase()}</div>
            <div><strong>发行方:</strong> ${parsedData.issuer}</div>
            <div><strong>账户:</strong> ${parsedData.account}</div>
            <div><strong>密钥:</strong> ${parsedData.secret.substring(0, 8)}...</div>
        `;
        
        // 填充配置名称建议
        const configNameInput = document.getElementById('configName');
        configNameInput.value = parsedData.issuer || parsedData.account || 'New Config';
        
        scanResult.style.display = 'block';
        document.getElementById('scanArea').style.display = 'none';
        
        // 保存解析后的数据
        this.scannedData = parsedData;
    }    // 保存扫描的配置
    async saveScannedConfig() {
        if (!this.scannedData) {
            this.showMessage('没有扫描数据可保存', 'error');
            return;
        }
        
        const configName = document.getElementById('configName').value.trim();
        if (!configName) {
            this.showMessage('请输入配置名称', 'warning');
            return;
        }
        
        try {
            console.log('准备保存扫描的配置:', this.scannedData);
            
            const config = {
                name: configName,
                ...this.scannedData,
                created: new Date().toISOString()
            };
            
            console.log('最终配置数据:', config);
            
            // 确保本地存储管理器已初始化
            if (!this.localStorageManager) {
                this.localStorageManager = new Storage();
            }
            
            // 默认保存到本地加密存储
            this.showMessage('正在保存配置...', 'info');
            const result = await this.localStorageManager.addLocalConfig(config);
            
            console.log('保存结果:', result);
            
            if (result.success) {
                this.showMessage('配置已保存到本地', 'success');
                
                // 清理扫描数据
                this.scannedData = null;
                  // 自动备份到云端（如果可用）
                try {
                    // 检查WebDAV是否已配置
                    const webdavConfig = await this.getStorageData('webdavConfig');
                    if (webdavConfig && webdavConfig.url && webdavConfig.username && webdavConfig.password && this.webdavClient) {
                        const backupResult = await this.webdavClient.addConfig(config);
                        if (backupResult.success) {
                            this.showMessage('已自动备份到云端', 'info', 2000);
                        } else {
                            console.warn('云端备份失败:', backupResult.message);
                        }
                    } else {
                        console.log('WebDAV未配置或客户端未初始化，跳过自动备份');
                    }                } catch (backupError) {
                    console.warn('云端备份出错:', backupError);
                    // 备份失败不影响主要功能
                }
                
                // 停止扫描并刷新本地列表
                this.stopScanning();
                if (this.currentTab === 'local') {
                    setTimeout(() => this.refreshLocalCodes(), 100);
                }
            } else {
                this.showMessage('保存失败: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('保存配置出错:', error);
            this.showMessage('保存失败: ' + error.message, 'error');
        }
    }

    // 打开设置页面
    openSettings() {
        chrome.tabs.create({
            url: chrome.runtime.getURL('html/setting.html')
        });
        window.close();
    }

    // 加载设置
    async loadSettings() {
        try {
            // 加载WebDAV设置
            const webdavConfig = await this.getStorageData('webdavConfig');
            if (webdavConfig && webdavConfig.url) {
                this.initWebDAVClient(webdavConfig);
            }
        } catch (error) {
            console.error('加载设置失败:', error);
        }
    }

    // 初始化WebDAV客户端
    async initWebDAVClient(config) {
        try {
            this.webdavClient = new WebDAV(config);
            const testResult = await this.webdavClient.test();
            if (!testResult.success) {
                console.warn('WebDAV连接测试失败:', testResult.error);
                this.webdavClient = null;
            }
        } catch (error) {
            console.error('初始化WebDAV客户端失败:', error);
            this.webdavClient = null;
        }
    }    // 显示消息 - 使用Menu系统简化API
    showMessage(message, type = 'info') {
        return window.GlobalScope.Menu.notify(message, type);
    }// 显示模态框 - 使用Menu系统简化API
    showModal(title, content) {
        return window.GlobalScope.Menu.alert(title, content);
    }    // 隐藏模态框 - Menu系统会自动处理
    hideModal() {
        window.GlobalScope.Menu.closeAllModals();
    }
    
    // 显示摄像头权限帮助
    showCameraPermissionHelp() {
        const helpContent = `
            <div class="permission-help">
                <h4>摄像头访问权限问题</h4>
                <p>浏览器扩展的弹出页面可能无法直接访问摄像头。请尝试以下解决方案：</p>
                <ol>
                    <li><strong>检查浏览器权限：</strong>
                        <ul>
                            <li>确保在浏览器地址栏左侧的权限图标中允许摄像头访问</li>
                            <li>在Chrome设置 > 隐私设置和安全性 > 网站设置 > 摄像头中允许访问</li>
                        </ul>
                    </li>
                    <li><strong>使用备选方案：</strong>
                        <ul>
                            <li>点击"屏幕识别"功能扫描屏幕上的二维码</li>
                            <li>在设置页面中手动输入验证码配置</li>
                        </ul>
                    </li>
                    <li><strong>浏览器兼容性：</strong>
                        <ul>
                            <li>建议使用Chrome或Edge最新版本</li>
                            <li>Firefox可能对扩展摄像头访问有限制</li>
                        </ul>
                    </li>
                </ol>
                <div class="help-actions">
                    <button onclick="popupManager.openSettings()" class="primary-btn">打开设置页面</button>
                    <button onclick="popupManager.startScreenScanning()" class="secondary-btn">使用屏幕识别</button>
                </div>
            </div>
        `;
        
        this.showModal('摄像头权限帮助', helpContent);
    }    // 同步认证状态
    async syncAuthenticationStates() {
        // 以填充页面的认证状态为准
        if (this.authenticated) {
            this.localAuthenticated = true;
        }
        
        // 检查WebAuthn凭据状态
        const authInfo = await this.getAuthenticatorInfo();
        if (authInfo.hasStoredCredential) {
            console.log('检测到已存储的WebAuthn凭据');
        }
        
        // 更新UI显示
        this.updateAuthStatus();
        this.updateLocalAuthStatus();
    }    // 重置认证状态（用于会话过期等情况）
    resetAuthenticationStates() {
        this.authenticated = false;
        this.localAuthenticated = false;
        this.updateAuthStatus();
        // 清除会话存储
        sessionStorage.removeItem('popup_auth_state');
        // 重置页面显示
        document.getElementById('authSection').style.display = 'block';
        document.getElementById('fillSection').style.display = 'none';
        document.getElementById('localAuthSection').style.display = 'block';
        document.getElementById('localCodes').style.display = 'none';
        // 根据设备验证器状态更新UI
        this.updateUIBasedOnDeviceAuth();
    }

    // 保存认证状态到会话存储（临时存储）
    saveAuthenticationState() {
        const authData = {
            authenticated: this.authenticated,
            localAuthenticated: this.localAuthenticated,
            timestamp: Date.now()
        };
        sessionStorage.setItem('popup_auth_state', JSON.stringify(authData));
    }    // 从会话存储恢复认证状态
    restoreAuthenticationState() {
        // 如果设备验证器未启用，清除认证状态并返回
        if (!this.deviceAuthEnabled) {
            this.resetAuthenticationStates();
            return false;
        }
        
        try {
            // 首先检查设备验证器的认证是否有效
            if (this.deviceAuthenticator && this.deviceAuthenticator.isAuthenticationValid()) {
                // 如果设备验证有效，不需要重新验证
                console.log('设备验证仍然有效，无需重新验证');
                this.authenticated = true;
                this.localAuthenticated = true;
                
                // 更新UI
                this.updateAuthStatus();
                this.showFillSection();
                this.showAllTabs();
                return true;
            }
            
            // 设备验证已过期，检查会话认证状态
            const authDataStr = sessionStorage.getItem('popup_auth_state');
            if (authDataStr) {
                const authData = JSON.parse(authDataStr);
                const now = Date.now();
                
                // 从localStorage获取用户设置的超时时间（分钟），默认15分钟
                const timeoutMinutes = parseInt(localStorage.getItem('device_auth_timeout') || '15');
                const maxAge = timeoutMinutes * 60 * 1000; // 使用用户设置的超时时间
                
                console.log(`使用超时时间: ${timeoutMinutes}分钟`);
                
                if (now - authData.timestamp < maxAge) {
                    this.authenticated = authData.authenticated || false;
                    this.localAuthenticated = authData.localAuthenticated || false;
                    
                    // 更新UI
                    if (this.authenticated) {
                        this.updateAuthStatus();
                        this.showFillSection();
                        this.showAllTabs();
                    }
                    
                    return true;
                } else {
                    console.log('认证已过期，需要重新验证');
                }
            }
        } catch (error) {
            console.error('恢复认证状态失败:', error);
        }
        return false;
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
    }    // 清理资源
    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        if (this.qrScanner) {
            this.qrScanner.stopScanning();
        }
    }

    // 诊断本地验证码问题
    async diagnoseLocalCodes() {
        console.log('=== 开始诊断本地验证码问题 ===');
        
        try {
            // 1. 检查认证状态
            console.log('1. 本地认证状态:', this.localAuthenticated);
            
            // 2. 检查本地存储
            const rawStorage = localStorage.getItem('local_config_list');
            console.log('2. 本地配置列表原始数据:', rawStorage);
            
            if (rawStorage) {
                const configList = JSON.parse(rawStorage);
                console.log('3. 解析后的配置列表:', configList);
                
                for (const item of configList) {
                    console.log(`4. 检查配置 ${item.name} (ID: ${item.id})`);
                    
                    // 检查加密数据
                    const encryptedData = localStorage.getItem(`encrypted_local_config_${item.id}`);
                    console.log(`   加密数据存在:`, !!encryptedData);
                    console.log(`   加密数据长度:`, encryptedData?.length || 0);
                    
                    // 尝试解密
                    try {
                        const result = await this.localStorageManager.getLocalConfig(item.id);
                        console.log(`   解密结果:`, result.success);
                        if (result.success) {
                            console.log(`   配置名称:`, result.config.name);
                        } else {
                            console.error(`   解密失败:`, result.message);
                        }
                    } catch (decryptError) {
                        console.error(`   解密错误:`, decryptError);
                    }
                }
            } else {
                console.warn('本地配置列表为空或不存在');
            }
            
            this.showMessage('诊断完成', 'success');
        } catch (error) {
            console.error('诊断本地验证码问题时出错:', error);
            this.showMessage('诊断失败: ' + error.message, 'error');
        }
    }

    // 处理接收到的消息
    async handleMessage(message) {
        console.log('接收到消息:', message);
        
        if (message.type === 'authStatus') {
            this.authenticated = message.authenticated;
            this.localAuthenticated = message.localAuthenticated;
            
            this.updateAuthStatus();
            this.updateLocalAuthStatus();
        } else if (message.type === 'configUpdate') {
            // 配置更新通知
            if (this.currentTab === 'local') {
                this.loadLocalCodes();
            } else {
                this.checkSavedConfig();
            }
        } else if (message.type === 'webdavStatus') {
            // WebDAV 状态更新
            if (message.status === 'connected') {
                this.showMessage('已连接到云端', 'success');
            } else {
                this.showMessage('云端连接已断开', 'warning');
            }
        }
    }

    // 初始化背景脚本消息监听
    initBackgroundMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message);
        });
    }    // 更新认证按钮状态
    updateAuthButtonStates() {
        const authBtn = document.getElementById('authBtn');
        const localAuthBtn = document.getElementById('localAuthBtn');
        
        if (authBtn && localAuthBtn) {
            // 检查设备验证器是否启用
            const deviceAuthInfo = this.deviceAuthenticator.getStatus();
            if (!deviceAuthInfo.enabled) {
                const warningText = '生物识别验证未启用，请在设置中启用';
                if (authBtn) {
                    authBtn.title = warningText;
                    authBtn.style.opacity = '0.6';
                }
                if (localAuthBtn) {
                    localAuthBtn.title = warningText;
                    localAuthBtn.style.opacity = '0.6';
                }
            } else {
                // 检查设备支持情况
                this.deviceAuthenticator.checkSupport().then(supported => {
                    if (!supported) {
                        const warningText = '设备不支持生物识别认证';
                        if (authBtn) {
                            authBtn.title = warningText;
                            authBtn.style.opacity = '0.6';
                        }
                        if (localAuthBtn) {
                            localAuthBtn.title = warningText;
                            localAuthBtn.style.opacity = '0.6';
                        }
                    }
                });
            }
        }
    }

    // 重置设备验证凭据
    resetWebAuthnCredentials() {
        this.deviceAuthenticator.resetCredentials();
        this.showMessage('设备密钥已重置，下次验证时将重新注册', 'info');    }

    // 获取设备认证器信息
    async getAuthenticatorInfo() {
        return await this.deviceAuthenticator.getAuthenticatorInfo();
    }    // 检查设备验证器状态
    async checkDeviceAuthStatus() {
        try {
            // 标记页面类型，方便设备验证器识别
            document.body.id = document.body.id || 'authenticator-popup';
            
            // 1. 首先从chrome.storage直接获取最新的设置
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                try {
                    // 尝试获取直接键值
                    const result = await chrome.storage.local.get(['device_auth_enabled', 'deviceAuthConfig']);
                    
                    if (result.device_auth_enabled !== undefined) {
                        this.deviceAuthEnabled = result.device_auth_enabled === true || 
                                                result.device_auth_enabled === 'true';
                        console.log('从chrome.storage直接键值获取设备验证器状态:', this.deviceAuthEnabled ? '启用' : '禁用');
                    } else if (result.deviceAuthConfig && result.deviceAuthConfig.enabled !== undefined) {
                        this.deviceAuthEnabled = result.deviceAuthConfig.enabled;
                        console.log('从chrome.storage配置对象获取设备验证器状态:', this.deviceAuthEnabled ? '启用' : '禁用');
                    }
                } catch (e) {
                    console.warn('从chrome.storage获取设备验证器状态失败:', e);
                }
            }
            
            // 2. 如果chrome.storage没有结果，再从deviceAuthenticator获取
            if (this.deviceAuthEnabled === undefined) {
                const status = this.deviceAuthenticator.getStatus();
                this.deviceAuthEnabled = status.enabled;
                console.log('从deviceAuthenticator获取设备验证器状态:', status);
            }
            
            // 确保验证器实例也更新到最新状态
            if (this.deviceAuthenticator.isEnabled !== this.deviceAuthEnabled) {
                this.deviceAuthenticator.isEnabled = this.deviceAuthEnabled;
                console.log('更新设备验证器实例状态:', this.deviceAuthEnabled ? '启用' : '禁用');
            }
            
            // 监听设备验证成功事件
            document.addEventListener('deviceAuthSuccess', (e) => {
                this.authenticated = true;
                this.updateUIBasedOnDeviceAuth();
            });
            
            // 监听设备验证状态变化事件
            document.addEventListener('deviceAuthStateChanged', (e) => {
                const isValid = e.detail.authenticated;
                this.authenticated = isValid;
                this.updateUIBasedOnDeviceAuth();
            });
        } catch (error) {
            console.error('检查设备验证器状态失败:', error);
            this.deviceAuthEnabled = false;
        }
    }

    // 重新加载设备验证器设置
    async reloadDeviceAuthSettings() {
        try {
            console.log('重新加载设备验证器设置...');
            
            // 首先尝试从chrome.storage直接获取最新的设置
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                const result = await chrome.storage.local.get(['device_auth_enabled', 'deviceAuthConfig']);
                
                if (result.device_auth_enabled !== undefined) {
                    this.deviceAuthEnabled = result.device_auth_enabled === true || 
                                            result.device_auth_enabled === 'true';
                    // 确保验证器实例也更新
                    this.deviceAuthenticator.isEnabled = this.deviceAuthEnabled;
                    console.log('已重新加载设备验证器状态:', this.deviceAuthEnabled ? '启用' : '禁用');
                    
                    // 更新UI
                    this.updateUIBasedOnDeviceAuth();
                    return;
                } else if (result.deviceAuthConfig && result.deviceAuthConfig.enabled !== undefined) {
                    this.deviceAuthEnabled = result.deviceAuthConfig.enabled;
                    // 确保验证器实例也更新
                    this.deviceAuthenticator.isEnabled = this.deviceAuthEnabled;
                    console.log('已重新加载设备验证器状态(从配置对象):', this.deviceAuthEnabled ? '启用' : '禁用');
                    
                    // 更新UI
                    this.updateUIBasedOnDeviceAuth();
                    return;
                }
            }
            
            // 如果chrome.storage没有结果，使用设备验证器重新加载设置
            await this.deviceAuthenticator.loadSettings();
            this.deviceAuthEnabled = this.deviceAuthenticator.isEnabled;
            console.log('已通过设备验证器实例重新加载状态:', this.deviceAuthEnabled ? '启用' : '禁用');
            
            // 更新UI
            this.updateUIBasedOnDeviceAuth();
        } catch (error) {
            console.error('重新加载设备验证器设置失败:', error);
        }
    }    // 根据设备验证器状态更新UI    
    updateUIBasedOnDeviceAuth() {
        var deviceAuthStatus = this.deviceAuthenticator.getStatus();
        console.log('更新UI基于设备验证器状态:', deviceAuthStatus);
        console.log('当前认证状态:', { authenticated: this.authenticated, localAuthenticated: this.localAuthenticated });
        
        if (!this.deviceAuthEnabled) {
            // 如果设备验证器未启用，显示设置提示
            this.showDeviceAuthSetupPrompt();
            return;
        }
        
        // 检查认证状态，如果已认证则显示正常界面
        if (this.authenticated || this.localAuthenticated) {
            // 如果已认证，显示所有标签页和正常界面
            this.showAllTabs();
            this.restoreNormalUI();
            return;
        }
        
        // 检查是否需要安全验证
        if (this.deviceAuthenticator.shouldRestrictAccess()) {
            this.showSecurityRestrictedUI();
            return;
        }
        
        // 如果设备验证器启用但未解锁，只显示认证界面，隐藏其他标签页
        this.hideOtherTabsUntilAuthenticated();
    }
    
    // 显示安全受限UI
    showSecurityRestrictedUI() {
        var container = document.querySelector('.popup-container');
        container.innerHTML = `
            <div class="security-restricted-notice">
                <div class="security-icon">🔒</div>
                <h3>安全验证已启用</h3>
                <p>请先通过设备验证后访问验证码功能</p>
                
                <div class="security-actions">
                    <button id="performSecurityAuth" class="primary-btn">
                        <span>🔑</span>
                        <span>设备验证</span>
                    </button>
                    
                    <button id="openSecuritySettings" class="secondary-btn">
                        <span>⚙️</span>
                        <span>安全设置</span>
                    </button>
                </div>
                
                <div class="security-note">
                    <p>安全验证保护您的验证码免受未经授权的访问</p>
                </div>
            </div>
        `;
        
        var self = this;
        // 绑定事件
        document.getElementById('performSecurityAuth')?.addEventListener('click', function() {
            self.performSecurityAuthentication();
        });
        
        document.getElementById('openSecuritySettings')?.addEventListener('click', function() {
            self.openSettings();
        });
    }
      // 执行安全验证
    performSecurityAuthentication() {
        var self = this;
        this.performBiometricAuth().then(function(result) {
            if (result.success) {
                // 更新认证状态
                self.authenticated = true;
                self.localAuthenticated = true;
                self.showMessage('验证成功！正在加载界面...', 'success');
                
                // 保存认证状态
                self.saveAuthenticationState();
                
                // 立即更新UI
                setTimeout(function() {
                    self.updateUIBasedOnDeviceAuth();
                }, 500);
            } else {
                self.showMessage('验证失败: ' + result.error, 'error');
            }
        }).catch(function(error) {
            self.showMessage('验证过程出错: ' + error.message, 'error');
        });
    }

    // 显示设备验证器设置提示
    showDeviceAuthSetupPrompt() {
        const container = document.querySelector('.popup-container');
        container.innerHTML = `
            <div class="device-auth-setup-prompt">
                <div class="setup-icon">🔐</div>
                <h3>设备验证器未启用</h3>
                <p>为了保护您的验证码安全，请先在设置中启用设备验证器。</p>
                <p>设备验证器使用Windows Hello、指纹或面部识别等生物识别技术来保护您的2FA验证码。</p>
                <button id="openDeviceAuthSettings" class="primary-btn">
                    <span>⚙️</span>
                    <span>前往设置启用</span>
                </button>
            </div>
        `;
        
        // 添加设置按钮事件监听
        document.getElementById('openDeviceAuthSettings')?.addEventListener('click', () => {
            this.openSettings();
        });
    }

    // 隐藏其他标签页直到认证完成
    hideOtherTabsUntilAuthenticated() {
        const tabButtons = document.querySelectorAll('.popup-tab-btn');
        const tabContents = document.querySelectorAll('.popup-tab-content');
        
        // 隐藏所有标签页按钮，只保留第一个（填充标签页）
        tabButtons.forEach((btn, index) => {
            if (index === 0) {
                btn.style.display = 'block';
                btn.classList.add('active');
            } else {
                btn.style.display = 'none';
                btn.classList.remove('active');
            }
        });
        
        // 只显示第一个标签页内容
        tabContents.forEach((content, index) => {
            if (index === 0) {
                content.style.display = 'block';
                content.classList.add('active');
            } else {
                content.style.display = 'none';
                content.classList.remove('active');
            }
        });
        
        // 确保当前标签页是填充页
        this.currentTab = 'fill';
    }

    // 显示所有标签页
    showAllTabs() {
        const tabButtons = document.querySelectorAll('.popup-tab-btn');
        const tabContents = document.querySelectorAll('.popup-tab-content');
        
        // 显示所有标签页按钮
        tabButtons.forEach(btn => {
            btn.style.display = 'block';
        });
        
        // 显示所有标签页内容（但保持当前激活状态）
        tabContents.forEach(content => {
            content.style.display = 'block';
        });
    }

    // 初始化TOTP管理器
    async initializeTOTPManager() {
        try {
            console.log('初始化弹出页面TOTP管理器...');
            await this.totpConfigManager.initPopup();
            console.log('TOTP管理器初始化完成');
        } catch (error) {
            console.error('初始化TOTP管理器失败:', error);
        }
    }

    // 恢复正常UI界面
    restoreNormalUI() {
        const container = document.querySelector('.popup-container');
        if (!container) return;
        
        // 检查是否当前显示的是受限访问界面
        if (container.querySelector('.security-restricted-notice') || 
            container.querySelector('.device-auth-setup-prompt')) {
            
            // 重新加载整个页面内容
            window.location.reload();
            return;
        }
        
        // 确保正常的标签页和内容都可见
        const tabBtns = document.querySelectorAll('.popup-tab-btn');
        const tabContents = document.querySelectorAll('.popup-tab-content');
        
        tabBtns.forEach(btn => {
            btn.style.display = 'block';
        });
        
        tabContents.forEach(content => {
            if (content.id === this.currentTab) {
                content.classList.add('active');
            }
        });
        
        // 显示正确的内容区域
        if (this.authenticated) {
            this.showFillSection();
        }
        
        if (this.localAuthenticated) {
            this.showLocalCodes();
        }
    }
}

// 创建PopupManager实例
const popupManager = new PopupManager();

const globalScope = (() => {
    if (typeof globalThis !== 'undefined') return globalThis;
    if (typeof window !== 'undefined') return window;
    if (typeof self !== 'undefined') return self;
    if (typeof global !== 'undefined') return global;
    return {};
})();
    
globalScope.GlobalScope = globalScope.GlobalScope || {};
globalScope.GlobalScope.PopupManager = PopupManager;
globalScope.GlobalScope.popupManager = popupManager;
