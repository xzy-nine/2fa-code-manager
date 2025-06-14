// 设备验证器管理器
// 处理WebAuthn生物识别验证相关功能

var DeviceAuthenticator = function() {
    this.isEnabled = false;
    this.credentialId = null;
    this.lastAuthTime = null;
    this.authTimeout = 15; // 默认15分钟超时
    
    // UI相关属性
    this.elements = {};
    this.uiInitialized = false;
    this.isSettingsInitialized = false;  // 设置页面初始化标记
    
    this.init();
};

// 初始化
DeviceAuthenticator.prototype.init = function() {
    var self = this;    this.loadSettings().then(function() {
        self.checkSupport().then(function() {
            // 检查是否在浏览器环境中（有document对象）
            if (typeof document !== 'undefined') {
                // 如果DOM已加载，则立即初始化UI
                if (document.readyState !== 'loading') {
                    self.initUI();
                    self.initSettings();  // 尝试初始化设置页面
                } else {
                    // 否则等待DOM加载完成后初始化UI
                    document.addEventListener('DOMContentLoaded', function() {
                        self.initUI();
                        self.initSettings();  // 尝试初始化设置页面
                    });
                }
            }
            
            // 执行一次认证状态检查
            self.checkAuth();
            
            // 设置定期检查
            setInterval(function() {
                self.checkAuth();
            }, 60000);
        });
    });    // 监听设置变更事件
    if (typeof document !== 'undefined') {
        document.addEventListener('deviceAuthConfigChanged', function() {
            console.log('设备验证器配置已更改，重新加载设置');
            self.loadSettings();
        });
    }
};

// 进行认证状态检查
DeviceAuthenticator.prototype.checkAuth = function() {
    var isValid = this.isAuthenticationValid();
    console.log('认证状态检查:', isValid ? '有效' : '无效');
    
    // 如果UI已初始化，更新UI
    if (this.uiInitialized) {
        this.updatePopupAuthUI();
    }
    
    // 触发事件
    var event = new CustomEvent('deviceAuthStateChanged', {
        detail: { authenticated: isValid }
    });
    document.dispatchEvent(event);
    
    return isValid;
};

// 初始化UI
DeviceAuthenticator.prototype.initUI = function() {
    try {
        // 如果UI已初始化或没有相关DOM元素则退出
        if (this.uiInitialized) return;
        
        // 检测当前页面类型
        var isPopup = document.getElementById('authenticator-popup');
        var isSettings = document.getElementById('authenticator-settings');
        
        if (isPopup) {
            this.initPopupUI();
        } else if (isSettings) {
            // 设置页面的UI由initSettings方法处理
            console.log('发现设置页面，将由initSettings方法处理UI');
        } else {
            // 非UI页面，跳过初始化
            return;
        }
        
        this.uiInitialized = true;
        console.log('设备认证UI初始化完成');
    } catch (error) {
        console.error('初始化设备认证UI失败:', error);
    }
};

// 初始化设置页面
DeviceAuthenticator.prototype.initSettings = function() {
    var self = this;
    
    // 检查是否在设置页面
    var deviceAuthSettingsContainer = document.getElementById('device-auth-settings');
    if (!deviceAuthSettingsContainer) return;
    
    // 渲染设备验证器设置UI
    this.renderDeviceAuthSettings(deviceAuthSettingsContainer);
    
    // 获取设置页面中的设备验证器相关元素
    this.elements = {
        enableDeviceAuth: document.getElementById('enableDeviceAuth'),
        deviceAuthTimeout: document.getElementById('deviceAuthTimeout'),
        testDeviceAuth: document.getElementById('testDeviceAuth'),
        resetCredentials: document.getElementById('resetCredentials'),
        deviceAuthStatus: document.getElementById('deviceAuthStatus'),
        saveDeviceAuth: document.getElementById('saveDeviceAuth')
    };
    
    // 设置初始值
    if (this.elements.enableDeviceAuth) {
        this.elements.enableDeviceAuth.checked = this.isEnabled;
    }
    
    // 获取超时设置
    var timeoutMinutes = localStorage.getItem('device_auth_timeout') || '15';
    if (this.elements.deviceAuthTimeout) {
        this.elements.deviceAuthTimeout.value = timeoutMinutes;
    }
    
    // 更新状态显示
    this.updateStatusDisplay();
    
    // 显示设置详情区域
    var deviceAuthDetails = document.getElementById('deviceAuthDetails');
    if (deviceAuthDetails) {
        deviceAuthDetails.style.display = 'block';
    }
    
    // 添加事件监听器
    this.attachSettingsEventListeners();
    
    this.isSettingsInitialized = true;
    console.log('设备验证器设置初始化完成');
};

