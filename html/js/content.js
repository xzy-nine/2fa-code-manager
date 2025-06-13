// 内容脚本 - 负责页面交互
// Content Script环境不支持ES6模块，使用全局类
class ContentScript {
    constructor() {
        this.selectedInput = null;
        this.init();
    }

    init() {
        this.addInputListeners();
        this.setupMessageListener();
        this.createIndicator();
    }

    // 添加输入框监听器
    addInputListeners() {
        // 监听所有可能的2FA输入框
        const selectors = [
            'input[type="text"]',
            'input[type="number"]',
            'input[type="tel"]',
            'input[placeholder*="验证码"]',
            'input[placeholder*="code"]',
            'input[placeholder*="token"]',
            'input[placeholder*="otp"]',
            'input[id*="code"]',
            'input[id*="otp"]',
            'input[id*="token"]',
            'input[class*="code"]',
            'input[class*="otp"]',
            'input[class*="token"]',
            'input[name*="code"]',
            'input[name*="otp"]',
            'input[name*="token"]'
        ];

        document.addEventListener('click', (e) => {
            const target = e.target;
            
            // 检查是否为潜在的2FA输入框
            if (this.isPotential2FAInput(target)) {
                this.selectInput(target);
            }
        });

        // 监听焦点事件
        document.addEventListener('focusin', (e) => {
            const target = e.target;
            
            if (this.isPotential2FAInput(target)) {
                this.selectInput(target);
            }
        });
    }

    // 判断是否为潜在的2FA输入框
    isPotential2FAInput(element) {
        if (element.tagName !== 'INPUT') return false;
        
        const type = element.type.toLowerCase();
        const validTypes = ['text', 'number', 'tel', 'password'];
        
        if (!validTypes.includes(type)) return false;

        // 检查长度限制（通常2FA码是4-8位）
        const maxLength = element.maxLength;
        if (maxLength && maxLength >= 4 && maxLength <= 8) return true;

        // 检查属性和内容
        const attributes = [
            element.placeholder,
            element.id,
            element.className,
            element.name,
            element.getAttribute('aria-label')
        ].join(' ').toLowerCase();

        const keywords = [
            'code', 'otp', 'token', 'verify', 'auth', 'factor',
            '验证码', '验证', '动态码', '口令', 'sms', 'totp'
        ];

        return keywords.some(keyword => attributes.includes(keyword));
    }

    // 选择输入框
    selectInput(input) {
        // 移除之前的选择
        if (this.selectedInput) {
            this.selectedInput.classList.remove('totp-selected');
        }

        this.selectedInput = input;
        input.classList.add('totp-selected');

        // 显示指示器
        this.showIndicator(input);

        // 通知背景脚本
        chrome.runtime.sendMessage({
            action: 'inputSelected',
            inputInfo: {
                id: input.id,
                name: input.name,
                placeholder: input.placeholder,
                maxLength: input.maxLength,
                type: input.type
            }
        });
    }

    // 创建指示器
    createIndicator() {
        if (document.getElementById('totp-indicator')) return;

        const indicator = document.createElement('div');
        indicator.id = 'totp-indicator';
        indicator.innerHTML = `
            <div class="totp-indicator-content">
                <span class="totp-icon">🔐</span>
                <span class="totp-text">已选择2FA输入框</span>
            </div>
        `;

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            #totp-indicator {
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                z-index: 10000;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                transform: translateY(-100px);
                opacity: 0;
                transition: all 0.3s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            #totp-indicator.show {
                transform: translateY(0);
                opacity: 1;
            }
            
            .totp-indicator-content {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .totp-icon {
                font-size: 14px;
            }
            
            .totp-selected {
                outline: 2px solid #667eea !important;
                outline-offset: 2px !important;
                box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2) !important;
                transition: all 0.2s ease !important;
            }
            
            .totp-filling {
                background: linear-gradient(90deg, #f0f4ff 0%, #e0e7ff 50%, #f0f4ff 100%) !important;
                background-size: 200% 100% !important;
                animation: fillAnimation 1s ease-in-out !important;
            }
            
            @keyframes fillAnimation {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(indicator);
    }

    // 显示指示器
    showIndicator(input) {
        const indicator = document.getElementById('totp-indicator');
        if (indicator) {
            indicator.classList.add('show');
            
            // 3秒后隐藏
            setTimeout(() => {
                indicator.classList.remove('show');
            }, 3000);
        }
    }

    // 设置消息监听器
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'fillCode') {
                this.fillCode(message.code);
                sendResponse({ success: true });
            } else if (message.action === 'getSelectedInput') {
                sendResponse({ 
                    hasSelected: !!this.selectedInput,
                    inputInfo: this.selectedInput ? {
                        id: this.selectedInput.id,
                        name: this.selectedInput.name,
                        placeholder: this.selectedInput.placeholder,
                        maxLength: this.selectedInput.maxLength,
                        type: this.selectedInput.type
                    } : null
                });
            }
            
