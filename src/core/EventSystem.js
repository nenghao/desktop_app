/**
 * 统一事件系统入口 (EventSystem)
 * 
 * 【文件职责】
 * 1. 作为整个事件系统的统一入口和对外API
 * 2. 整合EventBus、EventMixin、BaseComponent和事件常量
 * 3. 提供应用级的事件系统管理器
 * 4. 管理组件实例和命名空间的生命周期
 * 5. 提供事件系统的初始化和配置管理
 * 
 * 【架构设计】
 * 这是事件系统的最高层，统一管理和协调所有事件相关功能：
 * 
 * ┌──────────────────────────────────────┐
 * │       EventSystem.js (统一入口)        │
 * ├──────────────────────────────────────┤
 * │ GlobalEventManager.js  │  BaseComponent.js │
 * │ (全局事件管理)    │   (组件基类)   │
 * ├─────────────────────┼──────────────────┤
 * │    EventMixin.js       │ EventConstants.js  │
 * │  (事件处理混入)     │  (事件常量)     │
 * ├─────────────────────┴──────────────────┤
 * │  EventBus.js (底层实现)                 │
 * └──────────────────────────────────────┘
 * 
 * 【核心功能】
 * 1. 事件系统初始化和配置
 * 2. 组件实例的创建和管理
 * 3. 命名空间的创建和管理
 * 4. 系统统计和监控
 * 5. 资源清理和生命周期管理
 * 
 * 【使用方式】
 * ```javascript
 * // 1. 初始化系统
 * import { initEventSystem } from './core/EventSystem.js';
 * await initEventSystem({ debug: true });
 * 
 * // 2. 创建组件
 * import { createEventComponent, BaseComponent } from './core/EventSystem.js';
 * class MyComponent extends BaseComponent {}
 * const component = createEventComponent(MyComponent);
 * 
 * // 3. 使用事件常量
 * import { AUTH_EVENTS, UI_EVENTS } from './core/EventSystem.js';
 * 
 * // 4. 全局事件操作
 * import { on, emit, createNamespace } from './core/EventSystem.js';
 * ```
 * 
 * 【配置选项】
 * - debug: boolean - 是否启用调试模式
 * - maxListeners: number - 最大监听器数量
 * - enablePerformanceMonitoring: boolean - 是否启用性能监控
 * - middlewares: Array - 中间件列表
 * 
 * 【注意事项】
 * - 这是事件系统的唯一对外入口，其他模块不应直接引用
 * - 初始化后所有组件都会自动使用统一的事件系统
 * - 系统销毁时会自动清理所有资源
 * 
 * @author Questech Team
 * @since 1.0.0
 */

// 导出核心事件类
export { EventBus } from './EventBus.js';
export { EventMixin, withEvents } from './EventMixin.js';
export { BaseComponent, createComponent } from './BaseComponent.js';

// 导出事件常量
export * from './EventConstants.js';

// 导出全局事件管理器
export {
    globalEventManager,
    getGlobalEventBus,
    createNamespace,
    getEventStats,
    resetEventSystem,
    on,
    once,
    off,
    emit,
    emitAsync,
    clear,
    waitFor,
    onMultiple,
    emitMultiple,
    emitPattern
} from './GlobalEventManager.js';

/**
 * 统一事件系统管理器
 * 提供完整的事件系统功能
 */
export class UnifiedEventSystem {
    constructor() {
        this.initialized = false;
        this.components = new Set();
        this.namespaces = new Map();
    }

    /**
     * 初始化统一事件系统
     */
    async initialize(config = {}) {
        if (this.initialized) {
            console.warn('[UnifiedEventSystem] 系统已初始化');
            return;
        }

        try {
            // 导入全局事件管理器
            const { globalEventManager } = await import('./GlobalEventManager.js');

            // 初始化全局EventBus
            this.globalEventBus = globalEventManager.initialize();

            // 配置系统
            if (config.debug !== undefined) {
                this.globalEventBus.setDebug(config.debug);
            }

            if (config.maxListeners) {
                this.globalEventBus.setMaxListeners(config.maxListeners);
            }

            if (config.enablePerformanceMonitoring) {
                this.globalEventBus.enablePerformanceMonitoring();
            }

            // 设置中间件
            if (config.middlewares && Array.isArray(config.middlewares)) {
                config.middlewares.forEach(middleware => {
                    this.globalEventBus.use(middleware);
                });
            }

            this.initialized = true;
            console.log('✅ 统一事件系统初始化完成');

        } catch (error) {
            console.error('❌ 统一事件系统初始化失败:', error);
            throw error;
        }
    }

