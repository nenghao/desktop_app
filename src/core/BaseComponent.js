/**
 * 组件基类 (BaseComponent)
 * 
 * 【文件职责】
 * 1. 为所有组件提供统一的基础架构和生命周期管理
 * 2. 自动集成EventMixin提供统一的事件处理能力
 * 3. 提供组件渲染、更新、销毁的完整生命周期
 * 4. 统一状态管理和错误处理机制
 * 5. 提供便捷的DOM操作和调试方法
 * 
 * 【设计原则】
 * - 继承此基类的组件都具有统一的API和行为
 * - 自动管理事件监听器，防止内存泄漏
 * - 提供可重写的生命周期钩子
 * - 支持异步渲染和错误恢复
 * 
 * 【生命周期】
 * 1. 创建阶段：constructor() → onCreate()
 * 2. 渲染阶段：safeRender() → render() → bindEvents() → onMounted()
 * 3. 更新阶段：update() → render() → bindEvents() → onUpdated()
 * 4. 销毁阶段：destroy() → onBeforeUnmount() → 清理 → onUnmounted()
 * 
 * 【事件能力】
 * - 内部事件：this.on('event', callback)
 * - DOM事件：this.bindClick('#btn', handler)
 * - 全局事件：this.onGlobal(AUTH_EVENTS.LOGIN, callback)
 * 
 * 【使用方式】
 * ```javascript
 * class MyComponent extends BaseComponent {
 *   getDefaultOptions() {
 *     return { title: '默认标题' };
 *   }
 *   
 *   async render(container, props) {
 *     container.innerHTML = `<h1>${props.title}</h1>`;
 *   }
 *   
 *   bindEvents() {
 *     this.bindClick('h1', () => console.log('标题被点击'));
 *   }
 * }
 * ```
 * 
 * 【注意事项】
 * - 子类必须实现render()方法
 * - 使用safeRender()而不是render()来渲染组件
 * - 销毁组件时事件监听器会自动清理
 * 
 * @author Questech Team
 * @since 1.0.0
 */

import { COMPONENT_EVENTS } from './EventConstants.js';

export class BaseComponent {
    constructor(options = {}) {
        // 基础属性
        this.container = null;
        this.options = { ...this.getDefaultOptions(), ...options };
        this.id = this.options.id || null;
        this.state = {};
        this.isRendered = false;
        this.isDestroyed = false;

        // 初始化事件系统属性
        this._listeners = new Map();
        this._domListeners = new Set();
        this._globalEventBus = options.eventBus || (window.app && window.app.getService ? window.app.getService('eventBus') : null);
        this._eventNamespace = this.getEventNamespace();

        // 生命周期钩子
        this.onCreate();
        this.emit(COMPONENT_EVENTS.INIT);
    }

    // ===== 事件系统方法 =====

