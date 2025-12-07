/**
 * 全局通知管理器
 * 提供类似Flutter SnackBar的通知功能
 */

import { NotificationContainer } from './NotificationContainer.js';

export class NotificationCenter {
    constructor(options = {}) {
        this.eventBus = options.eventBus;
        this.container = null;
        this.notifications = new Map();
        this.maxCount = options.maxCount || 3;
        this.defaultDurations = {
            success: 3000,
            info: 2000,
            warning: 4000,
            error: 5000
        };

        this.init(options.container || document.body);
        this.setupEventListeners();
    }

    /**
     * 初始化通知容器
     */
    init(parentContainer) {
        this.container = new NotificationContainer({
            parent: parentContainer
        });
    }

    /**
     * 设置事件监听
     */
    setupEventListeners() {
        if (this.eventBus) {
            this.eventBus.on('notification:show', (data) => {
                this.show(data);
            });

            this.eventBus.on('notification:clear', () => {
                this.clear();
            });
        }
    }

    /**
     * 显示通知
     */
    show(options) {
        if (typeof options === 'string') {
            options = { message: options, type: 'info' };
        }

        const config = {
            id: Date.now() + Math.random(),
            type: 'info',
            duration: this.defaultDurations.info,
            closable: true,
            ...options
        };

        // 设置默认持续时间（只在未指定 duration 时设置，允许 duration: 0）
        if (options.duration === undefined) {
            config.duration = this.defaultDurations[config.type] || this.defaultDurations.info;
        }

        // 检查数量限制
        this.enforceMaxCount();

        // 创建并显示通知
        const notification = this.container.addNotification(config);
        this.notifications.set(config.id, notification);

        // 不在这里设置自动移除，让 NotificationItem 自己管理计时器
        // 这样可以支持鼠标悬停暂停功能

        return config.id;
    }

    /**
     * 快捷方法
     */
    success(message, options = {}) {
        return this.show({ ...options, message, type: 'success' });
    }

    error(message, options = {}) {
        return this.show({ ...options, message, type: 'error' });
    }

    warning(message, options = {}) {
        return this.show({ ...options, message, type: 'warning' });
    }

    info(message, options = {}) {
        return this.show({ ...options, message, type: 'info' });
    }

    /**
     * 显示持久通知（不会自动消失）
     * @param {string} message - 通知消息
     * @param {Object} options - 配置选项
     * @param {string} options.type - 通知类型: 'success' | 'error' | 'warning' | 'info'
     * @param {string} options.title - 通知标题（可选）
     * @param {Array} options.actions - 操作按钮数组（可选）
     * @returns {number} 通知ID
     */
    pin(message, options = {}) {
        console.log('✅显示持久通知 ' + message);
        return this.show({
            ...options,
            message,
            type: options.type || 'info',
            duration: 0  // duration 设为 0 表示不自动消失
        });
    }

    /**
     * 移除通知
     */
    remove(id) {
        const notification = this.notifications.get(id);
        if (notification) {
            this.container.removeNotification(id);
            this.notifications.delete(id);
        }
    }

    /**
     * 清除所有通知
     */
    clear() {
        this.notifications.clear();
        this.container.clear();
    }

    /**
     * 按类型清除
     */
    clearByType(type) {
        for (const [id, notification] of this.notifications) {
            if (notification.config && notification.config.type === type) {
                this.remove(id);
            }
        }
    }

    /**
     * 暂停所有通知的自动关闭
     */
    pauseAll() {
        for (const notification of this.notifications.values()) {
            if (notification.pauseTimer) {
                notification.pauseTimer();
            }
        }
    }

    /**
     * 恢复所有通知的自动关闭
     */
    resumeAll() {
        for (const notification of this.notifications.values()) {
            if (notification.resumeTimer) {
                notification.resumeTimer();
            }
        }
    }

    /**
     * 获取指定ID的通知
     */
    getNotification(id) {
        return this.notifications.get(id);
    }

    /**
     * 获取所有通知
     */
    getAllNotifications() {
        return Array.from(this.notifications.values());
    }

    /**
     * 更新通知内容
     */
    updateNotification(id, updates) {
        const notification = this.notifications.get(id);
        if (notification && notification.config) {
            Object.assign(notification.config, updates);
            // 重新渲染通知
            const element = notification.render();
            if (notification.element && notification.element.parentNode) {
                notification.element.parentNode.replaceChild(element, notification.element);
            }
        }
    }

    /**
     * 设置最大通知数量
     */
    setMaxCount(count) {
        this.maxCount = count;
        this.enforceMaxCount();
    }

    /**
     * 设置默认持续时间
     */
    setDefaultDuration(type, duration) {
        this.defaultDurations[type] = duration;
    }

    /**
     * 强制执行最大数量限制
     */
    enforceMaxCount() {
        while (this.notifications.size >= this.maxCount) {
            const oldestId = this.notifications.keys().next().value;
            this.remove(oldestId);
        }
    }

    /**
     * 获取当前通知数量
     */
    getCount() {
        return this.notifications.size;
    }

    /**
     * 销毁管理器
     */
    destroy() {
        this.clear();
        if (this.container) {
            this.container.destroy();
        }
        if (this.eventBus) {
            this.eventBus.off('notification:show');
            this.eventBus.off('notification:clear');
        }
    }
}