// TOTP适配器 - 使用OTPAuth库的包装器
class TOTPAdapter {
    constructor() {
        this.timeStep = 30; // 30秒时间步长
        this.digits = 6;    // 6位验证码
        
        // 确保OTPAuth库已加载
        if (typeof OTPAuth === 'undefined') {
            console.error('OTPAuth库未加载');
            throw new Error('OTPAuth库未加载');
        }
    }

    // 生成TOTP验证码
    async generateTOTP(secret, timeOffset = 0) {
        try {
            // 验证密钥
            if (!secret) {
                throw new Error('密钥为空');
            }
            
            // 清理Base32密钥
            const cleanSecret = secret.replace(/\s/g, '').toUpperCase();
            
            // 创建TOTP实例
            const totp = new OTPAuth.TOTP({
                secret: cleanSecret,
                digits: this.digits,
                period: this.timeStep,
                algorithm: 'SHA1'
            });
            
            // 如果有时间偏移，需要手动计算时间戳
            let token;
            if (timeOffset !== 0) {
                const timestamp = Math.floor((Date.now() + timeOffset * 1000) / 1000);
                token = totp.generate({ timestamp });
            } else {
                token = totp.generate();
            }

            return token;
        } catch (error) {
            console.error('生成TOTP失败:', error);
            return null;
        }
    }

    // 获取当前验证码和剩余时间
    async getCurrentCode(secret) {
        const code = await this.generateTOTP(secret);
        const totp = new OTPAuth.TOTP({
            secret: secret.replace(/\s/g, '').toUpperCase(),
            digits: this.digits,
            period: this.timeStep,
            algorithm: 'SHA1'
        });
        
        const timeRemaining = Math.floor(totp.remaining() / 1000);
        
        return {
            code: code,
            timeRemaining: timeRemaining,
            nextCode: await this.generateTOTP(secret, this.timeStep)
        };
    }

    // 验证TOTP代码（允许时间偏差）
    async verifyTOTP(secret, inputCode, window = 1) {
        try {
            const cleanSecret = secret.replace(/\s/g, '').toUpperCase();
            const totp = new OTPAuth.TOTP({
                secret: cleanSecret,
                digits: this.digits,
                period: this.timeStep,
                algorithm: 'SHA1'
            });
            
            const delta = totp.validate({ token: inputCode, window });
            return delta !== null;
        } catch (error) {
            console.error('验证TOTP失败:', error);
            return false;
        }
    }

    // 解析TOTP URI
    parseOTPAuth(uri) {
        try {
            const totp = OTPAuth.URI.parse(uri);
            
            return {
                secret: totp.secret.base32,
                issuer: totp.issuer || '',
                account: totp.label || '',
                digits: totp.digits,
                period: totp.period,
                algorithm: totp.algorithm,
                label: totp.issuer ? `${totp.issuer} (${totp.label})` : totp.label
            };
        } catch (error) {
            console.error('解析OTP URI失败:', error);
            return null;
        }
    }

    // 生成TOTP URI
    generateOTPAuth(secret, account, issuer = '', digits = 6, period = 30) {
        try {
            const totp = new OTPAuth.TOTP({
                issuer: issuer,
                label: account,
                secret: secret,
                algorithm: 'SHA1',
                digits: digits,
                period: period
            });
            
            return totp.toString();
        } catch (error) {
            console.error('生成OTP URI失败:', error);
            return null;
        }
    }

    // 验证Base32密钥格式
    validateSecret(secret) {
        try {
            const cleanSecret = secret.replace(/\s/g, '').toUpperCase();
            
            // 尝试创建Secret对象来验证
            OTPAuth.Secret.fromBase32(cleanSecret);
            
            if (cleanSecret.length < 16) {
                return { valid: false, message: '密钥长度太短' };
            }

            return { valid: true, secret: cleanSecret };
        } catch (error) {
            return { valid: false, message: '密钥格式无效，应为Base32格式' };
        }
    }

    // 生成随机Base32密钥
    generateRandomSecret(length = 32) {
        try {
            const secret = new OTPAuth.Secret({ size: Math.ceil(length * 5 / 8) });
            return secret.base32;
        } catch (error) {
            console.error('生成随机密钥失败:', error);
            // 回退到原有实现
            const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
            let secretStr = '';
            const randomArray = crypto.getRandomValues(new Uint8Array(length));
            
            for (let i = 0; i < length; i++) {
                secretStr += base32chars[randomArray[i] % base32chars.length];
            }
            
            return secretStr;
        }
    }

