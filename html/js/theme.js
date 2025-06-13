// 主题管理器 - 全局主题控制
class ThemeManager {
    constructor() {
        this.currentTheme = 'auto';
        this.init();
    }

    async init() {
        await this.loadTheme();
        this.applyTheme();
        this.setupMediaQueryListener();
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
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        globalThemeManager.init();
    });
} else {
    globalThemeManager.init();
}
