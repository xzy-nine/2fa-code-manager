// 全局作用域管理 - 在第一个加载的模块中定义
const GlobalScope = (() => {
    const scope = (() => {
        if (typeof globalThis !== 'undefined') return globalThis;
        if (typeof window !== 'undefined') return window;
        if (typeof self !== 'undefined') return self;
        if (typeof global !== 'undefined') return global;
        throw new Error('无法确定全局作用域');
    })();
    
    // 确保 GlobalScope 属性存在
    scope.GlobalScope = scope.GlobalScope || {};
    
    return scope.GlobalScope;
})();

// 加密解密模块
class CryptoManager {    constructor() {
        this.defaultKey = 'default-2fa-key-2025';
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

    // 生成密钥
    async generateKey(password = null) {
        const keyMaterial = password || this.defaultKey;
        const encoder = new TextEncoder();
        const keyData = encoder.encode(keyMaterial);
        
        return await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        );
    }

    // 派生加密密钥
    async deriveKey(password = null, salt = null) {
        if (!salt) {
            salt = crypto.getRandomValues(new Uint8Array(16));
        }
        
        const keyMaterial = await this.generateKey(password);
        
        return {
            key: await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            ),
            salt: salt
        };
    }

    // 加密数据
    async encrypt(data, password = null) {
        try {
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(JSON.stringify(data));
            
            const { key, salt } = await this.deriveKey(password);
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            const encryptedData = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                dataBuffer
            );
            
            // 组合salt、iv和加密数据
            const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
            combined.set(salt, 0);
            combined.set(iv, salt.length);
            combined.set(new Uint8Array(encryptedData), salt.length + iv.length);
            
            return this.arrayBufferToBase64(combined);
        } catch (error) {
            console.error('加密失败:', error);
            // 简单加密作为备选
            return this.simpleEncrypt(data, password);
        }
    }

    // 解密数据
    async decrypt(encryptedData, password = null) {
        try {
            const combined = this.base64ToArrayBuffer(encryptedData);
            
            // 提取salt、iv和加密数据
            const salt = combined.slice(0, 16);
            const iv = combined.slice(16, 28);
            const encrypted = combined.slice(28);
            
            const { key } = await this.deriveKey(password, salt);
            
            const decryptedData = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                encrypted
            );
            
            const decoder = new TextDecoder();
            const jsonString = decoder.decode(decryptedData);
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('解密失败:', error);
            // 尝试简单解密
            return this.simpleDecrypt(encryptedData, password);
        }
    }

    // 简单加密（备选方案）
    simpleEncrypt(data, password = null) {
        const key = password || this.defaultKey;
        const jsonString = JSON.stringify(data);
        let encrypted = '';
        
        for (let i = 0; i < jsonString.length; i++) {
            const charCode = jsonString.charCodeAt(i);
            const keyChar = key.charCodeAt(i % key.length);
            encrypted += String.fromCharCode(charCode ^ keyChar);
        }
        
        return btoa(encrypted);
    }

    // 简单解密（备选方案）
    simpleDecrypt(encryptedData, password = null) {
        try {
            const key = password || this.defaultKey;
            const encrypted = atob(encryptedData);
            let decrypted = '';
            
            for (let i = 0; i < encrypted.length; i++) {
                const charCode = encrypted.charCodeAt(i);
                const keyChar = key.charCodeAt(i % key.length);
                decrypted += String.fromCharCode(charCode ^ keyChar);
            }
            
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('简单解密失败:', error);
            return null;
        }
    }

    // 工具方法：ArrayBuffer转Base64
    arrayBufferToBase64(buffer) {
        const binary = String.fromCharCode(...new Uint8Array(buffer));
        return btoa(binary);
    }

    // 工具方法：Base64转ArrayBuffer
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const buffer = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            buffer[i] = binary.charCodeAt(i);
        }
        return buffer;
    }

    // 生成安全的随机密钥
    generateSecureKey(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let result = '';
        const randomArray = crypto.getRandomValues(new Uint8Array(length));
        
        for (let i = 0; i < length; i++) {
            result += chars[randomArray[i] % chars.length];
        }
        
        return result;
    }    // 验证密钥强度
    validateKeyStrength(key) {
        if (!key || key.length < 8) {
            return { valid: false, message: '密钥长度至少8位' };
        }
        
        const hasUpper = /[A-Z]/.test(key);
        const hasLower = /[a-z]/.test(key);
        const hasNumber = /\d/.test(key);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(key);
        
        const strength = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
        
        if (strength < 2) {
            return { valid: false, message: '密钥强度太弱，建议包含大小写字母、数字和特殊字符' };
        }        
        return { valid: true, strength: strength };
    }
    
    // 设置页面相关方法
    initSettings() {
        // 检查是否在设置页面
        const encryptionSettingsContainer = document.getElementById('encryption-settings');
        if (!encryptionSettingsContainer) return;
        
        // 渲染加密设置UI
        this.renderEncryptionSettings(encryptionSettingsContainer);
        
        // 获取元素引用
        this.elements = {
            encryptionKey: document.getElementById('encryptionKey'),
            saveEncryptionButton: document.getElementById('saveEncryption')
        };
        
        // 绑定事件监听
        this.setupEventListeners();
        
        // 加载设置
        this.loadEncryptionSettings();
        
        this.isSettingsInitialized = true;
        console.log('加密设置初始化完成');
    }
    
    renderEncryptionSettings(container) {
        container.innerHTML = `
            <section class="settings-section">
                <h2>加密设置</h2>
                <div class="form-group">
                    <label for="encryptionKey">自定义加密密钥</label>
                    <input type="password" id="encryptionKey" placeholder="留空使用简单加密">
                    <small>输入强密码以提供更高安全性</small>
                </div>
                <button id="saveEncryption" class="btn btn-primary">保存加密设置</button>
            </section>
        `;
    }
    
    setupEventListeners() {
        // 保存按钮事件
        this.elements.saveEncryptionButton?.addEventListener('click', () => {
            this.saveEncryptionSettings();
        });
    }
    
    // 加载加密设置
    async loadEncryptionSettings() {
        try {
            const result = await chrome.storage.local.get(['encryptionConfig']);
            const config = result.encryptionConfig || {};
            
            // 设置表单值
            if (this.elements.encryptionKey) {
                this.elements.encryptionKey.value = config.customKey || '';
            }
        } catch (error) {
            console.error('加载加密设置失败:', error);
            this.showSettingsMessage('加载设置失败: ' + error.message, 'error');
        }
    }
    
    // 保存加密设置
    async saveEncryptionSettings() {
        if (!this.isSettingsInitialized) return;
        
        const encryptionKey = this.elements.encryptionKey?.value;

        // 验证密钥强度
        if (encryptionKey) {
            const validation = this.validateKeyStrength(encryptionKey);
            if (!validation.valid) {
                this.showSettingsMessage(validation.message, 'warning');
                return;
            }
        }

        try {
            await chrome.storage.local.set({
                encryptionConfig: {
                    customKey: encryptionKey
                }
            });
            this.showSettingsMessage('加密设置已保存', 'success');
        } catch (error) {
            this.showSettingsMessage('保存失败: ' + error.message, 'error');
        }
    }
    
    // 显示设置页面消息
    showSettingsMessage(message, type) {
        if (window.settingManager && typeof window.settingManager.showMessage === 'function') {
            window.settingManager.showMessage(message, type);
        } else {
            console.log(`[加密设置 ${type}]`, message);
        }
    }
}

// 创建全局实例
const cryptoManager = new CryptoManager();

// 全局变量导出 - 支持多种环境
if (typeof globalThis !== 'undefined') {
    globalThis.CryptoManager = CryptoManager;
    globalThis.cryptoManager = cryptoManager;
} else if (typeof window !== 'undefined') {
    window.CryptoManager = CryptoManager;
    window.cryptoManager = cryptoManager;
} else if (typeof self !== 'undefined') {
    self.CryptoManager = CryptoManager;
    self.cryptoManager = cryptoManager;
}

// 添加到全局作用域
if (typeof GlobalScope !== 'undefined') {
    GlobalScope.CryptoManager = CryptoManager;
    GlobalScope.cryptoManager = cryptoManager;
}
