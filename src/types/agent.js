/**
 * 智能体类型定义和接口规范
 */

/**
 * 智能体基础配置接口
 */
export const AgentConfigSchema = {
  // 基本信息
  id: 'string',                    // 唯一标识符
  name: 'string',                  // 显示名称
  version: 'string',               // 版本号
  description: 'string',           // 描述信息
  author: 'string',                // 作者
  
  // 分类和标签
  category: 'string',              // 分类 (tools, data, document, etc.)
  tags: 'array',                   // 标签数组
  keywords: 'array',               // 关键词
  
  // 图标和样式
  icon: 'string',                  // 图标 (emoji或路径)
  color: 'string',                 // 主题色
  banner: 'string',                // 横幅图片
  
  // 功能配置
  features: 'array',               // 功能列表
  capabilities: 'object',          // 能力配置
  
  // 技术配置
  executable: 'string',            // 可执行文件路径
  entryPoint: 'string',            // 入口点
  dependencies: 'array',           // 依赖项
  
  // 权限配置
  permissions: 'array',            // 权限列表
  sandbox: 'boolean',              // 是否沙箱运行
  
  // 生命周期
  lifecycle: 'object',             // 生命周期钩子
  
  // 路由配置
  routes: 'array',                 // 子路由配置
  
  // API配置
  api: 'object',                   // API接口配置
  
  // 状态配置
  state: 'object',                 // 状态配置
  
  // 元数据
  metadata: 'object'               // 额外元数据
};

/**
 * 智能体状态枚举
 */
export const AgentStatus = {
  INSTALLING: 'installing',        // 安装中
  INSTALLED: 'installed',          // 已安装
  LOADING: 'loading',              // 加载中
  LOADED: 'loaded',                // 已加载
  RUNNING: 'running',              // 运行中
  PAUSED: 'paused',                // 暂停
  STOPPED: 'stopped',              // 已停止
  ERROR: 'error',                  // 错误状态
  UNINSTALLING: 'uninstalling',   // 卸载中
  UNINSTALLED: 'uninstalled'       // 已卸载
};

/**
 * 智能体权限枚举
 */
export const AgentPermissions = {
  FILE_READ: 'file:read',          // 文件读取
  FILE_WRITE: 'file:write',        // 文件写入
  NETWORK_ACCESS: 'network:access', // 网络访问
  SYSTEM_INFO: 'system:info',      // 系统信息
  CLIPBOARD: 'clipboard',          // 剪贴板
  NOTIFICATIONS: 'notifications',   // 通知
  CAMERA: 'camera',                // 摄像头
  MICROPHONE: 'microphone',        // 麦克风
  LOCATION: 'location',            // 位置信息
  STORAGE: 'storage'               // 本地存储
};

/**
 * 智能体分类枚举
 */
export const AgentCategories = {
  TOOLS: 'tools',                  // 工具类
  DATA: 'data',                    // 数据处理
  DOCUMENT: 'document',            // 文档处理
  MEDIA: 'media',                  // 媒体处理
  COMMUNICATION: 'communication',   // 通信工具
  PRODUCTIVITY: 'productivity',     // 生产力工具
  ENTERTAINMENT: 'entertainment',   // 娱乐工具
  EDUCATION: 'education',          // 教育工具
  DEVELOPMENT: 'development',      // 开发工具
  SYSTEM: 'system'                 // 系统工具
};

/**
 * 智能体生命周期钩子
 */
export const AgentLifecycleHooks = {
  // 安装阶段
  beforeInstall: 'beforeInstall',   // 安装前
  onInstall: 'onInstall',          // 安装中
  afterInstall: 'afterInstall',    // 安装后
  
  // 加载阶段
  beforeLoad: 'beforeLoad',        // 加载前
  onLoad: 'onLoad',                // 加载中
  afterLoad: 'afterLoad',          // 加载后
  
  // 启动阶段
  beforeStart: 'beforeStart',      // 启动前
  onStart: 'onStart',              // 启动中
  afterStart: 'afterStart',        // 启动后
  
  // 运行阶段
  onUpdate: 'onUpdate',            // 更新时
  onMessage: 'onMessage',          // 消息接收
  onError: 'onError',              // 错误处理
  
  // 停止阶段
  beforeStop: 'beforeStop',        // 停止前
  onStop: 'onStop',                // 停止中
  afterStop: 'afterStop',          // 停止后
  
  // 卸载阶段
  beforeUninstall: 'beforeUninstall', // 卸载前
  onUninstall: 'onUninstall',      // 卸载中
  afterUninstall: 'afterUninstall' // 卸载后
};

/**
 * 智能体API接口类型
 */
export const AgentAPITypes = {
  HTTP: 'http',                    // HTTP接口
  WEBSOCKET: 'websocket',          // WebSocket接口
  IPC: 'ipc',                      // 进程间通信
  FILE: 'file',                    // 文件接口
  STREAM: 'stream'                 // 流接口
};

/**
 * 智能体消息类型
 */
export const AgentMessageTypes = {
  COMMAND: 'command',              // 命令消息
  QUERY: 'query',                  // 查询消息
  RESPONSE: 'response',            // 响应消息
  EVENT: 'event',                  // 事件消息
  ERROR: 'error',                  // 错误消息
  LOG: 'log'                       // 日志消息
};

/**
 * 智能体配置验证器
 */
export class AgentConfigValidator {
  static validate(config) {
    const errors = [];
    
    // 必填字段验证
    const requiredFields = ['id', 'name', 'version', 'description', 'category'];
    requiredFields.forEach(field => {
      if (!config[field]) {
        errors.push(`缺少必填字段: ${field}`);
      }
    });
    
    // ID格式验证
    if (config.id && !/^[a-z0-9-]+$/.test(config.id)) {
      errors.push('ID只能包含小写字母、数字和连字符');
    }
    
    // 版本号验证
    if (config.version && !/^\d+\.\d+\.\d+$/.test(config.version)) {
      errors.push('版本号格式应为 x.y.z');
    }
    
    // 分类验证
    if (config.category && !Object.values(AgentCategories).includes(config.category)) {
      errors.push(`无效的分类: ${config.category}`);
    }
    
    // 权限验证
    if (config.permissions) {
      config.permissions.forEach(permission => {
        if (!Object.values(AgentPermissions).includes(permission)) {
          errors.push(`无效的权限: ${permission}`);
        }
      });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * 智能体默认配置
 */
export const DefaultAgentConfig = {
  version: '1.0.0',
  category: AgentCategories.TOOLS,
  tags: [],
  keywords: [],
  features: [],
  capabilities: {},
  dependencies: [],
  permissions: [],
  sandbox: true,
  lifecycle: {},
  routes: [],
  api: {},
  state: {},
  metadata: {}
};
