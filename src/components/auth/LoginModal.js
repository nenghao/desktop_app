/**
 * 登录模态框组件
 * 处理用户登录流程：手机号验证码登录
 */

import { Modal } from '../common/Modal.js';
import { UserApiService } from '../../services/api/UserApiService.js';
import { UserManager } from '../../services/UserManager.js';
import { NotificationCenter } from '../common/NotificationCenter.js';
// 导入 Lit 组件
import '../lit/index.js';

export class LoginModal {
  constructor(options = {}) {
    this.userManager = options.userManager || new UserManager();
    this.userApiService = new UserApiService();
    this.notificationCenter = options.notificationCenter || new NotificationCenter();

    // 回调函数
    this.onLoginSuccess = options.onLoginSuccess || null;
    this.onTrialMode = options.onTrialMode || null;
    this.onClose = options.onClose || null;

    // 倒计时状态
    this.countdownTimer = null;
    this.countdownSeconds = 0;

    // 事件绑定状态
    this.eventsbound = false;
    this.sms_template = null;
    // Apple SDK 事件绑定状态
    this._appleEventsInitialized = false;

    // 创建统一模态框实例
    this.modal = new Modal({
      title: '', // 移除标题，将在右侧区域显示
      width: 'auto',
      height: 'auto',
      className: 'login-modal',
      content: this.createLoginContent(),
      closable: true,
      maskClosable: true,
      showFooter: false,
      onClose: () => {
        this.clearCountdown();
        if (this.onClose) this.onClose();
      }
    });
  }

  /**
   * 显示登录模态框
   */
  show() {
    console.log("🔧 LoginModal.show() 开始执行");
    console.log("📱 调用 this.modal.show()");
    this.modal.show();
    console.log("🔗 绑定事件");
    // 确保在模态框显示后绑定事件，但只绑定一次
    if (!this.eventsbound) {
      this.bindEvents();
      this.eventsbound = true;
    }

    // 初始化 Apple SDK
    if (!window.electronAPI) {
      this.initAppleSDK();
    }

    console.log("✅ LoginModal.show() 执行完成");
  }

  /**
   * 隐藏登录模态框
   */
  hide() {
    this.clearCountdown();
    this.clearFormInputs();
    this.modal.hide();
  }

