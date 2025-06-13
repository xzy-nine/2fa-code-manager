// WebDAV客户端模块
class WebDAVClient {
    constructor(config = {}) {
        this.baseUrl = config.url || '';
        this.username = config.username || '';
        this.password = config.password || '';
        this.configPath = '/2fa-configs/';
        this.configListFile = 'config-list.json';
    }

    // 设置认证信息
    setCredentials(url, username, password) {
        this.baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
        this.username = username;
        this.password = password;
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
            }
        } catch (error) {
            return { success: false, message: `网络错误: ${error.message}` };
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
            }
        } catch (error) {
            return { success: false, message: `上传错误: ${error.message}` };
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
    }

    // 获取配置列表
    async getConfigList() {
        const result = await this.downloadFile(this.configListFile);
        if (result.success) {
            return result.data || [];
        } else {
            // 如果文件不存在，返回空列表
            return [];
        }
    }

    // 更新配置列表
    async updateConfigList(configList) {
        return await this.uploadFile(this.configListFile, configList);
    }

    // 添加新配置
    async addConfig(config) {
        try {
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
    }

    // 获取配置详情
    async getConfig(configId, encryptionKey = null) {
        try {
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
    }

    // 删除配置
    async deleteConfig(configId) {
        try {
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

// 全局变量导出 - 支持多种环境
(() => {
    const GlobalScope = (() => {
        if (typeof globalThis !== 'undefined') return globalThis;
        if (typeof window !== 'undefined') return window;
        if (typeof self !== 'undefined') return self;
        if (typeof global !== 'undefined') return global;
        throw new Error('无法确定全局作用域');
    })();
    
    GlobalScope.WebDAVClient = WebDAVClient;
})();