    // 计算验证码进度（用于UI显示）
    getCodeProgress() {
        const now = Math.floor(Date.now() / 1000);
        const timeRemaining = this.timeStep - (now % this.timeStep);
        const progress = ((this.timeStep - timeRemaining) / this.timeStep) * 100;
        
        return {
            timeRemaining: timeRemaining,
            progress: progress,
            isExpiringSoon: timeRemaining <= 5
        };
    }
}

// 保持兼容性 - 使用相同的接口
class TOTPGenerator extends TOTPAdapter {
    constructor() {
        super();
    }
}

// TOTP统一配置管理器 - 支持弹出页面和设置页面
class TOTPConfigManager {
    constructor() {
        this.totpAdapter = new TOTPAdapter();
        this.localStorageManager = window.localStorageManager || (GlobalScope.LocalStorageManager ? new GlobalScope.LocalStorageManager() : null);
        this.configs = [];
        this.updateInterval = null; // 添加更新定时器
        this.isPopupMode = false; // 标识是否为弹出页面模式
    }

    // 初始化弹出页面接口
    async initPopup() {
        try {
            console.log('初始化TOTP弹出页面...');
            this.isPopupMode = true;
            // 停止旧的定时器
            this.stopAutoUpdate();
            await this.loadConfigs();
            console.log('配置加载完成，配置数量:', this.configs.length);
            await this.renderConfigList();
            console.log('TOTP弹出页面初始化完成');
        } catch (error) {
            console.error('初始化TOTP弹出页面失败:', error);
        }
    }

    // 初始化设置页面接口 - 与其他模块保持一致
    async initSettings() {
        try {
            console.log('初始化TOTP配置管理器...');
            this.isPopupMode = false;
            // 停止旧的定时器
            this.stopAutoUpdate();
            await this.loadConfigs();
            console.log('配置加载完成，配置数量:', this.configs.length);
            this.renderSettings();
            this.initEventListeners();
            console.log('TOTP配置管理器初始化完成');
        } catch (error) {
            console.error('初始化TOTP配置设置失败:', error);
        }
    }

    // 渲染设置界面
    renderSettings() {
        const container = document.getElementById('config-management-settings');
        if (!container) return;

        container.innerHTML = this.renderConfigManagementSection();
        this.renderConfigList();

        // 渲染模态框
        const modalsContainer = document.getElementById('modals-container');
        if (modalsContainer) {
            modalsContainer.innerHTML += this.renderAddConfigModal();
        }
    }

    // 渲染配置管理区域
    renderConfigManagementSection() {
        return `
            <section class="settings-section">
                <h2>TOTP配置管理</h2>
                <div class="form-group">
                    <div class="config-actions">
                        <button id="addConfig" class="btn btn-secondary">添加配置</button>
                        <button id="exportConfigs" class="btn btn-secondary">导出配置</button>
                        <button id="importConfigs" class="btn btn-secondary">导入配置</button>
                        <button id="backupToCloud" class="btn btn-primary">备份到云端</button>
                        <button id="restoreFromCloud" class="btn btn-info">从云端恢复</button>
                        <button id="validateConfigs" class="btn btn-warning">验证配置</button>
                    </div>
                </div>
                <div class="form-group">
                    <div class="config-list" id="configList">
                        <!-- 配置列表将在这里动态生成 -->
                    </div>
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
            <div id="editConfigModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>编辑配置</h3>
                        <span class="close" id="editModalClose">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="editConfigName">配置名称</label>
                            <input type="text" id="editConfigName" placeholder="例如：GitHub">
                        </div>
                        <div class="form-group">
                            <label for="editConfigIssuer">发行方</label>
                            <input type="text" id="editConfigIssuer" placeholder="例如：GitHub">
                        </div>
                        <div class="form-group">
                            <label for="editConfigAccount">账户</label>
                            <input type="text" id="editConfigAccount" placeholder="例如：username@example.com">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button id="saveEditConfig" class="btn btn-primary">保存</button>
                        <button id="cancelEditConfig" class="btn btn-secondary">取消</button>
                    </div>
                </div>
            </div>
        `;
    }

