/**
 * 智能体标准化接口
 */

import { AgentStatus, AgentLifecycleHooks, AgentMessageTypes } from '../types/agent.js';

/**
 * 智能体基础接口类
 */
export class AgentInterface {
  constructor(config) {
    this.config = config;
    this.status = AgentStatus.INSTALLED;
    this.instance = null;
    this.process = null;
    this.eventListeners = new Map();
    this.messageQueue = [];
    this.isInitialized = false;
  }
  
  /**
   * 初始化智能体
   */
  async initialize() {
    if (this.isInitialized) {
      return true;
    }
    
    try {
      // 执行初始化前钩子
      await this.executeHook(AgentLifecycleHooks.beforeLoad);
      
      // 验证配置
      this.validateConfig();
      
      // 检查依赖
      await this.checkDependencies();
      
      // 检查权限
      await this.checkPermissions();
      
      // 执行初始化钩子
      await this.executeHook(AgentLifecycleHooks.onLoad);
      
      this.isInitialized = true;
      this.status = AgentStatus.LOADED;
      
      // 执行初始化后钩子
      await this.executeHook(AgentLifecycleHooks.afterLoad);
      
      return true;
    } catch (error) {
      this.status = AgentStatus.ERROR;
      await this.executeHook(AgentLifecycleHooks.onError, { error });
      throw error;
    }
  }
  
  /**
   * 启动智能体
   */
  async start() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (this.status === AgentStatus.RUNNING) {
      return true;
    }
    
