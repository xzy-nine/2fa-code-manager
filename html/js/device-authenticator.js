// 设备验证器管理器
// 处理WebAuthn生物识别验证相关功能

class DeviceAuthenticator {
    constructor() {
        this.isEnabled = false;
        this.credentialId = null;
        this.lastAuthTime = null;
        this.init();
    }

    // 初始化
    async init() {
        await this.loadSettings();
        this.checkSupport();
    }

    // 加载设置
    async loadSettings() {
        try {
            this.isEnabled = localStorage.getItem('device_auth_enabled') === 'true';
            this.credentialId = localStorage.getItem('webauthn_credential_id');
            this.lastAuthTime = localStorage.getItem('last_webauthn_auth');
        } catch (error) {
            console.error('加载设备验证器设置失败:', error);
        }
    }

    // 保存设置
    async saveSettings() {
        try {
            localStorage.setItem('device_auth_enabled', this.isEnabled.toString());
        } catch (error) {
            console.error('保存设备验证器设置失败:', error);
        }
    }    // 启用设备验证器
    async enable() {
        this.isEnabled = true;
        await this.saveSettings();
        console.log('设备验证器已启用');
        // 注意：如果之前已有注册的凭据，将继续使用现有凭据
        // 这样可以避免用户频繁开关功能时需要重新注册的问题
    }    // 禁用设备验证器
    async disable() {
        this.isEnabled = false;
        await this.saveSettings();
        // 注意：禁用时不清除凭据，只是暂时停用功能
        // 用户可以稍后重新启用而无需重新注册
        // 如需完全重置，请使用 resetCredentials() 方法
        console.log('设备验证器已禁用（保留凭据）');
    }

    // 检查设备支持情况
    async checkSupport() {
        try {
            if (!window.PublicKeyCredential) {
                console.warn('浏览器不支持WebAuthn');
                return false;
            }

            const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            if (!available) {
                console.warn('设备不支持平台认证器');
                return false;
            }

            console.log('设备支持WebAuthn平台认证器');
            return true;
        } catch (error) {
            console.error('检查WebAuthn支持时出错:', error);
            return false;
        }
    }

    // 执行设备验证
    async authenticate() {
        if (!this.isEnabled) {
            return { success: false, error: '设备验证器未启用' };
        }

        const supported = await this.checkSupport();
        if (!supported) {
            return { success: false, error: '设备不支持生物识别验证' };
        }

        try {
            // 生成挑战
            const challenge = new Uint8Array(32);
            crypto.getRandomValues(challenge);

            // 尝试从存储中获取已注册的凭据ID
            let credentialId = this.credentialId;
            
            if (!credentialId) {
                // 首次使用，需要注册新凭据
                const registrationResult = await this.registerCredential(challenge);
                if (!registrationResult.success) {
                    return registrationResult;
                }
                credentialId = registrationResult.credentialId;
                this.credentialId = credentialId;
            }

            // 执行认证
            const credentialRequestOptions = {
                challenge: challenge,
                allowCredentials: [{
                    id: this.base64ToArrayBuffer(credentialId),
                    type: 'public-key',
                    transports: ['internal']
                }],
                userVerification: 'required',  // 要求用户验证（生物识别或PIN）
                timeout: 60000
            };

            const assertion = await navigator.credentials.get({
                publicKey: credentialRequestOptions
            });

            if (assertion) {
                // 验证成功，记录认证时间
                this.lastAuthTime = Date.now().toString();
                localStorage.setItem('last_webauthn_auth', this.lastAuthTime);
                return { success: true };
            } else {
                return { success: false, error: '设备密钥验证失败' };
            }

        } catch (error) {
            console.error('设备密钥认证错误:', error);
            
            // 处理特定错误
            if (error.name === 'NotAllowedError') {
                return { success: false, error: '用户取消了认证或认证超时，请重试' };
            } else if (error.name === 'InvalidStateError') {
                return { success: false, error: '设备密钥状态无效，正在重置...' };
            } else if (error.name === 'NotSupportedError') {
                return { success: false, error: '设备不支持此认证方式' };
            } else if (error.name === 'SecurityError') {
                return { success: false, error: '安全错误：请确保网站使用HTTPS协议' };
            } else if (error.name === 'UnknownError') {
                return { success: false, error: '认证器遇到未知错误，请重试' };
            } else {
                return { success: false, error: `认证失败: ${error.message}` };
            }
        }
    }

