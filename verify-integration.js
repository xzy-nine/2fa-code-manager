console.log('开始验证TOTP集成...');

// 验证OTPAuth库是否可用
if (typeof OTPAuth !== 'undefined') {
    console.log('✅ OTPAuth库加载成功');
    
    // 验证TOTPGenerator类是否可用
    if (typeof TOTPGenerator !== 'undefined') {
        console.log('✅ TOTPGenerator类可用');
        
        try {
            // 创建实例
            const totp = new TOTPGenerator();
            console.log('✅ TOTPGenerator实例创建成功');
            
            // 测试生成随机密钥
            const secret = totp.generateRandomSecret();
            console.log('✅ 随机密钥生成成功:', secret.substring(0, 8) + '...');
            
            // 测试生成验证码
            totp.generateTOTP(secret).then(code => {
                if (code) {
                    console.log('✅ 验证码生成成功:', code);
                    console.log('🎉 TOTP集成验证通过！所有功能正常');
                } else {
                    console.error('❌ 验证码生成失败');
                }
            }).catch(error => {
                console.error('❌ 验证码生成出错:', error);
            });
            
        } catch (error) {
            console.error('❌ TOTPGenerator初始化失败:', error);
        }
    } else {
        console.error('❌ TOTPGenerator类未定义');
    }
} else {
    console.error('❌ OTPAuth库未加载');
}
