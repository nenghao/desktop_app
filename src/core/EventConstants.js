/**
 * 事件常量定义 (EventConstants)
 * 
 * 【文件职责】
 * 1. 统一定义所有事件名称常量，避免魔法字符串
 * 2. 提供事件命名规范和验证规则
 * 3. 按模块和功能分类组织事件常量
 * 4. 提供事件名解析和验证工具函数
 * 5. 确保事件名的一致性和可维护性
 * 
 * 【命名规范】
 * - 全局事件格式：'模块:动作' 如 'auth:login', 'ui:modal-open'
 * - 组件内部事件格式：'动作名' 如 'click', 'change', 'mounted'
 * - 使用小写字母和连字符，不使用驼峰命名
 * - 动词在前，名词在后
 * 
 * 【事件分类】
 * 1. 全局事件：跨组件通信，带模块前缀
 *    - APP_EVENTS: 应用生命周期事件
 *    - AUTH_EVENTS: 用户认证事件
 *    - ROUTER_EVENTS: 路由导航事件
 *    - THEME_EVENTS: 主题切换事件
 *    - AGENT_EVENTS: 智能体事件
 *    - UI_EVENTS: UI组件事件
 *    - DATA_EVENTS: 数据操作事件
 *    - SYSTEM_EVENTS: 系统级事件
 * 
 * 2. 组件内部事件：组件内部状态变化
 *    - COMPONENT_EVENTS: 通用组件事件
 *    - FORM_EVENTS: 表单组件事件
 *    - LIST_EVENTS: 列表/表格组件事件
 * 
 * 【使用方式】
 * ```javascript
 * import { AUTH_EVENTS, UI_EVENTS } from './EventConstants.js';
 * 
 * // ✅ 好的方式
 * this.emitGlobal(AUTH_EVENTS.LOGIN_SUCCESS, userData);
 * this.onGlobal(UI_EVENTS.MODAL_OPEN, callback);
 * 
 * // ❌ 避免的方式
 * this.emitGlobal('userLogin', userData); // 魔法字符串
 * this.onGlobal('openModal', callback);  // 命名不统一
 * ```
 * 
 * 【扩展指南】
 * 添加新事件时，请遵循以下步骤：
 * 1. 确定事件属于哪个模块
 * 2. 按命名规范定义事件名
 * 3. 添加到对应的事件常量对象
 * 4. 在JSDoc中添加说明
 * 
 * @author Questech Team
 * @since 1.0.0
 */

// ===== 全局事件类型 =====

/**
 * 应用生命周期事件
 */
export const APP_EVENTS = {
    // 应用启动
    INIT: 'app:init',
    READY: 'app:ready',
    ERROR: 'app:error',

    // 应用状态
    LOADING_START: 'app:loading-start',
    LOADING_END: 'app:loading-end',

    // 应用销毁
    BEFORE_UNLOAD: 'app:before-unload',
    UNLOAD: 'app:unload'
};

/**
 * 路由事件
 */
export const ROUTER_EVENTS = {
    // 路由变化
    BEFORE_NAVIGATE: 'router:before-navigate',
    AFTER_NAVIGATE: 'router:after-navigate',
    NAVIGATE_ERROR: 'router:navigate-error',

    // 路由状态
    ROUTE_CHANGED: 'router:route-changed',
    PARAMS_CHANGED: 'router:params-changed',
    QUERY_CHANGED: 'router:query-changed'
};

/**
 * 用户认证事件
 */
export const AUTH_EVENTS = {
    // 登录相关
    LOGIN_START: 'auth:login-start',
    LOGIN_SUCCESS: 'auth:login-success',
    LOGIN_ERROR: 'auth:login-error',

    // 登出相关
    LOGOUT: 'auth:logout',
    LOGOUT_SUCCESS: 'auth:logout-success',

    // Token相关
    TOKEN_REFRESH: 'auth:token-refresh',
    TOKEN_EXPIRED: 'auth:token-expired',

    // 用户状态
    USER_CHANGED: 'auth:user-changed',
    PROFILE_UPDATED: 'auth:profile-updated'
};