    // 渲染配置列表 - 支持弹出页面和设置页面两种模式
    async renderConfigList() {
        if (this.isPopupMode) {
            await this.renderPopupConfigList();
        } else {
            await this.renderSettingsConfigList();
        }
        
        // 启动自动更新
        this.startAutoUpdate();
    }

    // 渲染弹出页面配置列表
    async renderPopupConfigList() {
        const configList = document.getElementById('localCodes');
        if (!configList) return;
        
        console.log('渲染弹出页面配置列表，配置数量:', this.configs.length);

        if (this.configs.length === 0) {
            configList.innerHTML = `                
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <p>暂无实时验证码</p>
                    <p class="empty-tip">在设置中添加实时加载的验证码</p>
                </div>
            `;
            return;
        }

        // 使用弹出页面的HTML结构（不包含编辑删除按钮）
        let html = '';
        for (const config of this.configs) {
            try {
                const currentCode = await this.totpAdapter.getCurrentCode(config.secret);
                html += `
                    <div class="code-item">
                        <div class="code-header">
                            <div class="code-name">${config.name || config.label || '未命名'}</div>
                            <div class="code-timer">
                                <div class="timer-circle">
                                    <div class="timer-progress" style="--progress: ${((30 - currentCode.timeRemaining) / 30) * 100}%"></div>
                                </div>
                                <span>${currentCode.timeRemaining}</span>
                            </div>
                        </div>
                        <div class="code-value" data-id="${config.id}" data-secret="${config.secret}">${currentCode.code}</div>
                    </div>
                `;
            } catch (error) {
                console.error(`渲染配置项 ${config.name} 失败:`, error);
                html += `
                    <div class="code-item">
                        <div class="code-header">
                            <div class="code-name">${config.name || config.label || '未命名'}</div>
                            <div class="code-timer">
                                <div class="timer-circle">
                                    <div class="timer-progress"></div>
                                </div>
                                <span>30</span>
                            </div>
                        </div>
                        <div class="code-value">------</div>
                    </div>
                `;
            }
        }

        configList.innerHTML = html;
        this.bindPopupItemEvents();
    }

    // 渲染设置页面配置列表
    async renderSettingsConfigList() {
        const configList = document.getElementById('configList');
        if (!configList) return;

        console.log('渲染设置页面配置列表，配置数量:', this.configs.length);

        if (this.configs.length === 0) {
            configList.innerHTML = '<p class="no-configs">暂无配置，请添加TOTP配置</p>';
            return;
        }

        let html = '<div class="config-items">';
        for (const config of this.configs) {
            try {
                const currentCode = await this.totpAdapter.getCurrentCode(config.secret);
                html += `
                    <div class="config-item" data-id="${config.id}">
                        <div class="config-info">
                            <div class="config-name">${config.name || config.label || '未命名'}</div>
                            <div class="config-details">
                                ${config.issuer ? `<span class="issuer">${config.issuer}</span>` : ''}
                                ${config.account ? `<span class="account">${config.account}</span>` : ''}
                            </div>
                        </div>
                        <div class="config-code">
                            <div class="code-header">
                                <div class="code-timer">
                                    <div class="timer-circle">
                                        <div class="timer-progress" style="--progress: ${((30 - currentCode.timeRemaining) / 30) * 100}%"></div>
                                    </div>
                                    <span class="timer-text">${currentCode.timeRemaining}</span>
                                </div>
                            </div>
                            <span class="code" data-id="${config.id}" data-secret="${config.secret}">${currentCode.code}</span>
                        </div>
                        <div class="config-actions">
                            <button class="btn btn-small edit-config" data-id="${config.id}">编辑</button>
                            <button class="btn btn-small btn-danger delete-config" data-id="${config.id}">删除</button>
                        </div>
                    </div>
                `;
            } catch (error) {
                console.error(`渲染配置项 ${config.name} 失败:`, error);
                html += `
                    <div class="config-item error" data-id="${config.id}">
                        <div class="config-info">
                            <div class="config-name">${config.name || config.label || '未命名'}</div>
                            <div class="config-error">配置错误: ${error.message}</div>
                        </div>
                        <div class="config-actions">
                            <button class="btn btn-small edit-config" data-id="${config.id}">编辑</button>
                            <button class="btn btn-small btn-danger delete-config" data-id="${config.id}">删除</button>
                        </div>
                    </div>
                `;
            }
        }
        html += '</div>';

        configList.innerHTML = html;
        this.bindConfigItemEvents();
    }

