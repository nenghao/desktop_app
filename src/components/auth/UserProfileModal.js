/**
 * 用户信息模态框组件
 * 显示已登录用户的详细信息
 */

import { Modal } from '../common/Modal.js';
import { UserManager } from '../../services/UserManager.js';
import { NotificationCenter } from '../common/NotificationCenter.js';
import { IconUtils } from '../../utils/IconUtils.js';
import { userApiService } from '../../services/api/UserApiService.js';
// 导入 Lit 组件
import '../lit/index.js';

export class UserProfileModal {
  // 静态变量：上次请求用户信息的时间
  static lastFetchTime = null;
  // 请求频率控制：10分钟（毫秒）
  static FETCH_INTERVAL = 10 * 60 * 1000;

  constructor(options = {}) {
    this.userManager = options.userManager || new UserManager();

    // 回调函数
    this.onLogout = options.onLogout || null;
    this.onClose = options.onClose || null;

    // 状态标志
    this.isAvatarModalOpening = false; // 用于防止头像模态框重复打开
    this.avatarModal = null; // 头像选择模态框引用
    this.selectedAvatar = null; // 临时保存选择的头像

    // 创建统一模态框实例
    this.modal = new Modal({
      title: '用户中心',
      height: 'auto',
      className: 'user-profile-modal',
      content: this.createProfileContent(),
      closable: false, // 禁用默认关闭按钮，使用自定义的 Lit 组件
      maskClosable: true,
      showFooter: false,
      onClose: () => {
        if (this.onClose) this.onClose();
      }
    });
  }

  /**
   * 显示用户信息模态框
   */
  async show() {
    console.log("🔧 UserProfileModal.show() 开始执行");

    // 检查是否需要刷新用户信息（10分钟频率控制）
    await this.checkAndRefreshUserInfo();

    // 更新内容后显示
    console.log("🔄 更新资料内容");
    this.updateProfileContent();
    console.log("📱 调用 this.modal.show()");
    this.modal.show();
    console.log("🔗 绑定事件");
    // 确保在模态框显示后绑定事件
    this.bindEvents();
    console.log("✅ UserProfileModal.show() 执行完成");
  }

  /**
   * 检查并刷新用户信息（10分钟频率控制）
   */
  async checkAndRefreshUserInfo() {
    const now = Date.now();
    const lastFetch = UserProfileModal.lastFetchTime;

    // 如果从未请求过，或者距离上次请求超过10分钟，则刷新用户信息
    if (!lastFetch || (now - lastFetch) > UserProfileModal.FETCH_INTERVAL) {
      console.log('🔄 距离上次请求超过10分钟，正在刷新用户信息...');
      try {
        await this.userManager.refreshUserInfo();
        UserProfileModal.lastFetchTime = now;
        console.log('✅ 用户信息刷新成功');
      } catch (error) {
        console.error('❌ 刷新用户信息失败:', error);
        // 即使刷新失败，也更新时间戳，避免频繁重试
        UserProfileModal.lastFetchTime = now;
      }
    } else {
      const timeLeft = UserProfileModal.FETCH_INTERVAL - (now - lastFetch);
      const minutesLeft = Math.ceil(timeLeft / 60000);
      console.log(`⏰ 距离上次请求不足10分钟，跳过刷新（还需等待约${minutesLeft}分钟）`);
    }
  }

  /**
   * 隐藏用户信息模态框
   */
  hide() {
    this.modal.hide();
  }

  /**
   * 创建用户资料内容
   */
  createProfileContent() {
    const contentDiv = document.createElement('div');
    contentDiv.className = 'profile-container';
    this.updateProfileContentHTML(contentDiv);

    // 使用 setTimeout 确保 DOM 元素已经插入
    setTimeout(() => {
      this.loadCurrentAvatar();
    }, 0);

    return contentDiv;
  }

  /**
   * 更新用户资料内容
   */
  updateProfileContent() {
    const modalBody = this.modal.getBody();
    const profileContainer = modalBody.querySelector('.profile-container');
    if (profileContainer) {
      this.updateProfileContentHTML(profileContainer);
      // 加载头像
      this.loadCurrentAvatar();
      // 重新绑定事件
      this.bindEvents();
    }
  }

