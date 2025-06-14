// 主题管理器 - 全局主题控制
class ThemeManager {
    constructor() {
        this.currentTheme = 'auto';
        this.isSettingsInitialized = false;
        this.elements = {};
        this.init();
    }    async init() {
        await this.loadTheme();
        this.applyTheme();
        this.setupMediaQueryListener();

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

    async loadTheme() {
        try {
            // 优先从chrome.storage获取
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await chrome.storage.local.get(['themeConfig']);
                this.currentTheme = result.themeConfig?.theme || 'auto';
            } else {
                // 回退到localStorage
                this.currentTheme = localStorage.getItem('theme-preference') || 'auto';
            }
        } catch (error) {
            console.warn('无法加载主题设置，使用默认主题:', error);
            this.currentTheme = 'auto';
        }
    }

    async saveTheme(theme) {
        this.currentTheme = theme;
        
        try {
            // 同时保存到chrome.storage和localStorage
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.set({
                    themeConfig: { theme: theme }
                });
            }
            localStorage.setItem('theme-preference', theme);
        } catch (error) {
            console.warn('无法保存主题设置:', error);
        }
        
        this.applyTheme();
        
        // 显示保存成功消息（如果在设置页面）
        if (this.isSettingsInitialized && window.settingManager) {
            window.settingManager.showMessage('主题设置已保存', 'success');
            this.showSuccessAnimation(this.elements.saveThemeButton);
        }
    }

    applyTheme() {
        const body = document.body;
        
        // 移除所有主题类
        body.classList.remove('dark-mode', 'light-mode');
        
        switch (this.currentTheme) {
            case 'dark':
                body.classList.add('dark-mode');
                break;
            case 'light':
                body.classList.add('light-mode');
                break;
            case 'auto':
            default:
                // 跟随系统设置，不添加额外类，依赖CSS媒体查询
                break;
        }

        // 触发主题变更事件
        this.dispatchThemeChangeEvent();
        
        // 如果在设置页面，更新选择框
        if (this.isSettingsInitialized && this.elements.themeSelect) {
            this.elements.themeSelect.value = this.currentTheme;
        }
    }

    setupMediaQueryListener() {
        // 监听系统主题变化
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', () => {
                if (this.currentTheme === 'auto') {
                    this.applyTheme();
                }
            });
        }
    }

    dispatchThemeChangeEvent() {
        // 派发自定义事件，其他组件可以监听此事件
        const event = new CustomEvent('themeChanged', {
            detail: {
                theme: this.currentTheme,
                effectiveTheme: this.getEffectiveTheme()
            }
        });
        document.dispatchEvent(event);
    }

    getEffectiveTheme() {
        if (this.currentTheme === 'auto') {
            return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches 
                ? 'dark' : 'light';
        }
        return this.currentTheme;
    }
    
    // 设置页面相关方法
    initSettings() {
        // 检查是否在设置页面
        const themeSettingsContainer = document.getElementById('theme-settings');
        if (!themeSettingsContainer) return;
        
        // 渲染主题设置UI
        this.renderThemeSettings(themeSettingsContainer);
        
        // 获取元素引用
        this.elements = {
            themeSelect: document.getElementById('themeSelect'),
            saveThemeButton: document.getElementById('saveTheme')
        };
        
        // 绑定事件监听
        this.setupEventListeners();
        
        // 更新选择框值
        if (this.elements.themeSelect) {
            this.elements.themeSelect.value = this.currentTheme;
        }
        
        this.isSettingsInitialized = true;
        console.log('主题设置初始化完成');
    }
    
    renderThemeSettings(container) {
        container.innerHTML = `
            <section class="settings-section">
                <h2>主题设置</h2>
                <div class="form-group">
                    <label for="themeSelect">选择主题</label>
                    <select id="themeSelect">
                        <option value="auto">跟随系统</option>
                        <option value="light">浅色模式</option>
                        <option value="dark">深色模式</option>
                    </select>
                    <small>选择您偏好的主题模式，"跟随系统"将根据系统设置自动切换</small>
                </div>
                <button id="saveTheme" class="btn btn-primary">保存主题设置</button>
            </section>
        `;
    }
    
    setupEventListeners() {
        // 保存按钮事件
        this.elements.saveThemeButton?.addEventListener('click', () => {
            const selectedTheme = this.elements.themeSelect?.value || 'auto';
            this.saveTheme(selectedTheme);
        });
        
        // 主题选择变更事件
        this.elements.themeSelect?.addEventListener('change', () => {
            const selectedTheme = this.elements.themeSelect?.value || 'auto';
            // 实时预览主题效果但不保存
            this.currentTheme = selectedTheme;
            this.applyTheme();
        });
    }
    
    // 按钮成功动画效果
    showSuccessAnimation(button) {
        if (!button) return;
        
        const originalText = button.textContent;
        const originalClass = button.className;
        
        button.textContent = '✓ 已保存';
        button.className = `${originalClass} btn-success`;
        
        setTimeout(() => {
            button.textContent = originalText;
            button.className = originalClass;
        }, 2000);
    }

    // 获取当前主题
    getCurrentTheme() {
        return this.currentTheme;
    }

    // 获取当前生效的主题（考虑auto模式）
    getEffectiveTheme() {
        if (this.currentTheme === 'auto') {
            return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches 
                ? 'dark' : 'light';
        }
        return this.currentTheme;
    }

    // 切换主题
    toggleTheme() {
        const themes = ['auto', 'light', 'dark'];
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        this.saveTheme(themes[nextIndex]);
    }

    // 检查是否为深色模式
    isDarkMode() {
        return this.getEffectiveTheme() === 'dark';
    }

    // 检查是否为浅色模式
    isLightMode() {
        return this.getEffectiveTheme() === 'light';
    }
}

// 创建全局实例
const globalThemeManager = new ThemeManager();

// 全局导出
if (typeof globalThis !== 'undefined') {
    globalThis.ThemeManager = ThemeManager;
    globalThis.themeManager = globalThemeManager;
} else if (typeof window !== 'undefined') {
    window.ThemeManager = ThemeManager;
    window.themeManager = globalThemeManager;
} else if (typeof self !== 'undefined') {
    self.ThemeManager = ThemeManager;
    self.themeManager = globalThemeManager;
}

// 添加到全局作用域
if (typeof GlobalScope !== 'undefined') {
    GlobalScope.ThemeManager = ThemeManager;
    GlobalScope.themeManager = globalThemeManager;
}

// 页面加载完成后立即初始化
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            globalThemeManager.init();
        });
    } else {
        globalThemeManager.init();
    }
}
