// TOTP验证码生成模块
class TOTPGenerator {
    constructor() {
        this.timeStep = 30; // 30秒时间步长
        this.digits = 6;    // 6位验证码
    }    // Base32解码
    base32Decode(base32) {
        const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let bits = '';
        let hex = '';

        // 移除空格和转换为大写
        base32 = base32.replace(/\s/g, '').toUpperCase();
        console.log('清理后的Base32密钥:', base32);

        for (let i = 0; i < base32.length; i++) {
            const val = base32chars.indexOf(base32.charAt(i));
            if (val === -1) {
                console.error('无效的Base32字符:', base32.charAt(i), '在位置:', i);
                continue;
            }
            bits += val.toString(2).padStart(5, '0');
        }

        console.log('转换后的二进制长度:', bits.length);

        for (let i = 0; i + 8 <= bits.length; i += 8) {
            const chunk = bits.substr(i, 8);
            hex += parseInt(chunk, 2).toString(16).padStart(2, '0');
        }

        console.log('最终十六进制结果:', hex);
        return hex;
    }

    // HMAC-SHA1计算
    async hmacSha1(key, message) {
        const keyBuffer = new Uint8Array(key.match(/.{2}/g).map(byte => parseInt(byte, 16)));
        const messageBuffer = new Uint8Array(8);
        
        // 将时间戳写入8字节buffer（大端序）
        for (let i = 7; i >= 0; i--) {
            messageBuffer[7 - i] = (message >> (i * 8)) & 0xff;
        }

        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyBuffer,
            { name: 'HMAC', hash: 'SHA-1' },
            false,
            ['sign']
        );

        const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageBuffer);
        return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
    }    // 生成TOTP验证码
    async generateTOTP(secret, timeOffset = 0) {
        try {
            console.log('开始生成TOTP，密钥:', secret?.substring(0, 8) + '...');
            
            // 验证密钥
            if (!secret) {
                throw new Error('密钥为空');
            }
            
            // 解码Base32密钥
            const key = this.base32Decode(secret);
            console.log('Base32解码结果长度:', key.length);
            
            if (!key || key.length === 0) {
                throw new Error('Base32解码失败');
            }
            
            // 计算时间计数器
            const time = Math.floor((Date.now() / 1000 + timeOffset) / this.timeStep);
            console.log('时间计数器:', time);
            
            // 计算HMAC
            const hmac = await this.hmacSha1(key, time);
            console.log('HMAC计算结果长度:', hmac.length);
            
            // 动态截取
            const offset = parseInt(hmac.substring(hmac.length - 1), 16);
            const code = (
                ((parseInt(hmac.substr(offset * 2, 2), 16) & 0x7f) << 24) |
                ((parseInt(hmac.substr(offset * 2 + 2, 2), 16) & 0xff) << 16) |
                ((parseInt(hmac.substr(offset * 2 + 4, 2), 16) & 0xff) << 8) |
                (parseInt(hmac.substr(offset * 2 + 6, 2), 16) & 0xff)
            ) % Math.pow(10, this.digits);

            const result = code.toString().padStart(this.digits, '0');
            console.log('最终生成的验证码:', result);
            return result;
        } catch (error) {
            console.error('生成TOTP失败:', error);
            return null;
        }
    }

    // 获取当前验证码和剩余时间
    async getCurrentCode(secret) {
        const code = await this.generateTOTP(secret);
        const timeRemaining = this.timeStep - (Math.floor(Date.now() / 1000) % this.timeStep);
        
        return {
            code: code,
            timeRemaining: timeRemaining,
            nextCode: await this.generateTOTP(secret, this.timeStep)
        };
    }

    // 验证TOTP代码（允许时间偏差）
    async verifyTOTP(secret, inputCode, window = 1) {
        for (let i = -window; i <= window; i++) {
            const code = await this.generateTOTP(secret, i * this.timeStep);
            if (code === inputCode) {
                return true;
            }
        }
        return false;
    }

    // 解析TOTP URI
    parseOTPAuth(uri) {
        try {
            const url = new URL(uri);
            
            if (url.protocol !== 'otpauth:' || url.hostname !== 'totp') {
                throw new Error('不是有效的TOTP URI');
            }

            const params = new URLSearchParams(url.search);
            const secret = params.get('secret');
            const issuer = params.get('issuer') || '';
            const account = decodeURIComponent(url.pathname.substring(1));
            const digits = parseInt(params.get('digits')) || 6;
            const period = parseInt(params.get('period')) || 30;
            const algorithm = params.get('algorithm') || 'SHA1';

            if (!secret) {
                throw new Error('缺少secret参数');
            }

            return {
                secret: secret,
                issuer: issuer,
                account: account,
                digits: digits,
                period: period,
                algorithm: algorithm,
                label: issuer ? `${issuer} (${account})` : account
            };
        } catch (error) {
            console.error('解析OTP URI失败:', error);
            return null;
        }
    }

    // 生成TOTP URI
    generateOTPAuth(secret, account, issuer = '', digits = 6, period = 30) {
        const params = new URLSearchParams({
            secret: secret,
            issuer: issuer,
            digits: digits.toString(),
            period: period.toString(),
            algorithm: 'SHA1'
        });

        const label = issuer ? `${issuer}:${account}` : account;
        return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
    }

    // 验证Base32密钥格式
    validateSecret(secret) {
        const base32Regex = /^[A-Z2-7]+=*$/;
        const cleanSecret = secret.replace(/\s/g, '').toUpperCase();
        
        if (!base32Regex.test(cleanSecret)) {
            return { valid: false, message: '密钥格式无效，应为Base32格式' };
        }

        if (cleanSecret.length < 16) {
            return { valid: false, message: '密钥长度太短' };
        }

        return { valid: true, secret: cleanSecret };
    }

    // 生成随机Base32密钥
    generateRandomSecret(length = 32) {
        const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let secret = '';
        const randomArray = crypto.getRandomValues(new Uint8Array(length));
        
        for (let i = 0; i < length; i++) {
            secret += base32chars[randomArray[i] % base32chars.length];
        }
        
        return secret;
    }    // 计算验证码进度（用于UI显示）
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

// 全局变量导出 - 支持多种环境
(() => {
    GlobalScope.TOTPGenerator = TOTPGenerator;
})();
