// 本地存储管理模块 - 复用云端加密逻辑
class LocalStorageManager {
    constructor() {
        // 使用全局变量获取CryptoManager实例
        this.cryptoManager = new GlobalScope.CryptoManager();
        this.storageKey = 'encrypted_local_configs';
        this.configListKey = 'local_config_list';
    }

    // 获取加密密钥（复用云端逻辑）
    async getEncryptionKey() {
        try {
            const settings = await this.getStorageData('encryptionConfig');
            return settings?.customKey || null;
        } catch (error) {
            console.error('获取加密密钥失败:', error);
            return null;
        }
    }

    // 添加本地配置（加密存储）
    async addLocalConfig(config) {
        try {
            // 生成配置ID
            const configId = this.generateConfigId();
            const configWithId = {
                id: configId,
                ...config,
                createdAt: new Date().toISOString(),
                type: 'local'
            };

            // 获取加密密钥
            const encryptionKey = await this.getEncryptionKey();
            
            // 加密配置数据（复用云端加密逻辑）
            const encryptedConfig = await this.cryptoManager.encrypt(configWithId, encryptionKey);
            
            // 获取现有的加密配置列表
            const configList = await this.getLocalConfigList();
            
            // 创建配置列表项（明文，用于快速检索）
            const listItem = {
                id: configId,
                name: config.name || config.label || 'Unknown',
                issuer: config.issuer || '',
                account: config.account || '',
                domain: config.domain || '',
                createdAt: new Date().toISOString(),
                encrypted: true,
                storageType: 'local'
            };
            
            // 更新配置列表
            configList.push(listItem);
            
            // 保存加密配置和列表
            await this.saveEncryptedConfig(configId, encryptedConfig);
            await this.saveLocalConfigList(configList);
            
            return { success: true, config: listItem };
        } catch (error) {
            console.error('添加本地配置失败:', error);
            return { success: false, message: `添加配置失败: ${error.message}` };
        }
    }

    // 获取本地配置（解密）
    async getLocalConfig(configId) {
        try {
            // 获取加密配置
            const encryptedConfig = await this.getEncryptedConfig(configId);
            if (!encryptedConfig) {
                return { success: false, message: '配置不存在' };
            }
            
            // 获取加密密钥
            const encryptionKey = await this.getEncryptionKey();
            
            // 解密配置（复用云端解密逻辑）
            const decryptedConfig = await this.cryptoManager.decrypt(encryptedConfig, encryptionKey);
            
            if (!decryptedConfig) {
                return { success: false, message: '解密失败，请检查密钥' };
            }
            
            return { success: true, config: decryptedConfig };
        } catch (error) {
            console.error('获取本地配置失败:', error);
            return { success: false, message: `获取配置失败: ${error.message}` };
        }
    }

    // 获取所有本地配置列表
    async getLocalConfigList() {
        try {
            const result = await this.getStorageData(this.configListKey);
            return result || [];
        } catch (error) {
            console.error('获取本地配置列表失败:', error);
            return [];
        }
    }

    // 获取所有解密的本地配置
    async getAllLocalConfigs() {
        try {
            const configList = await this.getLocalConfigList();
            const configs = [];
            
            for (const listItem of configList) {
                const result = await this.getLocalConfig(listItem.id);
                if (result.success) {
                    configs.push(result.config);
                }
            }
            
            return configs;
        } catch (error) {
            console.error('获取所有本地配置失败:', error);
            return [];
        }
    }

    // 更新本地配置
    async updateLocalConfig(configId, updatedConfig) {
        try {
            // 获取现有配置
            const result = await this.getLocalConfig(configId);
            if (!result.success) {
                return result;
            }
            
            const mergedConfig = {
                ...result.config,
                ...updatedConfig,
                updatedAt: new Date().toISOString()
            };
            
            // 获取加密密钥
            const encryptionKey = await this.getEncryptionKey();
            
            // 重新加密配置
            const encryptedConfig = await this.cryptoManager.encrypt(mergedConfig, encryptionKey);
            
            // 保存加密配置
            await this.saveEncryptedConfig(configId, encryptedConfig);
            
            // 更新配置列表
            const configList = await this.getLocalConfigList();
            const listIndex = configList.findIndex(item => item.id === configId);
            
            if (listIndex !== -1) {
                configList[listIndex] = {
                    ...configList[listIndex],
                    name: mergedConfig.name || mergedConfig.label || 'Unknown',
                    issuer: mergedConfig.issuer || '',
                    account: mergedConfig.account || '',
                    domain: mergedConfig.domain || '',
                    updatedAt: mergedConfig.updatedAt
                };
                
                await this.saveLocalConfigList(configList);
            }
            
            return { success: true, config: mergedConfig };
        } catch (error) {
            console.error('更新本地配置失败:', error);
            return { success: false, message: `更新配置失败: ${error.message}` };
        }
    }

