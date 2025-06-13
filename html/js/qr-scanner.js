// 二维码扫描模块
class QRScanner {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.context = null;
        this.stream = null;
        this.scanning = false;
        this.scanInterval = null;
    }    // 初始化摄像头
    async initCamera(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.context = this.canvas.getContext('2d');

        try {
            // 检查浏览器是否支持媒体设备
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('浏览器不支持摄像头访问');
            }

            // 首先尝试基本的视频约束
            let constraints = {
                video: {
                    width: { ideal: 640, max: 1280 },
                    height: { ideal: 480, max: 720 },
                    facingMode: 'environment' // 优先使用后置摄像头
                }
            };

            try {
                this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (constraintError) {
                console.warn('使用完整约束失败，尝试简化约束:', constraintError);
                // 如果完整约束失败，尝试简化的约束
                constraints = {
                    video: true
                };
                this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            }

            this.video.srcObject = this.stream;
            
            // 等待视频加载
            return new Promise((resolve) => {
                this.video.addEventListener('loadedmetadata', () => {
                    resolve({ success: true });
                }, { once: true });
                
                // 设置超时
                setTimeout(() => {
                    resolve({ success: false, message: '视频加载超时' });
                }, 5000);
            });
            
        } catch (error) {
            console.error('摄像头初始化失败:', error);
            
            let message = '未知错误';
            
            switch (error.name) {
                case 'NotAllowedError':
                    message = '请允许访问摄像头权限';
                    break;
                case 'NotFoundError':
                    message = '未找到摄像头设备';
                    break;
                case 'NotReadableError':
                    message = '摄像头被其他应用占用';
                    break;
                case 'OverconstrainedError':
                    message = '摄像头不支持请求的配置，请尝试不同的设备';
                    break;
                case 'SecurityError':
                    message = '安全限制：扩展popup页面可能无法访问摄像头';
                    break;
                case 'TypeError':
                    message = '浏览器不支持摄像头访问';
                    break;                default:
                    message = `摄像头错误: ${error.message || error.toString()}`;
                    // 添加更详细的错误信息用于调试
                    console.error('详细错误信息:', {
                        name: error.name,
                        message: error.message,
                        stack: error.stack,
                        constraint: error.constraint
                    });
            }
            
            return { 
                success: false, 
                message: message,
                error: error
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
    }    // 检测二维码
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
            
            // 使用jsQR库进行二维码检测
            const qrData = this.decodeQRCode(imageData);
            
            if (qrData) {
                onDetected(qrData);
            }
        } catch (error) {
            console.error('二维码检测失败:', error);
        }
    }    // 使用jsQR库解码二维码
    decodeQRCode(imageData) {
        try {
            // 检查jsQR是否可用
            if (typeof jsQR === 'undefined') {
                console.error('jsQR库未加载，无法进行二维码解析');
                throw new Error('二维码解析库未加载');
            }

            // 使用jsQR解码
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });

            if (code) {
                console.log('二维码解码成功:', code.data);
                return code.data;
            }

            return null;
        } catch (error) {
            console.error('二维码解码失败:', error);
            throw error;
        }    }

    // 拍照识别
    async captureAndScan() {
        if (!this.video || !this.canvas) {
            return { success: false, message: '摄像头未初始化' };
        }

        try {
            // 绘制当前帧
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            this.context.drawImage(this.video, 0, 0);            // 获取图像数据并检测
            const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
            
            try {
                const qrData = this.decodeQRCode(imageData);
                
                if (qrData) {
                    return { success: true, data: qrData };
                } else {
                    return { success: false, message: '未检测到二维码' };
                }
            } catch (decodeError) {
                return { success: false, message: '二维码解析失败: ' + decodeError.message };
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
                    stream.getTracks().forEach(track => track.stop());                  // 检测二维码
                    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                    
                    try {
                        const qrData = this.decodeQRCode(imageData);
                        
                        if (qrData) {
                            resolve({ success: true, data: qrData });
                        } else {
                            resolve({ success: false, message: '屏幕中未检测到二维码' });
                        }
                    } catch (decodeError) {
                        resolve({ success: false, message: '二维码解析失败: ' + decodeError.message });
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
                    context.drawImage(img, 0, 0);                    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                    
                    try {
                        const qrData = this.decodeQRCode(imageData);
                        
                        if (qrData) {
                            resolve({ success: true, data: qrData });
                        } else {
                            resolve({ success: false, message: '图片中未检测到二维码' });
                        }
                    } catch (decodeError) {
                        resolve({ success: false, message: '二维码解析失败: ' + decodeError.message });
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
        }        return capabilities;    }
}

// 全局变量导出 - 支持多种环境
(() => {
    GlobalScope.QRScanner = QRScanner;
})();
