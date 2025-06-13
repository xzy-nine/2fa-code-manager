# 全局变量模块系统使用指南

## 概述

本项目已从ES6模块系统迁移到全局变量模块系统，以确保与Chrome扩展的Service Worker环境兼容。

## 系统架构

### 1. 模块加载顺序

所有模块必须按照以下顺序加载：

```html
<!-- 核心模块 -->
<script src="./js/crypto.js"></script>
<script src="./js/totp.js"></script>
<script src="./js/local-storage.js"></script>
<script src="./js/webdav.js"></script>
<script src="./js/qr-scanner.js"></script>

<!-- 页面特定模块 -->
<script src="./js/popup.js"></script>     <!-- 仅弹出页面 -->
<script src="./js/setting.js"></script>   <!-- 仅设置页面 -->

<!-- 全局管理器 -->
<script src="./js/globals.js"></script>   <!-- 仅Service Worker -->
<script src="./js/main.js"></script>      <!-- 统一入口 -->
```

### 2. 全局变量导出

每个模块都通过全局变量导出：

```javascript
// 获取全局作用域
const GlobalScope = (() => {
    if (typeof globalThis !== 'undefined') return globalThis;
    if (typeof window !== 'undefined') return window;
    if (typeof self !== 'undefined') return self;
    if (typeof global !== 'undefined') return global;
    throw new Error('无法确定全局作用域');
})();

// 导出到全局作用域
GlobalScope.ModuleName = ModuleName;
```

## 可用模块

### 核心模块类

- `CryptoManager` - 加密解密管理器
- `TOTPGenerator` - TOTP验证码生成器
- `LocalStorageManager` - 本地存储管理器
- `WebDAVClient` - WebDAV客户端
- `QRScanner` - 二维码扫描器

### 页面管理器

- `PopupManager` - 弹出页面管理器
- `SettingManager` - 设置页面管理器

### 实例

- `popupManager` - PopupManager的单例实例
- `settingManager` - SettingManager的单例实例

### 全局对象

- `App` - 应用主类
- `app` - App的单例实例
- `Utils` - 工具函数集合
- `ModuleConfig` - 模块配置对象
- `VERSION` - 版本信息
- `BUILD_DATE` - 构建日期

### 别名（向后兼容）

- `Crypto` → `CryptoManager`
- `TOTP` → `TOTPGenerator`
- `WebDAV` → `WebDAVClient`
- `Storage` → `LocalStorageManager`
- `QRCode` → `QRScanner`
- `Popup` → `PopupManager`
- `Settings` → `SettingManager`
- `Config` → `ModuleConfig`

## 使用方法

### 1. 在HTML页面中使用

```html
<!DOCTYPE html>
<html>
<head>
    <title>示例页面</title>
</head>
<body>
    <!-- 按顺序加载模块 -->
    <script src="./js/crypto.js"></script>
    <script src="./js/totp.js"></script>
    <script src="./js/local-storage.js"></script>
    <script src="./js/webdav.js"></script>
    <script src="./js/qr-scanner.js"></script>
    <script src="./js/main.js"></script>
    
    <script>
        // 使用模块
        document.addEventListener('DOMContentLoaded', async () => {
            // 直接使用全局变量
            const crypto = new CryptoManager();
            const totp = new TOTPGenerator();
            
            // 或使用别名
            const crypto2 = new Crypto();
            const totp2 = new TOTP();
            
            // 使用App实例
            await app.init();
            const utils = app.getUtils();
            const config = app.getConfig();
        });
    </script>
</body>
</html>
```

### 2. 在Service Worker中使用

```javascript
// background.js
importScripts('./crypto.js');
importScripts('./totp.js');
importScripts('./local-storage.js');
importScripts('./webdav.js');
importScripts('./globals.js');

// 使用Modules访问器
const crypto = Modules.getCrypto();
const totp = Modules.getTOTP();
const storage = Modules.getStorage();
const webdav = Modules.getWebDAV();

// 或直接使用全局变量
const crypto2 = new CryptoManager();
const totp2 = new TOTPGenerator();
```