    // 删除本地配置
    async deleteLocalConfig(configId) {
        try {
            // 删除加密配置
            await this.deleteEncryptedConfig(configId);
            
            // 更新配置列表
            const configList = await this.getLocalConfigList();
            const updatedList = configList.filter(item => item.id !== configId);
            await this.saveLocalConfigList(updatedList);
            
            return { success: true, message: '配置删除成功' };
        } catch (error) {
            console.error('删除本地配置失败:', error);
            return { success: false, message: `删除配置失败: ${error.message}` };
        }
    }

    // 搜索本地配置
    async searchLocalConfigs(domain) {
        try {
            const configList = await this.getLocalConfigList();
            return configList.filter(config => 
                config.domain === domain || 
                config.issuer.toLowerCase().includes(domain.toLowerCase()) ||
                config.account.toLowerCase().includes(domain.toLowerCase())
            );
        } catch (error) {
            console.error('搜索本地配置失败:', error);
            return [];
        }
    }

    // 导出本地配置（加密）
    async exportLocalConfigs() {
        try {
            const configs = await this.getAllLocalConfigs();
            const exportData = {
                version: '1.0',
                type: 'local_encrypted',
                createdAt: new Date().toISOString(),
                configs: configs
            };
            
            return { success: true, data: exportData };
        } catch (error) {
            console.error('导出本地配置失败:', error);
            return { success: false, message: `导出失败: ${error.message}` };
        }
    }

    // 导入本地配置（加密）
    async importLocalConfigs(configsData) {
        try {
            const { configs } = configsData;
            const results = [];
            
            for (const config of configs) {
                const result = await this.addLocalConfig({
                    ...config,
                    // 移除ID，让系统重新生成
                    id: undefined,
                    createdAt: undefined
                });
                results.push(result);
            }
            
            const successCount = results.filter(r => r.success).length;
            return { 
                success: true, 
                message: `成功导入 ${successCount}/${configs.length} 个配置` 
            };
        } catch (error) {
            console.error('导入本地配置失败:', error);
            return { success: false, message: `导入失败: ${error.message}` };
        }
    }

    // 同步到云端（与WebDAV集成）
    async syncToCloud(webdavClient) {
        try {
            if (!webdavClient) {
                return { success: false, message: 'WebDAV客户端未初始化' };
            }
            
            const configs = await this.getAllLocalConfigs();
            const results = [];
            
            for (const config of configs) {
                // 标记为从本地同步的配置
                const cloudConfig = {
                    ...config,
                    syncSource: 'local',
                    syncedAt: new Date().toISOString()
                };
                
                const result = await webdavClient.addConfig(cloudConfig);
                results.push(result);
            }
            
            const successCount = results.filter(r => r.success).length;
            return { 
                success: true, 
                message: `成功同步 ${successCount}/${configs.length} 个配置到云端` 
            };
        } catch (error) {
            console.error('同步到云端失败:', error);
            return { success: false, message: `同步失败: ${error.message}` };
        }
    }

    // 私有方法：保存加密配置
    async saveEncryptedConfig(configId, encryptedData) {
        const key = `${this.storageKey}_${configId}`;
        await this.setStorageData(key, encryptedData);
    }

    // 私有方法：获取加密配置
    async getEncryptedConfig(configId) {
        const key = `${this.storageKey}_${configId}`;
        return await this.getStorageData(key);
    }

    // 私有方法：删除加密配置
    async deleteEncryptedConfig(configId) {
        const key = `${this.storageKey}_${configId}`;
        await chrome.storage.local.remove([key]);
    }

    // 私有方法：保存配置列表
    async saveLocalConfigList(configList) {
        await this.setStorageData(this.configListKey, configList);
    }

    // 私有方法：生成配置ID（复用WebDAV逻辑）
    generateConfigId() {
        return 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // 私有方法：存储操作封装
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

    // 获取存储统计
    async getStorageStats() {
        try {
            const configList = await this.getLocalConfigList();
            
            return {
                success: true,
                stats: {
                    totalConfigs: configList.length,
                    lastUpdated: configList.length > 0 ? 
                        Math.max(...configList.map(c => new Date(c.createdAt).getTime())) : 
                        null,
                    storageType: 'local_encrypted'
                }
            };
        } catch (error) {
            console.error('获取存储统计失败:', error);
            return { success: false, message: `获取统计失败: ${error.message}` };
        }
    }

    // 验证配置完整性
    async validateConfigs() {
        try {
            const configList = await this.getLocalConfigList();
            const results = [];
            
            for (const listItem of configList) {
                const result = await this.getLocalConfig(listItem.id);
                results.push({
                    id: listItem.id,
                    name: listItem.name,
                    valid: result.success,
                    error: result.success ? null : result.message
                });            }
            
            return { success: true, results };
        } catch (error) {
            console.error('验证配置完整性失败:', error);
            return { success: false, message: `验证失败: ${error.message}` };
        }
    }
}

// 全局变量导出 - 支持多种环境
(() => {
    GlobalScope.LocalStorageManager = LocalStorageManager;
})();
