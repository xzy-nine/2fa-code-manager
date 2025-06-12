// 二维码扫描模块
class QRScanner {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.context = null;
        this.stream = null;
        this.scanning = false;
        this.scanInterval = null;
    }

    // 初始化摄像头
    async initCamera(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.context = this.canvas.getContext('2d');

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // 优先使用后置摄像头
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            this.video.srcObject = this.stream;
            return { success: true };
        } catch (error) {
            console.error('摄像头初始化失败:', error);
            return { 
                success: false, 
                message: error.name === 'NotAllowedError' ? 
                    '请允许访问摄像头' : 
                    `摄像头错误: ${error.message}` 
            };
        }
    }

    // 开始扫描
    startScanning(onDetected) {
        if (this.scanning) return;

        this.scanning = true;
        this.scanInterval = setInterval(() => {
            this.detectQRCode(onDetected);
        }, 500); // 每500ms扫描一次
    }

    // 停止扫描
    stopScanning() {
        this.scanning = false;
        
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.video) {
            this.video.srcObject = null;
        }
    }

    // 检测二维码
    async detectQRCode(onDetected) {
        if (!this.video || !this.canvas || !this.context) return;

        try {
            // 设置canvas尺寸
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;

            // 绘制视频帧到canvas
            this.context.drawImage(this.video, 0, 0);

            // 获取图像数据
            const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
            
            // 使用简单的二维码检测算法
            const qrData = this.simpleQRDetection(imageData);
            
            if (qrData) {
                onDetected(qrData);
            }
        } catch (error) {
            console.error('二维码检测失败:', error);
        }
    }

    // 简单的二维码检测算法
    simpleQRDetection(imageData) {
        // 这里实现一个简化的二维码检测
        // 在实际项目中，建议使用成熟的库如jsQR
        
        // 转换为灰度图
        const grayData = this.toGrayScale(imageData);
        
        // 查找定位标记（简化版本）
        const patterns = this.findFinderPatterns(grayData, imageData.width, imageData.height);
        
        if (patterns.length >= 3) {
            // 尝试解码（这里返回模拟数据，实际需要完整的解码算法）
            return this.mockDecode();
        }
        
        return null;
    }

    // 转换为灰度图
    toGrayScale(imageData) {
        const data = imageData.data;
        const grayData = new Uint8Array(data.length / 4);
        
        for (let i = 0; i < data.length; i += 4) {
            const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
            grayData[i / 4] = gray;
        }
        
        return grayData;
    }

    // 查找定位标记
    findFinderPatterns(grayData, width, height) {
        const patterns = [];
        const minSize = Math.min(width, height) / 20;
        
        // 简化的定位标记检测
        for (let y = minSize; y < height - minSize; y += 5) {
            for (let x = minSize; x < width - minSize; x += 5) {
                if (this.isFinderPattern(grayData, width, x, y, minSize)) {
                    patterns.push({ x, y });
                }
            }
        }
        
        return patterns;
    }

    // 检查是否为定位标记
    isFinderPattern(grayData, width, x, y, size) {
        // 简化检测逻辑
        const threshold = 128;
        const center = grayData[y * width + x];
        
        return center < threshold; // 简单的黑点检测
    }

    // 模拟解码（实际项目中需要完整的解码算法）
    mockDecode() {
        // 这里应该返回实际的二维码内容
        // 为了演示，返回一个模拟的TOTP URI
        const mockURIs = [
            'otpauth://totp/Example:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example',
            'otpauth://totp/GitHub:user@github.com?secret=KBSWY3DPEHPK3PXP&issuer=GitHub',
            'otpauth://totp/Google:user@gmail.com?secret=LBSWY3DPEHPK3PXP&issuer=Google'
        ];
        
        return mockURIs[Math.floor(Math.random() * mockURIs.length)];
    }

    // 拍照识别
    async captureAndScan() {
        if (!this.video || !this.canvas) {
            return { success: false, message: '摄像头未初始化' };
        }

        try {
            // 绘制当前帧
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            this.context.drawImage(this.video, 0, 0);

            // 获取图像数据并检测
            const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const qrData = this.simpleQRDetection(imageData);

            if (qrData) {
                return { success: true, data: qrData };
            } else {
                return { success: false, message: '未检测到二维码' };
            }
        } catch (error) {
            return { success: false, message: `拍照失败: ${error.message}` };
        }
    }

    // 屏幕识别
    async scanScreen() {
        try {
            // 请求屏幕录制权限
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false
            });

            // 创建视频元素来显示屏幕内容
            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();

            return new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    // 创建canvas来捕获屏幕帧
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    
                    // 绘制屏幕内容
                    context.drawImage(video, 0, 0);
                    
                    // 停止屏幕录制
                    stream.getTracks().forEach(track => track.stop());
                    
                    // 检测二维码
                    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                    const qrData = this.simpleQRDetection(imageData);
                    
                    if (qrData) {
                        resolve({ success: true, data: qrData });
                    } else {
                        resolve({ success: false, message: '屏幕中未检测到二维码' });
                    }
                };
            });
        } catch (error) {
            return { 
                success: false, 
                message: error.name === 'NotAllowedError' ? 
                    '请允许屏幕录制权限' : 
                    `屏幕识别失败: ${error.message}` 
            };
        }
    }

    // 从文件扫描二维码
    async scanFromFile(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    
                    canvas.width = img.width;
                    canvas.height = img.height;
                    context.drawImage(img, 0, 0);
                    
                    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                    const qrData = this.simpleQRDetection(imageData);
                    
                    if (qrData) {
                        resolve({ success: true, data: qrData });
                    } else {
                        resolve({ success: false, message: '图片中未检测到二维码' });
                    }
                };
                
                img.onerror = () => {
                    resolve({ success: false, message: '图片加载失败' });
                };
                
                img.src = e.target.result;
            };
            
            reader.onerror = () => {
                resolve({ success: false, message: '文件读取失败' });
            };
            
            reader.readAsDataURL(file);
        });
    }

    // 检查设备能力
    static async checkCapabilities() {
        const capabilities = {
            camera: false,
            screenCapture: false,
            fileReader: true
        };

        try {
            // 检查摄像头
            const devices = await navigator.mediaDevices.enumerateDevices();
            capabilities.camera = devices.some(device => device.kind === 'videoinput');
        } catch (error) {
            console.log('无法检查摄像头设备');
        }

        try {
            // 检查屏幕录制
            capabilities.screenCapture = 'getDisplayMedia' in navigator.mediaDevices;
        } catch (error) {
            console.log('不支持屏幕录制');
        }

        return capabilities;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QRScanner;
} else {
    window.QRScanner = QRScanner;
}
