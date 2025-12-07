/**
 * Questech 应用配置
 */

export const appConfig = {
  // 应用基本信息
  name: '奇境探索',
  displayName: '奇境探索',
  version: '2.0.0',
  description: '现代化的跨平台智能插件系统',
  author: '奇境探索 Team',
  buildTime: __BUILD_TIME__ || new Date().toISOString(),

  // 应用设置
  settings: {
    // 默认语言
    defaultLanguage: 'zh-CN',

    // 默认主题
    defaultTheme: 'auto',

    // 支持的语言
    supportedLanguages: ['zh-CN', 'en-US'],

    // 支持的主题
    supportedThemes: ['light', 'dark', 'auto'],

    // 调试模式
    debug: process.env.NODE_ENV === 'development',

    // 性能配置
    performance: {
      enableMonitoring: true,
      enableLazyLoading: true,
      enableCodeSplitting: true,
      maxCacheSize: 50 * 1024 * 1024, // 50MB
      cacheExpiration: 24 * 60 * 60 * 1000 // 24小时
    },

    // 智能体配置
    agents: {
      maxConcurrentAgents: 10,
      defaultLoadTimeout: 10000,
      enableHotReload: process.env.NODE_ENV === 'development',
      cacheEnabled: true
    },

    // UI配置
    ui: {
      animationDuration: 300,
      debounceDelay: 300,
      throttleDelay: 100,
      maxNotifications: 5,
      autoHideNotifications: true,
      notificationDuration: 5000
    },

    // 存储配置
    storage: {
      prefix: 'Questech_',
      enableCompression: true,
      maxStorageSize: 10 * 1024 * 1024, // 10MB
      enableEncryption: false
    }
  },

  // 路由配置
  router: {
    mode: 'hash', // 'hash' | 'history'
    base: '/',
    scrollBehavior: 'smooth',
    enableTransitions: true
  },

  // 错误处理配置
  errorHandling: {
    enableReporting: true,
    enableConsoleLogging: true,
    enableUserNotification: true,
    maxErrorReports: 100,
    reportingEndpoint: '/api/errors'
  },

  // 安全配置
  security: {
    enableCSP: true,
    enableSRI: true,
    allowedOrigins: ['http://localhost:3000', 'http://localhost:8888'],
    enableSandbox: true
  },

  // 功能开关
  features: {
    enableChat: true,
    enableAgentStore: true,
    enableSettings: true,
    enableAnalytics: false,
    enableExperimentalFeatures: process.env.NODE_ENV === 'development'
  },

  // 智能体分类配置
  agentCategories: [
    {
      id: 'all',
      name: '全部智能体',
      icon: '🤖',
      color: '#2196F3'
    },
    {
      id: 'tools',
      name: '工具类',
      icon: '🔧',
      color: '#4CAF50'
    },
    {
      id: 'data',
      name: '数据处理',
      icon: '📊',
      color: '#FF9800'
    },
    {
      id: 'image',
      name: '图像处理',
      icon: '🖼️',
      color: '#9C27B0'
    },
    {
      id: 'document',
      name: '文档处理',
      icon: '📄',
      color: '#F44336'
    },
    {
      id: 'network',
      name: '网络服务',
      icon: '🌐',
      color: '#00BCD4'
    },
    {
      id: 'utility',
      name: '实用工具',
      icon: '⚙️',
      color: '#607D8B'
    },
    {
      id: 'ai',
      name: 'AI助手',
      icon: '🧠',
      color: '#E91E63'
    }
  ],

  // 快捷键配置
  shortcuts: {
    toggleSidebar: 'Ctrl+B',
    openSearch: 'Ctrl+K',
    openSettings: 'Ctrl+,',
    toggleTheme: 'Ctrl+Shift+T',
    newChat: 'Ctrl+N',
    openAgentStore: 'Ctrl+P'
  },

  // 开发工具配置
  devTools: {
    enableVueDevtools: false,
    enableReduxDevtools: false,
    enablePerformancePanel: process.env.NODE_ENV === 'development',
    enableDebugPanel: process.env.NODE_ENV === 'development'
  }
};

// 冻结配置对象，防止意外修改
Object.freeze(appConfig);

export default appConfig;
