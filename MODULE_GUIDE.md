# 模块使用指南

本项目已重构为ES6模块系统，同时支持Service Worker环境的全局变量访问。

## 架构说明

### ES6模块导出
所有核心模块都同时提供了ES6模块导出和全局变量导出：
- `crypto.js` - 加密管理器 (CryptoManager)
- `totp.js` - TOTP验证码生成器 (TOTPGenerator)
- `local-storage.js` - 本地存储管理器 (LocalStorageManager)
- `webdav.js` - WebDAV客户端 (WebDAVClient)
- `qr-scanner.js` - QR扫描器 (QRScanner)
- `popup.js` - 弹窗管理器 (PopupManager)
- `setting.js` - 设置管理器 (SettingManager)

### 统一入口
- `main.js` - ES6模块统一入口，用于popup.html和setting.html
- `globals.js` - 全局变量访问器，用于Service Worker环境

## 使用方式

### 1. 在HTML页面中使用 (popup.html, setting.html)

```html
<!-- 只需引入main.js -->
<script type="module" src="./js/main.js"></script>
```

```javascript
// 在页面脚本中使用ES6导入
import { CryptoManager, TOTPGenerator } from './js/main.js';

// 或使用别名
import { Crypto, TOTP } from './js/main.js';

// 使用预创建的实例
import { popupManager, settingManager } from './js/main.js';
```

### 2. 在Service Worker中使用 (background.js)

```javascript
// Service Worker环境使用importScripts
importScripts('./crypto.js');
importScripts('./totp.js');
importScripts('./local-storage.js');
importScripts('./webdav.js');
importScripts('./globals.js');

// 使用全局变量创建实例
const crypto = new CryptoManager();
const totp = new TOTPGenerator();

// 或使用Modules访问器
const crypto = Modules.getCrypto();
const totp = Modules.getTOTP();
```

### 3. 在Content Script中使用 (content.js)

Content Script已修改为使用全局变量，因为Chrome扩展的content script不支持ES6模块：

```javascript
// content.js中直接使用全局类
class ContentScript {
    // 实现逻辑
}

// 全局变量暴露
window.ContentScript = ContentScript;
```

## 模块访问器 (Modules)

为Service Worker环境提供了统一的模块访问器：

```javascript
// 检查模块是否可用
if (Modules.isAvailable('crypto')) {
    const crypto = Modules.getCrypto();
}

// 获取所有可用模块
const allModules = Modules.getAvailable();
```

## 环境兼容性

- **HTML页面**: 使用ES6模块 (`import`/`export`)
- **Service Worker**: 使用全局变量 (`importScripts`)
- **Content Script**: 使用全局变量
- **Node.js测试**: 支持ES6模块

## 导出统一说明

每个模块文件都包含双重导出：

```javascript
// 全局变量导出（用于Service Worker环境）
if (typeof globalThis !== 'undefined') {
    globalThis.CryptoManager = CryptoManager;
} else if (typeof window !== 'undefined') {
    window.CryptoManager = CryptoManager;
} else if (typeof self !== 'undefined') {
    self.CryptoManager = CryptoManager;
}

// ES6 模块导出
export { CryptoManager };
```

这样确保了在所有环境中都能正确访问模块。
