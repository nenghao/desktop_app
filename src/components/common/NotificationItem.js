/**
 * 通知项组件
 * 单个通知的渲染和交互逻辑
 */

export class NotificationItem {
    constructor(config, callbacks = {}) {
        this.config = config;
        this.callbacks = callbacks;
        this.element = null;
        this.timer = null;
        this.isPaused = false;
        this.remainingTime = config.duration || 0;
        this.startTime = null;
    }

    /**
     * 渲染通知项
     */
    render() {
        this.element = document.createElement('div');
        this.element.className = `notification-content notification-${this.config.type}`;
        this.element.dataset.id = this.config.id;

        // 渲染 actions 按钮
        const actionsHTML = this.config.actions && this.config.actions.length > 0
            ? `<div class="notification-actions">
                ${this.config.actions.map((action, index) =>
                    `<button class="notification-action-btn" data-action-index="${index}" type="button">
                        ${this.escapeHtml(action.text)}
                    </button>`
                ).join('')}
            </div>`
            : '';

        this.element.innerHTML = `
            ${this.config.closable ? `<button class="notification-close" type="button">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="15" y1="5" x2="5" y2="15"></line>
                    <line x1="5" y1="5" x2="15" y2="15"></line>
                </svg>
            </button>` : ''}
            <div class="notification-body">
                ${this.config.title ? `<div class="notification-title">${this.escapeHtml(this.config.title)}</div>` : ''}
                <div class="notification-message">${this.escapeHtml(this.config.message)}</div>
            </div>
            ${actionsHTML}
        `;

        this.bindEvents();
        this.startTimer();
        return this.element;
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // Actions 按钮点击事件
        if (this.config.actions && this.config.actions.length > 0) {
            const actionButtons = this.element.querySelectorAll('.notification-action-btn');
            actionButtons.forEach((btn, index) => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = this.config.actions[index];
                    if (action && action.onClick) {
                        action.onClick();
                    }
                    // 点击按钮后自动关闭通知
                    this.close();
                });
            });
        }

        // 点击事件
        if (this.config.onClick) {
            this.element.addEventListener('click', (e) => {
                if (!e.target.closest('.notification-close') && !e.target.closest('.notification-action-btn')) {
                    this.config.onClick();
                }
            });
            this.element.style.cursor = 'pointer';
        }

        // 关闭按钮
        const closeBtn = this.element.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.close();
            });
        }

        // 鼠标悬停暂停计时（仅对没有按钮的通知）
        const hasActions = this.config.actions && this.config.actions.length > 0;
        if (this.config.duration > 0 && !hasActions) {
            this.element.addEventListener('mouseenter', () => {
                this.pauseTimer();
            });

            this.element.addEventListener('mouseleave', () => {
                this.resumeTimer();
            });
        }
    }

    /**
     * 启动计时器
     */
    startTimer() {
        // 如果有 actions 按钮，不自动关闭通知
        const hasActions = this.config.actions && this.config.actions.length > 0;

        if (this.config.duration > 0 && !hasActions) {
            this.startTime = Date.now();
            this.timer = setTimeout(() => {
                this.close();
            }, this.config.duration);
        }
    }

    /**
     * 暂停计时器
     */
    pauseTimer() {
        if (this.timer && !this.isPaused) {
            clearTimeout(this.timer);
            this.isPaused = true;
            // 计算剩余时间
            const elapsed = Date.now() - this.startTime;
            this.remainingTime = Math.max(0, this.config.duration - elapsed);
        }
    }

    /**
     * 恢复计时器
     */
    resumeTimer() {
        if (this.isPaused && this.remainingTime > 0) {
            this.startTime = Date.now();
            this.timer = setTimeout(() => {
                this.close();
            }, this.remainingTime);
            this.isPaused = false;
        }
    }

    /**
     * 关闭通知
     */
    close() {
        if (this.timer) {
            clearTimeout(this.timer);
        }
        
        if (this.callbacks.onClose) {
            this.callbacks.onClose();
        }
        
        if (this.config.onClose) {
            this.config.onClose();
        }
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
     * 销毁组件
     */
    destroy() {
        if (this.timer) {
            clearTimeout(this.timer);
        }
        
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}