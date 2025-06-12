// 设置页面的JavaScript代码
document.addEventListener('DOMContentLoaded', function() {
    // 初始化本地存储管理器
    const localStorageManager = new LocalStorageManager();
    
    // 获取DOM元素
    const backButton = document.getElementById('backButton');
    const testWebdavButton = document.getElementById('testWebdav');
    const saveWebdavButton = document.getElementById('saveWebdav');
    const saveEncryptionButton = document.getElementById('saveEncryption');
    const saveLocalStorageButton = document.getElementById('saveLocalStorage');
    const addConfigButton = document.getElementById('addConfig');
    const exportConfigsButton = document.getElementById('exportConfigs');
    const importConfigsButton = document.getElementById('importConfigs');
    const syncToCloudButton = document.getElementById('syncToCloud');
    const validateConfigsButton = document.getElementById('validateConfigs');
    
    // 模态框相关元素
    const addConfigModal = document.getElementById('addConfigModal');
    const closeModal = document.querySelector('.close');
    const saveConfigButton = document.getElementById('saveConfig');
    const cancelConfigButton = document.getElementById('cancelConfig');

    // 返回按钮
    backButton.addEventListener('click', function() {
        window.close();
    });

    // 测试WebDAV连接
    testWebdavButton.addEventListener('click', async function() {
        const url = document.getElementById('webdavUrl').value;
        const username = document.getElementById('webdavUsername').value;
        const password = document.getElementById('webdavPassword').value;

        if (!url || !username || !password) {
            showMessage('请填写完整的WebDAV信息', 'error');
            return;
        }

        try {
            showMessage('正在测试连接...', 'info');
            // 这里应该调用后台脚本来测试WebDAV连接
            const result = await chrome.runtime.sendMessage({
                action: 'testWebDAV',
                config: { url, username, password }
            });

            if (result.success) {
                showMessage('WebDAV连接测试成功！', 'success');
            } else {
                showMessage('WebDAV连接测试失败: ' + result.error, 'error');
            }
        } catch (error) {
            showMessage('连接测试失败: ' + error.message, 'error');
        }
    });

    // 保存WebDAV设置
    saveWebdavButton.addEventListener('click', async function() {
        const config = {
            url: document.getElementById('webdavUrl').value,
            username: document.getElementById('webdavUsername').value,
            password: document.getElementById('webdavPassword').value
        };

        try {
            await chrome.storage.sync.set({ webdavConfig: config });
            showMessage('WebDAV设置已保存', 'success');
        } catch (error) {
            showMessage('保存失败: ' + error.message, 'error');
        }
    });

    // 保存加密设置
    saveEncryptionButton.addEventListener('click', async function() {
        const config = {
            customKey: document.getElementById('encryptionKey').value,
            biometricEnabled: document.getElementById('enableBiometric').checked
        };

        try {
            await chrome.storage.sync.set({ encryptionConfig: config });
            showMessage('加密设置已保存', 'success');
        } catch (error) {
            showMessage('保存失败: ' + error.message, 'error');
        }
    });

    // 保存本地存储设置
    saveLocalStorageButton.addEventListener('click', async function() {
        const config = {
            allowLocalStorage: document.getElementById('allowLocalStorage').checked
        };

        try {
            await chrome.storage.sync.set({ localStorageConfig: config });
            showMessage('本地存储设置已保存', 'success');
        } catch (error) {
            showMessage('保存失败: ' + error.message, 'error');
        }
    });

    // 显示添加配置模态框
    addConfigButton.addEventListener('click', function() {
        addConfigModal.style.display = 'block';
    });

    // 关闭模态框
    closeModal.addEventListener('click', function() {
        addConfigModal.style.display = 'none';
        clearConfigForm();
    });

    cancelConfigButton.addEventListener('click', function() {
        addConfigModal.style.display = 'none';
        clearConfigForm();
    });    // 保存配置
    saveConfigButton.addEventListener('click', async function() {
        const config = {
            name: document.getElementById('configName').value,
            secret: document.getElementById('configSecret').value,
            issuer: document.getElementById('configIssuer').value,
            account: document.getElementById('configAccount').value,
            digits: parseInt(document.getElementById('configDigits').value),
            period: parseInt(document.getElementById('configPeriod').value)
        };

        if (!config.name || !config.secret) {
            showMessage('请填写配置名称和密钥', 'error');
            return;
        }

        try {
            // 检查是否启用了加密本地存储
            const localStorageConfig = await chrome.storage.sync.get(['localStorageConfig']);
            const useEncryptedStorage = localStorageConfig.localStorageConfig?.allowLocalStorage;
            
            if (useEncryptedStorage) {
                // 使用新的加密本地存储
                const result = await localStorageManager.addLocalConfig(config);
                if (result.success) {
                    showMessage('配置已保存到加密本地存储', 'success');
                } else {
                    showMessage('保存失败: ' + result.message, 'error');
                    return;
                }
            } else {
                // 使用传统本地存储（向后兼容）
                const result = await chrome.storage.local.get(['totpConfigs']);
                const configs = result.totpConfigs || [];
                
                configs.push({
                    id: Date.now().toString(),
                    ...config,
                    created: new Date().toISOString()
                });

                await chrome.storage.local.set({ totpConfigs: configs });
                showMessage('配置已保存', 'success');
            }
            
            addConfigModal.style.display = 'none';
            clearConfigForm();
            loadConfigList();
        } catch (error) {
            showMessage('保存失败: ' + error.message, 'error');
        }
    });    // 导出配置
    exportConfigsButton.addEventListener('click', async function() {
        try {
            // 检查是否启用了加密本地存储
            const localStorageConfig = await chrome.storage.sync.get(['localStorageConfig']);
            const useEncryptedStorage = localStorageConfig.localStorageConfig?.allowLocalStorage;
            
            let configs = [];
            let exportType = 'legacy';
            
            if (useEncryptedStorage) {
                // 导出加密本地存储的配置
                const result = await localStorageManager.exportLocalConfigs();
                if (result.success) {
                    configs = result.data.configs;
                    exportType = 'encrypted';
                }
            } else {
                // 导出传统本地存储的配置
                const result = await chrome.storage.local.get(['totpConfigs']);
                configs = result.totpConfigs || [];
            }
            
            const exportData = {
                version: '1.0',
                type: exportType,
                exportedAt: new Date().toISOString(),
                configs: configs
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const url = URL.createObjectURL(dataBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `2fa-configs-${exportType}-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            showMessage(`配置已导出 (${exportType})`, 'success');
        } catch (error) {
            showMessage('导出失败: ' + error.message, 'error');
        }
    });    // 导入配置
    importConfigsButton.addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async function(event) {
            const file = event.target.files[0];
            if (file) {
                try {
                    const text = await file.text();
                    const importData = JSON.parse(text);
                    
                    // 检查导入数据格式
                    let configs = [];
                    if (Array.isArray(importData)) {
                        // 旧格式：直接是配置数组
                        configs = importData;
                    } else if (importData.configs && Array.isArray(importData.configs)) {
                        // 新格式：包含元数据的对象
                        configs = importData.configs;
                    } else {
                        throw new Error('无效的配置文件格式');
                    }
                    
                    // 检查是否启用了加密本地存储
                    const localStorageConfig = await chrome.storage.sync.get(['localStorageConfig']);
                    const useEncryptedStorage = localStorageConfig.localStorageConfig?.allowLocalStorage;
                    
                    if (useEncryptedStorage) {
                        // 导入到加密本地存储
                        const result = await localStorageManager.importLocalConfigs({ configs });
                        if (result.success) {
                            showMessage(result.message, 'success');
                        } else {
                            showMessage('导入失败: ' + result.message, 'error');
                        }
                    } else {
                        // 导入到传统本地存储
                        await chrome.storage.local.set({ totpConfigs: configs });
                        showMessage('配置已导入', 'success');
                    }
                    
                    loadConfigList();
                } catch (error) {
                    showMessage('导入失败: ' + error.message, 'error');
                }
            }
        };
        input.click();
    });

    // 同步到云端
    syncToCloudButton?.addEventListener('click', async function() {
        try {
            showMessage('正在同步到云端...', 'info');
            
            // 初始化WebDAV客户端
            const webdavConfig = await chrome.storage.sync.get(['webdavConfig']);
            if (!webdavConfig.webdavConfig || !webdavConfig.webdavConfig.url) {
                showMessage('请先配置WebDAV设置', 'error');
                return;
            }
            
            const webdavClient = new WebDAVClient(webdavConfig.webdavConfig);
            const testResult = await webdavClient.testConnection();
            
            if (!testResult.success) {
                showMessage('WebDAV连接失败: ' + testResult.message, 'error');
                return;
            }
            
            // 执行同步
            const result = await localStorageManager.syncToCloud(webdavClient);
            if (result.success) {
                showMessage(result.message, 'success');
            } else {
                showMessage(result.message, 'error');
            }
        } catch (error) {
            showMessage('同步失败: ' + error.message, 'error');
        }
    });

    // 验证配置完整性
    validateConfigsButton?.addEventListener('click', async function() {
        try {
            showMessage('正在验证配置...', 'info');
            
            const result = await localStorageManager.validateConfigs();
            if (result.success) {
                const validCount = result.results.filter(r => r.valid).length;
                const totalCount = result.results.length;
                
                if (validCount === totalCount) {
                    showMessage(`所有 ${totalCount} 个配置验证通过`, 'success');
                } else {
                    const invalidConfigs = result.results.filter(r => !r.valid);
                    let message = `${validCount}/${totalCount} 个配置验证通过\n\n无效配置：\n`;
                    invalidConfigs.forEach(config => {
                        message += `- ${config.name}: ${config.error}\n`;
                    });
                    showMessage(message, 'warning');
                }
            } else {
                showMessage('验证失败: ' + result.message, 'error');
            }
        } catch (error) {
            showMessage('验证失败: ' + error.message, 'error');
        }
    });

    // 加载页面时获取已保存的设置
    loadSettings();
    loadConfigList();

    // 工具函数
    function showMessage(message, type = 'info') {
        // 创建消息提示
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    function clearConfigForm() {
        document.getElementById('configName').value = '';
        document.getElementById('configSecret').value = '';
        document.getElementById('configIssuer').value = '';
        document.getElementById('configAccount').value = '';
        document.getElementById('configDigits').value = '6';
        document.getElementById('configPeriod').value = '30';
    }

    async function loadSettings() {
        try {
            // 加载WebDAV设置
            const webdavResult = await chrome.storage.sync.get(['webdavConfig']);
            if (webdavResult.webdavConfig) {
                const config = webdavResult.webdavConfig;
                document.getElementById('webdavUrl').value = config.url || '';
                document.getElementById('webdavUsername').value = config.username || '';
                document.getElementById('webdavPassword').value = config.password || '';
            }

            // 加载加密设置
            const encryptionResult = await chrome.storage.sync.get(['encryptionConfig']);
            if (encryptionResult.encryptionConfig) {
                const config = encryptionResult.encryptionConfig;
                document.getElementById('encryptionKey').value = config.customKey || '';
                document.getElementById('enableBiometric').checked = config.biometricEnabled || false;
            }

            // 加载本地存储设置
            const localStorageResult = await chrome.storage.sync.get(['localStorageConfig']);
            if (localStorageResult.localStorageConfig) {
                const config = localStorageResult.localStorageConfig;
                document.getElementById('allowLocalStorage').checked = config.allowLocalStorage || false;
            }
        } catch (error) {
            console.error('加载设置失败:', error);
        }
    }    async function loadConfigList() {
        try {
            // 检查是否启用了加密本地存储
            const localStorageConfig = await chrome.storage.sync.get(['localStorageConfig']);
            const useEncryptedStorage = localStorageConfig.localStorageConfig?.allowLocalStorage;
            
            let configs = [];
            
            if (useEncryptedStorage) {
                // 加载加密本地存储的配置列表
                configs = await localStorageManager.getLocalConfigList();
            } else {
                // 加载传统本地存储的配置
                const result = await chrome.storage.local.get(['totpConfigs']);
                configs = result.totpConfigs || [];
            }
            
            const configList = document.getElementById('configList');
            configList.innerHTML = '';
            
            if (configs.length === 0) {
                configList.innerHTML = '<div class="empty-state">暂无配置</div>';
                return;
            }
            
            configs.forEach(config => {
                const configItem = document.createElement('div');
                configItem.className = 'config-item';
                
                // 显示存储类型标识
                const storageType = useEncryptedStorage ? '🔒' : '📝';
                const storageLabel = useEncryptedStorage ? '加密存储' : '普通存储';
                
                configItem.innerHTML = `
                    <div class="config-info">
                        <div class="config-header">
                            <strong>${config.name}</strong>
                            <span class="storage-type" title="${storageLabel}">${storageType}</span>
                        </div>
                        <small>${config.issuer || ''} - ${config.account || ''}</small>
                        <div class="config-meta">
                            <span>创建: ${new Date(config.createdAt || config.created).toLocaleDateString()}</span>
                            ${config.updatedAt ? `<span>更新: ${new Date(config.updatedAt).toLocaleDateString()}</span>` : ''}
                        </div>
                    </div>
                    <div class="config-actions">
                        <button class="btn btn-small btn-secondary edit-config" data-id="${config.id}">编辑</button>
                        <button class="btn btn-small btn-danger delete-config" data-id="${config.id}">删除</button>
                    </div>
                `;
                configList.appendChild(configItem);
            });

            // 添加编辑和删除事件监听器
            document.querySelectorAll('.edit-config').forEach(button => {
                button.addEventListener('click', function() {
                    const configId = this.getAttribute('data-id');
                    editConfig(configId);
                });
            });

            document.querySelectorAll('.delete-config').forEach(button => {
                button.addEventListener('click', function() {
                    const configId = this.getAttribute('data-id');
                    deleteConfig(configId);
                });
            });
        } catch (error) {
            console.error('加载配置列表失败:', error);
            showMessage('加载配置列表失败: ' + error.message, 'error');
        }
    }    async function editConfig(configId) {
        try {
            // 检查是否启用了加密本地存储
            const localStorageConfig = await chrome.storage.sync.get(['localStorageConfig']);
            const useEncryptedStorage = localStorageConfig.localStorageConfig?.allowLocalStorage;
            
            let config = null;
            
            if (useEncryptedStorage && configId.startsWith('local_')) {
                // 从加密存储获取配置
                const result = await localStorageManager.getLocalConfig(configId);
                if (result.success) {
                    config = result.config;
                }
            } else {
                // 从传统存储获取配置
                const result = await chrome.storage.local.get(['totpConfigs']);
                const configs = result.totpConfigs || [];
                config = configs.find(c => c.id === configId);
            }
            
            if (config) {
                document.getElementById('configName').value = config.name;
                document.getElementById('configSecret').value = config.secret;
                document.getElementById('configIssuer').value = config.issuer || '';
                document.getElementById('configAccount').value = config.account || '';
                document.getElementById('configDigits').value = config.digits || 6;
                document.getElementById('configPeriod').value = config.period || 30;
                
                addConfigModal.style.display = 'block';
                
                // 修改保存按钮行为为更新
                saveConfigButton.onclick = async function() {
                    const updatedConfig = {
                        name: document.getElementById('configName').value,
                        secret: document.getElementById('configSecret').value,
                        issuer: document.getElementById('configIssuer').value,
                        account: document.getElementById('configAccount').value,
                        digits: parseInt(document.getElementById('configDigits').value),
                        period: parseInt(document.getElementById('configPeriod').value)
                    };

                    try {
                        if (useEncryptedStorage && configId.startsWith('local_')) {
                            // 更新加密存储的配置
                            const result = await localStorageManager.updateLocalConfig(configId, updatedConfig);
                            if (result.success) {
                                showMessage('配置已更新', 'success');
                            } else {
                                showMessage('更新失败: ' + result.message, 'error');
                                return;
                            }
                        } else {
                            // 更新传统存储的配置
                            const result = await chrome.storage.local.get(['totpConfigs']);
                            const configs = result.totpConfigs || [];
                            const updatedConfigs = configs.map(c => c.id === configId ? {
                                ...c,
                                ...updatedConfig,
                                updated: new Date().toISOString()
                            } : c);
                            await chrome.storage.local.set({ totpConfigs: updatedConfigs });
                            showMessage('配置已更新', 'success');
                        }
                        
                        addConfigModal.style.display = 'none';
                        clearConfigForm();
                        loadConfigList();
                        
                        // 恢复保存按钮的原始行为
                        saveConfigButton.onclick = saveConfigButton.originalOnClick;
                    } catch (error) {
                        showMessage('更新失败: ' + error.message, 'error');
                    }
                };
            }
        } catch (error) {
            showMessage('编辑配置失败: ' + error.message, 'error');
        }
    }    async function deleteConfig(configId) {
        if (confirm('确定要删除这个配置吗？')) {
            try {
                // 检查是否启用了加密本地存储
                const localStorageConfig = await chrome.storage.sync.get(['localStorageConfig']);
                const useEncryptedStorage = localStorageConfig.localStorageConfig?.allowLocalStorage;
                
                if (useEncryptedStorage && configId.startsWith('local_')) {
                    // 删除加密存储的配置
                    const result = await localStorageManager.deleteLocalConfig(configId);
                    if (result.success) {
                        showMessage('配置已删除', 'success');
                    } else {
                        showMessage('删除失败: ' + result.message, 'error');
                        return;
                    }
                } else {
                    // 删除传统存储的配置
                    const result = await chrome.storage.local.get(['totpConfigs']);
                    const configs = result.totpConfigs || [];
                    const updatedConfigs = configs.filter(c => c.id !== configId);
                    
                    await chrome.storage.local.set({ totpConfigs: updatedConfigs });
                    showMessage('配置已删除', 'success');
                }
                
                loadConfigList();
            } catch (error) {
                showMessage('删除配置失败: ' + error.message, 'error');
            }
        }
    }

    // 保存原始的保存按钮点击事件
    saveConfigButton.originalOnClick = saveConfigButton.onclick;
});
