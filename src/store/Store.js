/**
 * 状态存储器 - 模块化状态管理
 */

import { appModule } from './modules/app.js';
import { agentsModule } from './modules/agents.js';
import { chatModule } from './modules/chat.js';
import { uiModule } from './modules/ui.js';

export class Store {
  constructor() {
    this.state = {};
    this.getters = {};
    this.mutations = {};
    this.actions = {};
    this.modules = new Map();
    this.subscribers = new Map();
    this.actionSubscribers = new Map();
    
    this.setupModules();
    this.setupDevtools();
  }
  
  /**
   * 设置模块
   */
  setupModules() {
    // 注册模块
    this.registerModule('app', appModule);
    this.registerModule('agents', agentsModule);
    this.registerModule('chat', chatModule);
    this.registerModule('ui', uiModule);
    
    // 注册根级别的通用模块
    this.registerModule('storage', this.createStorageModule());
    this.registerModule('utils', this.createUtilsModule());
  }
  
  /**
   * 注册模块
   */
  registerModule(name, module) {
    this.modules.set(name, module);
    
    // 设置模块状态
    if (module.state) {
      this.state[name] = typeof module.state === 'function' ? module.state() : module.state;
    }
    
    // 设置模块getters
    if (module.getters) {
      this.getters[name] = {};
      Object.keys(module.getters).forEach(key => {
        this.getters[name][key] = () => {
          return module.getters[key](this.state[name], this.getters[name], this.state, this.getters);
        };
      });
    }
    
    // 设置模块mutations
    if (module.mutations) {
      this.mutations[name] = {};
      Object.keys(module.mutations).forEach(key => {
        this.mutations[name][key] = (payload) => {
          module.mutations[key](this.state[name], payload);
          this.notifySubscribers(name, key, payload);
        };
      });
    }
    
    // 设置模块actions
    if (module.actions) {
      this.actions[name] = {};
      Object.keys(module.actions).forEach(key => {
        this.actions[name][key] = (payload) => {
          const context = this.createActionContext(name);
          return module.actions[key](context, payload);
        };
      });
    }
  }
  
  /**
   * 创建Action上下文
   */
  createActionContext(moduleName) {
    return {
      state: this.state[moduleName],
      getters: this.getters[moduleName],
      commit: (type, payload) => this.commit(`${moduleName}/${type}`, payload),
      dispatch: (type, payload, options = {}) => {
        if (options.root) {
          return this.dispatch(type, payload);
        } else {
          return this.dispatch(`${moduleName}/${type}`, payload);
        }
      },
      rootState: this.state,
      rootGetters: this.getters
    };
  }
  
  /**
   * 提交mutation
   */
  commit(type, payload) {
    const [moduleName, mutationType] = type.includes('/') ? type.split('/') : [null, type];
    
    if (moduleName && this.mutations[moduleName] && this.mutations[moduleName][mutationType]) {
      this.mutations[moduleName][mutationType](payload);
    } else if (!moduleName && this.mutations[mutationType]) {
      this.mutations[mutationType](payload);
    } else {
      console.warn(`未找到mutation: ${type}`);
    }
  }
  
  /**
   * 分发action
   */
  async dispatch(type, payload) {
    const [moduleName, actionType] = type.includes('/') ? type.split('/') : [null, type];
    
    if (moduleName && this.actions[moduleName] && this.actions[moduleName][actionType]) {
      return await this.actions[moduleName][actionType](payload);
    } else if (!moduleName && this.actions[actionType]) {
      return await this.actions[actionType](payload);
    } else {
      console.warn(`未找到action: ${type}`);
    }
  }
  
  /**
   * 获取状态
   */
  getState(path) {
    if (!path) return this.state;
    
    const keys = path.split('/');
    let current = this.state;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return current;
  }
  
  /**
   * 获取getter值
   */
  getGetter(path) {
    if (!path) return this.getters;
    
    const keys = path.split('/');
    let current = this.getters;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return typeof current === 'function' ? current() : current;
  }
  
  /**
   * 订阅状态变化
   */
  subscribe(callback) {
    const id = Date.now() + Math.random();
    this.subscribers.set(id, callback);
    
    return () => {
      this.subscribers.delete(id);
    };
  }
  