// 渲染设备验证器设置区域
DeviceAuthenticator.prototype.renderDeviceAuthSettings = function(container) {
    container.innerHTML = `
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
};

// 初始化弹出页UI
DeviceAuthenticator.prototype.initPopupUI = function() {
    var self = this;
    
    try {
        // 获取弹出页中的设备验证器相关元素
        this.elements = {
            deviceAuthSection: document.getElementById('deviceAuthSection'),
            deviceAuthButton: document.getElementById('deviceAuthButton'),
            deviceAuthStatus: document.getElementById('deviceAuthStatus'),
            authContainer: document.getElementById('authContainer')
        };
        
        // 检查认证状态
        var isValid = this.isAuthenticationValid();
        console.log('初始化弹出页时的认证状态:', isValid ? '有效' : '无效');
        
        // 更新UI状态
        this.updatePopupAuthUI();
        
        // 如果认证有效，触发认证成功事件
        if (isValid) {
            var authEvent = new CustomEvent('deviceAuthSuccess', {
                detail: { authenticated: true }
            });
            document.dispatchEvent(authEvent);
            console.log('触发设备认证成功事件');
        }
        
        // 添加事件监听器
        this.attachPopupEventListeners();
        
        // 设置定期检查
        setInterval(function() {
            try {
                var isValid = self.isAuthenticationValid();
                self.updatePopupAuthUI();
                console.log('定期检查 - 认证状态:', isValid ? '有效' : '无效');
            } catch (error) {
                console.error('定期检查认证状态出错:', error);
            }
        }, 15000);
    } catch (error) {
        console.error('初始化弹出页UI失败:', error);
    }
};

// 为设置页面添加事件监听器
DeviceAuthenticator.prototype.attachSettingsEventListeners = function() {
    var self = this;
    var elements = this.elements;
    
    if (elements.enableDeviceAuth) {
        elements.enableDeviceAuth.addEventListener('change', function(e) {
            self.toggleDeviceAuth(e.target.checked);
        });
    }
    
    if (elements.testDeviceAuth) {
        elements.testDeviceAuth.addEventListener('click', function() {
            self.testDeviceAuth();
        });
    }
    
    if (elements.resetCredentials) {
        elements.resetCredentials.addEventListener('click', function() {
            self.resetDeviceCredentials();
        });
    }
    
    if (elements.saveDeviceAuth) {
        elements.saveDeviceAuth.addEventListener('click', function() {
            self.saveDeviceAuthSettings();
        });
    }
};

// 为弹出页添加事件监听器
DeviceAuthenticator.prototype.attachPopupEventListeners = function() {
    var self = this;
    
    if (this.elements.deviceAuthButton) {
        this.elements.deviceAuthButton.addEventListener('click', function() {
            self.handleAuthButtonClick();
        });
    }
};

// 处理弹出页认证按钮点击
DeviceAuthenticator.prototype.handleAuthButtonClick = function() {
    var self = this;
    
    this.authenticate().then(function(result) {
        if (result.success) {
            self.showMessage('验证成功', 'success');
            self.updatePopupAuthUI();
            
            // 触发认证成功事件，让其他组件响应
            var authEvent = new CustomEvent('deviceAuthSuccess', {
                detail: { authenticated: true }
            });
            document.dispatchEvent(authEvent);
        } else {
            self.showMessage('验证失败: ' + result.error, 'error');
        }
    }).catch(function(error) {
        console.error('验证过程出错:', error);
        self.showMessage('验证出错: ' + error.message, 'error');
    });
};

// 加载设置
DeviceAuthenticator.prototype.loadSettings = function() {
    var self = this;
    
    return new Promise(function(resolve, reject) {
        try {
            // 首先尝试从本地存储加载基本设置
            var enabled = localStorage.getItem('device_auth_enabled');
            if (enabled !== null) {
                self.isEnabled = (enabled === 'true');
            }
            
            var timeoutStr = localStorage.getItem('device_auth_timeout');
            if (timeoutStr) {
                self.authTimeout = parseInt(timeoutStr || '15');
            }
            
            self.credentialId = localStorage.getItem('webauthn_credential_id');
            self.lastAuthTime = localStorage.getItem('last_webauthn_auth');
            
            // 如果chrome.storage可用，尝试从中获取更新的设置
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(['device_auth_enabled', 'device_auth_timeout', 'last_webauthn_auth'], function(result) {
                    // 检查设备验证器是否启用
                    if (result.device_auth_enabled !== undefined) {
                        self.isEnabled = result.device_auth_enabled === true || result.device_auth_enabled === 'true';
                        localStorage.setItem('device_auth_enabled', self.isEnabled.toString());
                    }
                    
                    // 检查超时设置
                    if (result.device_auth_timeout !== undefined) {
                        self.authTimeout = parseInt(result.device_auth_timeout);
                        localStorage.setItem('device_auth_timeout', self.authTimeout.toString());
                    }
                    
                    // 检查最后认证时间
                    if (result.last_webauthn_auth) {
                        self.lastAuthTime = result.last_webauthn_auth;
                        localStorage.setItem('last_webauthn_auth', self.lastAuthTime);
                    }
                    
                    console.log('设备验证器设置加载完成:', {
                        isEnabled: self.isEnabled,
                        authTimeout: self.authTimeout,
                        hasCredential: !!self.credentialId,
                        lastAuthTime: self.lastAuthTime ? new Date(parseInt(self.lastAuthTime)).toLocaleString() : null
                    });
                    
                    resolve();
                });
            } else {
                console.log('设备验证器设置加载完成 (无chrome.storage):', {
                    isEnabled: self.isEnabled,
                    authTimeout: self.authTimeout,
                    hasCredential: !!self.credentialId,
                    lastAuthTime: self.lastAuthTime ? new Date(parseInt(self.lastAuthTime)).toLocaleString() : null
                });
                
                resolve();
            }
        } catch (error) {
            console.error('加载设备验证器设置失败:', error);
            reject(error);
        }
    });
};

// 保存设置
DeviceAuthenticator.prototype.saveSettings = function() {
    try {
        localStorage.setItem('device_auth_enabled', this.isEnabled.toString());
        if (this.authTimeout) {
            localStorage.setItem('device_auth_timeout', this.authTimeout.toString());
        }
        
        // 如果chrome.storage可用，同时保存到chrome.storage
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({
                'device_auth_enabled': this.isEnabled,
                'device_auth_timeout': this.authTimeout
            });
        }
    } catch (error) {
        console.error('保存设备验证器设置失败:', error);
    }
};

// 保存设备验证器设置
DeviceAuthenticator.prototype.saveDeviceAuthSettings = function() {
    try {
        // 获取DOM元素中的值
        var enabledValue = this.elements.enableDeviceAuth ? this.elements.enableDeviceAuth.checked : false;
        var timeoutValue = parseInt(this.elements.deviceAuthTimeout ? this.elements.deviceAuthTimeout.value : '15');
        
        // 保存到本地存储
        localStorage.setItem('device_auth_enabled', enabledValue.toString());
        localStorage.setItem('device_auth_timeout', timeoutValue.toString());
        
        // 更新内部状态
        this.isEnabled = enabledValue;
        this.authTimeout = timeoutValue;
        
        // 保存到chrome.storage
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({
                'device_auth_enabled': enabledValue,
                'device_auth_timeout': timeoutValue
            });
        }
        
        // 触发事件通知其他组件
        var event = new CustomEvent('deviceAuthConfigChanged', {
            detail: { enabled: enabledValue, timeout: timeoutValue }
        });
        document.dispatchEvent(event);
        
        this.showMessage('设备验证器设置已保存', 'success');
        this.updateStatusDisplay();
    } catch (error) {
        console.error('保存设备验证器设置失败:', error);
        this.showMessage('保存设置失败: ' + error.message, 'error');
    }
};

// 测试设备验证功能
DeviceAuthenticator.prototype.testDeviceAuth = function() {
    var self = this;
    
    this.authenticate().then(function(result) {
        if (result.success) {
            self.showMessage('设备验证成功！', 'success');
            self.updateStatusDisplay();
        } else {
            self.showMessage('设备验证失败: ' + result.error, 'error');
        }
    }).catch(function(error) {
        console.error('测试设备验证时出错:', error);
        self.showMessage('测试失败: ' + error.message, 'error');
    });
};

// 重置设备凭据
DeviceAuthenticator.prototype.resetDeviceCredentials = function() {
    // 显示确认对话框
    if (!confirm('确定要重置设备验证凭据吗？这将需要您重新注册设备。')) {
        return;
    }
    
    this.credentialId = null;
    this.lastAuthTime = null;
    localStorage.removeItem('webauthn_credential_id');
    localStorage.removeItem('webauthn_registration_time');
    localStorage.removeItem('last_webauthn_auth');
    
    // 如果chrome.storage可用，也清除其中的认证时间
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove(['last_webauthn_auth']);
    }
    
    console.log('WebAuthn凭据已重置 - 下次使用时需重新注册');
    this.showMessage('设备验证器凭据已重置，下次使用时需重新注册', 'info');
    this.updateStatusDisplay();
};

// 清除所有认证状态
DeviceAuthenticator.prototype.clearAllAuthenticationStates = function() {
    // 清除本地认证状态
    this.lastAuthTime = null;
    localStorage.removeItem('last_webauthn_auth');
    
    // 清除chrome.storage中的认证状态
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove(['last_webauthn_auth']);
    }
    
    // 触发事件通知其他组件清除认证状态
    var event = new CustomEvent('clearAllAuthenticationStates', {
        detail: { timestamp: Date.now() }
    });
    document.dispatchEvent(event);
    
    console.log('所有认证状态已清除');
};

// 切换设备验证器状态
DeviceAuthenticator.prototype.toggleDeviceAuth = function(enabled) {
    var self = this;
    
    // 如果是关闭操作，必须先验证
    if (!enabled && this.isEnabled) {
        this.requireAuthenticationToDisable().then(function(authResult) {
            if (authResult.success) {
                self.performToggle(enabled);
            } else {
                // 验证失败，恢复开关状态
                if (self.elements.enableDeviceAuth) {
                    self.elements.enableDeviceAuth.checked = true;
                }
                self.showMessage('关闭验证器需要先通过验证: ' + authResult.error, 'error');
            }
        });
    } else {
        // 开启操作直接执行
        this.performToggle(enabled);
    }
};

// 执行切换操作
DeviceAuthenticator.prototype.performToggle = function(enabled) {
    this.isEnabled = enabled;
    this.saveSettings();
    this.updateStatusDisplay();
    
    console.log('设备验证器状态已切换为:', enabled ? '启用' : '禁用');
    
    // 触发全局状态变更事件
    this.notifyGlobalSecurityStateChange(enabled);
};

// 要求验证后才能禁用
DeviceAuthenticator.prototype.requireAuthenticationToDisable = function() {
    var self = this;
    
    return new Promise(function(resolve) {
        // 显示确认对话框
        if (!confirm('关闭设备验证器需要进行身份验证，确定要继续吗？')) {
            resolve({ success: false, error: '用户取消操作' });
            return;
        }
        
        // 执行验证
        self.authenticate().then(function(result) {
            if (result.success) {
                // 验证成功，再次确认关闭
                if (confirm('验证通过！确定要关闭设备验证器吗？关闭后将无法保护您的验证码安全。')) {
                    resolve({ success: true });
                } else {
                    resolve({ success: false, error: '用户取消关闭操作' });
                }
            } else {
                resolve({ success: false, error: result.error || '验证失败' });
            }
        }).catch(function(error) {
            resolve({ success: false, error: '验证过程出错: ' + error.message });
        });
    });
};

// 通知全局安全状态变更
DeviceAuthenticator.prototype.notifyGlobalSecurityStateChange = function(enabled) {
    // 触发自定义事件，通知其他组件
    var event = new CustomEvent('globalSecurityStateChanged', {
        detail: { 
            enabled: enabled,
            timestamp: Date.now()
        }
    });
    document.dispatchEvent(event);
    
    // 如果关闭了验证器，清除所有认证状态
    if (!enabled) {
        this.clearAllAuthenticationStates();
    }
};

// 检查是否应该限制UI访问
DeviceAuthenticator.prototype.shouldRestrictAccess = function() {
    // 如果验证器已启用但未通过验证，则限制访问
    return this.isEnabled && !this.isAuthenticationValid();
};

// 渲染受限制的UI（只显示关闭开关）
DeviceAuthenticator.prototype.renderRestrictedUI = function(container) {
    if (!this.shouldRestrictAccess()) {
        return false; // 不需要限制
    }
    
    var self = this;
    container.innerHTML = `
        <div class="restricted-access-notice">
            <div class="security-icon">🔒</div>
            <h3>安全验证已启用</h3>
            <p>请先通过设备验证或关闭安全验证器后访问其他设置。</p>
            
            <div class="security-options">
                <div class="option-group">
                    <div class="switch-group">
                        <label for="enableDeviceAuth">启用设备验证器</label>
                        <label class="switch">
                            <input type="checkbox" id="enableDeviceAuth" checked>
                            <span class="slider"></span>
                        </label>
                    </div>
                    <small>关闭此选项需要先通过身份验证</small>
                </div>
                
                <div class="security-actions">
                    <button id="performVerification" class="btn btn-primary">
                        <span>🔑</span>
                        <span>设备验证</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // 绑定事件监听器
    var enableSwitch = container.querySelector('#enableDeviceAuth');
    var verifyBtn = container.querySelector('#performVerification');
    
    if (enableSwitch) {
        enableSwitch.addEventListener('change', function(e) {
            self.toggleDeviceAuth(e.target.checked);
        });
    }
    
    if (verifyBtn) {
        verifyBtn.addEventListener('click', function() {
            self.authenticate().then(function(result) {
                if (result.success) {
                    self.showMessage('验证成功！正在重新加载设置...', 'success');
                    
                    // 触发认证成功事件
                    var event = new CustomEvent('authenticationSuccessful', {
                        detail: { timestamp: Date.now() }
                    });
                    document.dispatchEvent(event);
                } else {
                    self.showMessage('验证失败: ' + result.error, 'error');
                }
            }).catch(function(error) {
                self.showMessage('验证过程出错: ' + error.message, 'error');
            });
        });
    }
      return true; // 成功渲染受限UI
};

