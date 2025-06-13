// 弹出页面主脚本
// 使用全局变量导入模块（GlobalScope已在crypto.js中定义）

// 从全局变量获取模块
const Crypto = GlobalScope.CryptoManager;
const TOTP = GlobalScope.TOTPGenerator;
const WebDAV = GlobalScope.WebDAVClient;
const Storage = GlobalScope.LocalStorageManager;
const QRCode = GlobalScope.QRScanner;

// 使用全局工具函数（在main.js中定义）
// Utils 已经在全局作用域中可用，无需重新声明

class PopupManager {constructor() {
        this.currentTab = 'fill';
        this.authenticated = false;
        this.localAuthenticated = false;
        this.webdavClient = null;
        this.qrScanner = null;
        this.totpGenerator = new TOTP();
        this.localStorageManager = new Storage();
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
    }

    // 切换标签页
    switchTab(tabName) {
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

        this.currentTab = tabName;

        // 标签页特殊处理
        if (tabName === 'local') {
            this.refreshLocalCodes();
        }
    }

    // 生物识别认证
    async authenticateUser() {
        try {
            this.showMessage('正在进行身份验证...', 'info');
            
            // 模拟生物识别认证
            const result = await this.performBiometricAuth();
            
            if (result.success) {
                this.authenticated = true;
                this.updateAuthStatus();
                this.showFillSection();
                this.showMessage('认证成功！', 'success');
            } else {
                this.showMessage('认证失败: ' + result.error, 'error');
            }
        } catch (error) {
            this.showMessage('认证过程中出现错误: ' + error.message, 'error');
        }
    }

    // 本地认证
    async authenticateLocal() {
        try {
            this.showMessage('正在验证身份...', 'info');
            
            const result = await this.performBiometricAuth();
            
            if (result.success) {
                this.localAuthenticated = true;
                this.showLocalCodes();
                await this.loadLocalCodes();
                this.showMessage('本地验证码已解锁！', 'success');
            } else {
                this.showMessage('验证失败: ' + result.error, 'error');
            }
        } catch (error) {
            this.showMessage('验证过程中出现错误: ' + error.message, 'error');
        }
    }

    // 执行生物识别认证
    async performBiometricAuth() {
        return new Promise((resolve) => {
            // 模拟异步认证过程
            setTimeout(() => {
                // 这里应该调用真实的生物识别API
                resolve({ success: true });
            }, 1500);
        });
    }

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
        }
    }    // 加载配置
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
        document.getElementById('quickFillBtn').disabled = false;
    }

    // 隐藏配置列表
    hideConfigList() {
        document.getElementById('configList').style.display = 'none';
    }    // 加载本地验证码
    async loadLocalCodes() {
        try {
            // 使用新的加密本地存储管理器
            const configs = await this.localStorageManager.getAllLocalConfigs();
            this.localCodes = configs;
            this.renderLocalCodes();
        } catch (error) {
            console.error('加载本地验证码失败:', error);
            this.localCodes = [];
            this.renderLocalCodes();
        }
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

        localCodesContainer.innerHTML = this.localCodes.map(config => `
            <div class="code-item">
                <div class="code-header">
                    <div class="code-name">${config.name}</div>
                    <div class="code-timer">
                        <div class="timer-circle">
                            <div class="timer-progress"></div>
                        </div>
                        <span>30</span>
                    </div>
                </div>
                <div class="code-value" data-secret="${config.secret}">------</div>
            </div>
        `).join('');

        // 更新验证码
        this.updateLocalCodesDisplay();

        // 添加复制功能
        localCodesContainer.querySelectorAll('.code-value').forEach(element => {
            element.addEventListener('click', () => {
                navigator.clipboard.writeText(element.textContent);
                this.showMessage('验证码已复制', 'success');
            });
        });
    }    // 更新本地验证码显示
    async updateLocalCodesDisplay() {
        console.log('开始更新本地验证码显示，配置数量:', this.localCodes.length);
        
        for (const config of this.localCodes) {
            const element = document.querySelector(`[data-secret="${config.secret}"]`);
            console.log('处理配置:', config.name, '元素找到:', !!element);
            
            if (element) {
                try {
                    console.log('开始生成TOTP，密钥:', config.secret?.substring(0, 8) + '...');
                    const code = await this.totpGenerator.generateTOTP(config.secret);
                    console.log('生成的验证码:', code);
                    
                    if (code) {
                        element.textContent = code;
                        console.log('验证码已更新到页面:', code);
                    } else {
                        element.textContent = '------';
                        console.error('生成验证码失败（返回null）:', config.name);
                    }
                } catch (error) {
                    element.textContent = '------';
                    console.error('生成验证码出错:', error, config.name);
                }
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
    }    // 更新计时器显示
    updateTimerDisplay() {
        const progress = this.totpGenerator.getCodeProgress();
        
        document.querySelectorAll('.timer-progress').forEach(element => {
            const rotation = (progress.progress / 100) * 360;
            element.style.transform = `rotate(${rotation}deg)`;
        });

        document.querySelectorAll('.code-timer span').forEach(element => {
            element.textContent = progress.timeRemaining.toString();
        });

        // 如果快到期了，重新生成验证码
        if (progress.timeRemaining <= 1) {
            setTimeout(() => this.updateLocalCodesDisplay(), 100);
        }
    }// 开始摄像头扫描
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
                    if (this.webdavClient) {
                        const backupResult = await this.webdavClient.addConfig(config);
                        if (backupResult.success) {
                            this.showMessage('已自动备份到云端', 'info', 2000);
                        } else {
                            console.warn('云端备份失败:', backupResult.message);
                        }
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
    }

    // 显示消息
    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
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
        modal.style.display = 'block';
    }    // 隐藏模态框
    hideModal() {
        document.getElementById('modal').style.display = 'none';
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

// 全局变量导出（用于Service Worker环境）
if (typeof globalThis !== 'undefined') {
    globalThis.PopupManager = PopupManager;
} else if (typeof window !== 'undefined') {
    window.PopupManager = PopupManager;
} else if (typeof self !== 'undefined') {
    self.PopupManager = PopupManager;
}

// ES6模块导出
const popupManager = new PopupManager();

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
    popupManager.cleanup();
});

// 全局变量导出 - 支持多种环境
(() => {
    GlobalScope.PopupManager = PopupManager;
    GlobalScope.popupManager = popupManager;
})();
