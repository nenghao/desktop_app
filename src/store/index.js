/**
 * 状态管理主入口
 */

import { Store } from './Store.js';

// 创建全局状态存储实例
export const store = new Store();

// 导出状态管理器类（向后兼容）
export class StateManager {
  constructor() {
    this.state = new Map();
    this.listeners = new Map();
    this.middleware = [];
  }
  
  /**
   * 获取状态
   */
  get(key) {
    return this.state.get(key);
  }
  
  /**
   * 设置状态
   */
  set(key, value) {
    const oldValue = this.state.get(key);
    this.state.set(key, value);
    
    // 触发监听器
    this.notifyListeners(key, value, oldValue);
  }
  
  /**
   * 订阅状态变化
   */
  subscribe(key, listener) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(listener);
    
    // 返回取消订阅函数
    return () => {
      const listeners = this.listeners.get(key);
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }
  
  /**
   * 通知监听器
   */
  notifyListeners(key, newValue, oldValue) {
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(newValue, oldValue, key);
        } catch (error) {
          console.error('状态监听器错误:', error);
        }
      });
    }
  }
  
  /**
   * 添加中间件
   */
  use(middleware) {
    this.middleware.push(middleware);
  }
  
  /**
   * 批量更新状态
   */
  batch(updates) {
    Object.entries(updates).forEach(([key, value]) => {
      this.set(key, value);
    });
  }
  
  /**
   * 清空状态
   */
  clear() {
    this.state.clear();
    this.listeners.clear();
  }
}

// 导出便捷方法
export const commit = (type, payload) => store.commit(type, payload);
export const dispatch = (type, payload) => store.dispatch(type, payload);
export const getState = (path) => store.getState(path);
export const getGetter = (path) => store.getGetter(path);
export const subscribe = (callback) => store.subscribe(callback);
export const subscribeAction = (callback) => store.subscribeAction(callback);

// 默认导出
export default store;