    // 绑定弹出页面配置项事件
    bindPopupItemEvents() {
        // 添加复制功能 - 使用弹出页面样式的验证码
        const codeElements = document.querySelectorAll('.code-value');
        codeElements.forEach(element => {
            element.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(element.textContent);
                    this.showMessage('验证码已复制', 'success');
                } catch (error) {
                    console.error('复制失败:', error);
                    this.showMessage('复制失败', 'error');
                }
            });
        });
    }

    // 绑定设置页面配置项事件
    bindConfigItemEvents() {
        // 编辑配置
        document.querySelectorAll('.edit-config').forEach(button => {
            button.addEventListener('click', (e) => {
                const configId = e.target.dataset.id;
                this.showEditConfigModal(configId);
            });
        });

        // 删除配置
        document.querySelectorAll('.delete-config').forEach(button => {
            button.addEventListener('click', async (e) => {
                const configId = e.target.dataset.id;
                const config = this.configs.find(c => c.id === configId);
                const configName = config ? (config.name || config.label || '未命名') : '配置';
                
                if (confirm(`确定要删除配置"${configName}"吗？`)) {
                    await this.deleteConfig(configId);
                }
            });
        });
    }

    // 更新验证码显示 - 支持两种模式
    async updateLocalCodesDisplay() {
        if (this.isPopupMode) {
            // 弹出页面模式：更新.code-value元素
            const codeElements = document.querySelectorAll('.code-value[data-secret]');
            
            for (const element of codeElements) {
                const secret = element.dataset.secret;
                const configId = element.dataset.id;
                
                if (!secret) continue;
                
                try {
                    const currentCode = await this.totpAdapter.getCurrentCode(secret);
                    
                    // 更新验证码
                    element.textContent = currentCode.code;
                    
                    // 更新定时器显示
                    const timerElement = element.closest('.code-item').querySelector('.code-timer span');
                    if (timerElement) {
                        timerElement.textContent = currentCode.timeRemaining;
                    }
                    
                    // 更新进度条
                    const progressElement = element.closest('.code-item').querySelector('.timer-progress');
                    if (progressElement) {
                        const progress = ((30 - currentCode.timeRemaining) / 30) * 100;
                        progressElement.style.transform = `rotate(${progress * 3.6}deg)`;
                    }
                    
                } catch (error) {
                    console.error(`更新配置 ${configId} 的验证码失败:`, error);
                    element.textContent = '------';
                }
            }
        } else {
            // 设置页面模式：更新.code元素
            const codeElements = document.querySelectorAll('.config-code .code[data-secret]');
            
            for (const element of codeElements) {
                const secret = element.dataset.secret;
                const configId = element.dataset.id;
                
                if (!secret) continue;
                
                try {
                    const currentCode = await this.totpAdapter.getCurrentCode(secret);
                    
                    // 更新验证码
                    element.textContent = currentCode.code;
                    
                    // 更新定时器显示
                    const timerElement = element.closest('.config-item').querySelector('.timer-text');
                    if (timerElement) {
                        timerElement.textContent = currentCode.timeRemaining;
                    }
                    
                    // 更新进度条
                    const progressElement = element.closest('.config-item').querySelector('.timer-progress');
                    if (progressElement) {
                        const progress = ((30 - currentCode.timeRemaining) / 30) * 100;
                        progressElement.style.setProperty('--progress', `${progress}%`);
                    }
                    
                    // 添加点击复制功能
                    element.onclick = async () => {
                        try {
                            await navigator.clipboard.writeText(currentCode.code);
                            this.showMessage('验证码已复制到剪贴板', 'success');
                        } catch (error) {
                            console.error('复制失败:', error);
                            this.showMessage('复制失败', 'error');
                        }
                    };
                    
                } catch (error) {
                    console.error(`更新配置 ${configId} 的验证码失败:`, error);
                    element.textContent = '------';
                }
            }
        }
    }

    // 启动自动更新
    startAutoUpdate() {
        // 清除现有的定时器
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        // 启动新的定时器，每秒更新一次
        this.updateInterval = setInterval(() => {
            this.updateLocalCodesDisplay();
        }, 1000);
    }

    // 停止自动更新
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    // 加载配置
    async loadConfigs() {
        try {
            // 使用与弹出界面相同的数据源
            if (this.localStorageManager) {
                this.configs = await this.localStorageManager.getAllLocalConfigs();
            } else {
                // 如果没有localStorageManager，尝试从不同的存储键读取
                // 首先尝试从localConfigs读取（与popup一致）
                let result = await chrome.storage.local.get(['localConfigs']);
                if (result.localConfigs && result.localConfigs.length > 0) {
                    this.configs = result.localConfigs;
                } else {
                    // 然后尝试从旧的存储键读取
                    result = await chrome.storage.local.get(['totpConfigs']);
                    this.configs = result.totpConfigs || [];
                }
            }
            console.log('加载配置成功，配置数量:', this.configs.length);
        } catch (error) {
            console.error('加载配置失败:', error);
            this.configs = [];
        }
    }

    // 保存配置
    async saveConfigs() {
        try {
            // 使用与弹出界面相同的数据源
            if (this.localStorageManager) {
                // 使用localStorageManager的方法逐个保存配置
                // 注意：这个方法主要用于回退，正常情况下应该使用addLocalConfig
                console.warn('使用回退方法保存配置');
            } else {
                // 如果没有localStorageManager，直接保存到storage
                // 使用与popup一致的存储键
                await chrome.storage.local.set({ localConfigs: this.configs });
            }
            console.log('保存配置成功');
        } catch (error) {
            console.error('保存配置失败:', error);
            throw error;
        }
    }

    /******************************* 设置页面专用方法 *******************************/
    
    // 初始化事件监听器（仅设置页面）
    initEventListeners() {
        if (this.isPopupMode) return; // 弹出页面不需要这些事件
        
        // 添加配置
        document.getElementById('addConfig')?.addEventListener('click', () => this.showAddConfigModal());
        
        // 导出配置
        document.getElementById('exportConfigs')?.addEventListener('click', () => this.exportConfigs());
        
        // 导入配置
        document.getElementById('importConfigs')?.addEventListener('click', () => this.importConfigs());
        
        // 备份到云端
        document.getElementById('backupToCloud')?.addEventListener('click', () => this.backupToCloud());
        
        // 从云端恢复
        document.getElementById('restoreFromCloud')?.addEventListener('click', () => this.restoreFromCloud());
        
        // 验证配置
        document.getElementById('validateConfigs')?.addEventListener('click', () => this.validateConfigs());
        
        // 添加配置模态框事件
        document.querySelector('#addConfigModal .close')?.addEventListener('click', () => this.hideAddConfigModal());
        document.getElementById('cancelConfig')?.addEventListener('click', () => this.hideAddConfigModal());
        document.getElementById('saveConfig')?.addEventListener('click', () => this.saveNewConfig());
        
        // 编辑配置模态框事件
        document.getElementById('editModalClose')?.addEventListener('click', () => this.hideEditConfigModal());
        document.getElementById('cancelEditConfig')?.addEventListener('click', () => this.hideEditConfigModal());
        document.getElementById('saveEditConfig')?.addEventListener('click', () => this.saveEditConfig());
        
        // 点击模态框外部关闭
        document.getElementById('addConfigModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'addConfigModal') {
                this.hideAddConfigModal();
            }
        });
        
        document.getElementById('editConfigModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'editConfigModal') {
                this.hideEditConfigModal();
            }
        });
    }

    // 显示添加配置模态框
    showAddConfigModal() {
        const modal = document.getElementById('addConfigModal');
        modal?.classList.add('show');
        // 清空表单
        document.getElementById('configName').value = '';
        document.getElementById('configSecret').value = '';
        document.getElementById('configIssuer').value = '';
        document.getElementById('configAccount').value = '';
        document.getElementById('configDigits').value = '6';
        document.getElementById('configPeriod').value = '30';
    }

    // 隐藏添加配置模态框
    hideAddConfigModal() {
        const modal = document.getElementById('addConfigModal');
        modal?.classList.remove('show');
    }

    // 显示编辑配置模态框
    showEditConfigModal(configId) {
        const config = this.configs.find(c => c.id === configId);
        if (!config) return;

        const modal = document.getElementById('editConfigModal');
        modal?.classList.add('show');
        
        // 填充表单
        document.getElementById('editConfigName').value = config.name || config.label || '';
        document.getElementById('editConfigIssuer').value = config.issuer || '';
        document.getElementById('editConfigAccount').value = config.account || '';
        
        // 存储当前编辑的配置ID
        this.currentEditingConfigId = configId;
    }

    // 隐藏编辑配置模态框
    hideEditConfigModal() {
        const modal = document.getElementById('editConfigModal');
        modal?.classList.remove('show');
        this.currentEditingConfigId = null;
    }

    // 保存新配置
    async saveNewConfig() {
        try {
            const name = document.getElementById('configName').value.trim();
            const secret = document.getElementById('configSecret').value.trim();
            const issuer = document.getElementById('configIssuer').value.trim();
            const account = document.getElementById('configAccount').value.trim();
            const digits = parseInt(document.getElementById('configDigits').value);
            const period = parseInt(document.getElementById('configPeriod').value);

            // 验证输入
            if (!name) {
                this.showMessage('请输入配置名称', 'error');
                return;
            }

            if (!secret) {
                this.showMessage('请输入密钥', 'error');
                return;
            }

            // 验证密钥格式
            const secretValidation = this.totpAdapter.validateSecret(secret);
            if (!secretValidation.valid) {
                this.showMessage(secretValidation.message, 'error');
                return;
            }

            // 创建配置对象 - 与弹出界面兼容的格式
            const config = {
                name,
                secret: secretValidation.secret,
                issuer: issuer || name, // 如果没有发行方，使用名称
                account: account || '',
                digits: digits || 6,
                period: period || 30,
                // 添加弹出界面需要的字段
                enabled: true,
                type: 'totp',
                label: name // 兼容字段
            };

            // 使用localStorageManager添加配置
            if (this.localStorageManager) {
                const result = await this.localStorageManager.addLocalConfig(config);
                if (!result.success) {
                    this.showMessage(result.message, 'error');
                    return;
                }
                // 重新加载所有配置
                await this.loadConfigs();
            } else {
                // 回退方法：直接添加到数组并保存
                config.id = Date.now().toString();
                config.createdAt = new Date().toISOString();
                this.configs.push(config);
                await this.saveConfigs();
            }
            
            // 更新配置列表
            await this.renderConfigList();
            
            // 关闭模态框
            this.hideAddConfigModal();
            
            this.showMessage('配置已成功添加', 'success');
        } catch (error) {
            console.error('保存配置失败:', error);
            this.showMessage('保存配置失败: ' + error.message, 'error');
        }
    }

    // 保存编辑的配置
    async saveEditConfig() {
        try {
            if (!this.currentEditingConfigId) return;

            const name = document.getElementById('editConfigName').value.trim();
            const issuer = document.getElementById('editConfigIssuer').value.trim();
            const account = document.getElementById('editConfigAccount').value.trim();

            if (!name) {
                this.showMessage('请输入配置名称', 'error');
                return;
            }

            const updatedConfig = {
                name,
                issuer,
                account
            };

            // 使用localStorageManager更新配置
            if (this.localStorageManager) {
                await this.localStorageManager.updateLocalConfig(this.currentEditingConfigId, updatedConfig);
                // 重新加载配置
                await this.loadConfigs();
            } else {
                // 回退方法：直接更新数组
                const configIndex = this.configs.findIndex(c => c.id === this.currentEditingConfigId);
                if (configIndex !== -1) {
                    this.configs[configIndex] = { ...this.configs[configIndex], ...updatedConfig };
                    await this.saveConfigs();
                }
            }

            // 更新配置列表
            await this.renderConfigList();
            
            // 关闭模态框
            this.hideEditConfigModal();
            
            this.showMessage('配置已成功更新', 'success');
        } catch (error) {
            console.error('保存编辑配置失败:', error);
            this.showMessage('保存配置失败: ' + error.message, 'error');
        }
    }

    // 删除配置
    async deleteConfig(configId) {
        try {
            if (this.localStorageManager) {
                // 使用localStorageManager删除配置
                await this.localStorageManager.deleteLocalConfig(configId);
                // 重新加载配置列表
                await this.loadConfigs();
            } else {
                // 回退方法：从数组中删除
                this.configs = this.configs.filter(config => config.id !== configId);
                await this.saveConfigs();
            }
            
            await this.renderConfigList();
            this.showMessage('配置已删除', 'success');
        } catch (error) {
            console.error('删除配置失败:', error);
            this.showMessage('删除配置失败', 'error');
        }
    }

    // 导出配置
    async exportConfigs() {
        try {
            const dataStr = JSON.stringify(this.configs, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `totp-configs-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.showMessage('配置导出成功', 'success');
        } catch (error) {
            console.error('导出配置失败:', error);
            this.showMessage('导出配置失败', 'error');
        }
    }

    // 导入配置
    importConfigs() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            try {
                const file = e.target.files[0];
                if (!file) return;

                const text = await file.text();
                const importedConfigs = JSON.parse(text);
                
                if (!Array.isArray(importedConfigs)) {
                    throw new Error('配置文件格式错误');
                }

                // 验证配置格式
                for (const config of importedConfigs) {
                    if (!config.name || !config.secret) {
                        throw new Error('配置文件包含无效的配置项');
                    }
                }

                // 合并配置（避免重复）
                const existingIds = new Set(this.configs.map(c => c.id));
                const newConfigs = importedConfigs.filter(c => !existingIds.has(c.id));
                
                this.configs.push(...newConfigs);
                await this.saveConfigs();
                await this.renderConfigList();
                
                this.showMessage(`成功导入 ${newConfigs.length} 个配置`, 'success');
            } catch (error) {
                console.error('导入配置失败:', error);
                this.showMessage('导入配置失败: ' + error.message, 'error');
            }
        };
        input.click();
    }

    // 备份到云端
    async backupToCloud() {
        try {
            if (window.webdavClient) {
                const backupData = {
                    configs: this.configs,
                    timestamp: new Date().toISOString(),
                    version: '1.0'
                };
                
                await window.webdavClient.uploadFile(
                    'totp-backup.json',
                    JSON.stringify(backupData, null, 2)
                );
                
                this.showMessage('备份到云端成功', 'success');
            } else {
                this.showMessage('WebDAV客户端未配置', 'error');
            }
        } catch (error) {
            console.error('备份到云端失败:', error);
            this.showMessage('备份到云端失败: ' + error.message, 'error');
        }
    }

    // 从云端恢复
    async restoreFromCloud() {
        try {
            if (window.webdavClient) {
                const backupData = await window.webdavClient.downloadFile('totp-backup.json');
                const parsed = JSON.parse(backupData);
                
                if (parsed.configs && Array.isArray(parsed.configs)) {
                    if (confirm('确定要从云端恢复配置吗？这将覆盖现有配置。')) {
                        this.configs = parsed.configs;
                        await this.saveConfigs();
                        await this.renderConfigList();
                        this.showMessage('从云端恢复成功', 'success');
                    }
                } else {
                    throw new Error('云端备份文件格式错误');
                }
            } else {
                this.showMessage('WebDAV客户端未配置', 'error');
            }
        } catch (error) {
            console.error('从云端恢复失败:', error);
            this.showMessage('从云端恢复失败: ' + error.message, 'error');
        }
    }

    // 验证配置
    async validateConfigs() {
        try {
            let validCount = 0;
            let invalidCount = 0;
            
            for (const config of this.configs) {
                try {
                    const code = await this.totpAdapter.generateTOTP(config.secret);
                    if (code) {
                        validCount++;
                    } else {
                        invalidCount++;
                    }
                } catch (error) {
                    invalidCount++;
                }
            }
            
            this.showMessage(
                `验证完成: ${validCount} 个有效配置, ${invalidCount} 个无效配置`,
                invalidCount > 0 ? 'warning' : 'success'
            );
        } catch (error) {
            console.error('验证配置失败:', error);
            this.showMessage('验证配置失败', 'error');
        }
    }

    // 显示消息
    showMessage(message, type = 'info', duration = 3000) {
        if (window.settingManager && window.settingManager.showMessage) {
            window.settingManager.showMessage(message, type, duration);
        } else if (this.isPopupMode && window.GlobalScope && window.GlobalScope.popupManager && window.GlobalScope.popupManager.showMessage) {
            // 弹出页面使用PopupManager的消息显示
            window.GlobalScope.popupManager.showMessage(message, type, duration);
        } else {
            // 简单的消息显示方法
            console.log(`[${type.toUpperCase()}] ${message}`);
            if (type === 'error') {
                alert(`错误: ${message}`);
            }
        }
    }
}

// 全局变量导出 - 支持多种环境
(() => {
    GlobalScope.TOTPGenerator = TOTPGenerator;
    GlobalScope.TOTPAdapter = TOTPAdapter;
    GlobalScope.TOTPConfigManager = TOTPConfigManager;
})();