// 绑定受限UI的事件
DeviceAuthenticator.prototype.bindRestrictedUIEvents = function() {
    var self = this;
    
    // 设备验证器开关事件
    var enableDeviceAuth = document.getElementById('enableDeviceAuth');
    if (enableDeviceAuth) {
        enableDeviceAuth.addEventListener('change', function(e) {
            self.toggleDeviceAuth(e.target.checked);
        });
    }
    
    // 验证按钮事件
    var performAuthBtn = document.getElementById('performAuth');
    if (performAuthBtn) {
        performAuthBtn.addEventListener('click', function() {
            self.performAuthForAccess();
        });
    }
};

// 执行验证以获取访问权限
DeviceAuthenticator.prototype.performAuthForAccess = function() {
    var self = this;
    
    this.authenticate().then(function(result) {
        if (result.success) {
            self.showMessage('验证成功！页面将重新加载', 'success');
            // 触发页面重新加载事件
            var event = new CustomEvent('authenticationSuccessful', {
                detail: { 
                    authenticated: true,
                    timestamp: Date.now()
                }
            });
            document.dispatchEvent(event);
            
            // 延迟重新加载页面
            setTimeout(function() {
                window.location.reload();
            }, 1000);
        } else {
            self.showMessage('验证失败: ' + result.error, 'error');
        }
    }).catch(function(error) {
        self.showMessage('验证过程出错: ' + error.message, 'error');
    });
};