  /**
   * 更新用户资料HTML内容
   */
  updateProfileContentHTML(container) {
    const currentUser = this.userManager.getCurrentUser();
    const displayName = this.userManager.getDisplayName();

    container.innerHTML = `
      <!-- 使用 Lit Elements 关闭按钮 -->
      <power-close-button
        variant="modal"
        size="medium"
        aria-label="关闭用户中心窗口"
        id="profile-close-btn">
      </power-close-button>

      <!-- 头像区域 -->
      <div class="avatar-section">
        <div class="avatar-container">
          <div class="profile-avatar" id="profile-avatar">
            <!-- 头像将通过 JavaScript 动态加载 -->
          </div>
          <button class="avatar-edit-btn" id="avatar-edit-btn" title="更换头像">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- 用户详细信息 -->
      <div class="profile-details">
        <div class="detail-item editable">
          <label class="detail-label">用户名</label>
          <div class="detail-input-group">
            <input type="text" class="detail-input" id="profile-username" value="${displayName}" maxlength="20" disabled data-original-value="${displayName}">
            <button class="edit-btn" id="username-edit-btn" title="编辑用户名" data-mode="edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          </div>
        </div>

        <div class="detail-item editable">
          <label class="detail-label">邮箱</label>
          <div class="detail-input-group">
            <input type="email" class="detail-input" id="profile-email" value="${currentUser?.email || ''}" placeholder="请输入邮箱地址" disabled data-original-value="${currentUser?.email || ''}">
            <button class="edit-btn" id="email-edit-btn" title="编辑邮箱" data-mode="edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          </div>
        </div>

        <div class="detail-item readonly">
          <label class="detail-label">手机号</label>
          <div class="detail-value readonly">${currentUser?.phone || '未设置'}</div>
        </div>

        <div class="detail-item readonly">
          <label class="detail-label">用户ID</label>
          <div class="detail-value detail-id readonly">${this.formatUserId(currentUser?.id)}</div>
        </div>

        <div class="detail-item readonly">
          <label class="detail-label">积分余额</label>
          <div class="detail-value readonly credits-value">${currentUser?.credits || 0} 积分</div>
        </div>

        <div class="detail-item readonly">
          <label class="detail-label">积分有效期</label>
          <div class="detail-value readonly">
            ${currentUser?.credits_expiration_date ?
        new Date(currentUser.credits_expiration_date).toLocaleDateString('zh-CN') :
        '永久有效'
      }
          </div>
        </div>
      </div>

      <!-- 账户操作按钮组 -->
      <div class="account-actions">
        <button class="action-btn secondary" id="change-password-btn">
          <span class="btn-text">修改密码</span>
        </button>
        <button class="action-btn danger" id="logout-btn">
          <span class="btn-text">退出登录</span>
        </button>
      </div>
    `;
  }

