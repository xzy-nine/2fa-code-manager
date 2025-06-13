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
            console.log('开始生成TOTP，密钥:', secret?.substring(0, 8) + '...');
            
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
            
            console.log('最终生成的验证码:', token);
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

// 全局变量导出 - 支持多种环境
(() => {
    GlobalScope.TOTPGenerator = TOTPGenerator;
    GlobalScope.TOTPAdapter = TOTPAdapter;
})();