// 更新设置页面状态显示
DeviceAuthenticator.prototype.updateStatusDisplay = function() {
    var self = this;
    
    if (!this.elements.deviceAuthStatus) return;
    
    // 获取设备支持和注册状态
    this.getAuthenticatorInfo().then(function(info) {
        var statusHTML = '';
        
        if (!info.supported) {
            statusHTML = '<span class="status-error">❌ 设备不支持生物识别验证</span>';
        } else if (!info.platformSupport) {
            statusHTML = '<span class="status-warning">⚠️ 设备不支持平台认证器</span>';
        } else if (!info.hasCredential) {
            statusHTML = '<span class="status-info">ℹ️ 未注册设备凭据，首次验证时将自动注册</span>';
        } else if (info.enabled && info.lastAuthTime) {
            var lastAuthDate = new Date(parseInt(info.lastAuthTime));
            statusHTML = '<span class="status-success">✅ 已设置 - 最后验证时间: ' + lastAuthDate.toLocaleString() + '</span>';
        } else if (info.enabled) {
            statusHTML = '<span class="status-warning">⚠️ 已启用但未进行首次验证</span>';
        } else {
            statusHTML = '<span class="status-info">ℹ️ 已禁用</span>';
        }
        
        self.elements.deviceAuthStatus.innerHTML = statusHTML;
    });
};