/**
 * 主题事件
 */
export const THEME_EVENTS = {
    // 主题切换
    CHANGE: 'theme:change',
    CHANGED: 'theme:changed',

    // 系统主题
    SYSTEM_CHANGE: 'theme:system-change',

    // 颜色更新
    COLOR_UPDATE: 'theme:color-update',

    // 自定义主题
    CUSTOM_THEME_ADD: 'theme:custom-add',
    CUSTOM_THEME_REMOVE: 'theme:custom-remove'
};

/**
 * 智能体事件
 */
export const AGENT_EVENTS = {
    // 生命周期
    BEFORE_INSTALL: 'agent:before-install',
    INSTALLED: 'agent:installed',
    BEFORE_LOAD: 'agent:before-load',
    LOADED: 'agent:loaded',
    BEFORE_START: 'agent:before-start',
    STARTED: 'agent:started',
    BEFORE_STOP: 'agent:before-stop',
    STOPPED: 'agent:stopped',
    UNLOADED: 'agent:unloaded',

    // 状态变化
    STATUS_CHANGED: 'agent:status-changed',
    ERROR: 'agent:error',

    // 消息通信
    MESSAGE_SENT: 'agent:message-sent',
    MESSAGE_RECEIVED: 'agent:message-received',

    // 数据更新
    DATA_UPDATED: 'agent:data-updated',
    CONFIG_CHANGED: 'agent:config-changed'
};

/**
 * UI组件事件
 */
export const UI_EVENTS = {
    // 通知系统
    NOTIFICATION_SHOW: 'ui:notification-show',
    NOTIFICATION_HIDE: 'ui:notification-hide',
    NOTIFICATION_CLEAR: 'ui:notification-clear',

    // 模态框
    MODAL_OPEN: 'ui:modal-open',
    MODAL_CLOSE: 'ui:modal-close',

    // 侧边栏
    SIDEBAR_TOGGLE: 'ui:sidebar-toggle',
    SIDEBAR_COLLAPSE: 'ui:sidebar-collapse',
    SIDEBAR_EXPAND: 'ui:sidebar-expand',

    // 搜索
    SEARCH_START: 'ui:search-start',
    SEARCH_RESULTS: 'ui:search-results',
    SEARCH_CLEAR: 'ui:search-clear',

    // 布局
    LAYOUT_RESIZE: 'ui:layout-resize',
    LAYOUT_CHANGE: 'ui:layout-change'
};

/**
 * 数据事件
 */
export const DATA_EVENTS = {
    // 数据加载
    LOADING_START: 'data:loading-start',
    LOADING_END: 'data:loading-end',
    LOAD_ERROR: 'data:load-error',

    // 数据更新
    UPDATED: 'data:updated',
    CREATED: 'data:created',
    DELETED: 'data:deleted',

    // 缓存
    CACHE_CLEARED: 'data:cache-cleared',
    CACHE_UPDATED: 'data:cache-updated',

    // 同步
    SYNC_START: 'data:sync-start',
    SYNC_SUCCESS: 'data:sync-success',
    SYNC_ERROR: 'data:sync-error'
};

/**
 * 系统事件
 */
export const SYSTEM_EVENTS = {
    // 网络状态
    ONLINE: 'system:online',
    OFFLINE: 'system:offline',

    // 窗口状态
    WINDOW_FOCUS: 'system:window-focus',
    WINDOW_BLUR: 'system:window-blur',
    WINDOW_RESIZE: 'system:window-resize',

    // 性能
    PERFORMANCE_WARNING: 'system:performance-warning',
    MEMORY_WARNING: 'system:memory-warning',

    // 错误
    GLOBAL_ERROR: 'system:global-error',
    UNHANDLED_REJECTION: 'system:unhandled-rejection'
};

// ===== 组件内部事件类型 =====

/**
 * 通用组件事件
 */
