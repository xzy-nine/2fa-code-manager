# 开发指南

## 🚀 快速开始

### 环境要求
- Node.js 16+
- Chrome/Edge 浏览器
- Git

### 安装步骤
1. 克隆项目
```bash
git clone <repository-url>
cd 2fa-xzy
```

2. 安装依赖
```bash
npm install
```

3. 运行验证
```bash
npm run validate
npm test
```

4. 在浏览器中加载扩展
- 打开 Chrome 浏览器
- 进入 `chrome://extensions/`
- 开启"开发者模式"
- 点击"加载已解压的扩展程序"
- 选择项目根目录

## 📁 项目结构

```
2fa-xzy/
├── manifest.json          # 扩展清单文件
├── package.json           # Node.js 包配置
├── README.md              # 项目说明
├── .gitignore            # Git 忽略文件
├── test-page.html        # 测试页面
│
├── html/                 # HTML 文件
│   └── popup.html        # 弹出页面
│
├── css/                  # 样式文件
│   └── popup.css         # 弹出页面样式
│
├── js/                   # JavaScript 模块
│   ├── popup.js          # 弹出页面逻辑
│   ├── background.js     # 后台服务
│   ├── content.js        # 内容脚本
│   ├── crypto.js         # 加密模块
│   ├── totp.js           # TOTP 算法
│   ├── webdav.js         # WebDAV 客户端
│   └── qr-scanner.js     # 二维码扫描
│
└── scripts/              # 构建脚本
    ├── validate.js       # 验证脚本
    ├── test.js           # 测试脚本
    └── package.js        # 打包脚本
```

## 🔧 开发工作流

### 1. 日常开发
```bash
# 验证代码
npm run validate

# 运行测试
npm test

# 启动测试服务器
npm run dev
```

### 2. 代码格式化
```bash
# 格式化所有代码
npm run format

# 检查代码规范
npm run lint
```

### 3. 构建发布
```bash
# 构建扩展
npm run build

# 打包扩展
npm run package
```

## 📋 核心模块详解

### 1. CryptoManager (crypto.js)
负责数据的加密和解密操作。

**主要方法：**
- `encrypt(data, password)` - 加密数据
- `decrypt(encryptedData, password)` - 解密数据
- `generateSecureKey(length)` - 生成安全密钥
- `validateKeyStrength(key)` - 验证密钥强度

**使用示例：**
```javascript
const crypto = new CryptoManager();

// 加密数据
const encrypted = await crypto.encrypt(sensitiveData, userPassword);

// 解密数据
const decrypted = await crypto.decrypt(encrypted, userPassword);
```

### 2. TOTPGenerator (totp.js)
实现TOTP算法，生成时间基础的一次性密码。

**主要方法：**
- `generateTOTP(secret, timeOffset)` - 生成TOTP验证码
- `getCurrentCode(secret)` - 获取当前验证码和剩余时间
- `parseOTPAuth(uri)` - 解析OTP URI
- `verifyTOTP(secret, inputCode)` - 验证TOTP代码

**使用示例：**
```javascript
const totp = new TOTPGenerator();

// 生成当前验证码
const codeInfo = await totp.getCurrentCode(secret);
console.log(`验证码: ${codeInfo.code}, 剩余时间: ${codeInfo.timeRemaining}s`);

// 解析二维码URI
const config = totp.parseOTPAuth('otpauth://totp/Example:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example');
```

### 3. WebDAVClient (webdav.js)
WebDAV协议客户端，用于云端数据同步。

**主要方法：**
- `testConnection()` - 测试连接
- `uploadFile(path, content)` - 上传文件
- `downloadFile(path)` - 下载文件
- `addConfig(config)` - 添加配置
- `getConfig(configId)` - 获取配置

**使用示例：**
```javascript
const webdav = new WebDAVClient();
webdav.setCredentials(url, username, password);

// 测试连接
const result = await webdav.testConnection();

// 添加配置
const addResult = await webdav.addConfig(configData);
```

### 4. QRScanner (qr-scanner.js)
二维码扫描和识别功能。

**主要方法：**
- `initCamera(videoElement, canvasElement)` - 初始化摄像头
- `startScanning(onDetected)` - 开始扫描
- `scanScreen()` - 屏幕识别
- `scanFromFile(file)` - 文件扫描

**使用示例：**
```javascript
const scanner = new QRScanner();

// 初始化摄像头
const result = await scanner.initCamera(video, canvas);

// 开始扫描
scanner.startScanning((qrData) => {
    console.log('检测到二维码:', qrData);
});
```