            return true;
        });
    }

    // 填充验证码
    fillCode(code) {
        if (!this.selectedInput) {
            this.showMessage('请先选择一个输入框', 'warning');
            return;
        }

        // 添加填充动画
        this.selectedInput.classList.add('totp-filling');

        // 模拟用户输入
        this.simulateUserInput(this.selectedInput, code);

        // 显示成功提示
        this.showMessage(`验证码已填充: ${code}`, 'success');

        // 移除动画
        setTimeout(() => {
            this.selectedInput.classList.remove('totp-filling');
        }, 1000);
    }

    // 模拟用户输入
    simulateUserInput(input, value) {
        // 聚焦输入框
        input.focus();

        // 清空当前值
        input.value = '';

        // 触发输入事件
        const inputEvent = new Event('input', { bubbles: true });
        const changeEvent = new Event('change', { bubbles: true });

        // 逐字符输入（模拟真实用户行为）
        let index = 0;
        const inputInterval = setInterval(() => {
            if (index < value.length) {
                input.value += value[index];
                input.dispatchEvent(inputEvent);
                index++;
            } else {
                clearInterval(inputInterval);
                input.dispatchEvent(changeEvent);
                
                // 触发其他可能的事件
                input.dispatchEvent(new Event('blur', { bubbles: true }));
                input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
            }
        }, 50); // 每50ms输入一个字符
    }

    // 显示消息
    showMessage(message, type = 'info') {
        // 移除现有消息
        const existingMessage = document.getElementById('totp-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // 创建新消息
        const messageDiv = document.createElement('div');
        messageDiv.id = 'totp-message';
        messageDiv.className = `totp-message totp-message-${type}`;
        messageDiv.textContent = message;

        // 添加样式
        if (!document.getElementById('totp-message-style')) {
            const style = document.createElement('style');
            style.id = 'totp-message-style';
            style.textContent = `
                .totp-message {
                    position: fixed;
                    top: 70px;
                    right: 20px;
                    padding: 12px 16px;
                    border-radius: 8px;
                    color: white;
                    font-size: 13px;
                    font-weight: 500;
                    z-index: 10001;
                    animation: slideInMessage 0.3s ease;
                    max-width: 300px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                
                .totp-message-success { background: #10b981; }
                .totp-message-error { background: #ef4444; }
                .totp-message-warning { background: #f59e0b; }
                .totp-message-info { background: #3b82f6; }
                
                @keyframes slideInMessage {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        // 添加到页面
        document.body.appendChild(messageDiv);

        // 自动移除
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    // 检测页面中的2FA输入框
    detectTOTPInputs() {
        const inputs = document.querySelectorAll('input');
        const potentialInputs = [];

        inputs.forEach(input => {
            if (this.isPotential2FAInput(input)) {
                potentialInputs.push({
                    element: input,
                    confidence: this.calculateConfidence(input)
                });
            }
        });

        // 按置信度排序
        potentialInputs.sort((a, b) => b.confidence - a.confidence);

        return potentialInputs;
    }

    // 计算输入框是否为2FA输入框的置信度
    calculateConfidence(input) {
        let confidence = 0;

        // 检查maxLength
        const maxLength = input.maxLength;
        if (maxLength >= 4 && maxLength <= 8) confidence += 30;
        if (maxLength === 6) confidence += 20; // 最常见的2FA长度

        // 检查type
        if (input.type === 'number') confidence += 25;
        if (input.type === 'tel') confidence += 20;
        if (input.type === 'text') confidence += 10;

        // 检查关键词
        const text = [
            input.placeholder,
            input.id,
            input.className,
            input.name,
            input.getAttribute('aria-label')
        ].join(' ').toLowerCase();

        const highConfidenceKeywords = ['otp', 'totp', '验证码', 'verification', 'authenticator'];
        const mediumConfidenceKeywords = ['code', 'token', 'verify', 'auth', 'sms'];
        const lowConfidenceKeywords = ['factor', 'security', '动态', '口令'];

        highConfidenceKeywords.forEach(keyword => {
            if (text.includes(keyword)) confidence += 25;
        });

        mediumConfidenceKeywords.forEach(keyword => {
            if (text.includes(keyword)) confidence += 15;
        });

        lowConfidenceKeywords.forEach(keyword => {
            if (text.includes(keyword)) confidence += 10;
        });

        // 检查输入框位置和上下文
        const label = this.findAssociatedLabel(input);
        if (label) {
            const labelText = label.textContent.toLowerCase();
            if (labelText.includes('验证码') || labelText.includes('code')) {
                confidence += 20;
            }
        }

        return confidence;
    }

    // 查找关联的标签
    findAssociatedLabel(input) {
        // 通过for属性查找
        if (input.id) {
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (label) return label;
        }

        // 查找父级或邻近的标签
        let parent = input.parentElement;
        while (parent && parent !== document.body) {
            const label = parent.querySelector('label');
            if (label) return label;
            parent = parent.parentElement;
        }

        return null;
    }

    // 自动检测并高亮2FA输入框
    autoDetectInputs() {
        const detectedInputs = this.detectTOTPInputs();
        
        if (detectedInputs.length > 0) {
            // 自动选择置信度最高的输入框
            const bestMatch = detectedInputs[0];
            if (bestMatch.confidence > 50) {
                this.selectInput(bestMatch.element);
            }
        }
    }

    // 页面变化监听
    observePageChanges() {
        const observer = new MutationObserver((mutations) => {
            let shouldRecheck = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.tagName === 'INPUT' || node.querySelector('input')) {
                                shouldRecheck = true;
                            }
                        }
                    });
                }
            });

            if (shouldRecheck) {
                setTimeout(() => {
                    this.autoDetectInputs();
                }, 500);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

// 初始化内容脚本
const contentScript = new ContentScript();

// 页面加载完成后自动检测
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            contentScript.autoDetectInputs();
            contentScript.observePageChanges();
        }, 1000);
    });
} else {
    setTimeout(() => {        contentScript.autoDetectInputs();
        contentScript.observePageChanges();
    }, 1000);
}

// 全局变量导出（Content Script环境）
if (typeof window !== 'undefined') {
    window.ContentScript = ContentScript;
    window.contentScript = contentScript;
}