### 3. 模块间依赖

模块现在通过全局变量获取依赖：

```javascript
class LocalStorageManager {
    constructor() {
        // 获取全局作用域
        const GlobalScope = (() => {
            if (typeof globalThis !== 'undefined') return globalThis;
            if (typeof window !== 'undefined') return window;
            if (typeof self !== 'undefined') return self;
            if (typeof global !== 'undefined') return global;
            throw new Error('无法确定全局作用域');
        })();
        
        // 从全局变量获取依赖
        this.cryptoManager = new GlobalScope.CryptoManager();
    }
}
```

## 迁移指南

### 从ES6模块迁移

1. **移除所有import/export语句**
   ```javascript
   // 删除这些
   import { CryptoManager } from './crypto.js';
   export { TOTPGenerator };
   
   // 使用全局变量替代
   const crypto = new GlobalScope.CryptoManager();
   GlobalScope.TOTPGenerator = TOTPGenerator;
   ```

2. **更新HTML中的script标签**
   ```html
   <!-- 从 -->
   <script type="module" src="./js/main.js"></script>
   
   <!-- 改为 -->
   <script src="./js/crypto.js"></script>
   <script src="./js/totp.js"></script>
   <!-- ... 其他模块 -->
   <script src="./js/main.js"></script>
   ```

3. **更新模块依赖**
   ```javascript
   // 从
   constructor() {
       this.crypto = new CryptoManager();
   }
   
   // 改为
   constructor() {
       const GlobalScope = (() => {
           if (typeof globalThis !== 'undefined') return globalThis;
           if (typeof window !== 'undefined') return window;
           if (typeof self !== 'undefined') return self;
           if (typeof global !== 'undefined') return global;
           throw new Error('无法确定全局作用域');
       })();
       
       this.crypto = new GlobalScope.CryptoManager();
   }
   ```

## 测试

使用提供的测试页面验证模块系统：

```bash
# 在浏览器中打开
test-modules-global.html
```

测试页面会验证：
- 模块加载状态
- 加密功能
- TOTP生成
- App实例
- 工具函数

## 注意事项

1. **加载顺序很重要** - 必须按依赖顺序加载模块
2. **全局命名空间** - 所有模块都在全局命名空间中，注意避免冲突
3. **向后兼容** - 保留了别名以确保现有代码继续工作
4. **Service Worker兼容** - 现在完全兼容Chrome扩展的Service Worker环境
5. **错误处理** - 模块加载失败时会抛出清晰的错误信息

## 故障排除

### 常见问题

1. **模块未定义错误**
   - 检查脚本加载顺序
   - 确保所有依赖模块都已加载

2. **Service Worker中模块不可用**
   - 使用`importScripts`加载所有需要的脚本
   - 使用`Modules`访问器或直接全局变量

3. **循环依赖**
   - 模块间现在通过全局变量解决循环依赖问题
   - 确保在构造函数中延迟加载依赖

## 扩展新模块

添加新模块时遵循以下模式：

```javascript
// new-module.js
class NewModule {
    constructor() {
        // 获取依赖
        const GlobalScope = (() => {
            if (typeof globalThis !== 'undefined') return globalThis;
            if (typeof window !== 'undefined') return window;
            if (typeof self !== 'undefined') return self;
            if (typeof global !== 'undefined') return global;
            throw new Error('无法确定全局作用域');
        })();
        
        this.dependency = new GlobalScope.SomeDependency();
    }
    
    // 模块功能...
}

// 全局导出
(() => {
    const GlobalScope = (() => {
        if (typeof globalThis !== 'undefined') return globalThis;
        if (typeof window !== 'undefined') return window;
        if (typeof self !== 'undefined') return self;
        if (typeof global !== 'undefined') return global;
        throw new Error('无法确定全局作用域');
    })();
    
    GlobalScope.NewModule = NewModule;
})();
```

然后在需要的地方添加脚本标签：

```html
<script src="./js/new-module.js"></script>
```

这样就完成了全局变量模块系统的设置和使用！
