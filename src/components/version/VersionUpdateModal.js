/**
 * 版本更新提示模态框组件
 * 提供版本更新通知和操作界面
 */

import { BaseComponent } from '../../core/BaseComponent.js';
import { Modal } from '../common/Modal.js';
import { IconUtils } from '../../utils/IconUtils.js';
// 导入 Lit 组件
// import '../lit/index.js';

export class VersionUpdateModal extends BaseComponent {
  constructor(options = {}) {
    super(options);

    // 默认配置
    this.options = {
      title: '发现新版本',
      confirmText: '立即更新',
      cancelText: '稍后提醒',
      forceUpdate: false,
      ...options
    };

    // 更新信息
    this.updateInfo = options.updateInfo || {};

    // 创建模态框实例
    this.modal = new Modal({
      title: this.options.title,
      height: 'auto',
      width: 500,
      className: 'version-update-modal',
      content: this.createUpdateContent(),
      closable: !this.options.forceUpdate, // 强制更新时不允许关闭
      maskClosable: !this.options.forceUpdate,
      keyboard: !this.options.forceUpdate, // 强制更新时禁用键盘事件
      showFooter: false,
      onClose: () => {
        this.handleModalClose();
      }
    });
  }

  /**
   * 处理模态框关闭
   */
  handleModalClose() {
    // 如果是强制更新，阻止关闭
    if (this.options.forceUpdate) {
      return;
    }

    // 发送内部事件
    this.emit('hide');
    // 发送全局事件
    this.emitGlobal('version-update:modal:hide');
  }

  /**
   * 显示模态框
   */
  show() {
    this.modal.show();

    // 在模态框显示后绑定事件
    setTimeout(() => {
      this.bindEvents();
    }, 100);

    // 发送内部事件
    this.emit('show');
    // 发送全局事件
    this.emitGlobal('version-update:modal:show');

    // 调用生命周期钩子
    this.onMounted();
  }

  /**
   * 隐藏模态框
   */
  hide() {
    // 如果是强制更新，阻止隐藏
    if (this.options.forceUpdate) {
      return;
    }

    this.modal.hide();
  }

  /**
   * 创建更新内容
   */
  createUpdateContent() {
    const contentDiv = document.createElement('div');
    contentDiv.className = 'update-container';
    this.updateContentHTML(contentDiv);
    return contentDiv;
  }