  /**
   * 创建登录内容
   */
  createLoginContent() {
    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = `
      <!-- 使用 Lit Elements 关闭按钮 -->
      <power-close-button 
        variant="modal" 
        size="medium" 
        aria-label="关闭登录窗口"
        id="login-close-btn">
      </power-close-button>
      
      <div class="login-container">
        <!-- 左侧插图区域 -->
        <div class="login-illustration">
          <div class="illustration-content">
            <div class="character-3d">
              <div class="character-body"></div>
              <div class="character-accessories">
                <div class="hat"></div>
                <div class="glasses"></div>
                <div class="phone"></div>
                <div class="pet"></div>
              </div>
              <div class="floating-elements">
                <div class="cloud cloud-1"></div>
                <div class="cloud cloud-2"></div>
                <div class="star star-1"></div>
                <div class="star star-2"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧登录表单区域 -->
        <div class="login-form-area">
          <!-- 登录标题 -->
          <div class="login-header">
            <h2>登录</h2>
          </div>
          
          <!-- 登录方式切换 -->
          <div class="login-tabs">
            <button class="tab-btn active" data-tab="sms" id="sms-tab">验证码登录</button>
            <button class="tab-btn" data-tab="password" id="password-tab">密码登录</button>
          </div>

          <!-- 统一登录表单 -->
          <form class="login-form" id="login-form">
            <div class="form-group">
              <input
                type="tel"
                id="phone"
                name="phone"
                placeholder="手机号"
                maxlength="11"
                required
              >
            </div>

            <!-- 验证码输入（验证码登录时显示） -->
            <div class="form-group" id="code-group">
              <div class="code-input-group">
                <input
                  type="text"
                  id="code"
                  name="code"
                  placeholder="验证码"
                  maxlength="6"
                >
                <button
                  type="button"
                  class="get-code-btn"
                  id="get-code-btn"
                >
                  获取验证码
                </button>
              </div>
            </div>

            <!-- 密码输入（密码登录时显示） -->
            <div class="form-group" id="password-group" style="display: none;">
              <div class="code-input-group">
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="密码"
                >
                <button
                  type="button"
                  class="get-code-btn"
                  id="forgot-password-btn"
                >
                  忘记密码
                </button>
              </div>
            </div>

            <div class="form-actions">
              <button type="submit" class="login-btn primary" id="login-btn">
                  <span class="btn-text">登录</span>
                  <div class="btn-loading-overlay">
                    <div class="btn-loading-content">
                      <div class="loading-spinner-small"></div>
                      <span class="btn-loading-text">登录中...</span>
                    </div>
                  </div>
                </button>

              <!-- Apple 登录按钮 -->
              <button type="button" class="login-btn apple" id="apple-login-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 6px;">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                <span>使用 Apple 账号登录</span>
              </button>

              <button type="button" class="login-btn secondary" id="trial-btn">
                试用
              </button>
            </div>
          </form>

          <div class="login-footer">
            <p>「登录」代表同意《<a href="#" class="link footer-doc-link" data-action="user-agreement" data-url="https://www.baizesz.com/user/agreement">用户协议</a>》《<a href="#" class="link footer-doc-link" data-action="privacy-policy" data-url="https://www.baizesz.com/user/private">隐私政策</a>》</p>
            <p class="auto-register">未注册的手机号将自动注册</p>
          </div>
        </div>
      </div>
    `;
    return contentDiv;
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    const modalBody = this.modal.getBody();
    if (!modalBody) {
      console.warn('LoginModal: 无法找到 modal-body 元素', {
        hasContainer: !!this.modal.getContainer(),
        containerHTML: this.modal.getContainer()?.innerHTML?.substring(0, 200)
      });
      return;
    }

    // 标签页切换
    const tabBtns = modalBody.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // 获取验证码按钮
    const getCodeBtn = modalBody.querySelector('#get-code-btn');
    if (getCodeBtn) {
      getCodeBtn.addEventListener('click', () => this.handleGetCode());
    }

    // 忘记密码按钮
    const forgotPasswordBtn = modalBody.querySelector('#forgot-password-btn');
    if (forgotPasswordBtn) {
      forgotPasswordBtn.addEventListener('click', () => this.handleForgotPassword());
    }

    // 统一登录表单提交
    const loginForm = modalBody.querySelector('#login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Apple 登录按钮
    const appleLoginBtn = modalBody.querySelector('#apple-login-btn');
    if (appleLoginBtn) {
      appleLoginBtn.addEventListener('click', () => this.handleAppleLogin());
    }

    // 试用按钮
    const trialBtn = modalBody.querySelector('#trial-btn');
    if (trialBtn) {
      trialBtn.addEventListener('click', () => this.handleTrial());
    }

    // Lit 组件关闭按钮事件
    const closeBtn = modalBody.querySelector('#login-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('power-close', () => this.hide());
    }

    // 手机号输入限制
    const phoneInput = modalBody.querySelector('#phone');
    if (phoneInput) {
      phoneInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
      });
    }