// 更新弹出页认证UI
DeviceAuthenticator.prototype.updatePopupAuthUI = function() {
    if (!this.elements.deviceAuthSection || !this.elements.deviceAuthButton) return;
    
    // 检查验证状态并更新UI
    var isValid = this.isAuthenticationValid();
    var hasCredential = !!this.credentialId;
    
    console.log('更新弹出页认证UI, 状态:', {
        isEnabled: this.isEnabled,
        isValid: isValid,
        hasCredential: hasCredential
    });
    
    if (!this.isEnabled) {
        this.elements.deviceAuthSection.style.display = 'none';
        return;
    }
    
    this.elements.deviceAuthSection.style.display = 'block';
    
    // 根据验证状态设置按钮样式和文本
    if (isValid) {
        this.elements.deviceAuthButton.textContent = '已验证';
        this.elements.deviceAuthButton.classList.remove('auth-button-needed');
        this.elements.deviceAuthButton.classList.add('auth-button-success');
        
        // 显示剩余时间
        this.updateRemainingTime();
    } else {
        this.elements.deviceAuthButton.textContent = hasCredential ? '需要验证' : '首次验证';
        this.elements.deviceAuthButton.classList.add('auth-button-needed');
        this.elements.deviceAuthButton.classList.remove('auth-button-success');
    }
    
    // 通知其他组件认证状态
    var event = new CustomEvent('deviceAuthStateChanged', {
        detail: { authenticated: isValid }
    });
    document.dispatchEvent(event);
};