  /**
   * 更新内容HTML
   */
  updateContentHTML(container) {
    const {
      currentVersion,
      latestVersion,
      updateInfo: versionInfo,
      downloadUrl,
      forceUpdate
    } = this.updateInfo;

    // 版本图标
    const versionIcon = this.getVersionIcon(forceUpdate);

    container.innerHTML = `
      <!-- 版本图标 -->
      <div class="update-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" />
          <path d="M2 17L12 22L22 17" />
          <path d="M2 12L12 17L22 12" />
        </svg>
      </div>

      <!-- 版本信息 -->
      <div class="version-info">
        <div class="version-item">
          <span class="label">当前版本:</span>
          <span class="value current">v${currentVersion || '1.0.0'}</span>
        </div>
        <div class="version-item">
          <span class="label">最新版本:</span>
          <span class="value latest">v${latestVersion || '1.0.1'}</span>
        </div>
      </div>

      <!-- 更新内容 -->
      <div class="update-description">
        ${versionInfo ? `
          <div class="update-features">
            <h4>更新内容:</h4>
            <ul>
              ${versionInfo.split('\n').filter(item => item.trim()).map(item => `<li>${item.trim()}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>

      <!-- 操作按钮 -->
      <div class="update-actions">
        <button class="update-btn primary" id="confirm-update-btn">
          <span>${this.options.confirmText}</span>
          <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9,18 15,12 9,6"></polyline>
          </svg>
        </button>

        ${!this.options.forceUpdate ? `
          <button class="update-btn secondary" id="cancel-update-btn">
            <span>${this.options.cancelText}</span>
          </button>
        ` : ''}
      </div>

      ${this.options.forceUpdate ? `
        <div class="force-notice">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>此版本为强制更新，为了您的使用安全和体验，请立即更新</span>
        </div>
      ` : ''}
    `;
  }

  /**
   * 获取版本图标
   */
  getVersionIcon(forceUpdate) {
    if (forceUpdate) {
      return '⚠️'; // 警告图标
    }
    return '🎉'; // 庆祝图标
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    const modalBody = this.modal.getBody();
    if (!modalBody) {
      console.warn('VersionUpdateModal: 无法找到 modal-body 元素');
      return;
    }

    console.log('VersionUpdateModal: 开始绑定事件');
    console.log('VersionUpdateModal: modalBody 内容:', modalBody.innerHTML.substring(0, 200));

    // 检查按钮是否存在
    const confirmBtn = modalBody.querySelector('#confirm-update-btn');
    const cancelBtn = modalBody.querySelector('#cancel-update-btn');
    console.log('VersionUpdateModal: 确认按钮存在:', !!confirmBtn);
    console.log('VersionUpdateModal: 取消按钮存在:', !!cancelBtn);

    // 移除之前的事件监听器（如果存在）
    if (this.modalClickHandler) {
      modalBody.removeEventListener('click', this.modalClickHandler);
    }

    // 使用事件委托
    this.modalClickHandler = (e) => {
      console.log('VersionUpdateModal: 检测到点击事件:', e.target);
      console.log('VersionUpdateModal: 目标元素ID:', e.target.id);
      console.log('VersionUpdateModal: 目标元素类名:', e.target.className);

      // 处理确认更新按钮点击
      const confirmBtn = e.target.closest('#confirm-update-btn');
      if (confirmBtn) {
        console.log('VersionUpdateModal: 确认更新按钮被点击');
        this.handleConfirmUpdate();
        return;
      }

      // 处理取消更新按钮点击
      const cancelBtn = e.target.closest('#cancel-update-btn');
      if (cancelBtn) {
        console.log('VersionUpdateModal: 取消更新按钮被点击');
        this.handleCancelUpdate();
        return;
      }
    };

    // 在 modalBody 上添加事件委托监听器
    modalBody.addEventListener('click', this.modalClickHandler);

    // 添加键盘事件监听器
    this.keydownHandler = (e) => {
      if (e.key === 'Escape' && this.options.forceUpdate) {
        console.log('VersionUpdateModal: 强制更新模式下阻止ESC关闭');
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    };

    document.addEventListener('keydown', this.keydownHandler);
    console.log('VersionUpdateModal: 事件绑定完成');
  }

  /**
   * 处理确认更新
   */
  handleConfirmUpdate() {
    console.log('✅ VersionUpdateModal: 用户确认更新');

    // 发送内部事件
    this.emit('confirm', this.updateInfo);
    // 发送全局事件
    this.emitGlobal('version-update:confirm', this.updateInfo);

    // 直接在外部浏览器打开下载页面
    const downloadUrl = this.updateInfo.downloadUrl || 'https://www.baizesz.com/app/download';
    window.open(downloadUrl, '_blank', 'noopener,noreferrer');

    // 隐藏模态框
    this.hide();
  }

  /**
   * 处理取消更新
   */
  handleCancelUpdate() {
    console.log('❌ VersionUpdateModal: 用户取消更新');

    // 发送内部事件
    this.emit('cancel', this.updateInfo);
    // 发送全局事件
    this.emitGlobal('version-update:cancel', this.updateInfo);

    // 隐藏模态框
    this.hide();
  }

  /**
   * 开始更新
   */
  startUpdate() {
    const { downloadUrl } = this.updateInfo;

    if (window.electronAPI && window.electronAPI.startUpdate) {
      // Electron 环境下的更新
      window.electronAPI.startUpdate(downloadUrl).then(() => {
        console.log('✅ VersionUpdateModal: 更新已开始');
      }).catch((error) => {
        console.error('❌ VersionUpdateModal: 更新失败', error);
        this.emit('update-error', error);
      });
    } else {
      // Web 环境下，打开下载链接
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    }
  }

  /**
   * 更新更新信息
   */
  setUpdateInfo(updateInfo) {
    this.updateInfo = { ...this.updateInfo, ...updateInfo };
    this.options.forceUpdate = updateInfo.forceUpdate || this.options.forceUpdate;

    // 重新渲染内容
    const modalBody = this.modal.getBody();
    const updateContainer = modalBody.querySelector('.update-container');
    if (updateContainer) {
      this.updateContentHTML(updateContainer);
      // 重新绑定事件
      this.bindEvents();
    }
  }

  /**
   * 销毁组件
   */
  destroy() {
    // 清理事件委托监听器
    if (this.modalClickHandler) {
      const modalBody = this.modal.getBody();
      if (modalBody) {
        modalBody.removeEventListener('click', this.modalClickHandler);
      }
      this.modalClickHandler = null;
    }

    // 清理键盘事件监听器
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }

    if (this.modal) {
      this.modal.destroy();
    }

    // 调用BaseComponent的销毁方法，会自动清理所有事件监听器
    super.destroy();
  }

  /**
   * 组件销毁前的清理工作
   */
  onBeforeUnmount() {
    // BaseComponent会自动清理所有事件监听器
    super.onBeforeUnmount();
  }
}