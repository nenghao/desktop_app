/**
 * 状态管理器 - 中央状态管理
 */

export class StateManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.state = {};
    this.subscribers = new Map();
    this.middleware = [];
    this.history = [];
    this.maxHistorySize = 50;
    this.debug = false;
  }

  /**
   * 初始化状态管理器
   */
  async initialize() {
    // 初始化默认状态
    this.state = {
      app: {
        initialized: false,
        loading: false,
        error: null,
        theme: 'auto',
        language: 'zh-CN',
        online: navigator.onLine,
        visible: !document.hidden
      },
      router: {
        currentRoute: '/',
        previousRoute: null,
        params: {},
        query: {}
      },
      agents: {
        installed: new Map(),
        loaded: new Map(),
        active: null,
        categories: [],
        searchResults: []
      },
      chat: {
        conversations: [],
        currentConversation: null,
        messages: [],
        typing: false
      },
      user: {
        profile: null,
        preferences: {},
        settings: {}
      },
      ui: {
        sidebar: {
          collapsed: false,
          activeSection: 'agents'
        },
        modal: {
          visible: false,
          type: null,
          data: null
        },
        notifications: []
      }
    };

    // 从本地存储恢复状态
    await this.restoreState();

    // 设置状态持久化
    this.setupStatePersistence();

    console.log('✅ StateManager 初始化完成');
  }

  /**
   * 获取状态
   * @param {string} path 状态路径，如 'app.theme' 或 'user.profile.name'
   */
  getState(path) {
    if (!path) {
      return this.state;
    }

    const keys = path.split('.');
    let current = this.state;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * 设置状态
   * @param {string} path 状态路径
   * @param {*} value 新值
   * @param {Object} options 选项
   */
  setState(path, value, options = {}) {
    const oldState = this.cloneState();
    const oldValue = this.getState(path);

    // 执行中间件
    for (const middleware of this.middleware) {
      const result = middleware(path, value, oldValue, this.state);
      if (result !== undefined) {
        value = result;
      }
    }

    // 更新状态
    this.setNestedValue(this.state, path, value);

    // 记录历史
    if (!options.skipHistory) {
      this.addToHistory({
        type: 'setState',
        path,
        oldValue,
        newValue: value,
        timestamp: Date.now()
      });
    }

    // 通知订阅者
    this.notifySubscribers(path, value, oldValue);

    // 发布状态变更事件
    this.eventBus.emit('state:change', {
      path,
      value,
      oldValue,
      state: this.state
    });

    if (this.debug) {
      console.log(`[StateManager] setState: ${path}`, { oldValue, newValue: value });
    }
  }

  /**
   * 更新状态（合并对象）
   * @param {string} path 状态路径
   * @param {Object} updates 更新对象
   */
  updateState(path, updates) {
    const currentValue = this.getState(path);

    if (typeof currentValue === 'object' && currentValue !== null && !Array.isArray(currentValue)) {
      const newValue = { ...currentValue, ...updates };
      this.setState(path, newValue);
    } else {
      this.setState(path, updates);
    }
  }

  /**
   * 订阅状态变化
   * @param {string} path 状态路径
   * @param {Function} callback 回调函数
   * @param {Object} options 选项
   */
  subscribe(path, callback, options = {}) {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, []);
    }

    const subscriber = {
      callback,
      immediate: options.immediate || false,
      deep: options.deep || false,
      id: this.generateId()
    };

    this.subscribers.get(path).push(subscriber);

    // 立即执行回调
    if (subscriber.immediate) {
      const currentValue = this.getState(path);
      callback(currentValue, undefined, path);
    }

    // 返回取消订阅函数
    return () => this.unsubscribe(path, subscriber.id);
  }

  /**
   * 取消订阅
   * @param {string} path 状态路径
   * @param {string} subscriberId 订阅者ID
   */
  unsubscribe(path, subscriberId) {
    const subscribers = this.subscribers.get(path);
    if (!subscribers) return false;

    const index = subscribers.findIndex(sub => sub.id === subscriberId);
    if (index !== -1) {
      subscribers.splice(index, 1);

      // 如果没有订阅者了，删除路径
      if (subscribers.length === 0) {
        this.subscribers.delete(path);
      }

      return true;
    }

    return false;
  }

  /**
   * 添加中间件
   * @param {Function} middleware 中间件函数
   */
  addMiddleware(middleware) {
    this.middleware.push(middleware);
  }

  /**
   * 移除中间件
   * @param {Function} middleware 中间件函数
   */
  removeMiddleware(middleware) {
    const index = this.middleware.indexOf(middleware);
    if (index !== -1) {
      this.middleware.splice(index, 1);
    }
  }

  /**
   * 重置状态
   * @param {string} path 可选的状态路径
   */
  resetState(path) {
    if (path) {
      // 重置特定路径的状态
      const defaultValue = this.getDefaultValue(path);
      this.setState(path, defaultValue);
    } else {
      // 重置整个状态
      this.initialize();
    }
  }

  /**
   * 获取状态历史
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * 清除历史
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * 设置嵌套值
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;

    for (const key of keys) {
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
  }

  /**
   * 通知订阅者
   */
  notifySubscribers(path, newValue, oldValue) {
    // 通知精确路径的订阅者
    const exactSubscribers = this.subscribers.get(path);
    if (exactSubscribers) {
      exactSubscribers.forEach(subscriber => {
        try {
          subscriber.callback(newValue, oldValue, path);
        } catch (error) {
          console.error('[StateManager] 订阅者回调出错:', error);
        }
      });
    }

    // 通知父路径的深度订阅者
    const pathParts = path.split('.');
    for (let i = pathParts.length - 1; i > 0; i--) {
      const parentPath = pathParts.slice(0, i).join('.');
      const parentSubscribers = this.subscribers.get(parentPath);

      if (parentSubscribers) {
        parentSubscribers.forEach(subscriber => {
          if (subscriber.deep) {
            try {
              const parentValue = this.getState(parentPath);
              subscriber.callback(parentValue, undefined, parentPath);
            } catch (error) {
              console.error('[StateManager] 深度订阅者回调出错:', error);
            }
          }
        });
      }
    }
  }

  /**
   * 添加到历史记录
   */
  addToHistory(entry) {
    this.history.unshift(entry);

    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }
  }

  /**
   * 克隆状态
   */
  cloneState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * 恢复状态
   */
  async restoreState() {
    try {
      const savedState = localStorage.getItem('Questech_state');
      if (savedState) {
        const parsedState = JSON.parse(savedState);

        // 只恢复用户相关的状态
        if (parsedState.user) {
          this.state.user = { ...this.state.user, ...parsedState.user };
        }

        if (parsedState.ui) {
          this.state.ui = { ...this.state.ui, ...parsedState.ui };
        }
      }
    } catch (error) {
      console.warn('[StateManager] 恢复状态失败:', error);
    }
  }

  /**
   * 设置状态持久化
   */
  setupStatePersistence() {
    // 监听特定状态变化并持久化
    this.subscribe('user', () => {
      this.persistState();
    }, { deep: true });

    this.subscribe('ui', () => {
      this.persistState();
    }, { deep: true });
  }

  /**
   * 持久化状态
   */
  persistState() {
    try {
      const stateToPersist = {
        user: this.state.user,
        ui: this.state.ui
      };

      localStorage.setItem('Questech_state', JSON.stringify(stateToPersist));
    } catch (error) {
      console.warn('[StateManager] 持久化状态失败:', error);
    }
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * 获取默认值
   */
  getDefaultValue(path) {
    // 这里可以定义各个路径的默认值
    const defaults = {
      'app.theme': 'auto',
      'app.language': 'zh-CN',
      'ui.sidebar.collapsed': false,
      'ui.sidebar.activeSection': 'agents'
    };

    return defaults[path];
  }

  /**
   * 启用/禁用调试模式
   */
  setDebug(enabled) {
    this.debug = enabled;
  }
}
