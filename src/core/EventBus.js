/**
 * 事件总线核心实现类 (EventBus)
 * 
 * 【文件职责】
 * 1. 提供纯粹的事件发布-订阅机制实现（无状态）
 * 2. 实现事件监听、发布、取消订阅等核心功能
 * 3. 提供高级功能：优先级、命名空间、批量操作
 * 4. 内置性能监控和中间件支持
 * 5. 提供异步事件处理和错误处理机制
 * 
 * 【设计理念】
 * - 纯粹的工具类，不依赖外部状态
 * - 可以创建多个独立的EventBus实例
 * - 提供完整的事件生命周期管理
 * - 支持扩展和自定义
 * 
 * 【与应用层的关系】
 * - core/EventBus.js: 底层实现类（this file）
 * - core/GlobalEventManager.js: 应用层管理器（使用此类）
 * 
 * 【核心特性】
 * - 优先级事件处理
 * - 命名空间隔离
 * - 批量操作支持
 * - 异步事件处理
 * - 性能监控
 * - 中间件支持
 * - 模式匹配发布
 * - 事件等待机制
 * 
 * 【使用方式】
 * ```javascript
 * const eventBus = new EventBus();
 * eventBus.on('event', callback);
 * eventBus.emit('event', data);
 * ```
 * 
 * @author Questech Team
 * @since 1.0.0
 */

export class EventBus {
  constructor() {
    this.events = new Map();
    this.onceEvents = new Map();
    this.maxListeners = 100;
    this.debug = false;
  }

  /**
   * 订阅事件
   * @param {string} event 事件名称
   * @param {Function} callback 回调函数
   * @param {Object} options 选项
   */
  on(event, callback, options = {}) {
    if (typeof callback !== 'function') {
      throw new Error('回调函数必须是一个函数');
    }

    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    const listeners = this.events.get(event);

    // 检查监听器数量限制
    if (listeners.length >= this.maxListeners) {
      console.warn(`事件 "${event}" 的监听器数量已达到最大限制 ${this.maxListeners}`);
    }

    const listener = {
      callback,
      once: false,
      priority: options.priority || 0,
      context: options.context || null,
      id: this.generateId()
    };

    listeners.push(listener);

    // 按优先级排序（高优先级先执行）
    listeners.sort((a, b) => b.priority - a.priority);

    if (this.debug) {
      console.log(`[EventBus] 订阅事件: ${event}`, listener);
    }

    // 返回取消订阅函数
    return () => this.off(event, listener.id);
  }

  /**
   * 订阅一次性事件
   * @param {string} event 事件名称
   * @param {Function} callback 回调函数
   * @param {Object} options 选项
   */
  once(event, callback, options = {}) {
    const unsubscribe = this.on(event, (...args) => {
      unsubscribe();
      callback(...args);
    }, { ...options, once: true });

    return unsubscribe;
  }

  /**
   * 取消订阅事件
   * @param {string} event 事件名称
   * @param {string|Function} callbackOrId 回调函数或监听器ID
   */
  off(event, callbackOrId) {
    if (!this.events.has(event)) {
      return false;
    }

    const listeners = this.events.get(event);
    let removed = false;

    for (let i = listeners.length - 1; i >= 0; i--) {
      const listener = listeners[i];

      if (
        listener.id === callbackOrId ||
        listener.callback === callbackOrId
      ) {
        listeners.splice(i, 1);
        removed = true;

        if (this.debug) {
          console.log(`[EventBus] 取消订阅事件: ${event}`, listener);
        }
      }
    }

    // 如果没有监听器了，删除事件
    if (listeners.length === 0) {
      this.events.delete(event);
    }

    return removed;
  }

  /**
   * 发布事件
   * @param {string} event 事件名称
   * @param {*} data 事件数据
   * @param {Object} options 选项
   */
  emit(event, data, options = {}) {
    const startTime = this._performanceEnabled ? performance.now() : 0;

    // 执行中间件
    const middlewareResult = this._executeMiddlewares(event, data);
    const finalEvent = middlewareResult.event;
    const finalData = middlewareResult.data;

    if (this.debug) {
      console.log(`[EventBus] 发布事件: ${finalEvent}`, finalData);
    }

    const listeners = this.events.get(finalEvent);
    if (!listeners || listeners.length === 0) {
      return false;
    }

    const results = [];
    const errors = [];

    // 创建事件对象
    const eventObj = {
      type: finalEvent,
      data: finalData,
      timestamp: Date.now(),
      preventDefault: false,
      stopPropagation: false
    };

    for (const listener of listeners) {
      try {
        // 检查是否停止传播
        if (eventObj.stopPropagation) {
          break;
        }

        let result;

        // 执行回调函数
        if (listener.context) {
          result = listener.callback.call(listener.context, eventObj);
        } else {
          result = listener.callback(eventObj);
        }

        // 处理异步结果
        if (result instanceof Promise) {
          result.catch(error => {
            console.error(`[EventBus] 事件 "${finalEvent}" 的异步监听器出错:`, error);
          });
        }

        results.push(result);

      } catch (error) {
        errors.push(error);
        console.error(`[EventBus] 事件 "${finalEvent}" 的监听器出错:`, error);

        if (options.throwOnError) {
          throw error;
        }
      }
    }

    // 记录性能数据
    if (this._performanceEnabled) {
      this._recordPerformance(finalEvent, startTime);
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      listenersCount: listeners.length
    };
  }

