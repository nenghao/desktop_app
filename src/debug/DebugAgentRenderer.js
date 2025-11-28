/**
 * DebugAgentRenderer - 调试用智能体 UI 渲染器
 *
 * 专门用于插件调试器的 UI 渲染逻辑
 * 注意：此文件仅用于调试功能，不影响正常生产环境
 */

import { agentStatusBarManager } from '../services/agent/AgentStatusBarManager.js';
import { agentDataService } from '../services/agent/AgentDataService.js';
import { IconUtils } from '../utils/IconUtils.js';
import { FileUploadService } from '../services/FileUploadService.js';
import { apiService } from '../services/api/ApiService.js';

export class DebugAgentRenderer {
  constructor() {
    this.app = null;
  }

  /**
   * 设置 App 实例
   * @param {Object} app - App 实例
   */
  setApp(app) {
    this.app = app;
  }

  /**
   * 渲染智能体 UI
   * @param {HTMLElement} container - 容器元素
   * @param {Object} uiBundle - UI 资源 { bundleCode, cssCode }
   * @param {Object} agentData - 智能体数据
   * @returns {Promise<void>}
   */
  async render(container, uiBundle, agentData) {
    try {
      console.log(`🎨 [DebugAgentRenderer] 开始渲染智能体 UI: ${agentData.id}`);

      // 1. 注入 CSS
      this.injectCSS(agentData.id, uiBundle.cssCode);

      // 2. 创建 context
      const context = this.createContext(container, agentData);

      // 3. 执行 bundle.js
      await this.executeBundle(uiBundle.bundleCode, context);

      console.log(`✅ [DebugAgentRenderer] 智能体 UI 渲染完成: ${agentData.id}`);
    } catch (error) {
      console.error(`❌ [DebugAgentRenderer] 渲染失败:`, error);
      throw error;
    }
  }

  /**
   * 注入 CSS
   * @param {string} agentId - 智能体 ID
   * @param {string} cssCode - CSS 代码
   */
  injectCSS(agentId, cssCode) {
    const styleId = `agent-ui-style-${agentId}`;

    // 移除旧的样式
    const oldStyle = document.getElementById(styleId);
    if (oldStyle) {
      oldStyle.remove();
    }

    // 注入新样式
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = cssCode;
    document.head.appendChild(style);

    console.log(`💅 [DebugAgentRenderer] CSS 注入成功: ${styleId}`);
  }

  /**
   * 创建 Context 对象
   * @param {HTMLElement} container - 容器元素
   * @param {Object} agentData - 智能体数据
   * @returns {Object} Context 对象
   */
  createContext(container, agentData) {
    // 创建文件上传服务实例
    const fileUploadService = new FileUploadService({
      agentId: agentData.id,
      agentData: agentData,
      notificationCenter: window.notificationCenter,
      statusBarManager: agentStatusBarManager,
      app: this.app,
      eventBus: null // 调试环境可能没有 eventBus
    });

    const context = {
      // DOM 容器
      container,

      // 智能体数据
      agentData,

      // UI 配置
      config: agentData.ui_config || {},

      // API 配置 - 从 ApiService 获取
      apiConfig: {
        baseUrl: apiService.baseURL,
        timeout: apiService.timeout
      },

      // 服务引用
      services: {
        statusBarManager: agentStatusBarManager,
        agentDataService,
        app: this.app,
        fileUpload: fileUploadService  // 添加文件上传服务
      },

      // 工具函数
      utils: {
        // 通知
        showNotification: (message, type = 'info') => {
          this.showNotification(message, type);
        },
        showError: (message) => {
          this.showNotification(message, 'error');
        },
        showSuccess: (message) => {
          this.showNotification(message, 'success');
        },
        showWarning: (message) => {
          this.showNotification(message, 'warning');
        },
        showInfo: (message) => {
          this.showNotification(message, 'info');
        },

        // 状态栏方法
        updateStatus: (status, message) => {
          if (agentStatusBarManager) {
            agentStatusBarManager.updateStatusOnly(status, message);
          }
        },
        updateAgentStatus: (agentName, status, message) => {
          if (agentStatusBarManager) {
            agentStatusBarManager.updateAgent(agentName, status, message);
          }
        },

        // 执行智能体方法
        executeAgent: async (methodName, args = []) => {
          return await this.executeAgent(agentData.id, methodName, args);
        },

        // 获取智能体数据
        getAgentData: () => {
          return agentData;
        },

        // 刷新智能体数据
        refreshAgentData: async () => {
          return await agentDataService.getAgentById(agentData.id, true);
        },

        // 图标工具
        IconUtils: IconUtils,

        // 文件上传快捷方法
        selectFiles: async (options = {}) => {
          return await fileUploadService.selectFiles(options);
        },
        uploadFile: async (file, options = {}) => {
          return await fileUploadService.upload(file, options);
        },
        uploadMultipleFiles: async (files, options = {}) => {
          return await fileUploadService.uploadMultiple(files, options);
        },
        selectAndUploadFile: async (options = {}) => {
          // 选择并上传文件的一站式方法
          const files = await fileUploadService.selectFiles({
            multiple: options.multiple || false,
            accept: options.accept
          });

          if (files.length === 0) {
            return null;
          }

          if (files.length === 1) {
            return await fileUploadService.upload(files[0], options);
          } else {
            return await fileUploadService.uploadMultiple(files, options);
          }
        }
      }
    };

    return context;
  }