// 更新剩余有效时间
DeviceAuthenticator.prototype.updateRemainingTime = function() {
    var self = this;
    
    if (!this.elements.deviceAuthStatus || !this.lastAuthTime) return;
    
    try {
        var lastAuth = parseInt(this.lastAuthTime);
        var now = Date.now();
        var timeoutMinutes = this.authTimeout || parseInt(localStorage.getItem('device_auth_timeout') || '15');
        var maxAgeMs = timeoutMinutes * 60 * 1000;
        var remainingMs = Math.max(0, lastAuth + maxAgeMs - now);
        var remainingMinutes = Math.floor(remainingMs / 60000);
        var remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
        
        this.elements.deviceAuthStatus.innerHTML = 
            '<span class="status-info">剩余有效期: ' + remainingMinutes + '分' + remainingSeconds + '秒</span>';
        
        // 如果还在有效期内，设置定时器更新显示
        if (remainingMs > 0) {
            setTimeout(function() { self.updateRemainingTime(); }, 1000);
        } else {
            this.updatePopupAuthUI();
        }
    } catch (error) {
        console.error('更新剩余时间失败:', error);
    }
};

// 显示消息
DeviceAuthenticator.prototype.showMessage = function(message, type) {
    if (!type) type = 'info';
    
    try {
        // 尝试使用全局消息显示函数
        if (typeof showToast === 'function') {
            showToast(message, type);
            return;
        }
        
        // 备选方案：创建一个简单的通知元素
        var toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // 显示并淡出
        setTimeout(function() {
            toast.classList.add('show');
            
            setTimeout(function() {
                toast.classList.remove('show');
                setTimeout(function() {
                    document.body.removeChild(toast);
                }, 300);
            }, 3000);
        }, 10);
    } catch (error) {
        console.error('显示消息失败:', error);
        console.log(type.toUpperCase() + ': ' + message);
    }
};

// 检查设备支持情况
DeviceAuthenticator.prototype.checkSupport = function() {
    return new Promise(function(resolve) {
        try {
            if (!window.PublicKeyCredential) {
                console.warn('浏览器不支持WebAuthn');
                resolve(false);
                return;
            }

            PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
                .then(function(available) {
                    if (!available) {
                        console.warn('设备不支持平台认证器');
                        resolve(false);
                        return;
                    }

                    console.log('设备支持WebAuthn平台认证器');
                    resolve(true);
                })
                .catch(function(error) {
                    console.error('检查WebAuthn支持时出错:', error);
                    resolve(false);
                });
        } catch (error) {
            console.error('检查WebAuthn支持时出错:', error);
            resolve(false);
        }
    });
};

// 检查认证是否仍然有效（可设置有效期）
DeviceAuthenticator.prototype.isAuthenticationValid = function() {
    if (!this.isEnabled) {
        console.log('认证无效: 设备验证器未启用');
        return false;
    }
    
    if (!this.lastAuthTime) {
        console.log('认证无效: lastAuthTime 为空');
        return false;
    }
    
    try {
        var lastAuth = parseInt(this.lastAuthTime);
        if (isNaN(lastAuth)) {
            console.log('认证无效: lastAuthTime 不是有效数字');
            return false;
        }
        
        var now = Date.now();
        
        // 使用内部超时设置或从localStorage读取
        var timeoutMinutes = this.authTimeout;
        if (!timeoutMinutes) {
            var timeoutMinutesStr = localStorage.getItem('device_auth_timeout');
            timeoutMinutes = parseInt(timeoutMinutesStr || '15');
            this.authTimeout = timeoutMinutes; // 更新实例变量
        }
        
        console.log('验证有效期检查 - 设置时间: ' + timeoutMinutes + '分钟, ' + 
                   '最后验证时间: ' + new Date(lastAuth).toLocaleString());
        
        var maxAgeMs = timeoutMinutes * 60 * 1000;
        var isValid = (now - lastAuth) < maxAgeMs;
        
        var remainingMinutes = Math.max(0, (lastAuth + maxAgeMs - now) / 60000);
        console.log('验证' + (isValid ? '仍然有效' : '已过期') + ', 剩余时间: ' + 
                   remainingMinutes.toFixed(1) + '分钟');
        
        return isValid;
    } catch (error) {
        console.error('验证有效期检查失败:', error);
        return false;
    }
};

