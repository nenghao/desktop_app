/**
 * 设置中心模态框组件
 * 提供应用设置界面，包括主题选择、界面配置等
 */

import { BaseComponent } from '../../core/BaseComponent.js';
import { Modal } from '../common/Modal.js';
import { IconUtils } from '../../utils/IconUtils.js';
import { getConfigCacheService } from '../../services/index.js';
// 导入 Lit 组件
import '../lit/index.js';

export class SettingsModal extends BaseComponent {
  constructor(options = {}) {
    super(options);

    // 获取配置缓存服务实例
    this.configCacheService = getConfigCacheService();

    // 初始化设置 - 只加载主题设置相关内容
    this.loadThemeSettings();

    // 创建模态框实例
    this.modal = new Modal({
      title: '偏好设置',
      height: 'auto',
      className: 'settings-modal',
      content: this.createSettingsContent(),
      closable: false, // 禁用默认关闭按钮，使用自定义的 Lit 组件
      maskClosable: true,
      showFooter: false,
      onClose: () => {
        this.handleModalClose();
      }
    });
  }

  /**
   * 加载主题设置
   */
  loadThemeSettings() {
    // 从缓存加载主题设置，或者使用默认值
    const cachedTheme = this.configCacheService.getCachedSetting('theme');
    this.settings = {
      theme: cachedTheme || 'auto'
    };
  }

  /**
   * 处理模态框关闭
   */
  handleModalClose() {
    // 发送内部事件
    this.emit('hide');
    // 发送全局事件
    this.emitGlobal('settings:modal:hide');
  }

  /**
   * 同步当前主题状态
   */
  syncCurrentTheme() {
    // 尝试从全局 app 实例获取当前主题
    if (window.app && window.app.themeManager) {
      const currentTheme = window.app.themeManager.getCurrentTheme();
      if (currentTheme && this.settings.theme !== currentTheme) {
        this.settings.theme = currentTheme;
      }
    }
  }

  /**
   * 显示模态框
   */
  show() {
    // 同步当前主题状态
    this.syncCurrentTheme();

    // 更新内容后显示（updateSettingsContent 会自动调用 bindEvents）
    this.updateSettingsContent();

    this.modal.show();
    // 发送内部事件
    this.emit('show');
    // 发送全局事件
    this.emitGlobal('settings:modal:show');

    // 调用生命周期钩子
    this.onMounted();
  }

  /**
   * 隐藏模态框
   */
  hide() {
    this.modal.hide();
  }

  /**
   * 创建设置内容
   */
  createSettingsContent() {
    const contentDiv = document.createElement('div');
    contentDiv.className = 'settings-container';
    this.updateSettingsContentHTML(contentDiv);
    return contentDiv;
  }

  /**
   * 更新设置内容
   */
  updateSettingsContent() {
    const modalBody = this.modal.getBody();
    const settingsContainer = modalBody.querySelector('.settings-container');
    if (settingsContainer) {
      this.updateSettingsContentHTML(settingsContainer);
      // 重新绑定事件 - 重要：innerHTML 更新后需要重新绑定
      this.bindEvents();
    }
  }

  /**
   * 更新设置HTML内容
   */
  updateSettingsContentHTML(container) {
    // 动态生成主题选择按钮
    const supportedThemes = this.configCacheService.getSupportedThemes();
    const themeButtonsHTML = supportedThemes.map(theme => {
      const themeNames = {
        'light': '浅色模式',
        'dark': '深色模式',
        'auto': '跟随系统'
      };
      return `
        <button class="theme-btn ${this.settings.theme === theme ? 'active' : ''}" data-theme="${theme}">
          ${themeNames[theme] || theme}
        </button>
      `;
    }).join('');


    container.innerHTML = `
      <!-- 使用 Lit Elements 关闭按钮 -->
      <power-close-button 
        variant="modal" 
        size="medium" 
        aria-label="关闭设置窗口"
        id="settings-close-btn">
      </power-close-button>
      
      <!-- 主题设置 -->
      <div class="settings-section">
        <div class="theme-selector">
          ${themeButtonsHTML}
        </div>
      </div>

      <!-- 底部链接区域 -->
      <div class="settings-section">
        <div class="footer-links">
          <a href="#" class="footer-link" data-action="open-source" data-url="https://www.baizesz.com/document/opensource-licenses">开源库声明 <svg class="link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"></polyline></svg></a>
          <a href="#" class="footer-link" data-action="user-agreement" data-url="https://www.baizesz.com/user/agreement">服务协议 <svg class="link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"></polyline></svg></a>
          <a href="#" class="footer-link" data-action="privacy-policy" data-url="https://www.baizesz.com/user/private">隐私政策 <svg class="link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"></polyline></svg></a>
          <a href="#" class="footer-link" data-action="third-party" data-url="https://www.baizesz.com/document/sdksharing">第三方信息共享清单 <svg class="link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"></polyline></svg></a>
          <a href="#" class="footer-link" data-action="feedback">意见与反馈 <svg class="link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"></polyline></svg></a>
          <a href="#" class="footer-link" data-action="about" data-url="https://www.baizesz.com/about">关于奇境探索 <span class="version">1.0.0(1)</span> <svg class="link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"></polyline></svg></a>
        </div>
      </div>
    `;
  }

