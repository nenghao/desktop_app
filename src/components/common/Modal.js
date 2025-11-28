/**
 * 统一模态框组件
 * 提供两层结构：背景层 + 内容包裹层
 */

export class Modal {
  constructor(options = {}) {
    this.options = {
      title: "",
      content: "",
      width: 428,
      height: "auto",
      closable: true,
      maskClosable: true,
      keyboard: true,
      centered: true,
      destroyOnClose: false,
      className: "",
      showFooter: true,
      ...options,
    };

    this.visible = false;
    this.backgroundElement = null; // 纯背景层
    this.modalWrapper = null; // 包裹层
    this.containerElement = null;
    this.onOk = options.onOk || null;
    this.onCancel = options.onCancel || null;
    this.onClose = options.onClose || null;

    // 不在构造函数中创建DOM，而是在show()时创建
  }

  /**
   * 创建模态框 - 三层结构
   */
  create() {
    // 第一层：纯背景层（新增）

    // 第二层：包裹层（保持原有CSS类名 modal-mask）
    this.modalWrapper = document.createElement("div");
    this.modalWrapper.className = "modal-wrapper";

    this.backgroundElement = document.createElement("div");
    this.backgroundElement.className = "modal-background";

    // 第三层：内容容器层
    this.containerElement = document.createElement("div");
    this.containerElement.className = `modal-container ${this.options.className}`;

    // 设置容器尺寸
    if (this.options.width) {
      this.containerElement.style.width =
        typeof this.options.width === "number"
          ? `${this.options.width}px`
          : this.options.width;
    }
    if (this.options.height && this.options.height !== "auto") {
      this.containerElement.style.height =
        typeof this.options.height === "number"
          ? `${this.options.height}px`
          : this.options.height;
    }

    // 将容器添加到包裹层
    this.modalWrapper.appendChild(this.backgroundElement);
    this.modalWrapper.appendChild(this.containerElement);

    this.render();
    this.bindEvents();
  }

