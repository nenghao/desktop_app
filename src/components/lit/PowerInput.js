import { LitElement, html, css } from 'lit';

/**
 * PowerInput - 基于 Lit Elements 的可复用输入框组件
 * 用法: <power-input placeholder="请输入..." type="text" @input=${handler}></power-input>
 */
export class PowerInput extends LitElement {
  static properties = {
    type: { type: String },
    placeholder: { type: String },
    value: { type: String },
    disabled: { type: Boolean },
    readonly: { type: Boolean },
    required: { type: Boolean },
    label: { type: String },
    error: { type: String },
    size: { type: String }
  };

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    .input-wrapper {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .label {
      font-size: 14px;
      font-weight: 500;
      color: var(--color-text-primary, #1f2937);
      margin-bottom: 4px;
    }

    .input-container {
      position: relative;
    }

    input {
      width: 100%;
      border: 1px solid var(--color-border, #d1d5db);
      border-radius: var(--border-radius-md, 6px);
      font-size: 14px;
      color: var(--color-text-primary, #1f2937);
      background-color: var(--color-surface, #ffffff);
      transition: all 0.2s ease;
      outline: none;
      font-family: inherit;
      box-sizing: border-box;
    }

    input:focus {
      border-color: var(--color-border-focus, #3b82f6);
      box-shadow: 0 0 0 3px var(--color-primary-light, rgba(59, 130, 246, 0.1));
    }

    input::placeholder {
      color: var(--color-text-placeholder, #9ca3af);
    }

    input:disabled {
      opacity: 0.6;
      pointer-events: none;
      background-color: var(--color-surface-disabled, #f9fafb);
    }

    input:readonly {
      background-color: var(--color-surface-readonly, #f9fafb);
      cursor: default;
    }

    /* 尺寸变体 */
    .size-small input {
      padding: 6px 12px;
      font-size: 12px;
    }

    .size-medium input {
      padding: 8px 12px;
      font-size: 14px;
    }

    .size-large input {
      padding: 12px 16px;
      font-size: 16px;
    }

    /* 错误状态 */
    .has-error input {
      border-color: var(--color-danger, #ef4444);
    }

    .has-error input:focus {
      border-color: var(--color-danger, #ef4444);
      box-shadow: 0 0 0 3px var(--color-danger-light, rgba(239, 68, 68, 0.1));
    }

    .error-message {
      font-size: 12px;
      color: var(--color-danger, #ef4444);
      margin-top: 4px;
    }

    .required {
      color: var(--color-danger, #ef4444);
    }
  `;

  constructor() {
    super();
    this.type = 'text';
    this.placeholder = '';
    this.value = '';
    this.disabled = false;
    this.readonly = false;
    this.required = false;
    this.label = '';
    this.error = '';
    this.size = 'medium';
  }

  render() {
    const wrapperClasses = [
      'input-wrapper',
      this.error ? 'has-error' : '',
      `size-${this.size}`
    ].filter(Boolean).join(' ');

    return html`
      <div class=${wrapperClasses}>
        ${this.label ? html`
          <label class="label">
            ${this.label}
            ${this.required ? html`<span class="required">*</span>` : ''}
          </label>
        ` : ''}
        
        <div class="input-container">
          <input
            type=${this.type}
            placeholder=${this.placeholder}
            .value=${this.value}
            ?disabled=${this.disabled}
            ?readonly=${this.readonly}
            ?required=${this.required}
            @input=${this._handleInput}
            @change=${this._handleChange}
            @focus=${this._handleFocus}
            @blur=${this._handleBlur}
          />
        </div>
        
        ${this.error ? html`
          <div class="error-message">${this.error}</div>
        ` : ''}
      </div>
    `;
  }

  _handleInput(e) {
    this.value = e.target.value;
    this.dispatchEvent(new CustomEvent('power-input', {
      detail: { value: this.value, originalEvent: e },
      bubbles: true,
      composed: true
    }));
  }

  _handleChange(e) {
    this.dispatchEvent(new CustomEvent('power-change', {
      detail: { value: this.value, originalEvent: e },
      bubbles: true,
      composed: true
    }));
  }

  _handleFocus(e) {
    this.dispatchEvent(new CustomEvent('power-focus', {
      detail: { originalEvent: e },
      bubbles: true,
      composed: true
    }));
  }

  _handleBlur(e) {
    this.dispatchEvent(new CustomEvent('power-blur', {
      detail: { originalEvent: e },
      bubbles: true,
      composed: true
    }));
  }

  // 公共方法
  focus() {
    const input = this.shadowRoot.querySelector('input');
    if (input) input.focus();
  }

  blur() {
    const input = this.shadowRoot.querySelector('input');
    if (input) input.blur();
  }

  select() {
    const input = this.shadowRoot.querySelector('input');
    if (input) input.select();
  }
}

// 注册自定义元素
customElements.define('power-input', PowerInput);
