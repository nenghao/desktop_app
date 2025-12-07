/**
 * LoadingSpinner 组件
 * 用于显示加载状态 - 合并了Loading.js的所有功能
 */

export class LoadingSpinner {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      type: 'spinner', // spinner, dots, bars, pulse
      size: 'medium', // small, medium, large
      text: 'Loading...',
      overlay: false,
      color: 'primary',
      centered: true,
      zIndex: 1000,
      ...options
    };
    this.element = null;
    this.visible = false;
  }

  /**
   * 渲染加载组件
   */
  render() {
    this.element = document.createElement('div');
    this.element.className = this.getClassName();
    this.element.style.zIndex = this.options.zIndex;

    if (this.options.overlay) {
      this.element.classList.add('loading-spinner--overlay');
    }

    if (this.options.centered) {
      this.element.classList.add('loading-spinner--centered');
    }

    this.element.innerHTML = this.getContent();
    return this.element;
  }

  /**
   * 获取类名
   */
  getClassName() {
    const { type, size, color } = this.options;
    return `loading-spinner loading-spinner--${type} loading-spinner--${size} loading-spinner--${color}`;
  }

  /**
   * 获取内容
   */
  getContent() {
    const { type, text } = this.options;

    switch (type) {
      case 'spinner':
        return this.getSpinnerContent(text);
      case 'dots':
        return this.getDotsContent(text);
      case 'bars':
        return this.getBarsContent(text);
      case 'pulse':
        return this.getPulseContent(text);
      default:
        return this.getSpinnerContent(text);
    }
  }

  /**
   * 获取旋转器内容
   */
  getSpinnerContent(text) {
    return `
      <div class="loading-spinner-content">
        <div class="loading-spinner-icon">
          <div class="spinner"></div>
        </div>
        ${text ? `<div class="loading-spinner-text">${text}</div>` : ''}
      </div>
    `;
  }

  /**
   * 获取点状加载内容
   */
  getDotsContent(text) {
    return `
      <div class="loading-spinner-content">
        <div class="loading-spinner-icon loading-dots">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
        ${text ? `<div class="loading-spinner-text">${text}</div>` : ''}
      </div>
    `;
  }

  /**
   * 获取条状加载内容
   */
  getBarsContent(text) {
    return `
      <div class="loading-spinner-content">
        <div class="loading-spinner-icon loading-bars">
          <div class="bar"></div>
          <div class="bar"></div>
          <div class="bar"></div>
          <div class="bar"></div>
          <div class="bar"></div>
        </div>
        ${text ? `<div class="loading-spinner-text">${text}</div>` : ''}
      </div>
    `;
  }

  /**
   * 获取脉冲加载内容
   */
  getPulseContent(text) {
    return `
      <div class="loading-spinner-content">
        <div class="loading-spinner-icon loading-pulse">
          <div class="pulse-circle"></div>
        </div>
        ${text ? `<div class="loading-spinner-text">${text}</div>` : ''}
      </div>
    `;
  }

  /**
   * 显示加载
   */
  show(text) {
    if (this.visible) return;

    if (!this.element) {
      this.render();
    }

    if (text) {
      this.setText(text);
    }

    this.visible = true;

    if (this.container) {
      this.container.appendChild(this.element);
    } else {
      document.body.appendChild(this.element);
    }

    // 添加显示动画
    requestAnimationFrame(() => {
      this.element.classList.add('loading-spinner--show');
    });
  }

  /**
   * 隐藏加载
   */
  hide() {
    if (!this.visible) return;

    this.visible = false;

    if (this.element) {
      this.element.classList.remove('loading-spinner--show');

      // 动画结束后移除DOM
      setTimeout(() => {
        if (this.element && this.element.parentNode) {
          this.element.parentNode.removeChild(this.element);
        }
      }, 300);
    }
  }

  /**
   * 设置文本
   */
  setText(text) {
    this.options.text = text;

    if (this.element) {
      const textElement = this.element.querySelector('.loading-spinner-text');
      if (textElement) {
        textElement.textContent = text;
      } else if (text) {
        // 如果没有文本元素但需要显示文本，创建一个
        const spinnerContent = this.element.querySelector('.loading-spinner-content');
        const textDiv = document.createElement('div');
        textDiv.className = 'loading-spinner-text';
        textDiv.textContent = text;
        spinnerContent.appendChild(textDiv);
      }
    }
  }

  /**
   * 更新文本（别名方法，保持兼容性）
   */
  updateText(text) {
    this.setText(text);
  }

  /**
   * 设置大小
   */
  setSize(size) {
    this.options.size = size;

    if (this.element) {
      this.element.className = this.getClassName();
    }
  }

  /**
   * 更新类型
   */
  updateType(type) {
    this.options.type = type;

    if (this.element) {
      this.element.className = this.getClassName();
      this.element.innerHTML = this.getContent();
    }
  }

  /**
   * 销毁组件
   */
  destroy() {
    this.hide();
    this.element = null;
    this.container = null;
  }
}

