/**
 * 非模态悬浮窗口组件
 * 用于加载并显示HTML内容，不阻止用户与主界面交互
 */

export class FloatingWindow {
  // 静态变量：管理所有窗口实例
  static instances = [];
  static currentZIndex = 5000;

  constructor(options = {}) {
    this.options = {
      title: '窗口',
      url: null,
      content: null,
      width: 600,
      height: 500,
      x: null,
      y: null,
      resizable: true,
      minimizable: true,
      maximizable: true,
      closable: true,
      className: '',
      onClose: null,
      ...options,
    };

    this.element = null;
    this.iframe = null;
    this.visible = false;
    this.minimized = false;
    this.maximized = false;
    this.zIndex = ++FloatingWindow.currentZIndex;

    // 拖拽相关
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.windowStartX = 0;
    this.windowStartY = 0;

    // 窗口状态保存（用于最大化/还原）
    this.savedState = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };

    // 将实例添加到管理器
    FloatingWindow.instances.push(this);
  }

  /**
   * 创建窗口DOM结构
   */
  create() {
    this.element = document.createElement('div');
    this.element.className = `floating-window ${this.options.className}`;
    this.element.style.zIndex = this.zIndex;

    // 计算初始位置
    const x = this.options.x !== null ? this.options.x : (window.innerWidth - this.options.width) / 2;
    const y = this.options.y !== null ? this.options.y : (window.innerHeight - this.options.height) / 2;

    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
    this.element.style.width = `${this.options.width}px`;
    this.element.style.height = `${this.options.height}px`;

    this.render();
    this.bindEvents();
    this.injectStyles();
  }

  /**
   * 渲染窗口内容
   */
  render() {
    this.element.innerHTML = `
      <div class="floating-window-header">
        <div class="floating-window-title">${this.escapeHtml(this.options.title)}</div>
        <div class="floating-window-controls">
          ${this.options.minimizable ? '<button class="window-control-btn minimize-btn" title="最小化">−</button>' : ''}
          ${this.options.maximizable ? '<button class="window-control-btn maximize-btn" title="最大化">□</button>' : ''}
          ${this.options.closable ? '<button class="window-control-btn close-btn" title="关闭">×</button>' : ''}
        </div>
      </div>
      <div class="floating-window-body">
        <div class="floating-window-loading">加载中...</div>
      </div>
    `;

    // 创建iframe加载内容
    const body = this.element.querySelector('.floating-window-body');
    if (this.options.url || this.options.content) {
      this.iframe = document.createElement('iframe');
      this.iframe.className = 'floating-window-iframe';
      this.iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-popups allow-forms');
      
      if (this.options.url) {
        this.iframe.src = this.options.url;
      } else if (this.options.content) {
        // 使用srcdoc加载HTML字符串
        this.iframe.srcdoc = this.options.content;
      }

      // iframe加载完成后移除loading
      this.iframe.onload = () => {
        const loading = body.querySelector('.floating-window-loading');
        if (loading) {
          loading.remove();
        }
      };

      body.appendChild(this.iframe);
    }
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    const header = this.element.querySelector('.floating-window-header');
    const minimizeBtn = this.element.querySelector('.minimize-btn');
    const maximizeBtn = this.element.querySelector('.maximize-btn');
    const closeBtn = this.element.querySelector('.close-btn');

    // 点击窗口置顶
    this.element.addEventListener('mousedown', () => {
      this.bringToFront();
    });

    // 标题栏拖拽
    header.addEventListener('mousedown', (e) => {
      // 如果点击的是按钮，不触发拖拽
      if (e.target.classList.contains('window-control-btn')) {
        return;
      }
      this.startDrag(e);
    });

    // 最小化按钮
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMinimize();
      });
    }

    // 最大化按钮
    if (maximizeBtn) {
      maximizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMaximize();
      });
    }

    // 关闭按钮
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
    }

    // 全局鼠标移动和释放事件
    this.handleMouseMove = (e) => this.onDrag(e);
    this.handleMouseUp = () => this.endDrag();
  }

  /**
   * 开始拖拽
   */
  startDrag(e) {
    if (this.maximized) return; // 最大化状态不允许拖拽

    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    
    const rect = this.element.getBoundingClientRect();
    this.windowStartX = rect.left;
    this.windowStartY = rect.top;

    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);

    this.element.classList.add('dragging');
    e.preventDefault();
  }

  /**
   * 拖拽中
   */
  onDrag(e) {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.dragStartX;
    const deltaY = e.clientY - this.dragStartY;

    let newX = this.windowStartX + deltaX;
    let newY = this.windowStartY + deltaY;

    // 边界限制
    const maxX = window.innerWidth - this.element.offsetWidth;
    const maxY = window.innerHeight - this.element.offsetHeight;

    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));

    this.element.style.left = `${newX}px`;
    this.element.style.top = `${newY}px`;
  }

  /**
   * 结束拖拽
   */
  endDrag() {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.element.classList.remove('dragging');

    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  }

  /**
   * 切换最小化
   */
  toggleMinimize() {
    this.minimized = !this.minimized;
    const body = this.element.querySelector('.floating-window-body');
    
    if (this.minimized) {
      this.element.classList.add('minimized');
      body.style.display = 'none';
      const minimizeBtn = this.element.querySelector('.minimize-btn');
      if (minimizeBtn) {
        minimizeBtn.textContent = '□';
        minimizeBtn.title = '还原';
      }
    } else {
      this.element.classList.remove('minimized');
      body.style.display = 'block';
      const minimizeBtn = this.element.querySelector('.minimize-btn');
      if (minimizeBtn) {
        minimizeBtn.textContent = '−';
        minimizeBtn.title = '最小化';
      }
    }
  }

  /**
   * 切换最大化
   */
  toggleMaximize() {
    this.maximized = !this.maximized;
    
    if (this.maximized) {
      // 保存当前状态
      const rect = this.element.getBoundingClientRect();
      this.savedState = {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      };

      // 最大化
      this.element.classList.add('maximized');
      this.element.style.left = '0';
      this.element.style.top = '0';
      this.element.style.width = '100%';
      this.element.style.height = '100%';

      const maximizeBtn = this.element.querySelector('.maximize-btn');
      if (maximizeBtn) {
        maximizeBtn.textContent = '❐';
        maximizeBtn.title = '还原';
      }
    } else {
      // 还原
      this.element.classList.remove('maximized');
      this.element.style.left = `${this.savedState.x}px`;
      this.element.style.top = `${this.savedState.y}px`;
      this.element.style.width = `${this.savedState.width}px`;
      this.element.style.height = `${this.savedState.height}px`;

      const maximizeBtn = this.element.querySelector('.maximize-btn');
      if (maximizeBtn) {
        maximizeBtn.textContent = '□';
        maximizeBtn.title = '最大化';
      }
    }
  }

  /**
   * 置顶窗口
   */
  bringToFront() {
    this.zIndex = ++FloatingWindow.currentZIndex;
    this.element.style.zIndex = this.zIndex;
  }

  /**
   * 显示窗口
   */
  show() {
    if (this.visible) return;

    if (!this.element) {
      this.create();
    }

    this.visible = true;
    document.body.appendChild(this.element);

    // 显示动画
    requestAnimationFrame(() => {
      this.element.classList.add('show');
    });

    this.bringToFront();
  }

  /**
   * 隐藏窗口
   */
  hide() {
    if (!this.visible) return;

    this.visible = false;
    this.element.classList.remove('show');

    setTimeout(() => {
      if (this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
    }, 300);
  }

  /**
   * 关闭窗口
   */
  close() {
    if (this.options.onClose) {
      const result = this.options.onClose();
      if (result === false) return;
    }

    this.hide();
    this.destroy();
  }

  /**
   * 销毁窗口
   */
  destroy() {
    // 清理事件监听
    if (this.isDragging) {
      this.endDrag();
    }

    // 从实例列表移除
    const index = FloatingWindow.instances.indexOf(this);
    if (index > -1) {
      FloatingWindow.instances.splice(index, 1);
    }

    // 移除DOM
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    // 清理引用
    this.element = null;
    this.iframe = null;
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
    if (document.getElementById('floating-window-styles')) return;

    const style = document.createElement('style');
    style.id = 'floating-window-styles';
    style.textContent = `
      .floating-window {
        position: fixed;
        display: flex;
        flex-direction: column;
        background: var(--color-surface, #ffffff);
        border: 1px solid var(--color-border, #e5e7eb);
        border-radius: var(--border-radius-lg, 8px);
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        overflow: hidden;
        opacity: 0;
        transform: scale(0.95);
        transition: opacity 0.3s ease, transform 0.3s ease;
      }

      .floating-window.show {
        opacity: 1;
        transform: scale(1);
      }

      .floating-window.dragging {
        cursor: move;
        user-select: none;
      }

      .floating-window.minimized {
        height: auto !important;
      }

      .floating-window.maximized {
        border-radius: 0;
      }

      .floating-window-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: var(--color-surface-secondary, #f9fafb);
        border-bottom: 1px solid var(--color-border, #e5e7eb);
        cursor: move;
        user-select: none;
      }

      .floating-window-title {
        font-size: var(--font-size-sm, 14px);
        font-weight: var(--font-weight-medium, 500);
        color: var(--color-text-primary, #1f2937);
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .floating-window-controls {
        display: flex;
        gap: 8px;
        margin-left: 12px;
      }

      .window-control-btn {
        width: 28px;
        height: 28px;
        border: none;
        border-radius: var(--border-radius-sm, 4px);
        background: transparent;
        color: var(--color-text-secondary, #6b7280);
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: var(--app-transition, all 0.2s ease);
      }

      .window-control-btn:hover {
        background: var(--color-surface-tertiary, #e5e7eb);
        color: var(--color-text-primary, #1f2937);
      }

      .window-control-btn.close-btn:hover {
        background: var(--color-error, #ef4444);
        color: white;
      }

      .floating-window-body {
        flex: 1;
        position: relative;
        overflow: hidden;
        background: var(--color-surface, #ffffff);
      }

      .floating-window-loading {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: var(--color-text-secondary, #6b7280);
        font-size: var(--font-size-sm, 14px);
      }

      .floating-window-iframe {
        width: 100%;
        height: 100%;
        border: none;
        background: white;
      }

      /* 暗色主题 */
      [data-theme="dark"] .floating-window {
        background: var(--bg-primary, #1f2937);
        border-color: var(--border-color, #374151);
      }

      [data-theme="dark"] .floating-window-header {
        background: var(--bg-secondary, #374151);
        border-bottom-color: var(--border-color, #4b5563);
      }

      [data-theme="dark"] .floating-window-title {
        color: var(--text-primary, #f3f4f6);
      }

      [data-theme="dark"] .window-control-btn {
        color: var(--text-secondary, #d1d5db);
      }

      [data-theme="dark"] .window-control-btn:hover {
        background: var(--bg-tertiary, #4b5563);
        color: var(--text-primary, #f3f4f6);
      }

      [data-theme="dark"] .floating-window-body {
        background: var(--bg-primary, #1f2937);
      }

      [data-theme="dark"] .floating-window-loading {
        color: var(--text-secondary, #d1d5db);
      }

      /* 响应式 */
      @media (max-width: 768px) {
        .floating-window {
          width: calc(100vw - 20px) !important;
          height: calc(100vh - 20px) !important;
          left: 10px !important;
          top: 10px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 静态方法 - 关闭所有窗口
   */
  static closeAll() {
    [...FloatingWindow.instances].forEach(instance => {
      instance.close();
    });
  }

  /**
   * 静态方法 - 快速创建并显示窗口
   */
  static open(options) {
    const window = new FloatingWindow(options);
    window.show();
    return window;
  }
}
