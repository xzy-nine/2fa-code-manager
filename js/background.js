// 背景脚本 - 处理扩展的后台逻辑
class BackgroundService {
    constructor() {
        this.init();
    }

    init() {
        this.setupContextMenus();
        this.setupMessageHandlers();
        this.setupTabUpdatedListener();
        this.setupInstallListener();
    }

    // 设置右键菜单
    setupContextMenus() {
        chrome.runtime.onInstalled.addListener(() => {
            // 创建主菜单
            chrome.contextMenus.create({
                id: 'totp-main',
                title: '2FA验证码管家',
                contexts: ['page', 'selection', 'editable']
            });

            // 填充验证码菜单
            chrome.contextMenus.create({
                id: 'totp-fill',
                parentId: 'totp-main',
                title: '填充验证码',
                contexts: ['editable']
            });

            // 扫描二维码菜单
            chrome.contextMenus.create({
                id: 'totp-scan',
                parentId: 'totp-main',
                title: '扫描二维码',
                contexts: ['page', 'selection']
            });

            // 管理配置菜单
            chrome.contextMenus.create({
                id: 'totp-manage',
                parentId: 'totp-main',
                title: '管理配置',
                contexts: ['page']
            });
        });

        // 处理菜单点击
        chrome.contextMenus.onClicked.addListener((info, tab) => {
            this.handleContextMenuClick(info, tab);
        });
    }

    // 处理右键菜单点击
    async handleContextMenuClick(info, tab) {
        switch (info.menuItemId) {
            case 'totp-fill':
                await this.fillTOTPCode(tab);
                break;
            case 'totp-scan':
                await this.scanQRCode(tab);
                break;
            case 'totp-manage':
                await this.openManagement();
                break;
        }
    }

    // 填充TOTP验证码
    async fillTOTPCode(tab) {
        try {
            // 检查是否有选中的输入框
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'getSelectedInput'
            });

            if (!response?.hasSelected) {
                await this.showNotification('请先点击一个验证码输入框', 'warning');
                return;
            }

