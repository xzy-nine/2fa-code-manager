// WebDAV客户端模块
class WebDAVClient {    constructor(config = {}) {
        this.baseUrl = config.url || '';
        this.username = config.username || '';
        this.password = config.password || '';
        this.configPath = '/2fa-configs/';
        this.configListFile = 'config-list.json';
        this.isSettingsInitialized = false;
        this.elements = {};
        
        // 检查是否在浏览器环境中（有document对象）
        if (typeof document !== 'undefined') {
            // 检查设置页面是否已加载
            if (document.readyState !== 'loading') {
                this.initSettings();
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    this.initSettings();
                });
            }
        }
    }

    // 设置认证信息
    setCredentials(url, username, password) {
        this.baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
        this.username = username;
        this.password = password;
    }
    
    // 设置页面相关方法
    async initSettings() {
        // 检查是否在设置页面
        const webdavSettingsContainer = document.getElementById('webdav-settings');
        if (!webdavSettingsContainer) return;
        
        // 渲染WebDAV设置UI
        this.renderWebDAVSettings(webdavSettingsContainer);
        
        // 获取元素引用
        this.elements = {
            urlInput: document.getElementById('webdavUrl'),
            usernameInput: document.getElementById('webdavUsername'),
            passwordInput: document.getElementById('webdavPassword'),
            testButton: document.getElementById('testWebdav'),
            saveButton: document.getElementById('saveWebdav')
        };
        
        // 绑定事件监听
        this.setupEventListeners();
        
        // 加载设置
        await this.loadWebDAVSettings();
        
        this.isSettingsInitialized = true;
        console.log('WebDAV设置初始化完成');
    }
    
    renderWebDAVSettings(container) {
        container.innerHTML = `
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
    
    setupEventListeners() {
        // 测试按钮事件
        this.elements.testButton?.addEventListener('click', () => {
            this.testWebDAVConnection();
        });
        
        // 保存按钮事件
        this.elements.saveButton?.addEventListener('click', () => {
            this.saveWebDAVSettings();
        });
    }
    
    // 加载WebDAV设置
    async loadWebDAVSettings() {
        try {
            const result = await chrome.storage.local.get(['webdavConfig']);
            const config = result.webdavConfig || {};
            
            // 设置表单值
            if (this.elements.urlInput) this.elements.urlInput.value = config.url || '';
            if (this.elements.usernameInput) this.elements.usernameInput.value = config.username || '';
            if (this.elements.passwordInput) this.elements.passwordInput.value = config.password || '';
            
            // 更新内部属性
            this.baseUrl = config.url || '';
            this.username = config.username || '';
            this.password = config.password || '';
        } catch (error) {
            console.error('加载WebDAV设置失败:', error);
            this.showSettingsMessage('加载设置失败: ' + error.message, 'error');
        }
    }
    
    // 测试WebDAV连接
    async testWebDAVConnection() {
        if (!this.isSettingsInitialized) return;
        
        const url = this.elements.urlInput?.value;
        const username = this.elements.usernameInput?.value;
        const password = this.elements.passwordInput?.value;

        if (!url || !username || !password) {
            this.showSettingsMessage('请填写完整的WebDAV信息', 'error');
            return;
        }

        try {
            this.showSettingsMessage('正在测试连接...', 'info');
            this.setCredentials(url, username, password);
            const result = await this.testConnection();
            
            if (result.success) {
                this.showSettingsMessage('WebDAV连接测试成功！', 'success');
            } else {
                this.showSettingsMessage('连接测试失败: ' + result.message, 'error');
            }
        } catch (error) {
            this.showSettingsMessage('连接测试失败: ' + error.message, 'error');
        }
    }
    
    // 保存WebDAV设置
    async saveWebDAVSettings() {
        if (!this.isSettingsInitialized) return;
        
        const config = {
            url: this.elements.urlInput?.value,
            username: this.elements.usernameInput?.value,
            password: this.elements.passwordInput?.value
        };

        try {
            await chrome.storage.local.set({ webdavConfig: config });
            this.showSettingsMessage('WebDAV设置已保存', 'success');
            
            // 更新内部属性
            this.baseUrl = config.url || '';
            this.username = config.username || '';
            this.password = config.password || '';
        } catch (error) {
            this.showSettingsMessage('保存失败: ' + error.message, 'error');
        }
    }
    
    // 显示设置页面消息
    showSettingsMessage(message, type) {
        if (window.settingManager && typeof window.settingManager.showMessage === 'function') {
            window.settingManager.showMessage(message, type);
        } else {
            console.log(`[WebDAV ${type}]`, message);
        }
    }

    // 创建认证头
    getAuthHeaders() {
        const auth = btoa(`${this.username}:${this.password}`);
        return {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    // 测试连接
    async testConnection() {
        try {
            const response = await fetch(this.baseUrl, {
                method: 'PROPFIND',
                headers: {
                    ...this.getAuthHeaders(),
                    'Depth': '0'
                }
            });

            if (response.ok) {
                return { success: true, message: '连接成功' };
            } else if (response.status === 401) {
                return { success: false, message: '认证失败，请检查用户名和密码' };
            } else {
                return { success: false, message: `连接失败: ${response.status} ${response.statusText}` };
            }        } catch (error) {
            console.error('WebDAV连接测试错误:', error);
            
            let errorMessage = '网络错误: ';
            
            if (error.message === 'Failed to fetch') {
                errorMessage += '无法连接到服务器，请检查：1) 服务器地址是否正确 2) 网络连接是否正常 3) 服务器是否在线 4) 是否被防火墙阻止';
            } else if (error.name === 'TypeError') {
                errorMessage += '请求配置错误，请检查服务器地址格式';
            } else {
                errorMessage += error.message;
            }
            
            return { success: false, message: errorMessage };
        }
    }

    // 确保目录存在
    async ensureDirectory(path) {
        try {
            const url = `${this.baseUrl}${path}`;
            const response = await fetch(url, {
                method: 'MKCOL',
                headers: this.getAuthHeaders()
            });

            // 201表示创建成功，405表示已存在
            return response.status === 201 || response.status === 405;
        } catch (error) {
            console.error('创建目录失败:', error);
            return false;
        }
    }

    // 上传文件
    async uploadFile(path, content) {
        try {
            await this.ensureDirectory(this.configPath);
            
            const url = `${this.baseUrl}${this.configPath}${path}`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: typeof content === 'string' ? content : JSON.stringify(content)
            });

            if (response.ok) {
                return { success: true, message: '上传成功' };
            } else {
                return { success: false, message: `上传失败: ${response.status} ${response.statusText}` };
            }        } catch (error) {
            console.error('WebDAV上传错误:', error);
            
            let errorMessage = '上传错误: ';
            
            // 根据错误类型提供更具体的信息
            if (error.message === 'Failed to fetch') {
                errorMessage += '网络请求失败，可能原因：网络连接问题、服务器不可达或CORS策略阻止';
            } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage += '请求配置错误或网络异常';
            } else {
                errorMessage += error.message;
            }
            
            return { success: false, message: errorMessage, originalError: error };
        }
    }

    // 下载文件
    async downloadFile(path) {
        try {
            const url = `${this.baseUrl}${this.configPath}${path}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const content = await response.text();
                try {
                    return { success: true, data: JSON.parse(content) };
                } catch {
                    return { success: true, data: content };
                }
            } else if (response.status === 404) {
                return { success: false, message: '文件不存在' };
            } else {
                return { success: false, message: `下载失败: ${response.status} ${response.statusText}` };
            }
        } catch (error) {
            return { success: false, message: `下载错误: ${error.message}` };
        }
    }

    // 删除文件
    async deleteFile(path) {
        try {
            const url = `${this.baseUrl}${this.configPath}${path}`;
            const response = await fetch(url, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            if (response.ok || response.status === 404) {
                return { success: true, message: '删除成功' };
            } else {
                return { success: false, message: `删除失败: ${response.status} ${response.statusText}` };
            }
        } catch (error) {
            return { success: false, message: `删除错误: ${error.message}` };
        }
    }

    // 列出文件
    async listFiles() {
        try {
            const url = `${this.baseUrl}${this.configPath}`;
            const response = await fetch(url, {
                method: 'PROPFIND',
                headers: {
                    ...this.getAuthHeaders(),
                    'Depth': '1'
                }
            });

            if (response.ok) {
                const xmlText = await response.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
                
                const files = [];
                const responses = xmlDoc.getElementsByTagName('d:response');
                
                for (let i = 0; i < responses.length; i++) {
                    const href = responses[i].getElementsByTagName('d:href')[0];
                    if (href) {
                        const path = href.textContent;
                        const filename = path.split('/').pop();
                        if (filename && filename !== '') {
                            files.push({
                                name: filename,
                                path: path,
                                isDirectory: path.endsWith('/')
                            });
                        }
                    }
                }
                
                return { success: true, files: files };
            } else {
                return { success: false, message: `获取文件列表失败: ${response.status}` };
            }
        } catch (error) {
            return { success: false, message: `列表错误: ${error.message}` };
        }
    }    // 获取配置列表
    async getConfigList() {
        // 检查WebDAV是否已正确配置
        if (!this.baseUrl || !this.username || !this.password) {
            console.warn('WebDAV配置不完整，返回空配置列表');
            return [];
        }

        const result = await this.downloadFile(this.configListFile);
        if (result.success) {
            return result.data || [];
        } else {
            // 如果文件不存在，返回空列表
            return [];
        }
    }    // 更新配置列表
    async updateConfigList(configList) {
        // 检查WebDAV是否已正确配置
        if (!this.baseUrl || !this.username || !this.password) {
            return { 
                success: false, 
                message: 'WebDAV配置不完整，请先配置服务器地址、用户名和密码' 
            };
        }

        return await this.uploadFile(this.configListFile, configList);
    }// 添加新配置
    async addConfig(config) {
        try {
            // 检查WebDAV是否已正确配置
            if (!this.baseUrl || !this.username || !this.password) {
                return { 
                    success: false, 
                    message: 'WebDAV配置不完整，请先配置服务器地址、用户名和密码' 
                };
            }

            // 生成配置ID
            const configId = this.generateConfigId();
            const configFile = `${configId}.json`;
            
            // 加密配置数据
            const cryptoManager = new CryptoManager();
            const encryptedConfig = await cryptoManager.encrypt(config);
            
            // 上传加密配置
            const uploadResult = await this.uploadFile(configFile, encryptedConfig);
            if (!uploadResult.success) {
                return uploadResult;
            }
            
            // 更新配置列表
            const configList = await this.getConfigList();
            const listItem = {
                id: configId,
                name: config.name || config.label || 'Unknown',
                issuer: config.issuer || '',
                account: config.account || '',
                domain: config.domain || '',
                createdAt: new Date().toISOString(),
                file: configFile
            };
            
            configList.push(listItem);
            const listResult = await this.updateConfigList(configList);
            
            if (listResult.success) {
                return { success: true, config: listItem };
            } else {
                // 如果列表更新失败，删除已上传的配置文件
                await this.deleteFile(configFile);
                return listResult;
            }
        } catch (error) {
            return { success: false, message: `添加配置失败: ${error.message}` };
        }
    }    // 获取配置详情
    async getConfig(configId, encryptionKey = null) {
        try {
            // 检查WebDAV是否已正确配置
            if (!this.baseUrl || !this.username || !this.password) {
                return { 
                    success: false, 
                    message: 'WebDAV配置不完整，请先配置服务器地址、用户名和密码' 
                };
            }

            const configList = await this.getConfigList();
            const configItem = configList.find(item => item.id === configId);
            
            if (!configItem) {
                return { success: false, message: '配置不存在' };
            }
            
            const result = await this.downloadFile(configItem.file);
            if (!result.success) {
                return result;
            }
            
            // 解密配置
            const cryptoManager = new CryptoManager();
            const decryptedConfig = await cryptoManager.decrypt(result.data, encryptionKey);
            
            if (!decryptedConfig) {
                return { success: false, message: '解密失败，请检查密钥' };
            }
            
            return { success: true, config: decryptedConfig };
        } catch (error) {
            return { success: false, message: `获取配置失败: ${error.message}` };
        }
    }    // 删除配置
    async deleteConfig(configId) {
        try {
            // 检查WebDAV是否已正确配置
            if (!this.baseUrl || !this.username || !this.password) {
                return { 
                    success: false, 
                    message: 'WebDAV配置不完整，请先配置服务器地址、用户名和密码' 
                };
            }

            const configList = await this.getConfigList();
            const configIndex = configList.findIndex(item => item.id === configId);
            
            if (configIndex === -1) {
                return { success: false, message: '配置不存在' };
            }
            
            const configItem = configList[configIndex];
            
            // 删除配置文件
            const deleteResult = await this.deleteFile(configItem.file);
            if (!deleteResult.success) {
                return deleteResult;
            }
            
            // 更新配置列表
            configList.splice(configIndex, 1);
            return await this.updateConfigList(configList);
        } catch (error) {
            return { success: false, message: `删除配置失败: ${error.message}` };
        }
    }

    // 搜索配置
    async searchConfigs(domain) {
        const configList = await this.getConfigList();
        return configList.filter(config => 
            config.domain === domain || 
            config.issuer.toLowerCase().includes(domain.toLowerCase()) ||
            config.account.toLowerCase().includes(domain.toLowerCase())
        );
    }

    // 生成配置ID
    generateConfigId() {
        return 'config_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // 备份所有配置
    async backupConfigs() {
        try {
            const configList = await this.getConfigList();
            const backup = {
                version: '1.0',
                createdAt: new Date().toISOString(),
                configs: configList
            };
            
            const backupFile = `backup_${Date.now()}.json`;
            return await this.uploadFile(backupFile, backup);
        } catch (error) {
            return { success: false, message: `备份失败: ${error.message}` };
        }
    }

    // 获取存储统计
    async getStorageStats() {
        try {
            const listResult = await this.listFiles();
            if (!listResult.success) {
                return listResult;
            }
            
            const configList = await this.getConfigList();
            
            return {
                success: true,
                stats: {
                    totalFiles: listResult.files.length,                    configCount: configList.length,
                    lastUpdated: configList.length > 0 ? 
                        Math.max(...configList.map(c => new Date(c.createdAt).getTime())) : 
                        null
                }
            };
        } catch (error) {
            return { success: false, message: `获取统计失败: ${error.message}` };
        }
    }
}

// 创建全局实例
const globalWebDAVClient = new WebDAVClient();

// 全局变量导出 - 支持多种环境
if (typeof globalThis !== 'undefined') {
    globalThis.WebDAVClient = WebDAVClient;
    globalThis.webdavClient = globalWebDAVClient;
} else if (typeof window !== 'undefined') {
    window.WebDAVClient = WebDAVClient;
    window.webdavClient = globalWebDAVClient;
} else if (typeof self !== 'undefined') {
    self.WebDAVClient = WebDAVClient;
    self.webdavClient = globalWebDAVClient;
}

// 添加到全局作用域
if (typeof GlobalScope !== 'undefined') {
    GlobalScope.WebDAVClient = WebDAVClient;
    GlobalScope.webdavClient = globalWebDAVClient;
}
