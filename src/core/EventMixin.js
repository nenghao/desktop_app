/**
 * 事件处理混入类 (EventMixin)
 * 
 * 【文件职责】
 * 1. 为组件和服务类提供统一的事件处理能力
 * 2. 管理组件内部事件系统（组件内部通信）
 * 3. 统一管理DOM事件监听器，自动清理防止内存泄漏
 * 4. 提供全局事件系统的接入接口
 * 5. 提供便捷的事件绑定方法（bindClick、bindInput等）
 * 
 * 【设计模式】Mixin模式（混合模式）
 * - 通过Object.assign混入到目标类中
 * - 不改变原有类的继承关系
 * - 提供可复用的事件处理能力
 * 
 * 【三层事件系统】
 * 1. 内部事件：组件内部状态变化通知
 *    - this.on('event', callback)
 *    - this.emit('event', data)
 * 
 * 2. DOM事件：统一管理DOM事件监听器
 *    - this.addDOMListener(element, 'click', handler)
 *    - this.bindClick(selector, handler)
 * 
 * 3. 全局事件：跨组件通信
 *    - this.onGlobal(AUTH_EVENTS.LOGIN, callback)
 *    - this.emitGlobal(UI_EVENTS.MODAL_OPEN, data)
 * 
 * 【使用方式】
 * ```javascript
 * // 方式1：直接混入
 * Object.assign(this, new EventMixin());
 * 
 * // 方式2：使用withEvents装饰器
 * class MyClass extends withEvents(BaseClass) {}
 * 
 * // 方式3：继承BaseComponent（已内置）
 * class MyComponent extends BaseComponent {}
 * ```
 * 
 * 【生命周期管理】
 * - initEventSystem(): 初始化事件系统
 * - destroyEventSystem(): 销毁时自动清理所有事件
 * 
 * @author Questech Team
 * @since 1.0.0
 */

export class EventMixin {
    constructor() {
        // 内部事件系统
        this._listeners = new Map();
        this._domListeners = new Set();
        this._globalEventBus = null;
        this._eventNamespace = null;
    }

    /**
     * 初始化事件系统
     * @param {EventBus} eventBus 全局事件总线
     * @param {string} namespace 事件命名空间
     */
    initEventSystem(eventBus = null, namespace = null) {
        this._globalEventBus = eventBus;
        this._eventNamespace = namespace;
    }

    // ===== 内部事件系统 (组件内部通信) =====

