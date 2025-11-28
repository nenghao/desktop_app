/**
 * 全局事件管理器 (GlobalEventManager)
 * 
 * 【文件职责】
 * 1. 管理整个应用的全局EventBus实例（单例模式）
 * 2. 提供统一的全局事件操作接口
 * 3. 协调不同模块间的事件通信
 * 4. 提供事件系统的统计和监控功能
 * 5. 管理事件命名空间，避免事件名冲突
 * 
 * 【与底层EventBus的区别】
 * - core/EventBus.js: 纯粹的事件总线实现类（无状态）
 * - core/GlobalEventManager.js: 应用级事件管理器（有状态，管理全局实例）
 * 
 * 【使用场景】
 * - 跨组件通信：用户登录状态变化、主题切换等
 * - 系统级事件：应用初始化、错误处理等
 * - 模块间协调：路由变化、数据更新通知等
 * 
 * 【API说明】
 * - on(event, callback): 订阅全局事件
 * - emit(event, data): 发布全局事件  
 * - createNamespace(name): 创建命名空间
 * - getEventStats(): 获取事件统计信息
 * 
 * @author Questech Team
 * @since 1.0.0
 */

// 导入增强版EventBus
export { EventBus } from './EventBus.js';

// 导入事件相关功能
import { EventBus as EnhancedEventBus } from './EventBus.js';

/**
 * 全局事件管理器单例
 * 
 * 【设计模式】单例模式
 * 【职责】管理全局EventBus实例，提供应用级事件协调
 */
class GlobalEventManager {
    constructor() {
        this._eventBus = null;
        this._initialized = false;
    }

    /**
     * 初始化全局事件管理器
     * 
     * 【功能】
     * - 创建全局EventBus实例
     * - 配置调试模式和性能监控
     * - 设置开发环境优化
     * 
     * @returns {EventBus} 初始化后的EventBus实例
     */
    initialize() {
        if (this._initialized) {
            console.warn('[GlobalEventManager] 已经初始化，跳过重复初始化');
            return this._eventBus;
        }

        this._eventBus = new EnhancedEventBus();

        // 开发环境启用调试和性能监控
        const isDevelopment = (typeof process !== 'undefined' && process?.env?.NODE_ENV === 'development') ||
                             (typeof window !== 'undefined' && window.location?.hostname === 'localhost');

        if (isDevelopment) {
            this._eventBus.setDebug(true);
            this._eventBus.enablePerformanceMonitoring();
        }

        this._initialized = true;
        console.log('✅ 全局事件管理器初始化完成');

        return this._eventBus;
    }

    /**
     * 获取EventBus实例
     * 
     * 【功能】获取或自动创建全局EventBus实例
     * @returns {EventBus} EventBus实例
     */
    getEventBus() {
        if (!this._initialized) {
            return this.initialize();
        }
        return this._eventBus;
    }

    /**
     * 重置事件管理器
     * 
     * 【使用场景】测试环境、应用重启等
     */
    reset() {
        if (this._eventBus) {
            this._eventBus.clear();
        }
        this._initialized = false;
        this._eventBus = null;
        console.log('🔄 全局事件管理器已重置');
    }

    /**
     * 获取事件系统统计信息
     * 
     * 【返回数据】
     * - eventCount: 事件总数
     * - listenerCount: 监听器总数
     * - namespaceCount: 命名空间数量
     * - performanceEvents: 性能监控事件数
     * 
     * @returns {Object} 统计信息对象
     */
    getStats() {
        if (!this._eventBus) {
            return { error: '事件管理器未初始化' };
        }

        const stats = this._eventBus.getStats();
        const debugInfo = this._eventBus.getDebugInfo();
        const perfData = this._eventBus.getPerformanceData();

        return {
            initialized: this._initialized,
            eventCount: stats.totalEvents,
            listenerCount: stats.totalListeners,
            namespaceCount: stats.namespaces?.size || 0,
            performanceEvents: Object.keys(perfData).length,
            debugMode: this._eventBus.debug,
            topEvents: stats.topEvents?.slice(0, 5) || []
        };
    }

    /**
     * 创建事件命名空间
     * 
     * 【功能】为模块创建独立的事件命名空间，避免事件名冲突
     * 【示例】const userNS = createNamespace('user'); userNS.on('login', callback);
     * 
     * @param {string} name 命名空间名称
     * @returns {Object} 命名空间对象
     */
    namespace(name) {
        return this.getEventBus().namespace(name);
    }