    /**
     * 创建组件实例
     * @param {class} ComponentClass 组件类
     * @param {Object} options 组件选项
     */
    createComponent(ComponentClass, options = {}) {
        // 确保组件使用全局EventBus
        const componentOptions = {
            ...options,
            eventBus: this.globalEventBus
        };

        const component = new ComponentClass(componentOptions);

        // 注册组件
        this.components.add(component);

        // 组件销毁时自动移除注册
        const originalDestroy = component.destroy;
        if (typeof originalDestroy === 'function') {
            component.destroy = async () => {
                await originalDestroy.call(component);
                this.components.delete(component);
            };
        }

        return component;
    }

    /**
     * 获取命名空间
     * @param {string} name 命名空间名称
     */
    getNamespace(name) {
        if (!this.namespaces.has(name)) {
            const namespace = this.globalEventBus.namespace(name);
            this.namespaces.set(name, namespace);
        }
        return this.namespaces.get(name);
    }

    /**
     * 批量创建命名空间
     * @param {Array<string>} names 命名空间名称数组
     */
    createNamespaces(names) {
        const namespaces = {};
        names.forEach(name => {
            namespaces[name] = this.getNamespace(name);
        });
        return namespaces;
    }

    /**
     * 获取系统统计
     */
    getSystemStats() {
        if (!this.initialized) {
            return { error: '系统未初始化' };
        }

        const eventBusStats = this.globalEventBus.getStats();
        const performanceData = this.globalEventBus.getPerformanceData();

        return {
            initialized: this.initialized,
            components: this.components.size,
            namespaces: this.namespaces.size,
            events: eventBusStats.totalEvents,
            listeners: eventBusStats.totalListeners,
            performance: Object.keys(performanceData).length,
            topEvents: eventBusStats.topEvents || [],
            componentList: Array.from(this.components).map(comp => ({
                name: comp.constructor.name,
                namespace: comp._eventNamespace,
                rendered: comp.isRendered,
                destroyed: comp.isDestroyed
            }))
        };
    }

    /**
     * 清理系统资源
     */
    async cleanup() {
        try {
            // 销毁所有组件
            const destroyPromises = Array.from(this.components).map(component => {
                if (typeof component.destroy === 'function') {
                    return component.destroy();
                }
            });

            await Promise.all(destroyPromises);

            // 清理命名空间
            this.namespaces.clear();

            // 清理EventBus
            if (this.globalEventBus) {
                this.globalEventBus.clear();
            }

            this.initialized = false;
            console.log('✅ 统一事件系统已清理');

        } catch (error) {
            console.error('❌ 系统清理失败:', error);
        }
    }

    /**
     * 重启系统
     */
    async restart(config = {}) {
        await this.cleanup();
        await this.initialize(config);
    }

    /**
     * 调试系统
     */
    debug() {
        const stats = this.getSystemStats();
        const debugInfo = this.globalEventBus?.getDebugInfo();

        console.group('🔧 统一事件系统调试信息');
        console.log('系统统计:', stats);
        console.log('EventBus调试信息:', debugInfo);
        console.log('组件列表:', Array.from(this.components));
        console.log('命名空间:', Array.from(this.namespaces.keys()));
        console.groupEnd();

        return { stats, debugInfo };
    }
}

// 创建全局统一事件系统实例
const unifiedEventSystem = new UnifiedEventSystem();

// 导出实例和类
export { unifiedEventSystem };
export default unifiedEventSystem;

/**
 * 快速初始化函数
 * @param {Object} config 配置选项
 */
export async function initEventSystem(config = {}) {
    return await unifiedEventSystem.initialize(config);
}

/**
 * 快速创建组件
 * @param {class} ComponentClass 组件类
 * @param {Object} options 选项
 */
export function createEventComponent(ComponentClass, options = {}) {
    return unifiedEventSystem.createComponent(ComponentClass, options);
}

/**
 * 获取系统实例
 */
export function getEventSystem() {
    return unifiedEventSystem;
}