## 🔐 安全开发指南

### 1. 数据保护
- 所有敏感数据必须加密存储
- 使用强随机数生成器
- 及时清除内存中的敏感数据
- 避免在日志中记录敏感信息

### 2. 加密最佳实践
```javascript
// ✅ 正确的加密方式
const encrypted = await crypto.encrypt(data, userPassword);

// ❌ 错误的方式（明文存储）
localStorage.setItem('secret', data);
```

### 3. 权限管理
- 只请求必要的浏览器权限
- 实现最小权限原则
- 定期清理过期数据

### 4. 输入验证
```javascript
// ✅ 验证用户输入
const validation = crypto.validateKeyStrength(userInput);
if (!validation.valid) {
    throw new Error(validation.message);
}

// ✅ 验证Base32密钥
const secretValidation = totp.validateSecret(secret);
if (!secretValidation.valid) {
    throw new Error(secretValidation.message);
}
```

## 🧪 测试指南

### 1. 单元测试
每个模块都应该有对应的测试用例：

```javascript
// 测试TOTP生成
async function testTOTPGeneration() {
    const totp = new TOTPGenerator();
    const secret = 'JBSWY3DPEHPK3PXP';
    const code = await totp.generateTOTP(secret);
    
    assert(code.length === 6, '验证码长度应为6位');
    assert(/^\d+$/.test(code), '验证码应为纯数字');
}
```

### 2. 集成测试
使用测试页面验证完整功能：

1. 打开 `test-page.html`
2. 测试输入框识别
3. 测试验证码填充
4. 测试二维码扫描

### 3. 手动测试清单
- [ ] 扩展正常加载
- [ ] 弹出页面显示正常
- [ ] 输入框自动识别
- [ ] 验证码正确填充
- [ ] 二维码扫描工作
- [ ] WebDAV同步功能
- [ ] 生物识别验证
- [ ] 本地存储功能

## 🐛 调试技巧

### 1. 开发者工具
```javascript
// 在代码中添加调试点
console.log('Debug info:', data);
debugger; // 浏览器会在此处暂停
```

### 2. 扩展调试
- 后台脚本：`chrome://extensions/` → 扩展详情 → "服务工作进程"
- 弹出页面：右键弹出页面 → "检查"
- 内容脚本：页面开发者工具 → Console

### 3. 网络调试
```javascript
// 监控WebDAV请求
fetch(url, options)
    .then(response => {
        console.log('Response:', response.status, response.statusText);
        return response;
    })
    .catch(error => {
        console.error('Network error:', error);
    });
```

## 📦 发布流程

### 1. 版本更新
```bash
# 更新版本号
npm version patch|minor|major

# 更新 manifest.json 中的版本号
```

### 2. 构建发布包
```bash
# 验证代码
npm run validate
npm test

# 构建扩展
npm run build

# 打包扩展
npm run package
```

### 3. 发布到商店
1. 登录 Chrome Web Store 开发者控制台
2. 上传生成的 ZIP 文件
3. 填写商店信息
4. 提交审核

## 🔧 扩展配置

### 1. 开发环境配置
```javascript
// 开发模式检测
const isDev = !('update_url' in chrome.runtime.getManifest());

if (isDev) {
    console.log('开发模式');
    // 开发特定逻辑
}
```

### 2. 生产环境优化
- 移除调试代码
- 压缩资源文件
- 优化图片大小
- 减少权限请求

## 📚 参考资料

### Chrome 扩展开发
- [Chrome Extensions API](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 迁移指南](https://developer.chrome.com/docs/extensions/mv3/intro/)

### 加密算法
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [TOTP RFC 6238](https://tools.ietf.org/html/rfc6238)

### WebDAV协议
- [WebDAV RFC 4918](https://tools.ietf.org/html/rfc4918)
- [CalDAV RFC 4791](https://tools.ietf.org/html/rfc4791)

## 🤝 贡献指南

### 1. 代码规范
- 使用 ESLint 配置
- 遵循 JavaScript Standard Style
- 添加必要的注释
- 编写对应的测试

### 2. 提交规范
```
type(scope): description

body

footer
```

类型：
- `feat`: 新功能
- `fix`: 修复
- `docs`: 文档
- `style`: 格式
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建

### 3. Pull Request
1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 创建 Pull Request
5. 等待代码审查

---

如有问题，请查看项目 Issues 或创建新的 Issue。