    // 验证码输入限制
    const codeInput = modalBody.querySelector('#code');
    if (codeInput) {
      codeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
      });
    }

    // 底部文档链接（用户协议、隐私政策）
    const footerDocLinks = modalBody.querySelectorAll('.footer-doc-link');
    footerDocLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleDocLinkClick(link);
      });
    });
  }

  /**
   * 处理获取验证码
   */
  async handleGetCode() {
    const modalBody = this.modal.getBody();
    const phoneInput = modalBody.querySelector('#phone');
    const getCodeBtn = modalBody.querySelector('#get-code-btn');
    const phone = phoneInput.value.trim();

    // 验证手机号
    if (!this.validatePhone(phone)) {
      this.showError('请输入正确的手机号');
      phoneInput.focus();
      return;
    }

    try {
      // 禁用按钮
      getCodeBtn.disabled = true;
      getCodeBtn.textContent = '发送中...';

      // 发送验证码请求
      const response = await this.userApiService.getVerificationCode(phone);

      if (response && response.success) {
        this.startCountdown();
        // 显示服务器返回的成功消息
        this.sms_template = response.data.template;
        if (response.message) {
          this.notificationCenter.success(response.message, { duration: 12000 });
        }
      } else {
        throw new Error(response?.message || '验证码发送失败');
      }
    } catch (error) {
      console.error('获取验证码失败:', error);
      this.showError(error.message || '验证码发送失败，请重试');

      // 恢复按钮状态
      getCodeBtn.disabled = false;
      getCodeBtn.textContent = '获取验证码';
    }
  }

  /**
   * 切换标签页
   */
  switchTab(tabName) {
    const modalBody = this.modal.getBody();

    // 更新标签按钮状态
    const tabBtns = modalBody.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // 切换输入字段显示
    const codeGroup = modalBody.querySelector('#code-group');
    const passwordGroup = modalBody.querySelector('#password-group');

    if (tabName === 'sms') {
      codeGroup.style.display = '';
      passwordGroup.style.display = 'none';
      // 清空密码字段
      const passwordInput = modalBody.querySelector('#password');
      if (passwordInput) passwordInput.value = '';
    } else {
      codeGroup.style.display = 'none';
      passwordGroup.style.display = '';
      // 清空验证码字段
      const codeInput = modalBody.querySelector('#code');
      if (codeInput) codeInput.value = '';
    }
  }

  /**
   * 处理统一登录
   */
  async handleLogin(e) {
    e.preventDefault();

    const modalBody = this.modal.getBody();
    const phoneInput = modalBody.querySelector('#phone');
    const loginBtn = modalBody.querySelector('#login-btn');
    const phone = phoneInput.value.trim();

    // 判断当前是哪种登录方式
    const activeTab = modalBody.querySelector('.tab-btn.active');
    const loginType = activeTab ? activeTab.dataset.tab : 'sms';

    // 验证手机号
    if (!this.validatePhone(phone)) {
      this.showError('请输入正确的手机号');
      phoneInput.focus();
      return;
    }

    // 根据登录类型验证对应的输入字段
    if (loginType === 'sms') {
      const codeInput = modalBody.querySelector('#code');
      const code = codeInput.value.trim();

      if (!code) {
        this.showError('请输入验证码');
        codeInput.focus();
        return;
      }

      if (code.length < 4) {
        this.showError('请输入正确的验证码');
        codeInput.focus();
        return;
      }
    } else {
      const passwordInput = modalBody.querySelect
      or('#password');
      const password = passwordInput.value.trim();

      if (!password) {
        this.showError('请输入密码');
        passwordInput.focus();
        return;
      }
    }

    // 验证通过，执行登录
    if (loginType === 'sms') {
      await this.handleSmsLogin(phone, loginBtn);
    } else {
      await this.handlePasswordLogin(phone, loginBtn);
    }
  }

  /**
   * 处理验证码登录
   */
  async handleSmsLogin(phone, loginBtn) {
    const modalBody = this.modal.getBody();
    const codeInput = modalBody.querySelector('#code');
    const code = codeInput.value.trim();

    try {
      // 显示加载状态
      const loadingOverlay = loginBtn.querySelector('.btn-loading-overlay');
      const btnText = loginBtn.querySelector('.btn-text');
      loginBtn.disabled = true;
      loadingOverlay.style.display = 'flex';
      btnText.style.display = 'none';

      // 禁用整个模态框内容（除了关闭按钮）
      this.setModalDisabled(true);

      // 使用UserManager进行登录
      const result = await this.userManager.login(phone, code, this.sms_template ?? '');

      if (result && result.success) {
        // 直接关闭模态框
        this.hide();
        if (this.onLoginSuccess) {
          this.onLoginSuccess(result.user);
        }
      } else {
        throw new Error('登录失败');
      }
    } catch (error) {
      console.error('登录失败:', error);
      this.showError(error.message || '登录失败，请重试');

      // 恢复按钮状态
      const loadingOverlay = loginBtn.querySelector('.btn-loading-overlay');
      const btnText = loginBtn.querySelector('.btn-text');
      loginBtn.disabled = false;
      loadingOverlay.style.display = 'none';
      btnText.style.display = 'inline';

      // 恢复模态框交互
      this.setModalDisabled(false);
    }
  }

  /**
   * 处理密码登录
   */
  async handlePasswordLogin(phone, loginBtn) {
    const modalBody = this.modal.getBody();
    const passwordInput = modalBody.querySelector('#password');
    const password = passwordInput.value.trim();

    try {
      // 显示加载状态
      const loadingOverlay = loginBtn.querySelector('.btn-loading-overlay');
      const btnText = loginBtn.querySelector('.btn-text');
      loginBtn.disabled = true;
      loadingOverlay.style.display = 'flex';
      btnText.style.display = 'none';

      // 禁用整个模态框内容（除了关闭按钮）
      this.setModalDisabled(true);

      // TODO: 实现密码登录逻辑
      // const result = await this.userManager.loginWithPassword(phone, password);
      console.log('密码登录:', phone, password);

      // 暂时模拟登录成功
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.showError('密码登录功能暂未开放，请使用验证码登录');

      // 恢复按钮状态
      loginBtn.disabled = false;
      loadingOverlay.style.display = 'none';
      btnText.style.display = 'inline';

      // 恢复模态框交互
      this.setModalDisabled(false);
    } catch (error) {
      console.error('密码登录失败:', error);
      this.showError(error.message || '登录失败，请重试');

      // 恢复按钮状态
      const loadingOverlay = loginBtn.querySelector('.btn-loading-overlay');
      const btnText = loginBtn.querySelector('.btn-text');
      loginBtn.disabled = false;
      loadingOverlay.style.display = 'none';
      btnText.style.display = 'inline';

      // 恢复模态框交互
      this.setModalDisabled(false);
    }
  }

  /**
   * 处理试用
   */
  handleTrial() {
    // 关闭模态框，不进行登录
    this.hide();
    // 可以触发试用模式的回调
    if (this.onTrialMode) {
      this.onTrialMode();
    }
  }

  /**
   * 处理忘记密码
   */
  handleForgotPassword() {
    // TODO: 实现忘记密码功能
    this.showError('忘记密码功能暂未开放，请使用验证码登录');
  }

  /**
   * 处理文档链接点击（用户协议、隐私政策）
   * @param {HTMLElement} linkElement - 点击的链接元素
   */
  handleDocLinkClick(linkElement) {
    const action = linkElement.dataset.action;
    const url = linkElement.dataset.url;

    // 定义窗口标题
    const titles = {
      'user-agreement': '用户协议',
      'privacy-policy': '隐私政策'
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
          console.log('✅ LoginModal: 文档窗口创建成功', windowId);
        }).catch((error) => {
          console.error('❌ LoginModal: 文档窗口创建失败', error);
          // 降级到浏览器打开
          window.open(url, '_blank', 'noopener,noreferrer');
        });
      } else {
        console.log('🌐 LoginModal: Electron API 不可用，使用浏览器打开');
        // Web环境下在新标签页打开
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }
  }

  /**
   * 处理 Apple 登录按钮点击
   */
  handleAppleLogin() {
    if (window.electronAPI) {
      // Electron 环境：标记来源并打开系统浏览器
      this.handleElectronAppleLogin();
    } else {
      // Web 环境：使用 Apple SDK
      this.handleWebAppleLogin();
    }
  }

  /**
   * 处理 Electron 环境的 Apple 登录
   */
  async handleElectronAppleLogin() {
    try {
      // 标记登录来源为 Electron
      sessionStorage.setItem('apple_login_source', 'electron');

      // 生成 state 用于防 CSRF
      const state = this.generateRandomState();
      sessionStorage.setItem('apple_login_state', state);

      // 构造 Apple 登录 URL
      const clientId = 'com.baizesz.signin.web';
      const redirectUri = 'https://baizesz.com/auth/apple/callback';
      const scope = 'name email';

      const appleAuthUrl = new URL('https://appleid.apple.com/auth/authorize');
      appleAuthUrl.searchParams.append('client_id', clientId);
      appleAuthUrl.searchParams.append('redirect_uri', redirectUri);
      appleAuthUrl.searchParams.append('response_type', 'code id_token');
      appleAuthUrl.searchParams.append('response_mode', 'form_post');
      appleAuthUrl.searchParams.append('scope', scope);
      appleAuthUrl.searchParams.append('state', state);
      appleAuthUrl.searchParams.append('source', 'electron'); // 添加来源标识

      console.log('🍎 Electron 发起 Apple 登录:', appleAuthUrl.toString());

      // 调用 Electron API 打开系统浏览器
      if (window.electronAPI && window.electronAPI.openExternal) {
        await window.electronAPI.openExternal(appleAuthUrl.toString());
      } else {
        // 降级方案：直接在 Electron webview 中打开
        window.open(appleAuthUrl.toString(), '_blank');
      }

      // 显示提示
      this.showSuccess('已在浏览器中打开 Apple 登录页面');

    } catch (error) {
      console.error('❌ Electron Apple 登录失败:', error);
      this.showError('打开 Apple 登录页面失败，请重试');
    }
  }

  /**
   * 处理 Web 环境的 Apple 登录
   */
  handleWebAppleLogin() {
    if (!window.AppleID) {
      this.showError('Apple 登录服务未加载，请刷新页面重试');
      return;
    }

    try {
      // 标记登录来源为 Web
      sessionStorage.setItem('apple_login_source', 'web');

      // 调用 Apple 登录
      window.AppleID.auth.signIn();
    } catch (error) {
      console.error('❌ 调用 Apple 登录失败:', error);
      this.showError('Apple 登录失败，请重试');
    }
  }

  /**
   * 初始化 Apple SDK
   */
  initAppleSDK() {
    if (!window.AppleID) {
      console.warn('⚠️ Apple SDK 未加载');
      return;
    }

    // 只在第一次初始化时绑定事件，避免重复绑定
    if (!this._appleEventsInitialized) {
      try {
        // Apple Sign In 要求使用 HTTPS 和真实域名，不支持 localhost
        // 在开发环境强制使用生产域名
        const isLocalhost = window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1';
        const redirectURI = isLocalhost
          ? 'https://baizesz.com/auth/apple/callback'
          : window.location.origin + '/auth/apple/callback';

        // 更新 meta 标签
        const redirectMeta = document.querySelector('meta[name="appleid-signin-redirect-uri"]');
        const stateMeta = document.querySelector('meta[name="appleid-signin-state"]');

        if (redirectMeta) {
          redirectMeta.setAttribute('content', redirectURI);
        }
        if (stateMeta) {
          stateMeta.setAttribute('content', this.generateRandomState());
        }

        console.log('✅ 更新 Apple meta 标签:', { redirectURI, isLocalhost });

        // 初始化 SDK
        window.AppleID.auth.init({
          clientId: 'com.baizesz.signin.web',
          scope: 'name email',
          redirectURI: redirectURI,
          state: this.generateRandomState(),
          usePopup: true,
        });

        console.log('✅ Apple SDK 初始化成功');

        // 监听 Apple 登录成功事件
        document.addEventListener('AppleIDSignInOnSuccess', (event) => {
          this.handleAppleSignInSuccess(event);
        });

        // 监听 Apple 登录失败事件
        document.addEventListener('AppleIDSignInOnFailure', (event) => {
          this.handleAppleSignInFailure(event);
        });

        this._appleEventsInitialized = true;
        console.log('✅ Apple 事件监听器已绑定');

      } catch (error) {
        console.error('❌ Apple SDK 初始化失败:', error);
      }
    }
  }

  /**
   * 处理 Apple 登录成功
   */
  async handleAppleSignInSuccess(event) {
    const { authorization, user } = event.detail;

    try {
      // 显示加载状态
      this.showSuccess('Apple 授权成功，正在登录...');

      // 调用后端 API
      const response = await this.userApiService.loginWithApple({
        type: 2,
        id_token: authorization.id_token,
        platform: 'web',
        email: user?.email,
        full_name: user ? `${user.name.firstName} ${user.name.lastName}` : null,
        version: '1.0.0'
      });

      if (response && response.success) {
        // 登录成功，保存用户信息
        this.userManager.setUser(response.data);

        // 关闭模态框
        this.hide();

        // 触发登录成功回调
        if (this.onLoginSuccess) {
          this.onLoginSuccess(response.data);
        }
      } else {
        throw new Error(response?.message || 'Apple 登录失败');
      }
    } catch (error) {
      console.error('Apple 登录处理失败:', error);
      this.showError(error.message || 'Apple 登录失败，请重试');
    }
  }

  /**
   * 处理 Apple 登录失败
   */
  handleAppleSignInFailure(event) {
    console.error('Apple 登录失败:', event.detail.error);

    // 用户取消登录不显示错误
    if (event.detail.error === 'popup_closed_by_user') {
      return;
    }

    this.showError('Apple 登录失败：' + event.detail.error);
  }

  /**
   * 生成随机状态字符串
   */
  generateRandomState() {
    return Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
  }

  /**
   * 验证手机号格式
   */
  validatePhone(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * 开始倒计时
   */
  startCountdown() {
    const modalBody = this.modal.getBody();
    const getCodeBtn = modalBody.querySelector('#get-code-btn');
    this.countdownSeconds = 60;

    this.countdownTimer = setInterval(() => {
      this.countdownSeconds--;
      if (getCodeBtn) {
        getCodeBtn.textContent = `${this.countdownSeconds}s后重试`;
      }

      if (this.countdownSeconds <= 0) {
        this.clearCountdown();
      }
    }, 1000);
  }

  /**
   * 清除倒计时
   */
  clearCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }

    // 检查modal是否存在，避免null错误
    if (this.modal && this.modal.getContainer()) {
      const modalBody = this.modal.getBody();
      if (modalBody) {
        const getCodeBtn = modalBody.querySelector('#get-code-btn');
        if (getCodeBtn) {
          getCodeBtn.disabled = false;
          getCodeBtn.textContent = '获取验证码';
        }
      }
    }
  }

  /**
   * 显示错误消息
   */
  showError(message) {
    this.notificationCenter.error(message);
  }

  /**
   * 显示成功消息
   */
  showSuccess(message) {
    this.notificationCenter.success(message);
  }

  /**
   * 设置模态框禁用状态（登录过程中禁用所有交互，除了关闭按钮）
   */
  setModalDisabled(disabled) {
    const modalBody = this.modal.getBody();
    if (!modalBody) return;

    const loginContainer = modalBody.querySelector('.login-container');
    if (!loginContainer) return;

    if (disabled) {
      // 创建遮罩层
      let overlay = modalBody.querySelector('.login-overlay-disabled');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'login-overlay-disabled';
        overlay.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.05);
          z-index: 999;
          pointer-events: none;
        `;
        loginContainer.style.position = 'relative';
        loginContainer.appendChild(overlay);
      }
    } else {
      // 移除遮罩层
      const overlay = modalBody.querySelector('.login-overlay-disabled');
      if (overlay) {
        overlay.remove();
      }
    }
  }

  /**
   * 清空表单输入和重置所有状态
   */
  clearFormInputs() {
    const modalBody = this.modal.getBody();
    if (!modalBody) return;

    // 清空手机号
    const phoneInput = modalBody.querySelector('#phone');
    if (phoneInput) phoneInput.value = '';

    // 清空验证码
    const codeInput = modalBody.querySelector('#code');
    if (codeInput) codeInput.value = '';

    // 清空密码
    const passwordInput = modalBody.querySelector('#password');
    if (passwordInput) passwordInput.value = '';

    // 重置登录按钮状态
    const loginBtn = modalBody.querySelector('#login-btn');
    if (loginBtn) {
      const loadingOverlay = loginBtn.querySelector('.btn-loading-overlay');
      const btnText = loginBtn.querySelector('.btn-text');
      loginBtn.disabled = false;
      if (loadingOverlay) loadingOverlay.style.display = 'none';
      if (btnText) btnText.style.display = 'inline';
    }

    // 重置获取验证码按钮状态
    const getCodeBtn = modalBody.querySelector('#get-code-btn');
    if (getCodeBtn) {
      getCodeBtn.disabled = false;
      getCodeBtn.textContent = '获取验证码';
    }

    // 移除模态框禁用遮罩层
    this.setModalDisabled(false);

    // 重置到验证码登录标签页
    this.switchTab('sms');
  }

  /**
   * 销毁组件
   */
  destroy() {
    this.clearCountdown();
    this.eventsbound = false;
    if (this.modal) {
      this.modal.destroy();
    }
  }
}
