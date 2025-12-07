/**
 * Questech 系统检测库
 * 用于在网页中检测用户的操作系统和处理器架构
 * 
 * 使用方法:
 * const detector = new QuestechSystemDetector();
 * const info = detector.getSystemInfo();
 * console.log(info); // { os: 'windows', arch: 'x64', browser: 'Chrome', ... }
 */

class QuestechSystemDetector {
    constructor() {
        this.userAgent = navigator.userAgent;
        this.platform = navigator.platform;
        this.languages = navigator.languages || [navigator.language];
        this.maxTouchPoints = navigator.maxTouchPoints || 0;
    }

    /**
     * 检测操作系统
     * @returns {string} 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'unknown'
     */
    detectOS() {
        const ua = this.userAgent.toLowerCase();
        const platform = this.platform.toLowerCase();

        // Windows
        if (ua.includes('win') || platform.includes('win')) {
            return 'windows';
        }
        
        // macOS
        if (ua.includes('mac') || platform.includes('mac')) {
            return 'macos';
        }
        
        // Linux (但不是Android)
        if ((ua.includes('linux') || platform.includes('linux')) && !ua.includes('android')) {
            return 'linux';
        }
        
        // Android
        if (ua.includes('android')) {
            return 'android';
        }
        
        // iOS
        if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
            return 'ios';
        }

