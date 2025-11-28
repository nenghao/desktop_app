/**
 * 智能体状态栏管理器
 * 统一管理所有智能体的状态显示
 */

export class AgentStatusBarManager {
  constructor() {
    this.currentAgent = null;
    this.currentStatus = 'uninitialized';
    this.isVisible = false;
    this.statusHistory = [];
    this.maxHistorySize = 50;
    this.animationTimeout = null; // 用于防抖

    // 状态定义（扩展支持智能体安装流程）
    this.statusDefinitions = {
      // 原有状态
      uninitialized: {
        color: '#6b7280',
        animation: false,
        defaultMessage: '未初始化'
      },
      initializing: {
        color: '#f59e0b',
        animation: 'pulse',
        defaultMessage: '初始化中...'
      },
      ready: {
        color: '#10b981',
        animation: false,
        defaultMessage: '环境就绪'
      },
      error: {
        color: '#ef4444',
        animation: false,
        defaultMessage: '初始化失败'
      },

      // 新增：智能体安装流程状态
      downloading: {
        color: '#3b82f6',
        animation: 'pulse',
        defaultMessage: '下载中...'
      },
      installing: {
        color: '#8b5cf6',
        animation: 'pulse',
        defaultMessage: '安装中...'
      },
      dependency_check: {
        color: '#06b6d4',
        animation: 'pulse',
        defaultMessage: '检查依赖...'
      },
      dependency_install: {
        color: '#0ea5e9',
        animation: 'pulse',
        defaultMessage: '安装依赖...'
      },
      completed: {
        color: '#10b981',
        animation: false,
        defaultMessage: '安装完成 ✓'
      },
      failed: {
        color: '#ef4444',
        animation: false,
        defaultMessage: '安装失败 ✗'
      }
    };

    // DOM元素缓存
    this.elements = {
      footer: null,
      statusDot: null,
      statusText: null,
      loadingSpinner: null
    };

    this.init();
  }

  /**
   * 初始化管理器
   */
  init() {
    this.cacheElements();
    this.setupEventListeners();
    console.log('✅ AgentStatusBarManager 初始化完成');
  }