    // 注册WebAuthn凭据
    async registerCredential(challenge) {
        try {
            const userId = new TextEncoder().encode('2fa-manager-user');
            
            const credentialCreationOptions = {
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
                    requireResidentKey: false,             // 不要求常驻密钥
                    residentKey: 'discouraged'             // 不鼓励常驻密钥
                },
                timeout: 60000,
                attestation: 'none'  // 不需要证明
            };

            const credential = await navigator.credentials.create({
                publicKey: credentialCreationOptions
            });

            if (credential) {
                const credentialId = this.arrayBufferToBase64(credential.rawId);
                this.credentialId = credentialId;
                localStorage.setItem('webauthn_credential_id', credentialId);
                localStorage.setItem('webauthn_registration_time', Date.now().toString());
                
                console.log('WebAuthn凭据注册成功');
                return { 
                    success: true, 
                    credentialId: credentialId 
                };
            } else {
                return { 
                    success: false, 
                    error: '无法创建设备密钥，请检查设备设置' 
                };
            }

        } catch (error) {
            console.error('注册WebAuthn凭据失败:', error);
            
            if (error.name === 'NotAllowedError') {
                return { success: false, error: '用户拒绝了设备密钥注册，请重试' };
            } else if (error.name === 'NotSupportedError') {
                return { success: false, error: '设备不支持密钥注册功能' };
            } else if (error.name === 'SecurityError') {
                return { success: false, error: '安全错误：请确保网站使用HTTPS协议' };
            } else {
                return { success: false, error: `注册失败: ${error.message}` };
            }
        }
    }    // 重置凭据 - 完全清除已注册的生物识别信息
    resetCredentials() {
        this.credentialId = null;
        this.lastAuthTime = null;
        localStorage.removeItem('webauthn_credential_id');
        localStorage.removeItem('webauthn_registration_time');
        localStorage.removeItem('last_webauthn_auth');
        console.log('WebAuthn凭据已重置 - 下次使用时需重新注册');
        // 注意：此方法会完全清除凭据，用户下次使用时需要重新注册
        // 通常在用户手动重置或遇到认证问题时使用
        // 简单的开关设备验证器功能不会调用此方法
    }

    // 获取认证器信息
    async getAuthenticatorInfo() {
        try {
            if (!window.PublicKeyCredential) {
                return { supported: false, reason: '浏览器不支持WebAuthn' };
            }

            const platformSupport = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            
            // 检查条件式中介支持
            let conditionalSupport = false;
            if (PublicKeyCredential.isConditionalMediationAvailable) {
                conditionalSupport = await PublicKeyCredential.isConditionalMediationAvailable();
            }

            return {
                supported: true,
                platformSupport: platformSupport,
                conditionalSupport: conditionalSupport,
                hasCredential: !!this.credentialId,
                enabled: this.isEnabled,
                lastAuthTime: this.lastAuthTime
            };

        } catch (error) {
            console.error('获取认证器信息失败:', error);
            return { supported: false, reason: error.message };
        }
    }

    // 工具方法：ArrayBuffer转Base64
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    // 工具方法：Base64转ArrayBuffer
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    // 检查认证是否仍然有效（可设置有效期）
    isAuthenticationValid(maxAgeMs = 15 * 60 * 1000) { // 默认15分钟
        if (!this.lastAuthTime) return false;
        
        const lastAuth = parseInt(this.lastAuthTime);
        const now = Date.now();
        return (now - lastAuth) < maxAgeMs;
    }

    // 获取状态摘要
    getStatus() {
        return {
            enabled: this.isEnabled,
            hasCredential: !!this.credentialId,
            isValid: this.isAuthenticationValid(),
            lastAuthTime: this.lastAuthTime
        };
    }
}

// 将DeviceAuthenticator添加到全局作用域
if (typeof GlobalScope !== 'undefined') {
    GlobalScope.DeviceAuthenticator = DeviceAuthenticator;
} else if (typeof window !== 'undefined') {
    window.DeviceAuthenticator = DeviceAuthenticator;
}

// 创建实例并添加到全局作用域
const deviceAuthenticator = new DeviceAuthenticator();
if (typeof GlobalScope !== 'undefined') {
    GlobalScope.deviceAuthenticator = deviceAuthenticator;
} else if (typeof window !== 'undefined') {
    window.deviceAuthenticator = deviceAuthenticator;
}