    /**
     * 发送内部事件
     * @param {string} event 事件名称
     * @param {*} data 事件数据
     */
    emit(event, data) {
        const listeners = this._listeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`事件处理器错误 [${event}]:`, error);
                }
            });
        }
    }

    /**
     * 监听内部事件
     * @param {string} event 事件名称
     * @param {Function} callback 回调函数
     */
    on(event, callback) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(callback);
    }

    /**
     * 移除内部事件监听
     * @param {string} event 事件名称
     * @param {Function} callback 回调函数
     */
    off(event, callback) {
        const listeners = this._listeners.get(event);
        if (listeners) {
            listeners.delete(callback);
            if (listeners.size === 0) {
                this._listeners.delete(event);
            }
        }
    }

    /**
     * 发送全局事件
     * @param {string} event 事件名称
     * @param {*} data 事件数据
     */
    emitGlobal(event, data) {
        if (this._globalEventBus) {
            const fullEvent = this._eventNamespace ? `${this._eventNamespace}:${event}` : event;
            this._globalEventBus.emit(fullEvent, data);
        }
    }

    /**
     * 监听全局事件
     * @param {string} event 事件名称
     * @param {Function} callback 回调函数
     */
    onGlobal(event, callback) {
        if (this._globalEventBus) {
            const fullEvent = this._eventNamespace ? `${this._eventNamespace}:${event}` : event;
            this._globalEventBus.on(fullEvent, callback);
        }
    }

    /**
     * 添加DOM事件监听器
     * @param {Element|string} element DOM元素或选择器
     * @param {string} event 事件类型
     * @param {Function} callback 回调函数
     * @param {Object} options 事件选项
     */
    addDOMListener(element, event, callback, options = {}) {
        // 如果传入的是字符串选择器，查找元素
        if (typeof element === 'string') {
            element = this.container ? this.container.querySelector(element) : document.querySelector(element);
        }
        
        // 验证元素是否存在且为DOM元素
        if (!element || typeof element.addEventListener !== 'function') {
            console.warn(`[${this.constructor.name}] 无效的DOM元素:`, element);
            return;
        }
        
        element.addEventListener(event, callback, options);
        this._domListeners.add({ element, event, callback, options });
    }

    /**
     * 绑定点击事件
     * @param {Element|string} element DOM元素或选择器
     * @param {Function} callback 回调函数
     */
    bindClick(element, callback) {
        this.addDOMListener(element, 'click', callback);
    }

    /**
     * 绑定输入事件
     * @param {Element|string} element DOM元素或选择器
     * @param {Function} callback 回调函数
     */
    bindInput(element, callback) {
        this.addDOMListener(element, 'input', callback);
    }

    /**
     * 销毁事件系统
     */
    destroyEventSystem() {
        // 清理DOM事件监听器
        this._domListeners.forEach(({ element, event, callback, options }) => {
            element.removeEventListener(event, callback, options);
        });
        this._domListeners.clear();

        // 清理内部事件监听器
        this._listeners.clear();

        // 重置属性
        this._globalEventBus = null;
        this._eventNamespace = null;
    }

    // ===== 容器管理方法 =====

    /**
     * 设置容器元素
     * @param {Element} container 容器元素
     */
    setContainer(container) {
        this.container = container;
        if (container) {
            container.setAttribute('data-component', this.constructor.name);
        }
    }

    // ===== 抽象方法 (子类必须实现) =====

    /**
     * 渲染组件 - 子类必须实现
     * @param {Element} container 容器元素
     * @param {Object} props 属性
     */
    async render(container, props = {}) {
        throw new Error('子类必须实现 render 方法');
    }

    /**
     * 获取默认选项 - 子类可重写
     */
    getDefaultOptions() {
        return {};
    }

    /**
     * 获取事件命名空间 - 子类可重写
     */
    getEventNamespace() {
        return this.constructor.name.toLowerCase().replace('component', '');
    }

    // ===== 生命周期方法 (子类可重写) =====

    /**
     * 组件创建时调用
     */
    onCreate() {
        // 子类可重写
    }

    /**
     * 组件挂载后调用
     */
    onMounted() {
        // 子类可重写
    }

    /**
     * 组件更新后调用
     */
    onUpdated(prevProps, prevState) {
        // 子类可重写
    }

    /**
     * 组件卸载前调用
     */
    onBeforeUnmount() {
        // 子类可重写
    }

    /**
     * 组件卸载后调用
     */
    onUnmounted() {
        // 子类可重写
    }

    /**
     * 绑定事件 - 子类重写来添加特定事件监听
     */
    bindEvents() {
        // 子类可重写
    }

    // ===== 核心方法 =====

    /**
     * 安全渲染方法
     */
    async safeRender(container, props = {}) {
        if (this.isDestroyed) {
            throw new Error('组件已销毁，无法渲染');
        }

        if (!container) {
            throw new Error('渲染容器不能为空');
        }

        try {
            this.container = container;

            // 调用子类的render方法
            await this.render(container, props);

            // 设置渲染状态
            this.isRendered = true;

            // 绑定事件
            this.bindEvents();

            // 触发生命周期
            this.onMounted();
            this.emit(COMPONENT_EVENTS.MOUNTED);

            console.log(`✅ ${this.constructor.name} 渲染完成`);

        } catch (error) {
            console.error(`❌ ${this.constructor.name} 渲染失败:`, error);
            throw error;
        }
    }

    /**
     * 更新组件
     */
    async update(props = {}) {
        if (!this.isRendered || this.isDestroyed) {
            console.warn(`${this.constructor.name} 未渲染或已销毁，无法更新`);
            return;
        }

        const prevProps = { ...this.options };
        const prevState = { ...this.state };

        try {
            // 更新属性
            this.options = { ...this.options, ...props };

            // 重新渲染
            await this.render(this.container, this.options);

            // 重新绑定事件
            this.clearDOMListeners();
            this.bindEvents();

            // 触发生命周期
            this.onUpdated(prevProps, prevState);
            this.emit(COMPONENT_EVENTS.UPDATED, { prevProps, prevState });

            console.log(`✅ ${this.constructor.name} 更新完成`);

        } catch (error) {
            console.error(`❌ ${this.constructor.name} 更新失败:`, error);
            throw error;
        }
    }

    /**
     * 销毁组件
     */
    async destroy() {
        if (this.isDestroyed) {
            return;
        }

        try {
            // 触发销毁前生命周期
            this.onBeforeUnmount();

            // 销毁组件时调用
            this.destroyEventSystem();

            // 清理DOM
            if (this.container) {
                this.container.innerHTML = '';
                this.container = null;
            }

            // 重置状态
            this.state = {};
            this.isRendered = false;
            this.isDestroyed = true;

            // 触发销毁后生命周期
            this.onUnmounted();
            this.emit(COMPONENT_EVENTS.UNMOUNTED);

            console.log(`✅ ${this.constructor.name} 已销毁`);

        } catch (error) {
            console.error(`❌ ${this.constructor.name} 销毁失败:`, error);
        }
    }

    // ===== 状态管理 =====

    /**
     * 设置状态
     */
    setState(newState, shouldUpdate = true) {
        const prevState = { ...this.state };
        this.state = { ...this.state, ...newState };

        this.emit(COMPONENT_EVENTS.STATE_CHANGED, {
            prevState,
            newState: this.state
        });

        if (shouldUpdate && this.isRendered) {
            this.update();
        }
    }

    /**
     * 获取状态
     */
    getState(key = null) {
        return key ? this.state[key] : { ...this.state };
    }

    // ===== 便捷方法 =====

    /**
     * 查找子元素
     */
    $(selector) {
        return this.container ? this.container.querySelector(selector) : null;
    }

    /**
     * 查找多个子元素
     */
    $$(selector) {
        return this.container ? this.container.querySelectorAll(selector) : [];
    }

    /**
     * 设置加载状态
     */
    setLoading(loading = true) {
        this.setState({ loading });

        if (this.container) {
            this.container.classList.toggle('loading', loading);
        }
    }

    /**
     * 设置错误状态
     */
    setError(error = null) {
        this.setState({ error });

        if (this.container) {
            this.container.classList.toggle('error', !!error);
        }
    }

    /**
     * 显示/隐藏组件
     */
    setVisible(visible = true) {
        this.setState({ visible });

        if (this.container) {
            this.container.style.display = visible ? '' : 'none';
        }
    }

    // ===== 调试方法 =====

    /**
     * 获取组件信息
     */
    getDebugInfo() {
        return {
            name: this.constructor.name,
            isRendered: this.isRendered,
            isDestroyed: this.isDestroyed,
            state: this.state,
            options: this.options,
            container: !!this.container,
            events: this.getEventDebugInfo()
        };
    }

    /**
     * 日志输出
     */
    log(...args) {
        console.log(`[${this.constructor.name}]`, ...args);
    }

    /**
     * 警告输出
     */
    warn(...args) {
        console.warn(`[${this.constructor.name}]`, ...args);
    }

    /**
     * 错误输出
     */
    error(...args) {
        console.error(`[${this.constructor.name}]`, ...args);
    }
}

/**
 * 创建简单组件的工厂函数
 * @param {Object} config 组件配置
 */
export function createComponent(config) {
    return class extends BaseComponent {
        getDefaultOptions() {
            return config.defaultOptions || {};
        }

        getEventNamespace() {
            return config.namespace || super.getEventNamespace();
        }

        async render(container, props) {
            if (config.render) {
                return await config.render.call(this, container, props);
            }
        }

        bindEvents() {
            if (config.bindEvents) {
                config.bindEvents.call(this);
            }
        }

        onCreate() {
            if (config.onCreate) {
                config.onCreate.call(this);
            }
        }

        onMounted() {
            if (config.onMounted) {
                config.onMounted.call(this);
            }
        }

        onUpdated(prevProps, prevState) {
            if (config.onUpdated) {
                config.onUpdated.call(this, prevProps, prevState);
            }
        }

        onBeforeUnmount() {
            if (config.onBeforeUnmount) {
                config.onBeforeUnmount.call(this);
            }
        }

        onUnmounted() {
            if (config.onUnmounted) {
                config.onUnmounted.call(this);
            }
        }
    };
}

export default BaseComponent;