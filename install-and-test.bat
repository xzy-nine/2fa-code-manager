@echo off
echo ========================================
echo   2FA验证码管家 - 浏览器扩展
echo   安装和测试指南
echo ========================================
echo.

echo 1. 检查文件完整性...
if not exist "manifest.json" (
    echo [错误] manifest.json 文件缺失
    pause
    exit /b 1
)

if not exist "html\popup.html" (
    echo [错误] popup.html 文件缺失
    pause
    exit /b 1
)

if not exist "js\popup.js" (
    echo [错误] popup.js 文件缺失
    pause
    exit /b 1
)

echo [成功] 文件检查完成
echo.

echo 2. 安装步骤:
echo.
echo    a) 打开Chrome浏览器
echo    b) 地址栏输入: chrome://extensions/
echo    c) 开启右上角的 "开发者模式"
echo    d) 点击 "加载已解压的扩展程序"
echo    e) 选择当前文件夹: %~dp0
echo.

echo 3. 测试步骤:
echo.
echo    a) 安装完成后，在浏览器工具栏找到扩展图标
echo    b) 双击 test-page.html 打开测试页面
echo    c) 点击页面上的验证码输入框
echo    d) 点击扩展图标测试功能
echo.

echo 4. 功能说明:
echo.
echo    ✓ 智能识别2FA验证码输入框
echo    ✓ 二维码扫描导入配置
echo    ✓ WebDAV云端同步
echo    ✓ 本地验证码存储
echo    ✓ 生物识别验证
echo.

echo 5. 支持的WebDAV服务:
echo.
echo    ✓ Nextcloud
echo    ✓ ownCloud
echo    ✓ 坚果云
echo    ✓ Synology NAS
echo    ✓ QNAP NAS
echo.

echo ========================================
echo 按任意键打开测试页面...
pause >nul

start test-page.html

echo.
echo 测试页面已打开！
echo 请按照上述步骤安装和测试扩展。
echo.
echo 如有问题，请查看以下文档:
echo - README.md (项目说明)
echo - INSTALL.md (安装指南)
echo - DEVELOPMENT.md (开发指南)
echo.
pause