export const COMPONENT_EVENTS = {
    // 生命周期
    INIT: 'init',
    MOUNTED: 'mounted',
    UPDATED: 'updated',
    UNMOUNTED: 'unmounted',

    // 状态
    STATE_CHANGED: 'state-changed',
    PROPS_CHANGED: 'props-changed',

    // 交互
    CLICK: 'click',
    CHANGE: 'change',
    SUBMIT: 'submit',
    CANCEL: 'cancel',

    // 验证
    VALIDATE: 'validate',
    VALIDATION_ERROR: 'validation-error',
    VALIDATION_SUCCESS: 'validation-success'
};

/**
 * 表单事件
 */
export const FORM_EVENTS = {
    // 表单状态
    DIRTY: 'dirty',
    PRISTINE: 'pristine',
    VALID: 'valid',
    INVALID: 'invalid',

    // 字段事件
    FIELD_CHANGE: 'field-change',
    FIELD_FOCUS: 'field-focus',
    FIELD_BLUR: 'field-blur',

    // 提交相关
    BEFORE_SUBMIT: 'before-submit',
    SUBMIT_SUCCESS: 'submit-success',
    SUBMIT_ERROR: 'submit-error',

    // 重置
    RESET: 'reset'
};

/**
 * 列表/表格事件
 */
export const LIST_EVENTS = {
    // 选择
    ITEM_SELECT: 'item-select',
    ITEM_DESELECT: 'item-deselect',
    SELECTION_CHANGE: 'selection-change',

    // 排序
    SORT_CHANGE: 'sort-change',

    // 过滤
    FILTER_CHANGE: 'filter-change',

    // 分页
    PAGE_CHANGE: 'page-change',
    PAGE_SIZE_CHANGE: 'page-size-change',

    // 数据操作
    ITEM_ADD: 'item-add',
    ITEM_UPDATE: 'item-update',
    ITEM_DELETE: 'item-delete'
};

// ===== 事件命名规范 =====

/**
 * 事件命名规范
 */
export const EVENT_NAMING_RULES = {
    GLOBAL_FORMAT: 'module:action',
    COMPONENT_FORMAT: 'action',

    // 常用动词
    VERBS: [
        'start', 'stop', 'pause', 'resume',
        'load', 'unload', 'reload',
        'create', 'update', 'delete',
        'show', 'hide', 'toggle',
        'open', 'close',
        'connect', 'disconnect',
        'send', 'receive',
        'validate', 'error'
    ],

    // 常用名词
    NOUNS: [
        'user', 'data', 'file', 'image',
        'message', 'notification', 'modal',
        'agent', 'plugin', 'theme',
        'route', 'page', 'view'
    ]
};

// ===== 辅助函数 =====

/**
 * 创建命名空间事件名
 * @param {string} namespace 命名空间
 * @param {string} event 事件名
 */
export function createNamespacedEvent(namespace, event) {
    return `${namespace}:${event}`;
}

/**
 * 解析事件名
 * @param {string} eventName 完整事件名
 */
export function parseEventName(eventName) {
    const parts = eventName.split(':');
    return {
        namespace: parts.length > 1 ? parts[0] : null,
        event: parts.length > 1 ? parts[1] : parts[0],
        full: eventName
    };
}

/**
 * 验证事件名格式
 * @param {string} eventName 事件名
 * @param {boolean} requireNamespace 是否必须有命名空间
 */
export function validateEventName(eventName, requireNamespace = false) {
    if (typeof eventName !== 'string' || !eventName.trim()) {
        return false;
    }

    const parsed = parseEventName(eventName);

    if (requireNamespace && !parsed.namespace) {
        return false;
    }

    // 检查格式：小写字母、数字、连字符
    const validFormat = /^[a-z0-9-]+(:[\a-z0-9-]+)?$/.test(eventName);

    return validFormat;
}

/**
 * 获取所有事件常量
 */
export function getAllEvents() {
    return {
        APP_EVENTS,
        ROUTER_EVENTS,
        AUTH_EVENTS,
        THEME_EVENTS,
        AGENT_EVENTS,
        UI_EVENTS,
        DATA_EVENTS,
        SYSTEM_EVENTS,
        COMPONENT_EVENTS,
        FORM_EVENTS,
        LIST_EVENTS
    };
}