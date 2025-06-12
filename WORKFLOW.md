# GitHub 工作流说明

## 工作流文件

项目包含以下GitHub Actions工作流：

### 1. 构建和测试 (`.github/workflows/build.yml`)

**触发条件:**
- 推送到 `main` 或 `develop` 分支
- 向 `main` 分支提交Pull Request
- 创建Release

**功能:**
- 代码检出和Node.js环境设置
- 安装依赖并运行验证
- 执行测试套件
- 构建和打包扩展
- 上传构建产物作为artifacts

### 2. 发布管理 (`.github/workflows/release.yml`)

**触发条件:**
- 推送版本标签 (`v*.*.*`)

**功能:**
- 自动构建扩展包
- 从CHANGELOG.md提取发布说明
- 创建GitHub Release
- 上传扩展文件和ZIP包

### 3. Chrome Web Store发布 (`.github/workflows/chrome-store.yml`)

**触发条件:**
- 正式版Release发布（非预发布）

**功能:**
- 自动发布到Chrome Web Store
- 需要设置 `CHROME_STORE_KEYS` secret

### 4. 代码质量检查 (`.github/workflows/quality.yml`)

**触发条件:**
- 推送到 `main` 或 `develop` 分支
- Pull Request

**功能:**
- 代码风格和格式检查
- 扩展包大小验证
- 安全扫描
- 权限检查
- 生成质量报告

## 使用说明

### 准备发布

1. **更新版本号**
   ```bash
   # 更新package.json和manifest.json中的版本号
   npm version patch  # 或 minor, major
   ```

2. **更新CHANGELOG.md**
   - 添加新版本的更新内容
   - 按照现有格式记录变更

3. **提交代码**
   ```bash
   git add .
   git commit -m "chore: release v1.0.1"
   git push origin main
   ```

### 创建Release

1. **创建标签**
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

2. **或通过GitHub界面**
   - 访问仓库的Releases页面
   - 点击"Create a new release"
   - 填写标签版本和发布信息

### Chrome Web Store发布

1. **设置Secrets**
   - 在GitHub仓库设置中添加 `CHROME_STORE_KEYS`
   - 内容为Chrome Web Store API密钥JSON

2. **自动发布**
   - 创建正式版Release后自动触发
   - 监控Actions页面查看发布状态

## Secret配置

### CHROME_STORE_KEYS
Chrome Web Store发布需要的API密钥，格式如下：
```json
{
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret", 
  "refreshToken": "your-refresh-token",
  "extId": "your-extension-id"
}
```

## 本地开发

### 安装依赖
```bash
npm install
```

### 验证代码
```bash
npm run validate
```

### 运行测试
```bash
npm test
```

### 构建扩展
```bash
npm run build
```

### 打包发布
```bash
npm run package
```

## 注意事项

1. **版本号同步**: 确保package.json和manifest.json中的版本号保持一致
2. **CHANGELOG更新**: 每次发布前更新CHANGELOG.md
3. **测试验证**: 发布前确保所有测试通过
4. **权限检查**: 新增权限需要在代码质量检查中通过验证
5. **文件大小**: 扩展包大小不能超过5MB

## 监控和调试

- 查看Actions执行状态: `https://github.com/your-username/2fa-code-manager/actions`
- 下载构建产物: 在Actions页面的具体执行中下载artifacts
- 查看质量报告: 在quality-check job中下载质量报告