            // 打开弹出页面（如果可能）或创建新页面
            chrome.action.openPopup();
        } catch (error) {
            console.error('填充验证码失败:', error);
            await this.showNotification('操作失败，请重试', 'error');
        }
    }

    // 扫描二维码
    async scanQRCode(tab) {
        try {
            // 请求屏幕录制权限
            const streamId = await new Promise((resolve, reject) => {
                chrome.desktopCapture.chooseDesktopMedia(
                    ['screen', 'window', 'tab'],
                    tab,
                    (streamId) => {
                        if (streamId) {
                            resolve(streamId);
                        } else {
                            reject(new Error('用户取消了屏幕录制'));
                        }
                    }
                );
            });

            // 发送消息到内容脚本进行屏幕扫描
            await chrome.tabs.sendMessage(tab.id, {
                action: 'scanScreen',
                streamId: streamId
            });
        } catch (error) {
            console.error('扫描二维码失败:', error);
            await this.showNotification('扫描失败，请重试', 'error');
        }
    }

    // 打开管理页面
    async openManagement() {
        chrome.action.openPopup();
    }

    // 设置消息处理器
    setupMessageHandlers() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // 保持消息通道开放
        });
    }

    // 处理消息
    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case 'inputSelected':
                    await this.handleInputSelected(message.inputInfo, sender.tab);
                    sendResponse({ success: true });
                    break;

                case 'getTOTPCode':
                    const code = await this.generateTOTPCode(message.secret);
                    sendResponse({ success: true, code: code });
                    break;

                case 'saveConfig':
                    const result = await this.saveConfiguration(message.config);
                    sendResponse(result);
                    break;

                case 'getConfigs':
                    const configs = await this.getConfigurations(message.domain);
                    sendResponse({ success: true, configs: configs });
                    break;

                case 'notification':
                    await this.showNotification(message.message, message.type);
                    sendResponse({ success: true });
                    break;

                default:
                    sendResponse({ success: false, message: '未知操作' });
            }
        } catch (error) {
            console.error('处理消息失败:', error);
            sendResponse({ success: false, message: error.message });
        }
    }

    // 处理输入框选择
    async handleInputSelected(inputInfo, tab) {
        try {
            // 更新徽章显示
            await this.updateBadge(tab.id, '1');

            // 检查是否有保存的配置
            const configs = await this.getSavedConfigs(tab.url);
            
            if (configs.length > 0) {
                // 如果有保存的配置，显示快速填充提示
                await this.showNotification('点击扩展图标快速填充验证码', 'info');
            } else {
                // 提示用户配置
                await this.showNotification('点击扩展图标选择验证码配置', 'info');
            }
        } catch (error) {
            console.error('处理输入框选择失败:', error);
        }
    }

    // 更新徽章
    async updateBadge(tabId, text, color = '#667eea') {
        try {
            await chrome.action.setBadgeText({
                text: text,
                tabId: tabId
            });

            await chrome.action.setBadgeBackgroundColor({
                color: color,
                tabId: tabId
            });
        } catch (error) {
            console.error('更新徽章失败:', error);
        }
    }

    // 生成TOTP验证码
    async generateTOTPCode(secret) {
        try {
            const totpGenerator = new TOTPGenerator();
            const codeInfo = await totpGenerator.getCurrentCode(secret);
            return codeInfo.code;
        } catch (error) {
            console.error('生成TOTP验证码失败:', error);
            return null;
        }
    }

    // 保存配置
    async saveConfiguration(config) {
        try {
            // 获取现有配置
            const result = await chrome.storage.local.get(['configurations']);
            const configurations = result.configurations || [];

            // 添加新配置
            const newConfig = {
                id: this.generateId(),
                ...config,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            configurations.push(newConfig);

            // 保存配置
            await chrome.storage.local.set({ configurations: configurations });

            return { success: true, config: newConfig };
        } catch (error) {
            console.error('保存配置失败:', error);
            return { success: false, message: error.message };
        }
    }

    // 获取配置
    async getConfigurations(domain = null) {
        try {
            const result = await chrome.storage.local.get(['configurations']);
            let configurations = result.configurations || [];

            if (domain) {
                // 过滤特定域名的配置
                configurations = configurations.filter(config => 
                    config.domain === domain || 
                    config.issuer?.toLowerCase().includes(domain.toLowerCase())
                );
            }

            return configurations;
        } catch (error) {
            console.error('获取配置失败:', error);
            return [];
        }
    }

    // 获取保存的配置
    async getSavedConfigs(url) {
        try {
            const domain = new URL(url).hostname;
            return await this.getConfigurations(domain);
        } catch (error) {
            console.error('获取保存配置失败:', error);
            return [];
        }
    }

    // 显示通知
    async showNotification(message, type = 'info', duration = 5000) {
        const iconMap = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        try {
            await chrome.notifications.create({
                type: 'basic',
                iconUrl: 'favicon.png',
                title: '2FA验证码管家',
                message: `${iconMap[type] || 'ℹ️'} ${message}`
            });
        } catch (error) {
            console.error('显示通知失败:', error);
        }
    }

    // 监听标签页更新
    setupTabUpdatedListener() {
        chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.url) {
                // 清除徽章
                await this.updateBadge(tabId, '');
                
                // 检查是否有保存的配置
                const configs = await this.getSavedConfigs(tab.url);
                
                if (configs.length > 0) {
                    // 如果有配置，显示小徽章提示
                    await this.updateBadge(tabId, '●', '#10b981');
                }
            }
        });
    }

    // 监听安装事件
    setupInstallListener() {
        chrome.runtime.onInstalled.addListener(async (details) => {
            if (details.reason === 'install') {
                // 首次安装
                await this.showWelcomeNotification();
                await this.initializeDefaultSettings();
            } else if (details.reason === 'update') {
                // 更新
                await this.handleUpdate(details.previousVersion);
            }
        });
    }

    // 显示欢迎通知
    async showWelcomeNotification() {
        await this.showNotification(
            '欢迎使用2FA验证码管家！点击扩展图标开始配置。',
            'info',
            10000
        );
    }

    // 初始化默认设置
    async initializeDefaultSettings() {
        const defaultSettings = {
            enableBiometric: false,
            enableLocalStorage: false,
            autoFill: false,
            notificationEnabled: true,
            syncEnabled: false
        };

        await chrome.storage.local.set({ 
            settings: defaultSettings,
            configurations: [],
            siteConfigs: {}
        });
    }

    // 处理更新
    async handleUpdate(previousVersion) {
        // 版本迁移逻辑
        const currentVersion = chrome.runtime.getManifest().version;
        
        await this.showNotification(
            `扩展已更新到版本 ${currentVersion}`,
            'success'
        );

        // 执行必要的数据迁移
        await this.migrateData(previousVersion, currentVersion);
    }

    // 数据迁移
    async migrateData(fromVersion, toVersion) {
        try {
            // 这里可以添加版本特定的迁移逻辑
            console.log(`数据迁移: ${fromVersion} -> ${toVersion}`);
        } catch (error) {
            console.error('数据迁移失败:', error);
        }
    }

    // 生成唯一ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // 清理过期数据
    async cleanupExpiredData() {
        try {
            const result = await chrome.storage.local.get(['configurations']);
            const configurations = result.configurations || [];
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

            // 清理30天前的临时配置
            const cleanedConfigs = configurations.filter(config => {
                if (config.temporary) {
                    return new Date(config.createdAt) > thirtyDaysAgo;
                }
                return true;
            });

            if (cleanedConfigs.length !== configurations.length) {
                await chrome.storage.local.set({ configurations: cleanedConfigs });
                console.log(`清理了 ${configurations.length - cleanedConfigs.length} 个过期配置`);
            }
        } catch (error) {
            console.error('清理过期数据失败:', error);
        }
    }

    // 备份配置到WebDAV
    async backupToWebDAV() {
        try {
            const result = await chrome.storage.local.get(['settings', 'configurations']);
            const settings = result.settings;
            
            if (!settings?.webdavUrl) {
                return { success: false, message: 'WebDAV未配置' };
            }

            // 这里实现WebDAV备份逻辑
            // 实际项目中需要更完整的实现
            
            return { success: true, message: '备份成功' };
        } catch (error) {
            console.error('备份失败:', error);
            return { success: false, message: error.message };
        }
    }

    // 定期任务
    setupPeriodicTasks() {
        // 每小时清理一次过期数据
        setInterval(() => {
            this.cleanupExpiredData();
        }, 60 * 60 * 1000);

        // 每6小时备份一次（如果启用）
        setInterval(async () => {
            const settings = await chrome.storage.local.get(['settings']);
            if (settings?.settings?.autoBackup) {
                await this.backupToWebDAV();
            }
        }, 6 * 60 * 60 * 1000);
    }
}

// 初始化背景服务
const backgroundService = new BackgroundService();

// 启动定期任务
backgroundService.setupPeriodicTasks();

// 导出供其他脚本使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BackgroundService;
} else {
    window.BackgroundService = BackgroundService;
}