  /**
   * 渲染模态框内容
   */
  render() {
    const { title, content, closable, showFooter } = this.options;

    this.containerElement.innerHTML = `
      <div class="modal-content">
        ${
          title
            ? `
          <div class="modal-header">
            <div class="modal-title">${title}</div>
            ${
              closable
                ? `
                 <button class="modal-close" id="close-profile">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
            `
                : ""
            }
          </div>
        `
            : ""
        }
        
        <div class="modal-body">
          ${typeof content === "string" ? content : ""}
        </div>
      </div>
    `;

    // 如果content是DOM元素，直接插入
    if (content instanceof HTMLElement) {
      const body = this.containerElement.querySelector(".modal-body");
      if (body) {
        body.innerHTML = "";
        body.appendChild(content);
      }
    }
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 背景层点击事件
    if (this.options.maskClosable) {
      this.backgroundElement.addEventListener("click", () => {
        this.close();
      });
    }

    // 包裹层点击事件
    if (this.options.maskClosable) {
      this.modalWrapper.addEventListener("click", (e) => {
        // 只有点击包裹层背景时才关闭
        if (e.target === this.modalWrapper) {
          this.close();
        }
      });
    }

    // 阻止容器点击事件冒泡
    this.containerElement.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    // 关闭按钮
    const closeBtn = this.containerElement.querySelector(".modal-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        this.close();
      });
    }

    // 确定按钮
    const okBtn = this.containerElement.querySelector(".modal-ok");
    if (okBtn) {
      okBtn.addEventListener("click", () => {
        this.handleOk();
      });
    }

    // 取消按钮
    const cancelBtn = this.containerElement.querySelector(".modal-cancel");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        this.handleCancel();
      });
    }

    // 键盘事件
    if (this.options.keyboard) {
      document.addEventListener("keydown", this.handleKeydown.bind(this));
    }
  }

  /**
   * 处理键盘事件
   */
  handleKeydown(e) {
    if (!this.visible) return;

    if (e.key === "Escape") {
      this.close();
    } else if (e.key === "Enter" && e.ctrlKey) {
      this.handleOk();
    }
  }

  /**
   * 处理确定按钮
   */
  async handleOk() {
    try {
      if (this.onOk) {
        const result = await this.onOk();
        if (result !== false) {
          this.close();
        }
      } else {
        this.close();
      }
    } catch (error) {
      console.error("模态框确定回调错误:", error);
    }
  }

  /**
   * 处理取消按钮
   */
  async handleCancel() {
    try {
      if (this.onCancel) {
        const result = await this.onCancel();
        if (result !== false) {
          this.close();
        }
      } else {
        this.close();
      }
    } catch (error) {
      console.error("模态框取消回调错误:", error);
    }
  }

  /**
   * 显示模态框
   */
  show() {
    console.log("🔧 Modal.show() 开始执行", {
      visible: this.visible,
      hasBackground: !!this.backgroundElement,
      hasMask: !!this.modalWrapper,
      hasContainer: !!this.containerElement,
    });

    if (this.visible) {
      console.log("⚠️ 模态框已经可见，跳过显示");
      return;
    }

    // 如果还没有创建DOM元素，先创建
    if (!this.modalWrapper) {
      console.log("🔧 首次显示，创建DOM元素");
      this.create();
    }

    this.visible = true;

    // 添加到DOM
    console.log("📄 添加模态框到 DOM");
    document.body.appendChild(this.modalWrapper);

    // 添加body类名，防止背景滚动
    document.body.classList.add("modal-open");

    // 动画显示
    requestAnimationFrame(() => {
      console.log("🎬 开始显示动画");
      this.modalWrapper.classList.add("modal-show");
      console.log("✅ 动画类名已添加", {
        wrapperClasses: this.modalWrapper.className,
      });
    });

    // 聚焦到第一个可聚焦元素
    this.focusFirstElement();
    console.log("✅ Modal.show() 执行完成");
  }

  /**
   * 隐藏模态框
   */
  hide() {
    if (!this.visible) return;

    this.visible = false;

    // 动画隐藏
    this.modalWrapper.classList.remove("modal-show");

    // 动画结束后移除DOM
    setTimeout(() => {
      if (this.modalWrapper.parentNode) {
        document.body.removeChild(this.modalWrapper);
      }

      // 移除body类名
      document.body.classList.remove("modal-open");
    }, 300);
  }

  /**
   * 关闭模态框
   */
  close() {
    if (this.onClose) {
      const result = this.onClose();
      if (result === false) return;
    }

    this.hide();

    if (this.options.destroyOnClose) {
      this.destroy();
    }
  }

  /**
   * 更新内容
   */
  updateContent(content) {
    const body = this.containerElement.querySelector(".modal-body");
    if (body) {
      if (typeof content === "string") {
        body.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        body.innerHTML = "";
        body.appendChild(content);
      }
    }
  }

  /**
   * 更新标题
   */
  updateTitle(title) {
    const titleEl = this.containerElement.querySelector(".modal-title");
    if (titleEl) {
      titleEl.textContent = title;
    }
  }

  /**
   * 设置加载状态
   */
  setLoading(loading) {
    const okBtn = this.containerElement.querySelector(".modal-ok");
    if (okBtn) {
      okBtn.disabled = loading;
      okBtn.innerHTML = loading
        ? '<span class="loading-spinner"></span> 处理中...'
        : "确定";
    }
  }

  /**
   * 聚焦到第一个可聚焦元素
   */
  focusFirstElement() {
    const focusableElements = this.containerElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }

  /**
   * 获取模态框容器元素（供子类使用）
   */
  getContainer() {
    // 如果还没有创建，先创建
    if (!this.containerElement) {
      this.create();
    }
    return this.containerElement;
  }

  /**
   * 获取模态框主体元素（供子类使用）
   */
  getBody() {
    // 如果还没有创建，先创建
    if (!this.containerElement) {
      this.create();
    }
    return this.containerElement.querySelector(".modal-body");
  }

  /**
   * 销毁模态框
   */
  destroy() {
    // 移除事件监听
    if (this.options.keyboard) {
      document.removeEventListener("keydown", this.handleKeydown.bind(this));
    }

    // 移除DOM
    if (this.modalWrapper && this.modalWrapper.parentNode) {
      this.modalWrapper.parentNode.removeChild(this.modalWrapper);
    }

    // 移除body类名
    document.body.classList.remove("modal-open");

    // 清理引用
    this.backgroundElement = null;
    this.modalWrapper = null;
    this.containerElement = null;
    this.onOk = null;
    this.onCancel = null;
    this.onClose = null;
  }
}

/**
 * 模态框工厂函数
 */
export const modal = {
  /**
   * 显示信息模态框
   */
  info(options) {
    return new Modal({
      ...options,
      className: "modal-info",
    });
  },

  /**
   * 显示成功模态框
   */
  success(options) {
    return new Modal({
      ...options,
      className: "modal-success",
    });
  },

  /**
   * 显示警告模态框
   */
  warning(options) {
    return new Modal({
      ...options,
      className: "modal-warning",
    });
  },

  /**
   * 显示错误模态框
   */
  error(options) {
    return new Modal({
      ...options,
      className: "modal-error",
    });
  },

  /**
   * 显示确认模态框
   */
  confirm(options) {
    return new Modal({
      title: "确认",
      ...options,
      className: "modal-confirm",
    });
  },
};
