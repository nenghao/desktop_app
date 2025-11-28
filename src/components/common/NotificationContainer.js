/**
 * 通知容器组件
 * 管理通知的渲染和布局
 */

import { NotificationItem } from './NotificationItem.js';

export class NotificationContainer {
    constructor(options = {}) {
        this.parent = options.parent;
        this.notifications = new Map();
        this.container = null;

        this.init();
        this.injectStyles();
    }

    /**
     * 初始化容器
     */
    init() {
        this.container = document.createElement('div');
        this.container.className = 'notification-container';
        this.parent.appendChild(this.container);
    }

    /**
     * 注入样式
     */
    injectStyles() {
        if (document.getElementById('notification-styles')) return;

        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification-container {
                position: fixed;
                top: 45px;
                right: 16px;
                z-index: 10000;
                pointer-events: none;
                min-width: 320px;
                max-width: 400px;
                border-radius: var(--border-radius-lg);
        
            }

            .notification-content {
                pointer-events: auto;
                transform: translateX(100%);
                opacity: 0;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border: 1px solid var(--color-border, #e5e7eb);
                border-radius: var(--border-radius-lg);
                padding: 12px 16px;
                box-shadow: var(--shadow-lg);
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                justify-content: flex-start !important;
                gap: 12px;
                position: relative;
                overflow: visible;
                min-height: 44px;
                width: 100%;
                backdrop-filter: blur(40px) saturate(180%);
                -webkit-backdrop-filter: blur(40px) saturate(180%);
                margin-bottom: var(--spacing-1);
                background: rgba(255, 255, 255, 0.5);
            }

            .notification-content.show {
                transform: translateX(0);
                opacity: 1;
            }

            .notification-content.hide {
                transform: translateX(100%);
                opacity: 0;
                margin-bottom: 0;
                max-height: 0;
                overflow: hidden;
            }

            .notification-body {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                justify-content: center;
                padding-right: 12px;
            }

            .notification-title {
                font-weight: var(--font-weight-semibold);
                font-size: var(--font-size-sm);
                color: var(--color-text-primary, #1f2937);
                margin-bottom: 4px;
                cursor: default;
                user-select: text;
            }

            .notification-message {
                font-size: var(--font-size-sm);
                color: var(--color-text-secondary, #6b7280);
                line-height: var(--line-height-normal);
                cursor: default;
                user-select: text;
            }

            .notification-actions {
                display: flex;
                flex-direction: column;
                gap: 6px;
                margin-left: auto;
                align-self: center;
            }

            .notification-action-btn {
                padding: 6px 16px;
                font-size: var(--font-size-sm);
                font-weight: var(--font-weight-medium);
                color: var(--color-primary-light, #3b82f6);
                background: transparent;
                border: 1px solid var(--color-border, #e5e7eb);
                border-radius: var(--border-radius-md);
                cursor: pointer;
                transition: all var(--duration-200) var(--ease-in-out);
                white-space: nowrap;
            }

            .notification-action-btn:hover {
                background-color: var(--color-surface-hover, #f3f4f6);
                border-color: var(--color-primary, #3b82f6);
            }

            .notification-action-btn:active {
                transform: scale(0.98);
            }

            .notification-close {
                position: absolute;
                top: -5px;
                right: -5px;
                width: 20px;
                height: 20px;
                border: none;
                background: var(--color-surface, #ffffff);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--color-text-tertiary, #9ca3af);
                border-radius: var(--border-radius-full);
                transition: all var(--duration-200) var(--ease-in-out);
                z-index: 1;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }

            .notification-close svg {
                width: 12px;
                height: 12px;
                stroke-width: 2.5;
            }

            .notification-close:hover {
                background-color: var(--color-error, #ef4444);
                color: #ffffff;
            }

            /* 类型样式 */
            .notification-content.notification-success {
                border-left: 8px solid var(--color-success, #10b981);
            }

            .notification-content.notification-error {
                border-left: 8px solid var(--color-error, #ff0000ff);
            }

            .notification-content.notification-warning {
                border-left: 8px solid var(--color-warning, #f59e0b);
            }

            .notification-content.notification-info {
                border-left: 8px solid var(--color-info, #3b82f6);
            }

            /* 暗色主题 */
            @media (prefers-color-scheme: dark) {
            .notification-action-btn {
                color: #60a5fa;
                border-color: #374151;
            }

            .notification-action-btn:hover {
                background-color: #374151;
                border-color: #60a5fa;
            }

            .notification-content {
                background: rgba(0, 0, 0, 0.5);
                box-shadow: 0 0px 16px rgba(151, 150, 150, 0.1);
            }

            .notification-close {
                background: var(--bg-primary, #1f2937);
                color: #9ca3af;
            }

            .notification-close:hover {
                background-color: var(--color-error, #ef4444);
                color: #ffffff;
            }
            }

            /* 响应式 */
            @media (max-width: 640px) {
                .notification-container {
                    left: 20px;
                    right: 20px;
                    max-width: none;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 添加通知
     */
    addNotification(config) {
        const notification = new NotificationItem(config, {
            onClose: () => this.removeNotification(config.id),
            onClick: config.onClick
        });

        this.notifications.set(config.id, notification);

        // 渲染到容器
        const element = notification.render();
        this.container.appendChild(element);

        // 触发显示动画
        requestAnimationFrame(() => {
            element.classList.add('show');
        });

        return notification;
    }

    /**
     * 移除通知
     */
    removeNotification(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        const element = notification.element;
        if (element) {
            element.classList.add('hide');

            // 等待动画完成后移除
            setTimeout(() => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
                this.notifications.delete(id);
            }, 300);
        }
    }

    /**
     * 清除所有通知
     */
    clear() {
        for (const id of this.notifications.keys()) {
            this.removeNotification(id);
        }
    }

    /**
     * 销毁容器
     */
    destroy() {
        this.clear();
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }

        // 移除样式
        const style = document.getElementById('notification-styles');
        if (style) {
            style.remove();
        }
    }
}