// 执行设备验证
DeviceAuthenticator.prototype.authenticate = function() {
    var self = this;
    
    if (!this.isEnabled) {
        return Promise.resolve({ success: false, error: '设备验证器未启用' });
    }
    
    return this.checkSupport().then(function(supported) {
        if (!supported) {
            return { success: false, error: '设备不支持生物识别验证' };
        }
        
        return new Promise(function(resolve) {
            try {
                // 生成挑战
                var challenge = new Uint8Array(32);
                crypto.getRandomValues(challenge);
                
                // 尝试从存储中获取已注册的凭据ID
                var credentialId = self.credentialId;
                
                // 处理凭据
                var processCredentials = function(credId) {
                    // 执行认证
                    var credentialRequestOptions = {
                        challenge: challenge,
                        allowCredentials: [{
                            id: self.base64ToArrayBuffer(credId),
                            type: 'public-key',
                            transports: ['internal']
                        }],
                        userVerification: 'required',  // 要求用户验证（生物识别或PIN）
                        timeout: 60000
                    };
                    
                    navigator.credentials.get({
                        publicKey: credentialRequestOptions
                    }).then(function(assertion) {
                        if (assertion) {
                            // 验证成功，记录认证时间
                            var now = Date.now();
                            self.lastAuthTime = now.toString();
                            
                            // 保存到localStorage
                            localStorage.setItem('last_webauthn_auth', self.lastAuthTime);
                            
                            // 保存到chrome.storage (如果可用)
                            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                                chrome.storage.local.set({ 'last_webauthn_auth': self.lastAuthTime });
                            }
                            
                            console.log('验证成功! 认证时间:', new Date(now).toLocaleString());
                            
                            // 更新UI
                            if (self.uiInitialized) {
                                self.updatePopupAuthUI();
                            }
                            
                            resolve({ success: true });
                        } else {
                            resolve({ success: false, error: '设备密钥验证失败' });
                        }
                    }).catch(function(error) {
                        console.error('设备密钥认证错误:', error);
                        
                        var errorMessage = '认证失败';
                        if (error.name === 'NotAllowedError') {
                            errorMessage = '用户取消了认证或认证超时，请重试';
                        } else if (error.name === 'InvalidStateError') {
                            errorMessage = '设备密钥状态无效，正在重置...';
                        } else if (error.name === 'NotSupportedError') {
                            errorMessage = '设备不支持此认证方式';
                        } else if (error.name === 'SecurityError') {
                            errorMessage = '安全错误：请确保网站使用HTTPS协议';
                        } else if (error.name === 'UnknownError') {
                            errorMessage = '认证器遇到未知错误，请重试';
                        } else {
                            errorMessage = '认证失败: ' + error.message;
                        }
                        
                        resolve({ success: false, error: errorMessage });
                    });
                };
                
                // 如果没有凭据，需要先注册
                if (!credentialId) {
                    self.registerCredential(challenge).then(function(registrationResult) {
                        if (registrationResult.success) {
                            self.credentialId = registrationResult.credentialId;
                            processCredentials(registrationResult.credentialId);
                        } else {
                            resolve(registrationResult);
                        }
                    });
                } else {
                    processCredentials(credentialId);
                }
            } catch (error) {
                console.error('设备验证流程出错:', error);
                resolve({ success: false, error: '验证流程出错: ' + error.message });
            }
        });
    });
};