    try {
      // 执行启动前钩子
      await this.executeHook(AgentLifecycleHooks.beforeStart);
      
      // 启动智能体进程
      await this.startProcess();
      
      this.status = AgentStatus.RUNNING;
      
      // 执行启动钩子
      await this.executeHook(AgentLifecycleHooks.onStart);
      
      // 执行启动后钩子
      await this.executeHook(AgentLifecycleHooks.afterStart);
      
      return true;
    } catch (error) {
      this.status = AgentStatus.ERROR;
      await this.executeHook(AgentLifecycleHooks.onError, { error });
      throw error;
    }
  }
  
  /**
   * 停止智能体
   */
  async stop() {
    if (this.status !== AgentStatus.RUNNING) {
      return true;
    }
    
    try {
      // 执行停止前钩子
      await this.executeHook(AgentLifecycleHooks.beforeStop);
      
      // 停止智能体进程
      await this.stopProcess();
      
      this.status = AgentStatus.STOPPED;
      
      // 执行停止钩子
      await this.executeHook(AgentLifecycleHooks.onStop);
      
      // 执行停止后钩子
      await this.executeHook(AgentLifecycleHooks.afterStop);
      
      return true;
    } catch (error) {
      this.status = AgentStatus.ERROR;
      await this.executeHook(AgentLifecycleHooks.onError, { error });
      throw error;
    }
  }
  
  /**
   * 暂停智能体
   */
  async pause() {
    if (this.status !== AgentStatus.RUNNING) {
      return false;
    }
    
    this.status = AgentStatus.PAUSED;
    return true;
  }
  
  /**
   * 恢复智能体
   */
  async resume() {
    if (this.status !== AgentStatus.PAUSED) {
      return false;
    }
    
    this.status = AgentStatus.RUNNING;
    return true;
  }
  
  /**
   * 重启智能体
   */
  async restart() {
    await this.stop();
    await this.start();
    return true;
  }
  
  /**
   * 发送消息到智能体
   */
  async sendMessage(type, data) {
    if (this.status !== AgentStatus.RUNNING) {
      throw new Error('智能体未运行');
    }
    
    const message = {
      id: this.generateMessageId(),
      type,
      data,
      timestamp: Date.now(),
      agentId: this.config.id
    };
    
    try {
      const response = await this.processMessage(message);
      return response;
    } catch (error) {
      await this.executeHook(AgentLifecycleHooks.onError, { error, message });
      throw error;
    }
  }
  
  /**
   * 执行命令
   */
  async executeCommand(command, params = {}) {
    return this.sendMessage(AgentMessageTypes.COMMAND, { command, params });
  }
  
  /**
   * 查询数据
   */
  async query(query, params = {}) {
    return this.sendMessage(AgentMessageTypes.QUERY, { query, params });
  }
  
  /**
   * 添加事件监听器
   */
  addEventListener(event, listener) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(listener);
  }
  
  /**
   * 移除事件监听器
   */
  removeEventListener(event, listener) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  /**
   * 触发事件
   */
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`事件监听器错误 [${event}]:`, error);
        }
      });
    }
  }
  
  /**
   * 获取智能体状态
   */
  getStatus() {
    return {
      status: this.status,
      isInitialized: this.isInitialized,
      isRunning: this.status === AgentStatus.RUNNING,
      config: this.config,
      uptime: this.getUptime(),
      memoryUsage: this.getMemoryUsage()
    };
  }
  
  /**
   * 获取智能体信息
   */
  getInfo() {
    return {
      id: this.config.id,
      name: this.config.name,
      version: this.config.version,
      description: this.config.description,
      category: this.config.category,
      author: this.config.author,
      status: this.status,
      features: this.config.features,
      permissions: this.config.permissions
    };
  }
  
  /**
   * 验证配置
   */
  validateConfig() {
    if (!this.config.id) {
      throw new Error('智能体ID不能为空');
    }
    
    if (!this.config.executable) {
      throw new Error('智能体可执行文件路径不能为空');
    }
    
    // 更多验证逻辑...
  }
  
  /**
   * 检查依赖
   */
  async checkDependencies() {
    if (!this.config.dependencies || this.config.dependencies.length === 0) {
      return true;
    }
    
    for (const dependency of this.config.dependencies) {
      const isAvailable = await this.checkDependency(dependency);
      if (!isAvailable) {
        throw new Error(`依赖项不可用: ${dependency}`);
      }
    }
    
    return true;
  }
  
  /**
   * 检查单个依赖
   */
  async checkDependency(dependency) {
    // 实现依赖检查逻辑
    return true;
  }
  
  /**
   * 检查权限
   */
  async checkPermissions() {
    if (!this.config.permissions || this.config.permissions.length === 0) {
      return true;
    }
    
    for (const permission of this.config.permissions) {
      const isGranted = await this.checkPermission(permission);
      if (!isGranted) {
        throw new Error(`权限未授予: ${permission}`);
      }
    }
    
    return true;
  }
  
  /**
   * 检查单个权限
   */
  async checkPermission(permission) {
    // 实现权限检查逻辑
    return true;
  }
  
  /**
   * 启动进程
   */
  async startProcess() {
    // 子类实现具体的进程启动逻辑
    throw new Error('startProcess 方法需要在子类中实现');
  }
  
  /**
   * 停止进程
   */
  async stopProcess() {
    // 子类实现具体的进程停止逻辑
    throw new Error('stopProcess 方法需要在子类中实现');
  }
  
  /**
   * 处理消息
   */
  async processMessage(message) {
    // 子类实现具体的消息处理逻辑
    throw new Error('processMessage 方法需要在子类中实现');
  }
  
  /**
   * 执行生命周期钩子
   */
  async executeHook(hookName, data = {}) {
    const hook = this.config.lifecycle?.[hookName];
    if (typeof hook === 'function') {
      try {
        await hook.call(this, data);
      } catch (error) {
        console.error(`生命周期钩子执行失败 [${hookName}]:`, error);
        throw error;
      }
    }
  }
  
  /**
   * 生成消息ID
   */
  generateMessageId() {
    return `${this.config.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 获取运行时间
   */
  getUptime() {
    // 实现运行时间计算
    return 0;
  }
  
  /**
   * 获取内存使用情况
   */
  getMemoryUsage() {
    // 实现内存使用情况获取
    return { used: 0, total: 0 };
  }
}