  /**
   * 订阅action
   */
  subscribeAction(callback) {
    const id = Date.now() + Math.random();
    this.actionSubscribers.set(id, callback);
    
    return () => {
      this.actionSubscribers.delete(id);
    };
  }
  
  /**
   * 通知订阅者
   */
  notifySubscribers(moduleName, mutationType, payload) {
    this.subscribers.forEach(callback => {
      try {
        callback({
          type: `${moduleName}/${mutationType}`,
          payload,
          state: this.state
        });
      } catch (error) {
        console.error('状态订阅回调错误:', error);
      }
    });
  }
  
  /**
   * 创建存储模块
   */
  createStorageModule() {
    return {
      namespaced: true,
      actions: {
        async get(context, key) {
          try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
          } catch (error) {
            console.error('读取本地存储失败:', error);
            return null;
          }
        },
        
        async set(context, { key, value }) {
          try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
          } catch (error) {
            console.error('写入本地存储失败:', error);
            return false;
          }
        },
        
        async remove(context, key) {
          try {
            localStorage.removeItem(key);
            return true;
          } catch (error) {
            console.error('删除本地存储失败:', error);
            return false;
          }
        },
        
        async clear() {
          try {
            localStorage.clear();
            return true;
          } catch (error) {
            console.error('清空本地存储失败:', error);
            return false;
          }
        }
      }
    };
  }
  
  /**
   * 创建工具模块
   */
  createUtilsModule() {
    return {
      namespaced: true,
      actions: {
        generateId() {
          return Date.now().toString(36) + Math.random().toString(36).substr(2);
        },
        
        formatDate(context, timestamp) {
          return new Date(timestamp).toLocaleString();
        },
        
        debounce(context, { func, wait = 300 }) {
          let timeout;
          return function executedFunction(...args) {
            const later = () => {
              clearTimeout(timeout);
              func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
          };
        },
        
        throttle(context, { func, limit = 300 }) {
          let inThrottle;
          return function executedFunction(...args) {
            if (!inThrottle) {
              func.apply(this, args);
              inThrottle = true;
              setTimeout(() => inThrottle = false, limit);
            }
          };
        }
      }
    };
  }
  
  /**
   * 设置开发工具
   */
  setupDevtools() {
    if (typeof window !== 'undefined' && window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
      // Vue DevTools集成
      window.__VUE_DEVTOOLS_GLOBAL_HOOK__.emit('vuex:init', this);
    }
    
    // 开发模式下的状态日志
    if (process.env.NODE_ENV === 'development') {
      this.subscribe(({ type, payload, state }) => {
        console.group(`%c mutation ${type}`, 'color: #03A9F4; font-weight: bold');
        console.log('%c prev state', 'color: #9E9E9E; font-weight: bold', state);
        console.log('%c payload', 'color: #03A9F4; font-weight: bold', payload);
        console.log('%c next state', 'color: #4CAF50; font-weight: bold', state);
        console.groupEnd();
      });
    }
  }
  
  /**
   * 初始化存储
   */
  async initialize() {
    try {
      // 初始化各个模块
      await this.dispatch('app/initialize');
      await this.dispatch('agents/initialize');
      await this.dispatch('chat/initialize');
      await this.dispatch('ui/initialize');
      
      console.log('✅ 状态存储初始化完成');
      
    } catch (error) {
      console.error('❌ 状态存储初始化失败:', error);
      throw error;
    }
  }
  
  /**
   * 重置存储
   */
  reset() {
    // 重置所有模块状态
    this.modules.forEach((module, name) => {
      if (module.state) {
        this.state[name] = typeof module.state === 'function' ? module.state() : { ...module.state };
      }
    });
  }
  
  /**
   * 导出状态快照
   */
  exportState() {
    return JSON.parse(JSON.stringify(this.state));
  }
  
  /**
   * 导入状态快照
   */
  importState(snapshot) {
    Object.keys(snapshot).forEach(key => {
      if (this.state[key]) {
        this.state[key] = snapshot[key];
      }
    });
  }
}
