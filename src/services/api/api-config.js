/**
 * API配置文件
 * 统一管理所有API服务的baseURL和其他配置
 *
 * 环境说明：
 * - Web开发环境：使用相对路径 '/api/'，通过 Vite 代理到 http://192.168.0.103:10089
 * - Electron环境：直接使用 http://192.168.0.103:10089（本地开发服务器）
 * - Web生产环境：使用实际后端地址 https://api.baizesz.com
 */

/**
 * 检测是否在 Electron 环境
 */
const isElectron = () => {
  return typeof window !== 'undefined' && 
         window.process?.type === 'renderer' ||
         navigator.userAgent.toLowerCase().includes('electron');
};

/**
 * 检测是否为开发环境
 * 优先使用 Electron 的 isDev，其次使用 Vite 的 import.meta.env.DEV
 */
const isDevelopment = () => {
  // 在 Electron 环境中，优先使用 preload 暴露的 isDev
  if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.isDev === 'boolean') {
    return window.electronAPI.isDev;
  }
  // 否则使用 Vite 的环境变量（Web 环境）
  return import.meta.env.DEV;
};

/**
 * 获取API基础URL
 */
const getApiBaseURL = () => {
  // Electron 环境
  if (isElectron()) {
    // Electron 开发环境：使用本地开发服务器
    if (isDevelopment()) {
      return 'http://192.168.0.103:10089';
    }
    // Electron 生产环境（打包后）：使用线上地址
    return 'https://api.baizesz.com/';
  }

  // Web 环境
  if (isDevelopment()) {
    // Web 开发环境：使用 /api 前缀，由 Vite 代理处理
    return '/api/';
  } else {
    // Web 生产环境：线上地址（必须包含完整的协议和域名）
    return 'https://api.baizesz.com/';
  }
};

/**
 * API基础配置
 */
export const API_CONFIG = {
  // 基础URL - 根据环境自动选择
  baseURL: getApiBaseURL(),

  // 默认超时时间（毫秒）
  timeout: 30000,

  // 默认请求头
  defaultHeaders: {
    'Content-Type': 'application/json'
  }
};

/**
 * 缓存配置
 * 统一管理所有API请求的缓存时间间隔（毫秒）
 */

export const API_REQUEST_CACHE = {
  AGENTS_DATA: 10 * 60 * 1000,          // 智能体列表：10分钟
  AGENT_DETAIL: 10 * 60 * 1000,          // 智能体详情：5分钟
  SIDEBAR_CONFIG: 30 * 60 * 1000,       // 侧边栏配置：30分钟
  CHAT_MODELS: 10 * 60 * 1000,          // 聊天模型：10分钟
  CHAT_ROLES: 10 * 60 * 1000,           // 聊天角色：10分钟
  AIGC_CONTENT: 5 * 60 * 1000,          // AIGC内容：5分钟
  PERSPECTIVES: 30 * 60 * 1000,         // 分析视角：30分钟
};

/**
 * 设置全局API配置
 * @param {Object} config - 新的配置
 */
export function setApiConfig(config) {
  Object.assign(API_CONFIG, config);
}

/**
 * 获取baseURL
 * @returns {string} baseURL
 */
export function getBaseURL() {
  return API_CONFIG.baseURL;
}

/**
 * 设置baseURL（运行时动态修改）
 * @param {string} baseURL - 新的baseURL
 */
export function setBaseURL(baseURL) {
  const oldBaseURL = API_CONFIG.baseURL;
  API_CONFIG.baseURL = baseURL;
  console.log(`📡 [API Config] baseURL 已更新:`);
  console.log(`   旧值: ${oldBaseURL}`);
  console.log(`   新值: ${baseURL}`);
  console.log(`   当前环境: ${isDevelopment() ? '开发环境' : '生产环境'}`);
}

/**
 * 打印当前 API 配置信息（用于调试）
 */
export function printApiConfig() {
  const isElectronEnv = isElectron();
  
  console.log('');
  console.log('========================================');
  console.log('📡 API 配置信息');
  console.log('========================================');
  console.log(`环境类型: ${isElectronEnv ? 'Electron' : 'Web'}`);
  console.log(`环境模式: ${import.meta.env.MODE}`);
  console.log(`开发环境: ${isDevelopment() ? '是' : '否'}`);
  console.log(`生产环境: ${!isDevelopment() ? '是' : '否'}`);
  console.log(`Vite DEV: ${import.meta.env.DEV ? '是' : '否'}`);
  console.log(`Vite PROD: ${import.meta.env.PROD ? '是' : '否'}`);
  if (isElectronEnv && window.electronAPI) {
    console.log(`Electron isDev: ${window.electronAPI.isDev ? '是' : '否'}`);
  }
  console.log(`baseURL: ${API_CONFIG.baseURL}`);
  console.log(`timeout: ${API_CONFIG.timeout}ms`);
  console.log('----------------------------------------');
  console.log('请求流程:');
  
  if (isElectronEnv && isDevelopment()) {
    console.log('  Electron 开发 → http://192.168.0.103:10089/xxx');
  } else if (isElectronEnv && !isDevelopment()) {
    console.log('  Electron 生产 → https://api.baizesz.com/xxx');
  } else if (isDevelopment()) {
    console.log('  前端代码请求 → /api/xxx');
    console.log('  ↓');
    console.log('  Vite 代理转发 → http://192.168.0.103:10089/xxx');
  } else {
    console.log('  前端代码请求 → https://api.baizesz.com/xxx');
  }
  console.log('========================================');
  console.log('');
}

// 启动时自动打印配置信息
printApiConfig();