// 注册WebAuthn凭据
DeviceAuthenticator.prototype.registerCredential = function(challenge) {
    var self = this;
    
    return new Promise(function(resolve) {
        try {
            var userId = new TextEncoder().encode('2fa-manager-user');
            
            var credentialCreationOptions = {
                challenge: challenge,
                rp: {
                    name: '2FA验证码管家',
                    id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname
                },
                user: {
                    id: userId,
                    name: '2FA验证码管家用户',
                    displayName: '2FA验证码管家用户'
                },
                pubKeyCredParams: [
                    { alg: -7, type: 'public-key' },   // ES256 (推荐)
                    { alg: -257, type: 'public-key' }, // RS256 (备选)
                    { alg: -37, type: 'public-key' }   // PS256 (备选)
                ],
                authenticatorSelection: {
                    authenticatorAttachment: 'platform',  // 仅平台认证器（Windows Hello等）
                    userVerification: 'required',         // 要求用户验证
                    requireResidentKey: false,            // 不要求常驻密钥
                    residentKey: 'discouraged'            // 不鼓励常驻密钥
                },
                timeout: 60000,
                attestation: 'none'  // 不需要证明
            };
            
            navigator.credentials.create({
                publicKey: credentialCreationOptions
            }).then(function(credential) {
                if (credential) {
                    var credentialId = self.arrayBufferToBase64(credential.rawId);
                    self.credentialId = credentialId;
                    localStorage.setItem('webauthn_credential_id', credentialId);
                    localStorage.setItem('webauthn_registration_time', Date.now().toString());
                    
                    console.log('WebAuthn凭据注册成功');
                    resolve({ success: true, credentialId: credentialId });
                } else {
                    resolve({ success: false, error: '无法创建设备密钥，请检查设备设置' });
                }
            }).catch(function(error) {
                console.error('注册WebAuthn凭据失败:', error);
                
                var errorMessage = '注册失败';
                if (error.name === 'NotAllowedError') {
                    errorMessage = '用户拒绝了设备密钥注册，请重试';
                } else if (error.name === 'NotSupportedError') {
                    errorMessage = '设备不支持密钥注册功能';
                } else if (error.name === 'SecurityError') {
                    errorMessage = '安全错误：请确保网站使用HTTPS协议';
                } else {
                    errorMessage = '注册失败: ' + error.message;
                }
                
                resolve({ success: false, error: errorMessage });
            });
        } catch (error) {
            console.error('注册WebAuthn凭据出错:', error);
            resolve({ success: false, error: '注册出错: ' + error.message });
        }
    });
};

// 获取认证器信息
DeviceAuthenticator.prototype.getAuthenticatorInfo = function() {
    var self = this;
    
    return new Promise(function(resolve) {
        try {
            if (!window.PublicKeyCredential) {
                resolve({ supported: false, reason: '浏览器不支持WebAuthn' });
                return;
            }

            PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
                .then(function(platformSupport) {
                    // 检查条件式中介支持
                    var checkConditionalSupport = function(callback) {
                        if (PublicKeyCredential.isConditionalMediationAvailable) {
                            PublicKeyCredential.isConditionalMediationAvailable().then(function(supported) {
                                callback(supported);
                            }).catch(function() {
                                callback(false);
                            });
                        } else {
                            callback(false);
                        }
                    };
                    
                    checkConditionalSupport(function(conditionalSupport) {
                        resolve({
                            supported: true,
                            platformSupport: platformSupport,
                            conditionalSupport: conditionalSupport,
                            hasCredential: !!self.credentialId,
                            enabled: self.isEnabled,
                            lastAuthTime: self.lastAuthTime
                        });
                    });
                })
                .catch(function(error) {
                    console.error('获取认证器信息失败:', error);
                    resolve({ supported: false, reason: error.message });
                });
        } catch (error) {
            console.error('获取认证器信息失败:', error);
            resolve({ supported: false, reason: error.message });
        }
    });
};

// 工具方法：ArrayBuffer转Base64
DeviceAuthenticator.prototype.arrayBufferToBase64 = function(buffer) {
    var bytes = new Uint8Array(buffer);
    var binary = '';
    for (var i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

// 工具方法：Base64转ArrayBuffer
DeviceAuthenticator.prototype.base64ToArrayBuffer = function(base64) {
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
};

// 获取状态摘要
DeviceAuthenticator.prototype.getStatus = function() {
    return {
        enabled: this.isEnabled,
        hasCredential: !!this.credentialId,
        isValid: this.isAuthenticationValid(),
        lastAuthTime: this.lastAuthTime
    };
};

// 创建全局实例
var deviceAuthenticator = new DeviceAuthenticator();

// 全局变量导出 - 支持多种环境
if (typeof globalThis !== 'undefined') {
    globalThis.DeviceAuthenticator = DeviceAuthenticator;
    globalThis.deviceAuthenticator = deviceAuthenticator;
} else if (typeof window !== 'undefined') {
    window.DeviceAuthenticator = DeviceAuthenticator;
    window.deviceAuthenticator = deviceAuthenticator;
} else if (typeof self !== 'undefined') {
    self.DeviceAuthenticator = DeviceAuthenticator;
    self.deviceAuthenticator = deviceAuthenticator;
}

// 添加到全局作用域
if (typeof GlobalScope !== 'undefined') {
    GlobalScope.DeviceAuthenticator = DeviceAuthenticator;
    GlobalScope.deviceAuthenticator = deviceAuthenticator;
}
