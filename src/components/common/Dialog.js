/**
 * 通用对话框组件
 * 提供确认、警告、信息等类型的对话框
 */

export class Dialog {
    constructor(options = {}) {
        this.options = {
            type: 'confirm', // confirm, alert, info, warning, error
            title: '确认操作',
            message: '确定要执行此操作吗？',
            confirmText: '确定',
            cancelText: '取消',
            showCancel: true,
            backdrop: true,
            ...options
        };
        
        this.element = null;
        this.backdrop = null;
        this.resolve = null;
        this.reject = null;
    }

    /**
     * 显示对话框
     */
    show() {
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
            this.render();
            this.bindEvents();
            this.animateIn();
        });
    }

    /**
     * 渲染对话框
     */
    render() {
        // 创建背景遮罩
        if (this.options.backdrop) {
            this.backdrop = document.createElement('div');
            this.backdrop.className = 'dialog-backdrop';
            document.body.appendChild(this.backdrop);
        }

        // 创建对话框
        this.element = document.createElement('div');
        this.element.className = `dialog dialog-${this.options.type}`;
        
        const icon = this.getIcon(this.options.type);
        
        this.element.innerHTML = `
            <div class="dialog-content">
                <div class="dialog-header">
                    <div class="dialog-icon">${icon}</div>
                    <h3 class="dialog-title">${this.escapeHtml(this.options.title)}</h3>
                </div>
                <div class="dialog-body">
                    <p class="dialog-message">${this.escapeHtml(this.options.message)}</p>
                </div>
                <div class="dialog-footer">
                    ${this.options.showCancel ? `<button class="dialog-btn dialog-btn-cancel" type="button">${this.escapeHtml(this.options.cancelText)}</button>` : ''}
                    <button class="dialog-btn dialog-btn-confirm" type="button">${this.escapeHtml(this.options.confirmText)}</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.element);
        this.injectStyles();
    }

    /**
     * 获取图标
     */
    getIcon(type) {
        const icons = {
            confirm: '❓',
            alert: '⚠️',
            info: 'ℹ️',
            warning: '⚠️',
            error: '❌',
            success: '✅'
        };
        return icons[type] || icons.confirm;
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 确认按钮
        const confirmBtn = this.element.querySelector('.dialog-btn-confirm');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.close(true);
            });
        }

        // 取消按钮
        const cancelBtn = this.element.querySelector('.dialog-btn-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.close(false);
            });
        }

        // 背景点击
        if (this.backdrop) {
            this.backdrop.addEventListener('click', () => {
                this.close(false);
            });
        }

        // ESC键
        this.handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                this.close(false);
            }
        };
        document.addEventListener('keydown', this.handleKeyDown);
    }

    /**
     * 入场动画
     */
    animateIn() {
        requestAnimationFrame(() => {
            if (this.backdrop) {
                this.backdrop.classList.add('show');
            }
            if (this.element) {
                this.element.classList.add('show');
            }
        });
    }

    /**
     * 关闭对话框
     */
    close(result = false) {
        // 移除事件监听
        document.removeEventListener('keydown', this.handleKeyDown);

        // 出场动画
        if (this.backdrop) {
            this.backdrop.classList.add('hide');
        }
        if (this.element) {
            this.element.classList.add('hide');
        }

        // 等待动画完成后移除元素
        setTimeout(() => {
            if (this.backdrop && this.backdrop.parentNode) {
                this.backdrop.parentNode.removeChild(this.backdrop);
            }
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }

            // 解析Promise
            if (this.resolve) {
                this.resolve(result);
            }
        }, 300);
    }

    /**
     * 转义HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 注入样式
     */
    injectStyles() {
        if (document.getElementById('dialog-styles')) return;

        const style = document.createElement('style');
        style.id = 'dialog-styles';
        style.textContent = `
            .dialog-backdrop {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10001;
                opacity: 0;
                transition: opacity 0.3s ease-in-out;
            }

            .dialog-backdrop.show {
                opacity: 1;
            }

            .dialog-backdrop.hide {
                opacity: 0;
            }

            .dialog {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.9);
                z-index: 10002;
                opacity: 0;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                max-width: 90vw;
                max-height: 90vh;
            }

            .dialog.show {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }

            .dialog.hide {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.9);
            }

            .dialog-content {
                background: var(--color-surface, #ffffff);
                border: 1px solid var(--color-border, #e5e7eb);
                border-radius: var(--border-radius-xl);
                box-shadow: var(--shadow-2xl);
                min-width: 320px;
                max-width: 500px;
                overflow: hidden;
            }

            .dialog-header {
                padding: var(--spacing-6) var(--spacing-6) var(--spacing-4);
                display: flex;
                align-items: center;
                gap: var(--spacing-3);
            }

            .dialog-icon {
                flex-shrink: 0;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: var(--font-size-2xl);
                border-radius: var(--border-radius-full);
                background: var(--color-surface-secondary, #f3f4f6);
                user-select: none;
            }

            .dialog-title {
                margin: 0;
                font-size: var(--font-size-lg);
                font-weight: var(--font-weight-semibold);
                color: var(--color-text-primary, #1f2937);
                line-height: var(--line-height-tight);
                cursor: default;
                user-select: text;
            }

            .dialog-body {
                padding: 0 var(--spacing-6) var(--spacing-6);
            }

            .dialog-message {
                margin: 0;
                font-size: var(--font-size-sm);
                color: var(--color-text-secondary, #6b7280);
                line-height: var(--line-height-normal);
                cursor: default;
                user-select: text;
            }

            .dialog-footer {
                padding: var(--spacing-4) var(--spacing-6) var(--spacing-6);
                display: flex;
                gap: var(--spacing-3);
                justify-content: flex-end;
            }

            .dialog-btn {
                padding: var(--spacing-2) var(--spacing-4);
                border-radius: var(--border-radius-md);
                font-size: var(--font-size-sm);
                font-weight: var(--font-weight-medium);
                cursor: pointer;
                transition: var(--app-transition);
                border: 1px solid transparent;
                min-width: 80px;
            }

            .dialog-btn-cancel {
                background: var(--color-surface-secondary, #f3f4f6);
                color: var(--color-text-secondary, #6b7280);
                border-color: var(--color-border, #e5e7eb);
            }

            .dialog-btn-cancel:hover {
                background: var(--color-surface-tertiary, #e5e7eb);
                color: var(--color-text-primary, #1f2937);
            }

            .dialog-btn-confirm {
                background: var(--color-primary, #3b82f6);
                color: var(--color-text-inverse, white);
            }

            .dialog-btn-confirm:hover {
                background: var(--color-primary-hover, #2563eb);
            }

            /* 类型样式 */
            .dialog-confirm .dialog-icon {
                background: var(--color-info-light, #dbeafe);
                color: var(--color-info, #3b82f6);
            }

            .dialog-warning .dialog-icon,
            .dialog-alert .dialog-icon {
                background: var(--color-warning-light, #fef3c7);
                color: var(--color-warning, #f59e0b);
            }

            .dialog-error .dialog-icon {
                background: var(--color-error-light, #fecaca);
                color: var(--color-error, #ef4444);
            }

            .dialog-success .dialog-icon {
                background: var(--color-success-light, #d1fae5);
                color: var(--color-success, #10b981);
            }

            .dialog-info .dialog-icon {
                background: var(--color-info-light, #dbeafe);
                color: var(--color-info, #3b82f6);
            }

            /* 危险操作样式 */
            .dialog-warning .dialog-btn-confirm,
            .dialog-error .dialog-btn-confirm {
                background: var(--color-error, #ef4444);
            }

            .dialog-warning .dialog-btn-confirm:hover,
            .dialog-error .dialog-btn-confirm:hover {
                background: var(--color-error-hover, #dc2626);
            }

            /* 暗色主题 */
            [data-theme="dark"] .dialog-content {
                background: var(--bg-primary, #1f2937);
                border: 1px solid var(--border-color, #374151);
            }

            [data-theme="dark"] .dialog-title {
                color: var(--text-primary, #f3f4f6);
            }

            [data-theme="dark"] .dialog-message {
                color: var(--text-secondary, #d1d5db);
            }

            [data-theme="dark"] .dialog-btn-cancel {
                background: var(--bg-secondary, #374151);
                color: var(--text-secondary, #d1d5db);
                border-color: var(--border-color, #4b5563);
            }

            [data-theme="dark"] .dialog-btn-cancel:hover {
                background: var(--bg-tertiary, #4b5563);
                color: var(--text-primary, #f3f4f6);
            }

            /* 响应式 */
            @media (max-width: 640px) {
                .dialog {
                    margin: 20px;
                    max-width: calc(100vw - 40px);
                }

                .dialog-content {
                    min-width: auto;
                }

                .dialog-header {
                    padding: 20px 20px 12px;
                }

                .dialog-body {
                    padding: 0 20px 20px;
                }

                .dialog-footer {
                    padding: 12px 20px 20px;
                    flex-direction: column-reverse;
                }

                .dialog-btn {
                    width: 100%;
                    justify-content: center;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 静态方法 - 确认对话框
     */
    static confirm(message, options = {}) {
        const dialog = new Dialog({
            type: 'confirm',
            title: '确认操作',
            message,
            confirmText: '确定',
            cancelText: '取消',
            ...options
        });
        return dialog.show();
    }

    /**
     * 静态方法 - 警告对话框
     */
    static warning(message, options = {}) {
        const dialog = new Dialog({
            type: 'warning',
            title: '警告',
            message,
            confirmText: '确定',
            cancelText: '取消',
            ...options
        });
        return dialog.show();
    }

    /**
     * 静态方法 - 错误对话框
     */
    static error(message, options = {}) {
        const dialog = new Dialog({
            type: 'error',
            title: '错误',
            message,
            confirmText: '确定',
            showCancel: false,
            ...options
        });
        return dialog.show();
    }

    /**
     * 静态方法 - 信息对话框
     */
    static info(message, options = {}) {
        const dialog = new Dialog({
            type: 'info',
            title: '信息',
            message,
            confirmText: '确定',
            showCancel: false,
            ...options
        });
        return dialog.show();
    }

    /**
     * 静态方法 - 删除确认对话框
     */
    static deleteConfirm(message = '确定要删除吗？此操作无法撤销。', options = {}) {
        const dialog = new Dialog({
            type: 'warning',
            title: '删除确认',
            message,
            confirmText: '删除',
            cancelText: '取消',
            ...options
        });
        return dialog.show();
    }
}