/**
 * 全局加载管理器
 */
export class LoadingManager {
  constructor() {
    this.loadings = new Map();
    this.globalLoading = null;
  }

  /**
   * 显示全局加载
   */
  showGlobal(options = {}) {
    if (this.globalLoading) {
      this.hideGlobal();
    }

    this.globalLoading = new LoadingSpinner(null, {
      overlay: true,
      ...options
    });

    this.globalLoading.show();
    return this.globalLoading;
  }

  /**
   * 隐藏全局加载
   */
  hideGlobal() {
    if (this.globalLoading) {
      this.globalLoading.hide();
      this.globalLoading = null;
    }
  }

  /**
   * 显示组件加载
   */
  show(id, container, options = {}) {
    if (this.loadings.has(id)) {
      this.hide(id);
    }

    const loading = new LoadingSpinner(container, options);
    this.loadings.set(id, loading);
    loading.show();

    return loading;
  }

  /**
   * 隐藏组件加载
   */
  hide(id) {
    const loading = this.loadings.get(id);
    if (loading) {
      loading.hide();
      this.loadings.delete(id);
    }
  }

  /**
   * 更新加载文本
   */
  updateText(id, text) {
    const loading = this.loadings.get(id);
    if (loading) {
      loading.updateText(text);
    }
  }

  /**
   * 检查是否正在加载
   */
  isLoading(id) {
    return this.loadings.has(id);
  }

  /**
   * 清除所有加载
   */
  clear() {
    this.hideGlobal();

    this.loadings.forEach(loading => {
      loading.hide();
    });

    this.loadings.clear();
  }
}

/**
 * 创建全局加载管理器实例
 */
export const loadingManager = new LoadingManager();

// 静态方法：创建全局加载器（保持向后兼容）
LoadingSpinner.showGlobal = function (text = 'Loading...', options = {}) {
  return loadingManager.showGlobal({
    text,
    size: 'large',
    ...options
  });
};

LoadingSpinner.hideGlobal = function () {
  loadingManager.hideGlobal();
};

/**
 * 便捷方法
 */
export const loading = {
  /**
   * 显示全局加载
   */
  show(options) {
    return loadingManager.showGlobal(options);
  },

  /**
   * 隐藏全局加载
   */
  hide() {
    loadingManager.hideGlobal();
  },

  /**
   * 显示组件加载
   */
  showIn(container, options) {
    const id = Date.now() + Math.random();
    return loadingManager.show(id, container, options);
  },

  /**
   * 包装异步函数，自动显示/隐藏加载
   */
  wrap(asyncFn, options = {}) {
    return async (...args) => {
      const loadingInstance = this.show(options);

      try {
        const result = await asyncFn(...args);
        return result;
      } finally {
        this.hide();
      }
    };
  },

  /**
   * 包装组件异步函数
   */
  wrapComponent(container, asyncFn, options = {}) {
    return async (...args) => {
      const loadingInstance = this.showIn(container, options);

      try {
        const result = await asyncFn(...args);
        return result;
      } finally {
        loadingInstance.hide();
      }
    };
  }
};

export default LoadingSpinner;