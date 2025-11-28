/**
 * HoverElevation - 可复用的悬停突起效果组件
 * 用于app-header上的各种元素（按钮、标签、搜索框等）
 */

import { LitElement, html, css } from 'lit';

export class HoverElevation extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
      transition: all 0.2s ease;
      border-radius: 6px;
    }

    /* 为更多按钮保持圆形 */
    :host(:has(#more-btn)) {
      border-radius: 50%;
    }

    :host(:hover) {      
      background: var(--color-surface-hover);
      color: var(--color-text-primary);
    }

    :host(.active) {
      box-shadow: 
        0 2px 8px rgba(0, 0, 0, 0.15),
        0 1px 3px rgba(0, 0, 0, 0.12);
    }

    /* 暗色主题适配 */
    @media (prefers-color-scheme: dark) {
      :host(:hover) {
        box-shadow: 
          0 2px 8px rgba(0, 0, 0, 0.3),
          0 1px 3px rgba(0, 0, 0, 0.2);
      }

      :host(.active) {
        box-shadow: 
          0 2px 8px rgba(0, 0, 0, 0.4),
          0 1px 3px rgba(0, 0, 0, 0.3);
      }
    }
  `;

  render() {
    return html`<slot></slot>`;
  }
}

customElements.define('hover-elevation', HoverElevation);