  /**
   * 缓存DOM元素
   * 使用header中的Python状态指示器元素
   */
  cacheElements() {
    this.elements.footer = document.getElementById('app-footer');

    // 使用header中的状态指示器（智能体详情页）
    const headerStatus = document.getElementById('python-status-header');

    if (headerStatus) {
      this.elements.statusDot = headerStatus.querySelector('#python-status-dot');
      this.elements.statusText = headerStatus.querySelector('#python-status-text');
    } else {
      // 备用方案：直接通过ID查找
      this.elements.statusDot = document.getElementById('python-status-dot');
      this.elements.statusText = document.getElementById('python-status-text');
    }

    this.elements.loadingSpinner = document.getElementById('agent-loading-spinner');
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 监听路由变化
    window.addEventListener('popstate', () => {
      this.handleRouteChange();
    });

    // 监听DOM变化（防止元素被重新渲染后丢失）
    const observer = new MutationObserver(() => {
      this.cacheElements();
    });

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  /**
   * 处理路由变化
   */
  handleRouteChange() {
    const currentPath = window.location.pathname;
    const isAgentDetailPage = (currentPath.includes('/agents/') && currentPath !== '/agents') ||
                             (currentPath.includes('/agent/') && currentPath !== '/agent');

    if (isAgentDetailPage && !this.isVisible) {
      this.show();
    } else if (!isAgentDetailPage && this.isVisible) {
      this.hide();
    }
  }

  /**
   * 显示状态栏（带动画）
   */
  show() {
    if (this.elements.footer && !this.isVisible) {
      // 清除可能存在的隐藏动画
      if (this.animationTimeout) {
        clearTimeout(this.animationTimeout);
        this.animationTimeout = null;
      }

      const footer = this.elements.footer;

      // 显示元素（保持在原始布局层级）
      footer.style.display = 'flex';

      // 强制重绘，确保display生效
      footer.offsetHeight;

      // 添加显示类，触发动画
      footer.classList.remove('hidden');
      footer.classList.add('visible');

      this.isVisible = true;
      console.log('📊 智能体状态栏显示动画开始');
    }
  }

  /**
   * 隐藏状态栏（带动画）
   */
  hide() {
    if (this.elements.footer && this.isVisible) {
      const footer = this.elements.footer;

      // 添加隐藏类，触发动画
      footer.classList.remove('visible');
      footer.classList.add('hidden');

      this.isVisible = false;

      // 动画完成后隐藏元素
      this.animationTimeout = setTimeout(() => {
        if (!this.isVisible) { // 确保在动画期间没有被重新显示
          footer.style.display = 'none';
        }
        this.animationTimeout = null;
      }, 300); // 与CSS动画时间一致

      console.log('📊 智能体状态栏隐藏动画开始');
    }
  }

  /**
   * 更新智能体信息
   * @param {string} agentName - 智能体名称
   * @param {string} status - 状态：uninitialized, initializing, ready, error
   * @param {string} message - 自定义状态消息（可选）
   */
  updateAgent(agentName, status = 'uninitialized', message = null) {
    // 验证状态
    if (!this.statusDefinitions[status]) {
      console.warn(`⚠️ 未知状态: ${status}，使用默认状态`);
      status = 'uninitialized';
    }

    // 更新当前状态
    this.currentAgent = agentName;
    this.currentStatus = status;

    // 更新UI
    this.updateStatus(status, message);

    // 记录历史
    this.addToHistory({
      agent: agentName,
      status: status,
      message: message || this.statusDefinitions[status].defaultMessage,
      timestamp: new Date()
    });

    console.log(`📊 更新智能体状态: ${agentName} -> ${status}`);
  }

  /**
   * 更新智能体名称（已移除，footer不再显示智能体名称）
   * @param {string} agentName - 智能体名称
   * @deprecated 不再使用，保留方法以避免破坏现有代码
   */
  updateAgentName(agentName) {
    // 不再更新智能体名称，footer中已移除该元素
    console.log(`📝 智能体名称: ${agentName}（仅记录，不显示在footer中）`);
  }

  /**
   * 更新状态
   * @param {string} status - 状态
   * @param {string} message - 自定义消息
   */
  updateStatus(status, message = null) {
    const statusDef = this.statusDefinitions[status];
    const displayMessage = message || statusDef.defaultMessage;

    // 更新状态点
    if (this.elements.statusDot) {
      // 移除所有状态类
      Object.keys(this.statusDefinitions).forEach(s => {
        this.elements.statusDot.classList.remove(s);
      });
      // 添加新状态类
      this.elements.statusDot.classList.add(status);
    }

    // 更新状态文本
    if (this.elements.statusText) {
      this.elements.statusText.textContent = displayMessage;
    }
  }

  /**
   * 只更新状态（不改变智能体名称）
   * @param {string} status - 状态
   * @param {string} message - 自定义消息
   */
  updateStatusOnly(status, message = null) {
    if (!this.statusDefinitions[status]) {
      console.warn(`⚠️ 未知状态: ${status}`);
      return;
    }

    this.currentStatus = status;
    this.updateStatus(status, message);

    // 记录历史
    this.addToHistory({
      agent: this.currentAgent,
      status: status,
      message: message || this.statusDefinitions[status].defaultMessage,
      timestamp: new Date()
    });

    console.log(`📊 更新状态: ${this.currentAgent} -> ${status}`);
  }

  /**
   * 获取当前状态
   */
  getCurrentState() {
    return {
      agent: this.currentAgent,
      status: this.currentStatus,
      visible: this.isVisible,
      timestamp: new Date()
    };
  }

  /**
   * 添加到历史记录
   */
  addToHistory(entry) {
    this.statusHistory.unshift(entry);

    if (this.statusHistory.length > this.maxHistorySize) {
      this.statusHistory = this.statusHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * 获取状态历史
   */
  getHistory() {
    return [...this.statusHistory];
  }

  /**
   * 清除历史记录
   */
  clearHistory() {
    this.statusHistory = [];
  }

  /**
   * 重置状态栏
   */
  reset() {
    this.updateAgent('Questech', 'uninitialized');
    this.hide();
  }

  /**
   * 显示加载动画
   */
  showLoading() {
    if (this.elements.loadingSpinner) {
      this.elements.loadingSpinner.classList.remove('hidden');
      console.log('🔄 显示智能体加载动画');
    }
  }

  /**
   * 隐藏加载动画
   */
  hideLoading() {
    if (this.elements.loadingSpinner) {
      this.elements.loadingSpinner.classList.add('hidden');
      console.log('✅ 隐藏智能体加载动画');
    }
  }

  /**
   * 销毁管理器
   */
  destroy() {
    // 清除动画定时器
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
      this.animationTimeout = null;
    }

    this.reset();
    this.clearHistory();
    this.elements = {};
    console.log('🗑️ AgentStatusBarManager 已销毁');
  }
}

// 创建全局实例
export const agentStatusBarManager = new AgentStatusBarManager();

// 设置全局访问
window.agentStatusBarManager = agentStatusBarManager;
