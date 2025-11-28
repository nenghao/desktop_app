/**
 * 自定义标题栏组件
 * 支持 Electron 和 Web 环境
 */

import { isElectron, isWeb } from '../../utils/platform-detector.js';

// 全局类型声明
/** @type {any} */
const electronAPI = typeof window !== 'undefined' ? window.electronAPI : undefined;

export class TitleBar {
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.electronAdapter = options.electronAdapter;
    this.isElectron = isElectron();
    this.isWeb = isWeb();

    this.container = null;
    this.menuTemplate = null;
    this.activeMenu = null;
    this.menuBarActive = false; // 菜单栏是否处于激活状态

    // 绑定方法
    this.handleMenuClick = this.handleMenuClick.bind(this);
    this.handleMenuHover = this.handleMenuHover.bind(this);
    this.handleMenuItemClick = this.handleMenuItemClick.bind(this);
    this.closeActiveMenu = this.closeActiveMenu.bind(this);
    this.deactivateMenuBar = this.deactivateMenuBar.bind(this);
  }

  /**
   * 渲染标题栏
   */
  async render(container) {
    this.container = container;

    // Web 环境不渲染标题栏
    if (this.isWeb) {
      this.container.innerHTML = '';
      console.log('🌐 TitleBar: Web 环境，不渲染自定义标题栏');
      return;
    }

    // 获取菜单模板
    if (this.electronAdapter && this.electronAdapter.isElectron) {
      this.menuTemplate = await electronAPI.getMenuTemplate();
    }

    // 检测平台
    let platform = 'web';
    if (this.electronAdapter && this.electronAdapter.isElectron) {
      const userAgent = navigator.userAgent;
      if (userAgent.indexOf('Mac') > -1) {
        platform = 'darwin';
      } else if (userAgent.indexOf('Linux') > -1) {
        platform = 'linux';
      } else {
        platform = 'win32';
      }
    }

    // macOS 和 Linux 使用原生标题栏，不渲染自定义标题栏
    // if (platform === 'darwin' || platform === 'linux') {
      this.container.innerHTML = '';
      console.log(`✅ TitleBar: ${platform} 平台使用原生标题栏，不渲染自定义标题栏`);
      return;
    // }

    // Windows 平台渲染自定义标题栏（仅 Electron）
    // this.container.innerHTML = `
    //   <div class="title-bar">
    //     <div class="title-bar-left">
    //       ${platform === 'win32' ? `
    //       <div class="menu-bar" id="menu-bar">
    //         ${this.renderMenuBar()}
    //       </div>
    //       ` : ''}
    //     </div>

    //     <div class="title-bar-center">
    //       <div class="window-title" id="agent-title" style="display: none;"></div>
    //     </div>

    //     <div class="title-bar-right">
    //       <div class="window-controls">
    //         <button class="window-control minimize" id="minimize-btn" aria-label="最小化">
    //           <svg class="control-icon minimize-icon" width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
    //             <rect x="2" y="6.5" width="11" height="2" stroke-width="1.5" fill="currentColor"/>
    //           </svg>
    //         </button>
    //         <button class="window-control maximize" id="maximize-btn" aria-label="最大化">
    //           <svg class="control-icon" width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
    //             <rect x="1" y="1" width="8" height="8" stroke="currentColor" stroke-width="1.5" fill="none"/>
    //           </svg>
    //         </button>
    //         <button class="window-control close" id="close-btn" aria-label="关闭">
    //           <svg class="control-icon close-icon" width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
    //             <path d="M2.5 2.5L11.5 11.5M11.5 2.5L2.5 11.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    //           </svg>
    //         </button>
    //       </div>
    //     </div>
    //   </div>

    //   <!-- 菜单下拉面板 -->
    //   <div class="menu-dropdown-overlay" id="menu-dropdown-overlay"></div>
    // `;

    // this.setupEventListeners();
    // console.log('✅ TitleBar 渲染完成');
  }

  /**
   * 渲染菜单栏 - 已废弃
   *-/
  renderMenuBar() {
    if (!this.menuTemplate) {
      return '';
    }

    return this.menuTemplate.map(menu => {
      // 使用应用图标替换文字菜单
      if (menu.label === 'app.icon' || menu.label.includes('Questech') || menu.label === 'File' || menu.label === '文件') {
        return `
          <button class="menu-item menu-icon" data-menu="${menu.label}">
            <img src="./src/assets/icons/png/64x64.png" alt="奇境探索" class="menu-app-icon" />
          </button>
        `;
      }
      
      return `
        <button class="menu-item" data-menu="${menu.label}">
          ${menu.label}
        </button>
      `;
    }).join('');
  }

  /**
   * 渲染菜单下拉内容 - 已废弃
   *-/
  renderMenuDropdown(menuLabel) {
    const menu = this.menuTemplate.find(m => m.label === menuLabel);
    if (!menu || !menu.submenu) return '';

    return `
      <div class="menu-dropdown" data-menu="${menuLabel}">
        ${menu.submenu.map(item => {
      if (item.type === 'separator') {
        return '<div class="menu-separator"></div>';
      }

      const accelerator = item.accelerator ?
        `<span class="menu-accelerator">${item.accelerator}</span>` : '';

      return `
            <div class="menu-dropdown-item" data-menu-id="${item.id || ''}">
              <span class="menu-item-label">${item.label}</span>
              ${accelerator}
            </div>
          `;
    }).join('')}
      </div>
    `;
  }

  /**
   * 设置事件监听 - 已废弃
   *-/
  setupEventListeners() {
    // 菜单点击和hover事件
    const menuBar = this.container.querySelector('#menu-bar');
    if (menuBar) {
      menuBar.addEventListener('click', this.handleMenuClick);
      menuBar.addEventListener('mouseover', this.handleMenuHover);
    }

    // 窗口控制按钮事件
    const minimizeBtn = this.container.querySelector('#minimize-btn');
    const maximizeBtn = this.container.querySelector('#maximize-btn');
    const closeBtn = this.container.querySelector('#close-btn');

    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        if (this.isElectron && this.electronAdapter && this.electronAdapter.isElectron) {
          electronAPI.minimizeWindow();
        }
      });
    }

    if (maximizeBtn) {
      maximizeBtn.addEventListener('click', () => {
        if (this.isElectron && this.electronAdapter && this.electronAdapter.isElectron) {
          electronAPI.toggleMaximizeWindow();
        }
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (this.isElectron && this.electronAdapter && this.electronAdapter.isElectron) {
          electronAPI.closeWindow();
        }
      });
    }

    // 窗口状态变化监听（仅 Electron 环境）
    if (this.isElectron && this.electronAdapter && this.electronAdapter.isElectron) {
      // 监听窗口最大化状态变化
      window.addEventListener('resize', () => {
        this.updateMaximizeIcon();
      });

      // 初始状态更新
      setTimeout(() => {
        this.updateMaximizeIcon();
      }, 100);
    }

    // 点击其他地方关闭菜单和取消激活状态
    document.addEventListener('click', this.deactivateMenuBar);
  }

  /**
   * 更新最大化按钮图标（仅 Electron 环境）- 已废弃
   *-/
  updateMaximizeIcon() {
    if (!this.isElectron) return;

    const maximizeBtn = this.container.querySelector('#maximize-btn');
    if (!maximizeBtn || !this.electronAdapter || !this.electronAdapter.isElectron) return;

    // 检查窗口是否最大化
    // 这里使用一个简单的检测方法，实际项目中可以通过IPC获取真实状态
    const isMaximized = window.innerWidth === screen.availWidth && 
                       window.innerHeight === screen.availHeight;

    if (isMaximized) {
      // 还原图标 - 双方框叠加效果
      maximizeBtn.innerHTML = `
        <svg class="control-icon maximize-icon" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="3" width="7" height="7" stroke="currentColor" stroke-width="1.5" fill="none"/>
          <rect x="4" y="1" width="7" height="7" stroke="currentColor" stroke-width="1.5" fill="var(--color-surface)"/>
        </svg>
      `;
      maximizeBtn.setAttribute('aria-label', '还原');
    } else {
      // 最大化图标 - 单方框
      maximizeBtn.innerHTML = `
        <svg class="control-icon maximize-icon" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="1" width="10" height="10" stroke="currentColor" stroke-width="1.5" fill="none"/>
        </svg>
      `;
      maximizeBtn.setAttribute('aria-label', '最大化');
    }
  }

  /**
   * 处理菜单点击 - 已废弃
   *-/
  handleMenuClick(event) {
    event.stopPropagation();

    const menuItem = event.target.closest('.menu-item');
    if (!menuItem) return;

    const menuLabel = menuItem.dataset.menu;

    // 激活菜单栏
    this.menuBarActive = true;

    // 如果点击的是当前活跃菜单，则关闭并取消激活
    if (this.activeMenu === menuLabel) {
      this.closeActiveMenu();
      this.menuBarActive = false;
      return;
    }

    // 显示新菜单
    this.showMenuDropdown(menuLabel, menuItem);
  }

  /**
   * 处理菜单hover - 已废弃
   *-/
  handleMenuHover(event) {
    // 只有在菜单栏激活状态下才响应hover
    if (!this.menuBarActive) return;

    const menuItem = event.target.closest('.menu-item');
    if (!menuItem) return;

    const menuLabel = menuItem.dataset.menu;

    // 如果hover的不是当前活跃菜单，则切换
    if (this.activeMenu !== menuLabel) {
      this.showMenuDropdown(menuLabel, menuItem);
    }
  }

  /**
   * 显示菜单下拉 - 已废弃
   *-/
  showMenuDropdown(menuLabel, menuElement) {
    const overlay = this.container.querySelector('#menu-dropdown-overlay');
    if (!overlay) return;

    // 先清除之前的活跃状态
    const previousActive = this.container.querySelector('.menu-item.active');
    if (previousActive) {
      previousActive.classList.remove('active');
    }

    // 设置活跃菜单
    this.activeMenu = menuLabel;
    menuElement.classList.add('active');

    // 渲染菜单内容
    overlay.innerHTML = this.renderMenuDropdown(menuLabel);
    overlay.style.display = 'block';

    // 定位菜单
    const rect = menuElement.getBoundingClientRect();
    const dropdown = overlay.querySelector('.menu-dropdown');
    if (dropdown) {
      dropdown.style.left = `${rect.left}px`;
      dropdown.style.top = `${rect.bottom}px`;

      // 添加菜单项点击事件
      dropdown.addEventListener('click', this.handleMenuItemClick);
    }
  }

  /**
   * 处理菜单项点击 - 已废弃
   *-/
  async handleMenuItemClick(event) {
    event.stopPropagation();

    const menuItem = event.target.closest('.menu-dropdown-item');
    if (!menuItem) return;

    const menuId = menuItem.dataset.menuId;
    if (!menuId) return;

    // 关闭菜单并取消激活状态
    this.closeActiveMenu();
    this.menuBarActive = false;

    // 执行菜单操作（仅 Electron 环境）
    if (this.isElectron && this.electronAdapter && this.electronAdapter.isElectron) {
      await electronAPI.menuItemClick(menuId);
    }
  }

  /**
   * 取消菜单栏激活状态 - 已废弃
   *-/
  deactivateMenuBar(event) {
    // 如果点击的是菜单栏内部，不取消激活状态
    const menuBar = this.container.querySelector('#menu-bar');
    const overlay = this.container.querySelector('#menu-dropdown-overlay');

    if (menuBar && (menuBar.contains(event.target) ||
      (overlay && overlay.contains(event.target)))) {
      return;
    }

    // 关闭菜单并取消激活状态
    this.closeActiveMenu();
    this.menuBarActive = false;
  }

  /**
   * 关闭活跃菜单 - 已废弃
   *-/
  closeActiveMenu() {
    if (!this.activeMenu) return;

    // 移除活跃状态
    const activeMenuItem = this.container.querySelector('.menu-item.active');
    if (activeMenuItem) {
      activeMenuItem.classList.remove('active');
    }

    // 隐藏下拉菜单
    const overlay = this.container.querySelector('#menu-dropdown-overlay');
    if (overlay) {
      overlay.style.display = 'none';
      overlay.innerHTML = '';
    }

    this.activeMenu = null;
  }

  */ // 废弃方法结束
  
  /**
   * 更新窗口标题
   */
  setTitle(title) {
    const titleElement = this.container.querySelector('.window-title');
    if (titleElement) {
      titleElement.textContent = title;
    }
  }

  /**
   * 显示智能体标题
   */
  showAgentTitle(agentName) {
    console.log('🔍 TitleBar.showAgentTitle 被调用:', agentName);
    const agentTitleElement = this.container.querySelector('#agent-title');
    console.log('🔍 agentTitleElement:', agentTitleElement);

    if (agentTitleElement) {
      agentTitleElement.textContent = agentName;
      agentTitleElement.style.display = 'block';
      console.log('✅ 智能体标题已设置:', agentName);
    } else {
      console.warn('❌ 找不到agent-title元素');
    }
  }

  /**
   * 隐藏智能体标题
   */
  hideAgentTitle() {
    const agentTitleElement = this.container.querySelector('#agent-title');
    if (agentTitleElement) {
      agentTitleElement.style.display = 'none';
      agentTitleElement.textContent = '';
    }
  }

  /**
   * 销毁组件
   */
  destroy() {
    document.removeEventListener('click', this.deactivateMenuBar);
    this.closeActiveMenu();
    this.menuBarActive = false;
  }
}