  /**
   * 绑定事件 - 使用事件委托避免DOM更新后事件丢失问题
   */
  bindEvents() {
    const modalBody = this.modal.getBody();
    if (!modalBody) {
      console.warn('SettingsModal: 无法找到 modal-body 元素');
      return;
    }

    // 移除之前的事件监听器（如果存在）
    if (this.modalClickHandler) {
      modalBody.removeEventListener('click', this.modalClickHandler);
    }

    // 使用事件委托 - 只在 modalBody 上绑定一个监听器
    this.modalClickHandler = (e) => {
      const target = e.target;

      // 处理主题按钮点击
      if (target.classList.contains('theme-btn')) {
        this.handleThemeChange(target.dataset.theme);
        return;
      }

      // 处理底部链接点击
      if (target.classList.contains('footer-link')) {
        this.handleFooterLinkClick(e);
        return;
      }

      // 处理 Lit 关闭按钮的点击
      const closeBtn = target.closest('#settings-close-btn');
      if (closeBtn) {
        this.hide();
        return;
      }
    };

    // 在 modalBody 上添加事件委托监听器
    this.addDOMListener(modalBody, 'click', this.modalClickHandler);
  }

  // 移除自定义事件系统，使用BaseComponent的统一事件系统

  /**
   * 处理主题变更
   */
  handleThemeChange(theme) {
    this.settings.theme = theme;

    // 更新按钮状态
    const modalBody = this.modal.getBody();
    const themeButtons = modalBody.querySelectorAll('.theme-btn');
    themeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });

    // 保存主题设置到缓存
    this.configCacheService.saveSetting('theme', theme);

    // 发送内部事件
    this.emit('themeChange', theme);
    // 发送全局事件
    if (this.eventBus) {
      this.emitGlobal('settings:theme:change', theme);
    } else if (window.app && window.app.eventBus) {
      window.app.eventBus.emit('settings:theme:change', theme);
    } else {
      console.error('❌ SettingsModal: 无法找到 eventBus');
    }
  }

  /**
   * 更新UI显示
   */
  updateUI() {
    const modalBody = this.modal.getBody();
    if (!modalBody) return;

    // 更新主题按钮
    const themeButtons = modalBody.querySelectorAll('.theme-btn');
    themeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === this.settings.theme);
    });
  }

  /**
   * 处理底部链接点击
   */
  handleFooterLinkClick(e) {
    e.preventDefault();
    const action = e.currentTarget.dataset.action;
    const url = e.currentTarget.dataset.url;

    // 定义窗口标题
    const titles = {
      'open-source': '开源库声明',
      'user-agreement': '服务协议',
      'privacy-policy': '隐私政策',
      'third-party': '第三方信息共享清单',
      'about': '关于奇境探索'
    };

    // 如果有URL，尝试打开
    if (url) {
      // 优先使用 Electron API 打开独立窗口
      if (window.electronAPI && window.electronAPI.createDocumentWindow) {
        window.electronAPI.createDocumentWindow({
          title: titles[action] || '查看详情',
          url: url,
          width: 900,
          height: 700
        }).then((windowId) => {
          console.log('✅ SettingsModal: 文档窗口创建成功', windowId);
        }).catch((error) => {
          console.error('❌ SettingsModal: 文档窗口创建失败', error);
          // 降级到浏览器打开
          window.open(url, '_blank', 'noopener,noreferrer');
        });
      } else {
        console.log('🌐 SettingsModal: Electron API 不可用，使用浏览器打开', {
          hasElectronAPI: !!window.electronAPI,
          hasCreateDocumentWindow: window.electronAPI && !!window.electronAPI.createDocumentWindow
        });
        // Web环境下在新标签页打开
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } else {
      // 处理没有URL的链接，如反馈
      switch (action) {
        case 'feedback':
          console.log('💬 SettingsModal: 打开意见与反馈');
          // 可以在这里添加反馈功能的逻辑
          break;
        default:
          console.log('🔍 SettingsModal: 点击了:', action);
      }
    }
  }



  /**
   * 发射设置变化事件
   * 注意：该方法已在上方定义，此处为保留注释
   */

  /**
   * 获取当前设置
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * 设置配置
   */
  setSettings(newSettings) {
    // 只更新主题相关设置
    if (newSettings.theme) {
      this.settings.theme = newSettings.theme;
      this.updateUI();
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