    /**
     * 批量订阅事件
     * 
     * 【使用场景】组件需要监听多个相关事件时
     * @param {Object} eventMap 事件映射对象 {eventName: callback}
     * @param {Object} options 订阅选项
     * @returns {Function} 批量取消订阅函数
     */
    onMultiple(eventMap, options = {}) {
        return this.getEventBus().onMultiple(eventMap, options);
    }

    /**
     * 等待特定事件触发
     * 
     * 【使用场景】异步等待某个事件完成
     * @param {string} event 事件名称
     * @param {number} timeout 超时时间(ms)
     * @returns {Promise} 事件Promise
     */
    waitFor(event, timeout = 5000) {
        return this.getEventBus().waitFor(event, timeout);
    }
}

// 创建全局单例实例
const globalEventManager = new GlobalEventManager();

// 导出单例
export default globalEventManager;
export { globalEventManager };

// ===== 便捷的全局函数 =====

/**
 * 获取全局EventBus实例
 * @returns {EventBus} 全局EventBus实例
 */
export function getGlobalEventBus() {
    return globalEventManager.getEventBus();
}

/**
 * 创建事件命名空间
 * @param {string} name 命名空间名称
 * @returns {Object} 命名空间对象
 */
export function createNamespace(name) {
    return globalEventManager.namespace(name);
}

/**
 * 获取事件系统统计信息
 * @returns {Object} 统计信息
 */
export function getEventStats() {
    return globalEventManager.getStats();
}

/**
 * 重置事件系统
 */
export function resetEventSystem() {
    return globalEventManager.reset();
}

// ===== 全局事件操作函数 =====

/**
 * 订阅全局事件
 * @param {string} event 事件名称
 * @param {Function} callback 回调函数
 * @param {Object} options 选项
 * @returns {Function} 取消订阅函数
 */
export function on(event, callback, options = {}) {
    return getGlobalEventBus().on(event, callback, options);
}

/**
 * 订阅一次性全局事件
 * @param {string} event 事件名称
 * @param {Function} callback 回调函数
 * @param {Object} options 选项
 * @returns {Function} 取消订阅函数
 */
export function once(event, callback, options = {}) {
    return getGlobalEventBus().once(event, callback, options);
}

/**
 * 取消订阅全局事件
 * @param {string} event 事件名称
 * @param {string|Function} callbackOrId 回调函数或监听器ID
 * @returns {boolean} 是否成功取消
 */
export function off(event, callbackOrId) {
    return getGlobalEventBus().off(event, callbackOrId);
}

/**
 * 发布全局事件
 * @param {string} event 事件名称
 * @param {*} data 事件数据
 * @param {Object} options 选项
 * @returns {Object} 发布结果
 */
export function emit(event, data, options = {}) {
    return getGlobalEventBus().emit(event, data, options);
}

/**
 * 异步发布全局事件
 * @param {string} event 事件名称
 * @param {*} data 事件数据
 * @param {Object} options 选项
 * @returns {Promise<Object>} 发布结果Promise
 */
export function emitAsync(event, data, options = {}) {
    return getGlobalEventBus().emitAsync(event, data, options);
}

/**
 * 清除全局事件监听器
 * @param {string} event 事件名称，为空则清除所有
 */
export function clear(event = null) {
    return getGlobalEventBus().clear(event);
}

/**
 * 等待全局事件触发
 * @param {string} event 事件名称
 * @param {number} timeout 超时时间(ms)
 * @returns {Promise} 事件Promise
 */
export function waitFor(event, timeout = 5000) {
    return getGlobalEventBus().waitFor(event, timeout);
}

/**
 * 批量订阅全局事件
 * @param {Object} eventMap 事件映射对象
 * @param {Object} options 选项
 * @returns {Function} 批量取消订阅函数
 */
export function onMultiple(eventMap, options = {}) {
    return getGlobalEventBus().onMultiple(eventMap, options);
}

/**
 * 批量发布全局事件
 * @param {Array} events 事件数组
 * @param {Object} options 选项
 * @returns {Array} 发布结果数组
 */
export function emitMultiple(events, options = {}) {
    return getGlobalEventBus().emitMultiple(events, options);
}

/**
 * 模式匹配发布全局事件
 * @param {string|RegExp} pattern 匹配模式
 * @param {*} data 事件数据
 * @param {Object} options 选项
 * @returns {Array} 发布结果数组
 */
export function emitPattern(pattern, data, options = {}) {
    return getGlobalEventBus().emitPattern(pattern, data, options);
}

// ===== 自动初始化 =====

// 浏览器环境下自动初始化（延迟执行，避免阻塞页面加载）
if (typeof window !== 'undefined') {
    setTimeout(() => {
        globalEventManager.initialize();
    }, 0);
}