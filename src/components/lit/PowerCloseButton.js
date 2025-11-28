import { LitElement, html, css } from 'lit';

/**
 * PowerCloseButton - 基于 Lit Elements 的可复用关闭按钮组件
 * 用法: <power-close-button @power-close=${handler}></power-close-button>
 */
export class PowerCloseButton extends LitElement {
    static properties = {
        size: { type: String },
        variant: { type: String },
        disabled: { type: Boolean },
        ariaLabel: { type: String, attribute: 'aria-label' }
    };

    static styles = css`
    :host {
      display: inline-block;
    }

    .close-button {
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      outline: none;
      user-select: none;
      position: relative;
    }

    .close-button:focus-visible {
      box-shadow: 0 0 0 2px var(--color-primary, #3b82f6);
    }

    .close-button:disabled {
      opacity: 0.5;
      pointer-events: none;
    }

    /* 尺寸变体 */
    .size-small {
      padding: 4px;
    }

    .size-small svg {
      width: 16px;
      height: 16px;
    }

    .size-medium {
      padding: 8px;
    }

    .size-medium svg {
      width: 20px;
      height: 20px;
    }

    .size-large {
      padding: 12px;
    }

    .size-large svg {
      width: 24px;
      height: 24px;
    }

    /* 样式变体 */
    .variant-default {
      color: var(--color-text-primary, #333333);
    }

    .variant-default:hover:not(:disabled) {
      background-color: var(--color-surface-hover);
    }

    .variant-modal {
      color: var(--color-text-primary, #333333);
      position: absolute;
      top: 7px;
      right: 16px;
      z-index: 10;
    }

    .variant-modal:hover:not(:disabled) {
      background-color: var(--color-surface-hover);
    }

    .variant-danger {
      color: var(--color-danger, #ef4444);
    }

    .variant-danger:hover:not(:disabled) {
      background-color: var(--color-danger-light, rgba(239, 68, 68, 0.1));
    }

    .variant-ghost {
      color: var(--color-text-secondary, #6b7280);
    }

    .variant-ghost:hover:not(:disabled) {
      color: var(--color-text-primary, #333333);
      background-color: var(--color-surface-hover);
    }

    /* SVG 图标 */
    svg {
      width: 20px;
      height: 20px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: transform 0.2s ease;
    }

    /* 深色主题适配 */
    @media (prefers-color-scheme: dark) {
      .variant-default {
        color: var(--color-text-primary-dark, #ffffff);
      }
      
      .variant-default:hover:not(:disabled) {
        background-color: var(--color-surface-hover-dark, #374151);
      }
      
      .variant-modal {
        color: var(--color-text-primary-dark, #ffffff);
      }
      
      .variant-modal:hover:not(:disabled) {
        background-color: var(--color-surface-hover-dark, #374151);
      }
    }

    /* 动画效果 */
    @keyframes closeButtonPulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }

    .close-button:active:not(:disabled) {
      animation: closeButtonPulse 0.15s ease;
    }
  `;

    constructor() {
        super();
        this.size = 'medium';
        this.variant = 'default';
        this.disabled = false;
        this.ariaLabel = '关闭';
    }

    render() {
        const classes = [
            'close-button',
            `size-${this.size}`,
            `variant-${this.variant}`
        ].filter(Boolean).join(' ');

        return html`
      <button 
        class=${classes}
        ?disabled=${this.disabled}
        aria-label=${this.ariaLabel}
        @click=${this._handleClick}
        @keydown=${this._handleKeydown}
      >
        <svg viewBox="0 0 24 24">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;
    }

    _handleClick(e) {
        if (this.disabled) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // 触发自定义事件
        this.dispatchEvent(new CustomEvent('power-close', {
            detail: { originalEvent: e },
            bubbles: true,
            composed: true
        }));
    }

    _handleKeydown(e) {
        if (this.disabled) return;

        // 支持 Enter 和 Space 键触发
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this._handleClick(e);
        }

        // 支持 Escape 键触发
        if (e.key === 'Escape') {
            e.preventDefault();
            this._handleClick(e);
        }
    }

    // 公共方法
    focus() {
        const button = this.shadowRoot.querySelector('button');
        if (button) button.focus();
    }

    blur() {
        const button = this.shadowRoot.querySelector('button');
        if (button) button.blur();
    }
}

// 注册自定义元素
customElements.define('power-close-button', PowerCloseButton);