        return 'unknown';
    }

    /**
     * 检测处理器架构
     * @returns {string} 'x64' | 'arm64' | 'x86' | 'unknown'
     */
    detectArchitecture() {
        const ua = this.userAgent.toLowerCase();
        const platform = this.platform.toLowerCase();

        // ARM64/AArch64 检测
        if (ua.includes('arm64') || ua.includes('aarch64') || 
            platform.includes('arm64') || platform.includes('aarch64') ||
            ua.includes('apple silicon')) {
            return 'arm64';
        }

        // x64 检测
        if (ua.includes('x86_64') || ua.includes('x64') || 
            ua.includes('win64') || ua.includes('wow64') || 
            platform.includes('x86_64') || platform.includes('win64')) {
            return 'x64';
        }

        // x86 (32位) 检测
        if (ua.includes('i386') || ua.includes('i686') || 
            platform.includes('i386') || platform.includes('win32') ||
            ua.includes('x86') && !ua.includes('x86_64')) {
            return 'x86';
        }

        // 现代设备默认假设为x64
        const os = this.detectOS();
        if (['windows', 'macos', 'linux'].includes(os)) {
            return 'x64';
        }

        return 'unknown';
    }

    /**
     * 检测浏览器
     * @returns {string} 浏览器名称
     */
    detectBrowser() {
        const ua = this.userAgent;
        
        if (ua.includes('Edg/')) {
            return 'Edge';
        } else if (ua.includes('Chrome/') && !ua.includes('Edg/')) {
            return 'Chrome';
        } else if (ua.includes('Firefox/')) {
            return 'Firefox';
        } else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
            return 'Safari';
        } else if (ua.includes('Opera/') || ua.includes('OPR/')) {
            return 'Opera';
        }
        
        return 'Unknown';
    }

    /**
     * 检测设备类型
     * @returns {string} 'desktop' | 'mobile' | 'tablet'
     */
    detectDeviceType() {
        const os = this.detectOS();
        
        // 移动设备
        if (['android', 'ios'].includes(os)) {
            // 简单的平板检测
            if (this.maxTouchPoints > 1 && window.screen.width >= 768) {
                return 'tablet';
            }
            return 'mobile';
        }
        
        // 桌面设备
        return 'desktop';
    }

    /**
     * 获取主要语言
     * @returns {string} 语言代码
     */
    getPrimaryLanguage() {
        const lang = this.languages[0] || navigator.language || 'en';
        
        // 中文特殊处理
        if (lang.toLowerCase().startsWith('zh')) {
            if (lang.includes('TW') || lang.includes('HK') || lang.includes('MO')) {
                return 'zh-TW';
            }
            return 'zh-CN';
        }
        
        return lang.split('-')[0].toLowerCase();
    }

    /**
     * 检测是否支持Questech
     * @returns {object} 支持信息
     */
    checkQuestechSupport() {
        const os = this.detectOS();
        const arch = this.detectArchitecture();
        const deviceType = this.detectDeviceType();
        
        const support = {
            supported: false,
            reason: '',
            recommendation: ''
        };

        // 检查设备类型
        if (deviceType !== 'desktop') {
            support.reason = 'Questech 仅支持桌面设备';
            support.recommendation = '请在 Windows、macOS 或 Linux 电脑上使用';
            return support;
        }

        // 检查操作系统
        if (os === 'windows') {
            if (arch === 'x86') {
                support.reason = '需要64位Windows系统';
                support.recommendation = '请升级到64位Windows系统';
                return support;
            }
            support.supported = true;
            return support;
        }

        if (['macos', 'linux'].includes(os)) {
            support.reason = `${os === 'macos' ? 'macOS' : 'Linux'} 版本开发中`;
            support.recommendation = '目前仅支持Windows，其他版本敬请期待';
            return support;
        }

        support.reason = '不支持的操作系统';
        support.recommendation = '请使用Windows、macOS或Linux系统';
        return support;
    }

    /**
     * 获取完整的系统信息
     * @returns {object} 系统信息对象
     */
    getSystemInfo() {
        const os = this.detectOS();
        const arch = this.detectArchitecture();
        const browser = this.detectBrowser();
        const deviceType = this.detectDeviceType();
        const language = this.getPrimaryLanguage();
        const support = this.checkQuestechSupport();

        return {
            os,
            arch,
            browser,
            deviceType,
            language,
            support,
            raw: {
                userAgent: this.userAgent,
                platform: this.platform,
                languages: this.languages,
                maxTouchPoints: this.maxTouchPoints
            }
        };
    }

    /**
     * 获取推荐的下载链接
     * @param {string} baseUrl 下载基础URL
     * @returns {string|null} 下载链接
     */
    getRecommendedDownloadUrl(baseUrl = 'https://github.com/your-username/Questech/releases/download/v2.0.0/') {
        const info = this.getSystemInfo();
        
        if (!info.support.supported) {
            return null;
        }

        if (info.os === 'windows') {
            if (info.arch === 'arm64') {
                return baseUrl + 'Questech-Setup-2.0.0-arm64.exe';
            } else {
                return baseUrl + 'Questech-Setup-2.0.0.exe';
            }
        }

        return null;
    }

    /**
     * 获取系统显示名称
     * @returns {string} 显示名称
     */
    getDisplayName() {
        const info = this.getSystemInfo();
        const osNames = {
            'windows': 'Windows',
            'macos': 'macOS',
            'linux': 'Linux',
            'android': 'Android',
            'ios': 'iOS',
            'unknown': '未知系统'
        };
        
        const osName = osNames[info.os] || '未知系统';
        const archName = info.arch.toUpperCase();
        
        return `${osName} ${archName}`;
    }
}

// 如果在浏览器环境中，添加到全局对象
if (typeof window !== 'undefined') {
    window.QuestechSystemDetector = QuestechSystemDetector;
}

// 如果在Node.js环境中，导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuestechSystemDetector;
}

// 使用示例和测试函数
function testSystemDetection() {
    const detector = new QuestechSystemDetector();
    const info = detector.getSystemInfo();
    
    console.log('🖥️ 系统检测结果:');
    console.log('操作系统:', info.os);
    console.log('架构:', info.arch);
    console.log('浏览器:', info.browser);
    console.log('设备类型:', info.deviceType);
    console.log('语言:', info.language);
    console.log('显示名称:', detector.getDisplayName());
    console.log('支持状态:', info.support);
    console.log('推荐下载:', detector.getRecommendedDownloadUrl());
    
    return info;
}

// 自动测试（如果在浏览器中）
if (typeof window !== 'undefined' && window.console) {
    // 延迟执行，避免影响页面加载
    setTimeout(() => {
        if (window.location.search.includes('test=true')) {
            testSystemDetection();
        }
    }, 1000);
}