  /**
   * 异步发布事件
   * @param {string} event 事件名称
   * @param {*} data 事件数据
   * @param {Object} options 选项
   */
  async emitAsync(event, data, options = {}) {
    if (this.debug) {
      console.log(`[EventBus] 异步发布事件: ${event}`, data);
    }

    const listeners = this.events.get(event);
    if (!listeners || listeners.length === 0) {
      return { success: true, results: [], errors: [], listenersCount: 0 };
    }

    const results = [];
    const errors = [];

    // 创建事件对象
    const eventObj = {
      type: event,
      data,
      timestamp: Date.now(),
      preventDefault: false,
      stopPropagation: false
    };

    for (const listener of listeners) {
      try {
        // 检查是否停止传播
        if (eventObj.stopPropagation) {
          break;
        }

        let result;

        // 执行回调函数
        if (listener.context) {
          result = listener.callback.call(listener.context, eventObj);
        } else {
          result = listener.callback(eventObj);
        }

        // 等待异步结果
        if (result instanceof Promise) {
          result = await result;
        }

        results.push(result);

      } catch (error) {
        errors.push(error);
        console.error(`[EventBus] 事件 "${event}" 的异步监听器出错:`, error);

        if (options.throwOnError) {
          throw error;
        }
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      listenersCount: listeners.length
    };
  }

  /**
   * 获取事件的监听器数量
   * @param {string} event 事件名称
   */
  listenerCount(event) {
    const listeners = this.events.get(event);
    return listeners ? listeners.length : 0;
  }

  /**
   * 获取所有事件名称
   */
  eventNames() {
    return Array.from(this.events.keys());
  }

  /**
   * 清除所有监听器
   * @param {string} event 可选的事件名称，如果不提供则清除所有
   */
  clear(event) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }

    if (this.debug) {
      console.log(`[EventBus] 清除监听器: ${event || '全部'}`);
    }
  }

  /**
   * 设置最大监听器数量
   * @param {number} max 最大数量
   */
  setMaxListeners(max) {
    this.maxListeners = max;
  }

  /**
   * 启用/禁用调试模式
   * @param {boolean} enabled 是否启用
   */
  setDebug(enabled) {
    this.debug = enabled;
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * 获取调试信息
   */
  getDebugInfo() {
    const info = {
      totalEvents: this.events.size,
      totalListeners: 0,
      events: {}
    };

    for (const [event, listeners] of this.events) {
      info.totalListeners += listeners.length;
      info.events[event] = {
        listenerCount: listeners.length,
        listeners: listeners.map(l => ({
          id: l.id,
          priority: l.priority,
          once: l.once,
          hasContext: !!l.context
        }))
      };
    }

    return info;
  }

  // ===== 增强功能 =====

  /**
   * 命名空间支持
   * @param {string} namespace 命名空间
   */
  namespace(namespace) {
    return {
      on: (event, callback, options) => this.on(`${namespace}:${event}`, callback, options),
      once: (event, callback, options) => this.once(`${namespace}:${event}`, callback, options),
      off: (event, callbackOrId) => this.off(`${namespace}:${event}`, callbackOrId),
      emit: (event, data, options) => this.emit(`${namespace}:${event}`, data, options),
      emitAsync: (event, data, options) => this.emitAsync(`${namespace}:${event}`, data, options),
      clear: (event) => event ? this.clear(`${namespace}:${event}`) : this.clearNamespace(namespace)
    };
  }

  /**
   * 清除指定命名空间的所有事件
   * @param {string} namespace 命名空间
   */
  clearNamespace(namespace) {
    const prefix = `${namespace}:`;
    const eventsToDelete = [];

    for (const event of this.events.keys()) {
      if (event.startsWith(prefix)) {
        eventsToDelete.push(event);
      }
    }

    eventsToDelete.forEach(event => this.events.delete(event));

    if (this.debug) {
      console.log(`[EventBus] 清除命名空间: ${namespace}, 删除事件: ${eventsToDelete.length}`);
    }

    return eventsToDelete.length;
  }

  /**
   * 批量订阅事件
   * @param {Object} eventMap 事件映射 {eventName: callback}
   * @param {Object} options 选项
   */
  onMultiple(eventMap, options = {}) {
    const unsubscribers = [];

    for (const [event, callback] of Object.entries(eventMap)) {
      const unsubscribe = this.on(event, callback, options);
      unsubscribers.push(unsubscribe);
    }

    // 返回批量取消订阅函数
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }

  /**
   * 批量发布事件
   * @param {Array} events 事件数组 [{event, data}, ...]
   * @param {Object} options 选项
   */
  emitMultiple(events, options = {}) {
    const results = [];

    for (const { event, data } of events) {
      const result = this.emit(event, data, options);
      results.push({ event, ...result });
    }

    return results;
  }

  /**
   * 等待事件触发
   * @param {string} event 事件名称
   * @param {number} timeout 超时时间(ms)
   */
  waitFor(event, timeout = 5000) {
    return new Promise((resolve, reject) => {
      let timeoutId;

      const unsubscribe = this.once(event, (eventObj) => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(eventObj);
      });

      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          unsubscribe();
          reject(new Error(`等待事件 "${event}" 超时 (${timeout}ms)`));
        }, timeout);
      }
    });
  }

  /**
   * 事件统计
   */
  getStats() {
    const stats = {
      totalEvents: this.events.size,
      totalListeners: 0,
      namespaces: new Map(),
      topEvents: []
    };

    // 统计监听器数量和命名空间
    for (const [event, listeners] of this.events) {
      stats.totalListeners += listeners.length;

      const namespace = event.includes(':') ? event.split(':')[0] : 'global';
      if (!stats.namespaces.has(namespace)) {
        stats.namespaces.set(namespace, { events: 0, listeners: 0 });
      }

      const nsStats = stats.namespaces.get(namespace);
      nsStats.events++;
      nsStats.listeners += listeners.length;

      stats.topEvents.push({ event, listenerCount: listeners.length });
    }

    // 排序热门事件
    stats.topEvents.sort((a, b) => b.listenerCount - a.listenerCount);
    stats.topEvents = stats.topEvents.slice(0, 10);

    return stats;
  }

  /**
   * 检查事件是否存在监听器
   * @param {string} event 事件名称
   */
  hasListeners(event) {
    return this.listenerCount(event) > 0;
  }

  /**
   * 获取匹配模式的事件列表
   * @param {string|RegExp} pattern 匹配模式
   */
  getMatchingEvents(pattern) {
    const events = [];
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);

    for (const event of this.events.keys()) {
      if (regex.test(event)) {
        events.push(event);
      }
    }

    return events;
  }

  /**
   * 发布到匹配模式的所有事件
   * @param {string|RegExp} pattern 匹配模式
   * @param {*} data 事件数据
   * @param {Object} options 选项
   */
  emitPattern(pattern, data, options = {}) {
    const matchingEvents = this.getMatchingEvents(pattern);
    const results = [];

    for (const event of matchingEvents) {
      const result = this.emit(event, data, options);
      results.push({ event, ...result });
    }

    return results;
  }

  /**
   * 创建子EventBus（继承父级配置）
   * @param {string} namespace 子命名空间
   */
  createChild(namespace) {
    const child = new EventBus();
    child.maxListeners = this.maxListeners;
    child.debug = this.debug;

    // 子EventBus的事件会自动添加命名空间前缀
    const originalEmit = child.emit;
    child.emit = (event, data, options) => {
      return originalEmit.call(child, `${namespace}:${event}`, data, options);
    };

    return child;
  }

  /**
   * 中间件支持
   */
  use(middleware) {
    if (!this._middlewares) {
      this._middlewares = [];
    }
    this._middlewares.push(middleware);
  }

  /**
   * 执行中间件
   */
  _executeMiddlewares(event, data) {
    if (!this._middlewares) return { event, data };

    let result = { event, data };

    for (const middleware of this._middlewares) {
      try {
        result = middleware(result.event, result.data) || result;
      } catch (error) {
        console.error('[EventBus] 中间件执行错误:', error);
      }
    }

    return result;
  }

  /**
   * 性能监控
   */
  enablePerformanceMonitoring() {
    this._performanceEnabled = true;
    this._performanceData = new Map();
  }

  /**
   * 获取性能数据
   */
  getPerformanceData() {
    return this._performanceData ? Object.fromEntries(this._performanceData) : {};
  }

  /**
   * 记录性能数据
   */
  _recordPerformance(event, startTime) {
    if (!this._performanceEnabled || !this._performanceData) return;

    const duration = performance.now() - startTime;

    if (!this._performanceData.has(event)) {
      this._performanceData.set(event, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        maxTime: 0
      });
    }

    const data = this._performanceData.get(event);
    data.count++;
    data.totalTime += duration;
    data.avgTime = data.totalTime / data.count;
    data.maxTime = Math.max(data.maxTime, duration);
  }
}

// 导出增强版EventBus
export default EventBus;
