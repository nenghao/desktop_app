/**
 * 平台环境检测工具
 * 用于检测当前运行环境（Electron 或 Web）
 */

/**
 * 检测是否在 Electron 环境中运行
 * @returns {boolean}
 */
export function isElectron() {
  // 方法1: 检查 window.electronAPI (通过 preload 注入)
  if (typeof window !== 'undefined' && window.electronAPI) {
    return true;
  }

  // 方法2: 检查 process.versions.electron (仅在 Node 集成时可用)
  if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
    return true;
  }

  // 方法3: 检查 navigator.userAgent
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    return navigator.userAgent.toLowerCase().includes('electron');
  }

  return false;
}

/**
 * 检测是否在纯 Web 环境中运行
 * @returns {boolean}
 */
export function isWeb() {
  return !isElectron();
}

/**
 * 检测是否在开发环境
 * @returns {boolean}
 */
export function isDev() {
  if (isElectron() && window.electronAPI?.isDev !== undefined) {
    return window.electronAPI.isDev;
  }
  // Web 环境通过 hostname 判断
  return (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('local'))
  );
}

/**
 * 获取当前平台信息
 * @returns {Object}
 */
export function getPlatformInfo() {
  return {
    isElectron: isElectron(),
    isWeb: isWeb(),
    isDev: isDev(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown'
  };
}

/**
 * 安全调用 Electron API
 * 在 Web 环境下返回 undefined 或默认值，不会报错
 * @param {Function} electronApiCall - Electron API 调用函数
 * @param {*} fallbackValue - Web 环境下的回退值
 * @returns {*}
 */
export async function safeElectronCall(electronApiCall, fallbackValue = undefined) {
  if (isElectron()) {
    try {
      return await electronApiCall();
    } catch (error) {
      console.error('❌ Electron API 调用失败:', error);
      return fallbackValue;
    }
  }
  return fallbackValue;
}

/**
 * 条件执行：仅在 Electron 环境下执行
 * @param {Function} callback
 */
export function onlyInElectron(callback) {
  if (isElectron()) {
    callback();
  }
}

/**
 * 条件执行：仅在 Web 环境下执行
 * @param {Function} callback
 */
export function onlyInWeb(callback) {
  if (isWeb()) {
    callback();
  }
}

// 打印平台信息（仅开发环境）
if (isDev()) {
  const info = getPlatformInfo();
  console.log('🖥️  平台检测:', {
    环境: info.isElectron ? 'Electron' : 'Web浏览器',
    开发模式: info.isDev ? '是' : '否',
    平台: info.platform,
    UserAgent: info.userAgent
  });
}

// 导出默认对象
export default {
  isElectron,
  isWeb,
  isDev,
  getPlatformInfo,
  safeElectronCall,
  onlyInElectron,
  onlyInWeb
};