  /**
   * 加载当前用户头像
   */
  loadCurrentAvatar() {
    const modalBody = this.modal.getBody();
    const profileAvatar = modalBody.querySelector('#profile-avatar');
    if (!profileAvatar) return;

    const currentUser = this.userManager.getCurrentUser();
    const avatarName = currentUser?.avatar || 'emoji-wink';

    // 清空现有内容
    profileAvatar.innerHTML = '';

    // 创建头像图片
    const img = document.createElement('img');
    // 使用 UserManager 获取头像路径
    const avatarPath = this.userManager.getAvatarPath(avatarName);
    img.src = avatarPath;
    img.style.width = '60px';
    img.style.height = '60px';
    img.alt = avatarName;

    img.onload = () => {
      console.log(`当前用户头像加载成功: ${avatarName}`);
    };

    img.onerror = (error) => {
      console.error(`加载用户头像失败: ${avatarName}`, error);
      // 加载失败时显示默认图标
      profileAvatar.innerHTML = IconUtils.getIcon('user');
    };

    profileAvatar.appendChild(img);
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    const modalBody = this.modal.getBody();
    if (!modalBody) {
      console.warn('UserProfileModal: 无法找到 modal-body 元素');
      return;
    }

    // Lit 组件关闭按钮事件
    const closeBtn = modalBody.querySelector('#profile-close-btn');
    if (closeBtn && !closeBtn.dataset.eventBound) {
      closeBtn.addEventListener('power-close', () => this.hide());
      closeBtn.dataset.eventBound = 'true';
    }

    // 头像编辑按钮
    const avatarEditBtn = modalBody.querySelector('#avatar-edit-btn');
    if (avatarEditBtn && !avatarEditBtn.dataset.eventBound) {
      // 使用函数声明而不是箭头函数，方便移除事件监听器
      const handleAvatarClick = async () => {
        // 如果正在打开或者已经打开了模态框，则不处理新的点击
        if (this.isAvatarModalOpening || this.avatarModal) {
          console.log('头像模态框正在打开或已打开，忽略重复点击');
          return;
        }

        try {
          this.isAvatarModalOpening = true;
          await this.handleAvatarEdit();
        } finally {
          // 确保无论如何都会重置标志
          setTimeout(() => {
            this.isAvatarModalOpening = false;
          }, 300);
        }
      };

      avatarEditBtn.addEventListener('click', handleAvatarClick);
      avatarEditBtn.dataset.eventBound = 'true';
    }

    // 用户名编辑/保存按钮
    const usernameEditBtn = modalBody.querySelector('#username-edit-btn');
    if (usernameEditBtn && !usernameEditBtn.dataset.eventBound) {
      usernameEditBtn.addEventListener('click', () => this.handleUsernameEditOrSave());
      usernameEditBtn.dataset.eventBound = 'true';
    }

    // 邮箱编辑/保存按钮
    const emailEditBtn = modalBody.querySelector('#email-edit-btn');
    if (emailEditBtn && !emailEditBtn.dataset.eventBound) {
      emailEditBtn.addEventListener('click', () => this.handleEmailEditOrSave());
      emailEditBtn.dataset.eventBound = 'true';
    }

    // 修改密码按钮
    const changePasswordBtn = modalBody.querySelector('#change-password-btn');
    if (changePasswordBtn && !changePasswordBtn.dataset.eventBound) {
      changePasswordBtn.addEventListener('click', () => this.handleChangePassword());
      changePasswordBtn.dataset.eventBound = 'true';
    }

    // 退出登录按钮
    const logoutBtn = modalBody.querySelector('#logout-btn');
    if (logoutBtn && !logoutBtn.dataset.eventBound) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
      logoutBtn.dataset.eventBound = 'true';
    }
  }

  /**
   * 处理头像编辑
   */
  handleAvatarEdit() {
    this.showAvatarSelectionModal();
  }

  /**
   * 显示头像选择模态框
   */
  async showAvatarSelectionModal() {
    // 重置选择的头像
    this.selectedAvatar = null;

    // 创建头像选择内容容器
    const contentDiv = document.createElement('div');
    contentDiv.className = 'avatar-selection-container';
    contentDiv.style.cssText = `
      padding: 8px;
      display: flex;
      flex-direction: column;
    `;

    // 创建头像网格
    const avatarGrid = document.createElement('div');
    avatarGrid.className = 'avatar-grid';
    avatarGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      max-height: 400px;
      overflow-y: auto;
      padding: 8px;
    `;
    contentDiv.appendChild(avatarGrid);

    // 创建底部按钮栏
    const footerDiv = document.createElement('div');
    footerDiv.className = 'avatar-modal-footer';
    footerDiv.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 8px 8px;
      border-top: 1px solid var(--border-color, #e0e0e0);
      margin-top: 8px;
    `;

    // 创建取消按钮
    const cancelBtn = document.createElement('button');
    cancelBtn.id = 'avatar-cancel-btn';
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText = `
      padding: 8px 24px;
      background: transparent;
      color: var(--text-color, #333);
      border: 1px solid var(--border-color, #e0e0e0);
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    `;

    // 创建保存按钮
    const saveBtn = document.createElement('button');
    saveBtn.id = 'avatar-save-btn';
    saveBtn.textContent = '保存';
    saveBtn.style.cssText = `
      padding: 8px 24px;
      background: var(--primary-color, #1a73e8);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    `;
    saveBtn.disabled = true;
    saveBtn.style.opacity = '0.5';
    saveBtn.style.cursor = 'not-allowed';

    footerDiv.appendChild(cancelBtn);
    footerDiv.appendChild(saveBtn);
    contentDiv.appendChild(footerDiv);

    // 确保每次只创建一个模态框，如果已有则先关闭
    if (this.avatarModal) {
      try {
        this.avatarModal.hide();
        console.log('检测到已存在的头像模态框，已先关闭');
      } catch (e) {
        console.warn('关闭已有模态框时出错:', e);
      }
      this.avatarModal = null;
    }

    // 创建头像选择模态框
    this.avatarModal = new Modal({
      title: '选择头像',
      width: 400,
      height: 'auto',
      content: contentDiv,
      closable: true,
      maskClosable: true,
      showFooter: false,
      className: 'avatar-selection-modal'
    });

    // 显示模态框
    this.avatarModal.show();
    console.log('新头像选择模态框已创建并显示');

    // 添加头像选项
    await this.addAvatarOptions(avatarGrid);

    // 绑定按钮事件
    saveBtn.addEventListener('click', () => this.handleAvatarSave());
    cancelBtn.addEventListener('click', () => {
      if (this.avatarModal) {
        this.avatarModal.hide();
        this.avatarModal = null;
      }
    });

    // 保存按钮引用供后续使用
    this.avatarSaveBtn = saveBtn;
  }

  /**
   * 添加头像选项
   */
  async addAvatarOptions(container) {
    // 从 UserManager 获取头像列表
    const avatarList = this.userManager.getAvatarList();

    // 当前选中的头像
    const currentUser = this.userManager.getCurrentUser();
    const currentAvatar = currentUser?.avatar || '';

    for (const avatar of avatarList) {
      const avatarOption = document.createElement('div');
      avatarOption.className = 'avatar-option';
      avatarOption.dataset.avatarName = avatar.name;

      // 检查是否为当前选中的头像
      const isSelected = currentAvatar === avatar.name;

      avatarOption.style.cssText = `
        width: 70px;
        height: 70px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border-radius: 8px;
        transition: all 0.2s ease;
        background-color: ${isSelected ? '#e3f2fd' : '#f5f5f5'};
        border: 2px solid ${isSelected ? '#2196f3' : 'transparent'};
      `;

      // 创建头像图片
      const img = document.createElement('img');

      // 使用 UserManager 提供的路径
      img.src = avatar.path;

      img.style.width = '50px';
      img.style.height = '50px';
      img.alt = avatar.name;

      // 确保图片加载成功
      img.onload = () => {
        console.log(`头像图片 ${avatar.name} 加载成功`);
      };

      img.onerror = (error) => {
        console.error(`头像图片 ${avatar.name} 加载失败:`, error);
        // 如果加载失败，尝试使用备用方案
        img.src = avatar.path; // 再次尝试原始路径
      };

      avatarOption.appendChild(img);

      // 添加点击事件
      avatarOption.addEventListener('click', () => {
        // 临时保存选择的头像（不添加 avatar- 前缀，直接使用 svg 文件名去除后缀）
        this.selectedAvatar = avatar.name;
        this.selectedAvatarPath = avatar.path;

        // 移除所有头像的选中状态
        const allAvatars = container.querySelectorAll('.avatar-option');
        allAvatars.forEach(opt => {
          opt.style.backgroundColor = '#f5f5f5';
          opt.style.borderColor = 'transparent';
        });

        // 高亮显示当前选择
        avatarOption.style.backgroundColor = '#e3f2fd';
        avatarOption.style.borderColor = '#2196f3';

        // 启用保存按钮
        if (this.avatarSaveBtn) {
          this.avatarSaveBtn.disabled = false;
          this.avatarSaveBtn.style.opacity = '1';
          this.avatarSaveBtn.style.cursor = 'pointer';
        }
      });

      // 添加悬停效果
      avatarOption.addEventListener('mouseenter', () => {
        if (!isSelected) {
          avatarOption.style.backgroundColor = '#eeeeee';
          avatarOption.style.transform = 'scale(1.05)';
        }
      });

      avatarOption.addEventListener('mouseleave', () => {
        if (!isSelected) {
          avatarOption.style.backgroundColor = '#f5f5f5';
          avatarOption.style.transform = 'scale(1)';
        }
      });

      container.appendChild(avatarOption);
    }
  }

  /**
   * 处理头像保存
   */
  async handleAvatarSave() {
    if (!this.selectedAvatar) {
      this.showMessage('请选择一个头像');
      return;
    }

    try {
      // 显示加载状态
      if (this.avatarSaveBtn) {
        this.avatarSaveBtn.disabled = true;
        this.avatarSaveBtn.textContent = '保存中...';
      }

      // 调用API更新头像（直接使用 svg 文件名，不添加前缀）
      await this.updateUserInfoOnServer({ avatar: this.selectedAvatar });

      // 更新主窗口头像显示
      if (this.selectedAvatarPath) {
        const profileAvatar = this.modal.getBody().querySelector('#profile-avatar');
        if (profileAvatar) {
          profileAvatar.innerHTML = '';
          const img = document.createElement('img');
          img.src = this.selectedAvatarPath;
          img.style.width = '60px';
          img.style.height = '60px';
          img.alt = this.selectedAvatar;
          profileAvatar.appendChild(img);
        }

        // 更新侧边栏头像
        this.updateSidebarAvatar(this.selectedAvatar);
      }

      // 关闭头像选择模态框
      if (this.avatarModal) {
        this.avatarModal.hide();
        this.avatarModal = null;
      }

      // 重置选择
      this.selectedAvatar = null;
      this.selectedAvatarPath = null;

      this.showMessage('头像更换成功');

    } catch (error) {
      console.error('保存头像失败:', error);
      this.showMessage(error.message || '保存头像失败');

      // 恢复按钮状态
      if (this.avatarSaveBtn) {
        this.avatarSaveBtn.disabled = false;
        this.avatarSaveBtn.textContent = '保存';
      }
    }
  }

  /**
   * 预览头像（不调用API）
   */
  previewAvatar(avatarName) {
    const profileAvatar = this.modal.getBody().querySelector('#profile-avatar');
    if (profileAvatar) {
      // 清空现有内容
      profileAvatar.innerHTML = '';

      // 创建新的头像图片
      const img = document.createElement('img');
      // 使用 UserManager 获取头像路径
      const avatarPath = this.userManager.getAvatarPath(avatarName);
      img.src = avatarPath;
      img.style.width = '60px';
      img.style.height = '60px';
      img.alt = avatarName;

      img.onload = () => {
        console.log(`头像预览更新为 ${avatarName}`);
      };

      img.onerror = (error) => {
        console.error(`预览头像图片失败:`, error);
        img.src = avatarPath;
      };

      profileAvatar.appendChild(img);
    }
  }

  /**
   * 更新侧边栏中的头像显示
   */
  updateSidebarAvatar(avatarName) {
    try {
      // 使用 UserManager 获取头像路径
      const imagePath = this.userManager.getAvatarPath(avatarName);

      // 获取侧边栏中的头像元素
      const sidebarAvatar = document.querySelector('#user-avatar');

      if (sidebarAvatar) {
        // 清空现有内容
        sidebarAvatar.innerHTML = '';

        // 创建新的头像图片
        const img = document.createElement('img');
        img.src = imagePath;
        img.alt = avatarName;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.borderRadius = '50%';

        sidebarAvatar.appendChild(img);
        console.log('侧边栏头像已更新:', avatarName);
      }

      // 也可以通过事件总线通知其他组件更新头像
      if (window.eventBus) {
        window.eventBus.emit('user:avatar-updated', {
          avatarName: avatarName,
          avatarPath: imagePath
        });
      }
    } catch (error) {
      console.error('更新侧边栏头像失败:', error);
    }
  }

  /**
   * 更新用户信息到服务器
   * @param {Object} userData - 用户数据对象
   * @returns {Promise} - 表示更新操作的Promise
   */
  async updateUserInfoOnServer(userData) {
    console.log('📤 调用更新用户信息API:', userData);

    try {
      const currentUser = this.userManager.getCurrentUser();
      console.log('🔍 当前用户信息:', {
        hasUser: !!currentUser,
        hasAccessToken: !!currentUser?.access_token,
        hasUserIdentifier: !!currentUser?.user_identifier,
        userIdentifier: currentUser?.user_identifier
      });

      if (!currentUser || !currentUser.access_token || !currentUser.user_identifier) {
        throw new Error('用户未登录或缺少认证信息');
      }

      // 调用 API 更新用户信息
      const response = await userApiService.updateUserInfo(
        currentUser.access_token,
        currentUser.user_identifier,
        userData
      );

      console.log('✅ 服务器返回:', response);
      if (!response.success) {
        throw new Error(response.message || '更新用户信息失败');
      }
      // 如果服务器返回了新的token，使用UserManager的updateTokens方法更新
      if (response.data.access_token && response.data.refresh_token) {
        console.log('🔑 收到新的token，使用UserManager更新');
        // 使用UserManager的updateTokens方法更新token
        await this.userManager.updateTokens({
          access_token: response.data.access_token,
          refresh_token: response.data.refresh_token,
          expires_in: response.data.expires_in
        });
      }

      await this.userManager.updateUserInfo(response.data);

      return response;
    } catch (error) {
      console.error('❌ 更新用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 处理用户名编辑或保存
   */
  async handleUsernameEditOrSave() {
    const modalBody = this.modal.getBody();
    const usernameInput = modalBody.querySelector('#profile-username');
    const editBtn = modalBody.querySelector('#username-edit-btn');

    // 如果是编辑模式，启用输入框并开始监听
    if (editBtn.dataset.mode === 'edit') {
      // 启用输入框
      usernameInput.disabled = false;
      usernameInput.focus();
      usernameInput.select();

      // 添加输入监听（如果还没添加）
      if (!usernameInput.dataset.hasListener) {
        usernameInput.addEventListener('input', () => {
          const currentValue = usernameInput.value.trim();
          const originalValue = usernameInput.dataset.originalValue;
          const hasChanged = currentValue !== originalValue;

          const svg = editBtn.querySelector('svg');
          if (hasChanged) {
            // 内容有变化，显示保存图标
            editBtn.dataset.mode = 'save';
            editBtn.title = '保存用户名';
            if (svg) {
              svg.innerHTML = `<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline>`;
            }
          } else {
            // 内容未变化，保持编辑图标
            editBtn.dataset.mode = 'edit';
            editBtn.title = '编辑用户名';
            if (svg) {
              svg.innerHTML = `<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>`;
            }
          }
        });
        usernameInput.dataset.hasListener = 'true';
      }
    }
    // 如果是保存模式，调用API保存
    else if (editBtn.dataset.mode === 'save') {
      const newUsername = usernameInput.value.trim();
      const originalValue = usernameInput.dataset.originalValue;

      // 验证
      if (!newUsername) {
        this.showMessage('用户名不能为空');
        return;
      }
      if (newUsername.length > 20) {
        this.showMessage('用户名长度不能超过20个字符');
        return;
      }

      if (newUsername === originalValue) {
        this.showMessage('用户名没有变化');
        return;
      }

      try {
        // 显示加载状态
        editBtn.disabled = true;

        // 调用API
        await this.updateUserInfoOnServer({ username: newUsername });

        // 更新原始值
        usernameInput.dataset.originalValue = newUsername;

        // 禁用输入框
        usernameInput.disabled = true;

        // 恢复按钮状态
        editBtn.disabled = false;
        editBtn.dataset.mode = 'edit';
        const svg = editBtn.querySelector('svg');
        if (svg) {
          svg.innerHTML = `<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>`;
        }
        editBtn.title = '编辑用户名';

        this.showMessage('用户名更新成功');

        // 更新界面显示
        this.updateProfileContent();

      } catch (error) {
        console.error('更新用户名失败:', error);
        this.showMessage(error.message || '更新用户名失败');
        editBtn.disabled = false;
      }
    }
  }

  /**
   * 处理邮箱编辑或保存
   */
  async handleEmailEditOrSave() {
    const modalBody = this.modal.getBody();
    const emailInput = modalBody.querySelector('#profile-email');
    const editBtn = modalBody.querySelector('#email-edit-btn');

    // 如果是编辑模式，启用输入框并开始监听
    if (editBtn.dataset.mode === 'edit') {
      // 启用输入框
      emailInput.disabled = false;
      emailInput.focus();
      emailInput.select();

      // 添加输入监听（如果还没添加）
      if (!emailInput.dataset.hasListener) {
        emailInput.addEventListener('input', () => {
          const currentValue = emailInput.value.trim();
          const originalValue = emailInput.dataset.originalValue;
          const hasChanged = currentValue !== originalValue;

          const svg = editBtn.querySelector('svg');
          if (hasChanged) {
            // 内容有变化，显示保存图标
            editBtn.dataset.mode = 'save';
            editBtn.title = '保存邮箱';
            if (svg) {
              svg.innerHTML = `<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline>`;
            }
          } else {
            // 内容未变化，保持编辑图标
            editBtn.dataset.mode = 'edit';
            editBtn.title = '编辑邮箱';
            if (svg) {
              svg.innerHTML = `<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>`;
            }
          }
        });
        emailInput.dataset.hasListener = 'true';
      }
    }
    // 如果是保存模式，调用API保存
    else if (editBtn.dataset.mode === 'save') {
      const newEmail = emailInput.value.trim();
      const originalValue = emailInput.dataset.originalValue;

      // 验证邮箱格式
      if (newEmail && !this.validateEmail(newEmail)) {
        this.showMessage('请输入正确的邮箱格式');
        return;
      }

      if (newEmail === originalValue) {
        this.showMessage('邮箱没有变化');
        return;
      }

      try {
        // 显示加载状态
        editBtn.disabled = true;

        // 调用API
        await this.updateUserInfoOnServer({ email: newEmail });

        // 更新原始值
        emailInput.dataset.originalValue = newEmail;

        // 禁用输入框
        emailInput.disabled = true;

        // 恢复按钮状态
        editBtn.disabled = false;
        editBtn.dataset.mode = 'edit';
        const svg = editBtn.querySelector('svg');
        if (svg) {
          svg.innerHTML = `<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>`;
        }
        editBtn.title = '编辑邮箱';

        this.showMessage('邮箱更新成功');

        // 更新界面显示
        this.updateProfileContent();

      } catch (error) {
        console.error('更新邮箱失败:', error);
        this.showMessage(error.message || '更新邮箱失败');
        editBtn.disabled = false;
      }
    }
  }

  /**
   * 验证邮箱格式
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 格式化用户ID显示（补零至3位）
   */
  formatUserId(userId) {
    if (!userId) return 'N/A';
    return String(userId).padStart(3, '0');
  }

  /**
   * 处理修改密码
   */
  handleChangePassword() {
    // TODO: 实现修改密码功能
    this.showMessage('修改密码功能即将上线');
  }

  /**
   * 处理退出登录
   */
  async handleLogout() {
    const modalBody = this.modal.getBody();
    const logoutBtn = modalBody.querySelector('#logout-btn');
    const btnText = logoutBtn.querySelector('.btn-text');

    try {
      // 显示加载状态
      logoutBtn.disabled = true;
      btnText.textContent = '退出中...';

      // 执行退出登录
      await this.userManager.logout();

      // 关闭模态框
      this.hide();

      // 触发退出登录回调
      if (this.onLogout) {
        this.onLogout();
      }

      NotificationCenter.success('已成功退出登录');
    } catch (error) {
      console.error('退出登录失败:', error);
      NotificationCenter.error('退出登录失败，请重试');

      // 恢复按钮状态
      logoutBtn.disabled = false;
      btnText.textContent = '退出登录';
    }
  }

  /**
   * 显示消息
   */
  showMessage(message) {
    // 使用通知管理器显示消息
    if (window.notificationCenter) {
      window.notificationCenter.info(message);
    }
  }

  /**
   * 更新用户信息显示
   */
  updateUserInfo() {
    this.updateProfileContent();
  }

  /**
   * 销毁组件
   */
  destroy() {
    if (this.modal) {
      this.modal.destroy();
    }
  }
}