  /**
   * 执行 Bundle.js
   * @param {string} bundleCode - Bundle.js 代码
   * @param {Object} context - Context 对象
   * @returns {Promise<void>}
   */
  async executeBundle(bundleCode, context) {
    try {
      // 使用 Function 构造函数执行代码
      const initFunction = new Function(`
        'use strict';
        return ${bundleCode}
      `);

      const init = initFunction();

      if (typeof init !== 'function') {
        throw new Error('bundle.js 必须返回一个初始化函数');
      }

      // 调用初始化函数
      await init(context);

      console.log(`✅ [DebugAgentRenderer] Bundle.js 执行成功`);
    } catch (error) {
      console.error(`❌ [DebugAgentRenderer] Bundle.js 执行失败:`, error);
      throw error;
    }
  }

  /**
   * 显示通知
   * @param {string} message - 消息内容
   * @param {string} type - 消息类型 (info, success, warning, error)
   */
  showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // 添加样式
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${this.getNotificationColor(type)};
      color: white;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;

    // 添加到页面
    document.body.appendChild(notification);

    // 3秒后自动移除
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }

  /**
   * 获取通知颜色
   * @param {string} type - 消息类型
   * @returns {string} 颜色值
   */
  getNotificationColor(type) {
    const colors = {
      info: '#3498db',
      success: '#2ecc71',
      warning: '#f39c12',
      error: '#e74c3c'
    };
    return colors[type] || colors.info;
  }

  /**
   * 执行智能体方法
   * @param {string} agentId - 智能体 ID
   * @param {string} methodName - 方法名
   * @param {Array} args - 参数
   * @returns {Promise<any>} 执行结果
   */
  async executeAgent(agentId, methodName, args = []) {
    try {
      console.log(`🚀 [DebugAgentRenderer] 执行智能体方法: ${agentId}.${methodName}`, args);

      // 调用后端 API
      const response = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agent_id: agentId,
          method: methodName,
          args: args
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ [DebugAgentRenderer] 方法执行成功:`, result);
      return result;

    } catch (error) {
      console.error(`❌ [DebugAgentRenderer] 方法执行失败:`, error);
      throw error;
    }
  }

  /**
   * 清理资源
   * @param {string} agentId - 智能体 ID
   */
  cleanup(agentId) {
    // 移除注入的 CSS
    const styleId = `agent-ui-style-${agentId}`;
    const style = document.getElementById(styleId);
    if (style) {
      style.remove();
    }

    console.log(`🧹 [DebugAgentRenderer] 清理完成: ${agentId}`);
  }
}

// 导出单例
export const debugAgentRenderer = new DebugAgentRenderer();