    /**
     * 订阅内部事件
     * @param {string} event 事件名称
     * @param {Function} callback 回调函数
     * @param {Object} options 选项
     */
    on(event, callback, options = {}) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }

        const listener = {
            callback,
            once: options.once || false,
            priority: options.priority || 0,
            id: this._generateId()
        };

        this._listeners.get(event).push(listener);

        // 按优先级排序
        this._listeners.get(event).sort((a, b) => b.priority - a.priority);

        // 返回取消监听函数
        return () => this.off(event, listener.id);
    }

    /**
     * 订阅一次性内部事件
     */
    once(event, callback, options = {}) {
        return this.on(event, callback, { ...options, once: true });
    }

    /**
     * 取消订阅内部事件
     */
    off(event, callbackOrId) {
        if (!this._listeners.has(event)) {
            return false;
        }

        const listeners = this._listeners.get(event);
        let removed = false;

        for (let i = listeners.length - 1; i >= 0; i--) {
            const listener = listeners[i];
            if (listener.id === callbackOrId || listener.callback === callbackOrId) {
                listeners.splice(i, 1);
                removed = true;
            }
        }

        if (listeners.length === 0) {
            this._listeners.delete(event);
        }

        return removed;
    }

    /**
     * 触发内部事件
     */
    emit(event, data) {
        const listeners = this._listeners.get(event);
        if (!listeners || listeners.length === 0) {
            return false;
        }

        const results = [];
        const toRemove = [];

        for (const listener of listeners) {
            try {
                const result = listener.callback(data);
                results.push(result);

                // 一次性事件标记为删除
                if (listener.once) {
                    toRemove.push(listener);
                }
            } catch (error) {
                console.error(`[EventMixin] 内部事件 "${event}" 监听器错误:`, error);
            }
        }

        // 删除一次性监听器
        toRemove.forEach(listener => {
            this.off(event, listener.id);
        });

        return results.length > 0;
    }

    // ===== DOM 事件管理 (统一管理DOM事件监听器) =====

    /**
     * 添加DOM事件监听器
     * @param {Element} element DOM元素
     * @param {string} event 事件名称
     * @param {Function} handler 事件处理器
     * @param {Object|boolean} options 事件选项
     */
    addDOMListener(element, event, handler, options = false) {
        if (!element || typeof handler !== 'function') {
            throw new Error('无效的DOM元素或事件处理器');
        }

        element.addEventListener(event, handler, options);

        // 记录监听器以便清理
        this._domListeners.add({
            element,
            event,
            handler,
            options
        });

        return () => this.removeDOMListener(element, event, handler);
    }

    /**
     * 移除DOM事件监听器
     */
    removeDOMListener(element, event, handler) {
        if (!element) return false;

        element.removeEventListener(event, handler);

        // 从记录中移除
        for (const listener of this._domListeners) {
            if (listener.element === element &&
                listener.event === event &&
                listener.handler === handler) {
                this._domListeners.delete(listener);
                return true;
            }
        }

        return false;
    }

    /**
     * 清理所有DOM监听器
     */
    clearDOMListeners() {
        for (const listener of this._domListeners) {
            try {
                listener.element.removeEventListener(listener.event, listener.handler);
            } catch (error) {
                console.warn('[EventMixin] 清理DOM监听器时出错:', error);
            }
        }
        this._domListeners.clear();
    }

    // ===== 全局事件系统 (跨组件通信) =====

    /**
     * 订阅全局事件
     * @param {string} event 事件名称
     * @param {Function} callback 回调函数
     * @param {Object} options 选项
     */
    onGlobal(event, callback, options = {}) {
        if (!this._globalEventBus) {
            console.warn('[EventMixin] 全局事件总线未初始化');
            return () => { };
        }

        const fullEvent = this._namespaceEvent(event);
        return this._globalEventBus.on(fullEvent, callback, options);
    }

    /**
     * 订阅一次性全局事件
     */
    onceGlobal(event, callback, options = {}) {
        if (!this._globalEventBus) {
            console.warn('[EventMixin] 全局事件总线未初始化');
            return () => { };
        }

        const fullEvent = this._namespaceEvent(event);
        return this._globalEventBus.once(fullEvent, callback, options);
    }

    /**
     * 取消订阅全局事件
     */
    offGlobal(event, callbackOrId) {
        if (!this._globalEventBus) {
            return false;
        }

        const fullEvent = this._namespaceEvent(event);
        return this._globalEventBus.off(fullEvent, callbackOrId);
    }

    /**
     * 触发全局事件
     */
    emitGlobal(event, data, options = {}) {
        if (!this._globalEventBus) {
            console.warn('[EventMixin] 全局事件总线未初始化');
            return false;
        }

        const fullEvent = this._namespaceEvent(event);
        return this._globalEventBus.emit(fullEvent, data, options);
    }

    // ===== 便捷方法 =====

    /**
     * 快速绑定按钮点击事件
     * @param {string|Element} selector 选择器或DOM元素
     * @param {Function} handler 点击处理器
     * @param {Element} context 查找上下文，默认为组件容器
     */
    bindClick(selector, handler, context = null) {
        const element = typeof selector === 'string'
            ? (context || this.container)?.querySelector(selector)
            : selector;

        if (!element) {
            console.warn(`[EventMixin] 未找到元素: ${selector}`);
            return () => { };
        }

        return this.addDOMListener(element, 'click', handler);
    }

    /**
     * 快速绑定输入框变化事件
     */
    bindInput(selector, handler, context = null) {
        const element = typeof selector === 'string'
            ? (context || this.container)?.querySelector(selector)
            : selector;

        if (!element) {
            console.warn(`[EventMixin] 未找到输入元素: ${selector}`);
            return () => { };
        }

        return this.addDOMListener(element, 'input', handler);
    }

    /**
     * 快速绑定表单提交事件
     */
    bindSubmit(selector, handler, context = null) {
        const element = typeof selector === 'string'
            ? (context || this.container)?.querySelector(selector)
            : selector;

        if (!element) {
            console.warn(`[EventMixin] 未找到表单元素: ${selector}`);
            return () => { };
        }

        return this.addDOMListener(element, 'submit', (e) => {
            e.preventDefault();
            handler(e);
        });
    }

    // ===== 生命周期管理 =====

    /**
     * 组件销毁时的清理工作
     */
    destroyEventSystem() {
        // 清理内部事件监听器
        this._listeners.clear();

        // 清理DOM事件监听器
        this.clearDOMListeners();

        console.log('[EventMixin] 事件系统已清理');
    }

    // ===== 私有方法 =====

    /**
     * 为事件添加命名空间
     */
    _namespaceEvent(event) {
        return this._eventNamespace ? `${this._eventNamespace}:${event}` : event;
    }

    /**
     * 生成唯一ID
     */
    _generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    /**
     * 获取调试信息
     */
    getEventDebugInfo() {
        return {
            namespace: this._eventNamespace,
            internalListeners: this._listeners.size,
            domListeners: this._domListeners.size,
            hasGlobalEventBus: !!this._globalEventBus
        };
    }
}

/**
 * 工厂函数：创建带有事件能力的基类
 * @param {class} BaseClass 基础类
 */
export function withEvents(BaseClass = class { }) {
    return class extends BaseClass {
        constructor(...args) {
            super(...args);

            // 混入事件功能
            Object.assign(this, new EventMixin());

            // 调用原始构造函数后初始化事件系统
            if (typeof this.initEvents === 'function') {
                this.initEvents();
            }
        }
    };
}

export default EventMixin;