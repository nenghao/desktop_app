import { LitElement, html, css } from 'lit';

/**
 * PowerButton - 基于 Lit Elements 的可复用按钮组件
 * 用法: <power-button type="primary" size="medium" @click=${handler}>按钮文本</power-button>
 */
export class PowerButton extends LitElement {
  static properties = {
    type: { type: String },
    size: { type: String },
    disabled: { type: Boolean },
    loading: { type: Boolean }
  };

  static styles = css`
    :host {
      display: inline-block;
    }

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid transparent;
      border-radius: var(--border-radius-md, 6px);
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
      outline: none;
      user-select: none;
      font-family: inherit;
    }

    button:focus-visible {
      box-shadow: 0 0 0 3px var(--color-primary-light, rgba(59, 130, 246, 0.3));
    }

    button:disabled {
      opacity: 0.6;
      pointer-events: none;
    }

    /* 尺寸变体 */
    .size-small {
      padding: 6px 12px;
      font-size: 12px;
    }

    .size-medium {
      padding: 8px 16px;
      font-size: 14px;
    }

    .size-large {
      padding: 12px 24px;
      font-size: 16px;
    }

    /* 类型变体 */
    .type-primary {
      background-color: var(--color-primary, #3b82f6);
      color: white;
      border-color: var(--color-primary, #3b82f6);
    }

    .type-primary:hover:not(:disabled) {
      background-color: var(--color-primary-hover, #2563eb);
      border-color: var(--color-primary-hover, #2563eb);
    }

    .type-secondary {
      background-color: transparent;
      color: var(--color-text-primary, #1f2937);
      border-color: var(--color-border, #d1d5db);
    }

    .type-secondary:hover:not(:disabled) {
      background-color: var(--color-surface-hover, #f9fafb);
      border-color: var(--color-border-hover, #9ca3af);
    }

    .type-danger {
      background-color: var(--color-danger, #ef4444);
      color: white;
      border-color: var(--color-danger, #ef4444);
    }

    .type-danger:hover:not(:disabled) {
      background-color: var(--color-danger-hover, #dc2626);
      border-color: var(--color-danger-hover, #dc2626);
    }

    .type-ghost {
      background-color: transparent;
      color: var(--color-primary, #3b82f6);
      border-color: transparent;
    }

    .type-ghost:hover:not(:disabled) {
      background-color: var(--color-primary-light, rgba(59, 130, 246, 0.1));
    }

    /* 加载状态 */
    .loading {
      position: relative;
      color: transparent;
    }

    .loading::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 16px;
      height: 16px;
      border: 2px solid currentColor;
      border-top: 2px solid transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      color: inherit;
    }

    @keyframes spin {
      0% { transform: translate(-50%, -50%) rotate(0deg); }
      100% { transform: translate(-50%, -50%) rotate(360deg); }
    }
  `;

  constructor() {
    super();
    this.type = 'primary';
    this.size = 'medium';
    this.disabled = false;
    this.loading = false;
  }

  render() {
    const classes = [
      `type-${this.type}`,
      `size-${this.size}`,
      this.loading ? 'loading' : ''
    ].filter(Boolean).join(' ');

    return html`
      <button 
        class=${classes}
        ?disabled=${this.disabled || this.loading}
        @click=${this._handleClick}
      >
        <slot></slot>
      </button>
    `;
  }

  _handleClick(e) {
    if (this.disabled || this.loading) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // 触发自定义事件
    this.dispatchEvent(new CustomEvent('power-click', {
      detail: { originalEvent: e },
      bubbles: true,
      composed: true
    }));
  }
}

// 注册自定义元素
customElements.define('power-button', PowerButton);
