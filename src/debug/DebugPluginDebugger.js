/**
 * DebugPluginDebugger - 插件调试器
 *
 * 用于在独立窗口中调试智能体 UI 插件
 * 注意：此文件仅用于调试功能，不影响正常生产环境
 */

import { DebugPluginLoader } from './DebugPluginLoader.js';
import { debugAgentRenderer } from './DebugAgentRenderer.js';

export class DebugPluginDebugger {
  constructor() {
    this.container = null;
    this.currentPlugin = null;
    this.pluginPath = null;
    this.loader = new DebugPluginLoader();
    this.toolbarElement = null;
    this.statusBarElement = null;
  }

  /**
   * 渲染调试页面
   * @param {string} pluginPath - 插件目录路径（可选）
   */
  async render(pluginPath = null) {
    try {
      console.log(`🐛 [PluginDebugger] 初始化调试器`);

      // 1. 创建页面布局
      this.createLayout();

      // 2. 加载插件（使用智能加载，支持回退）
      await this.loadPlugin(pluginPath);

      // 3. 渲染插件
      await this.renderPlugin();

    } catch (error) {
      console.error(`❌ [PluginDebugger] 初始化失败:`, error);
      this.notificationCenter.error(error.message);
    }
  }

  /**
   * 创建页面布局
   */
  createLayout() {
    const appContainer = document.getElementById('app');
    if (!appContainer) {
      throw new Error('找不到 #app 容器');
    }

    appContainer.innerHTML = `
      <div class="plugin-debugger">
        <!-- 顶部工具栏 -->
        <div class="debugger-toolbar">
          <div class="toolbar-left">
            <span class="toolbar-icon">🐛</span>
            <span class="toolbar-title">插件调试器</span>
            <span class="toolbar-path" id="plugin-path"></span>
          </div>
          <div class="toolbar-right">
            <button class="toolbar-btn" id="reload-btn" title="重新加载插件 (F5)">
              🔄 重新加载
            </button>
            <button class="toolbar-btn" id="select-plugin-btn" title="选择其他插件">
              📂 选择插件
            </button>
            <button class="toolbar-btn" id="theme-toggle-btn" title="切换深浅模式">
              🌓 主题
            </button>
            <button class="toolbar-btn" id="devtools-btn" title="打开开发者工具 (Ctrl+Shift+I)">
              🐛 DevTools
            </button>
          </div>
        </div>

        <!-- 主内容区域 -->
        <div class="debugger-content">
          <div class="plugin-container" id="plugin-container"></div>
        </div>

        <!-- 底部状态栏 -->
        <div class="debugger-statusbar" id="debugger-statusbar">
          <span class="status-text">准备就绪</span>
        </div>
      </div>
    `;

    // 添加样式
    this.injectStyles();

    // 获取元素引用
    this.container = document.getElementById('plugin-container');
    this.toolbarElement = document.querySelector('.debugger-toolbar');
    this.statusBarElement = document.getElementById('debugger-statusbar');

    // 绑定事件
    this.bindEvents();

    // 更新路径显示
    this.updatePathDisplay();
  }

  /**
   * 注入样式
   */
  injectStyles() {
    const styleId = 'plugin-debugger-styles';
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* CSS 变量定义 - 供插件使用 */
      :root {
        --color-background: #ffffff;
        --color-background-secondary: #f8f9fa;
        --color-background-tertiary: #e9ecef;
        --color-surface: #ffffff;
        --color-surface-secondary: #f8f9fa;
        --color-surface-hover: #e9ecef;
        --color-border: #dee2e6;
        --color-border-hover: #adb5bd;
        --color-border-disabled: #e9ecef;
        --color-text-primary: #212529;
        --color-text-secondary: #6c757d;
        --color-text-tertiary: #adb5bd;
        --color-text-disabled: #ced4da;
        --color-text-inverse: #ffffff;
        --color-primary: #0d6efd;
        --color-primary-hover: #0b5ed7;
        --color-primary-active: #0a58ca;
        --color-primary-light: #cfe2ff;
        --color-success: #198754;
        --color-error: #dc3545;
        --color-warning: #ffc107;
        --color-info: #0dcaf0;
        --color-shadow-focus: rgba(13, 110, 253, 0.25);
        --color-shadow-hover: rgba(0, 0, 0, 0.15);
      }

      .plugin-debugger {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background: #f5f5f5;
      }

      .debugger-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 20px;
        background: #2c3e50;
        color: white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }

      .toolbar-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .toolbar-icon {
        font-size: 20px;
      }

      .toolbar-title {
        font-size: 16px;
        font-weight: 600;
      }

      .toolbar-path {
        font-size: 12px;
        color: #95a5a6;
        font-family: monospace;
      }

      .toolbar-right {
        display: flex;
        gap: 8px;
      }

      .toolbar-btn {
        padding: 6px 12px;
        background: #34495e;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        transition: background 0.2s;
      }

      .toolbar-btn:hover {
        background: #415b76;
      }

      .toolbar-btn:active {
        transform: scale(0.98);
      }

      .debugger-content {
        flex: 1;
        overflow: hidden;
        background: white;
      }

      .plugin-container {
        width: 100%;
        height: 100%;
        padding: 20px;
      }

      .debugger-statusbar {
        padding: 8px 20px;
        background: #ecf0f1;
        border-top: 1px solid #bdc3c7;
        font-size: 12px;
        color: #7f8c8d;
      }

      .status-text {
        font-family: monospace;
      }

      .status-success {
        color: #27ae60;
      }

      .status-error {
        color: #e74c3c;
      }

      .status-loading {
        color: #3498db;
      }

      /* 错误显示 */
      .error-container {
        padding: 40px;
        text-align: center;
      }

      .error-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .error-title {
        font-size: 20px;
        font-weight: 600;
        color: #e74c3c;
        margin-bottom: 8px;
      }

      .error-message {
        font-size: 14px;
        color: #7f8c8d;
        font-family: monospace;
      }

      /* 对话框样式 */
      .plugin-selector-dialog {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
      }

      .dialog-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
      }

      .dialog-content {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 8px;
        padding: 24px;
        min-width: 400px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      }

      .dialog-content h3 {
        margin: 0 0 20px 0;
        font-size: 18px;
        color: #2c3e50;
      }

      .dialog-body {
        margin-bottom: 20px;
      }

      .dialog-body label {
        display: block;
        margin-bottom: 8px;
        font-size: 14px;
        color: #34495e;
        font-weight: 500;
      }

      .dialog-body input {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        font-family: monospace;
        box-sizing: border-box;
      }

      .dialog-body input:focus {
        outline: none;
        border-color: #3498db;
        box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
      }

      .dialog-hint {
        margin: 8px 0 0 0;
        font-size: 12px;
        color: #95a5a6;
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }

      .dialog-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .dialog-btn-cancel {
        background: #ecf0f1;
        color: #7f8c8d;
      }

      .dialog-btn-cancel:hover {
        background: #bdc3c7;
      }

      .dialog-btn-primary {
        background: #3498db;
        color: white;
      }

      .dialog-btn-primary:hover {
        background: #2980b9;
      }

      /* 暗色主题 */
      [data-theme="dark"] {
        --color-background: #1a1a1a;
        --color-background-secondary: #2d2d2d;
        --color-background-tertiary: #3d3d3d;
        --color-surface: #2d2d2d;
        --color-surface-secondary: #3d3d3d;
        --color-surface-hover: #4d4d4d;
        --color-border: #4d4d4d;
        --color-border-hover: #6d6d6d;
        --color-text-primary: #e0e0e0;
        --color-text-secondary: #b0b0b0;
        --color-text-tertiary: #808080;
      }

      [data-theme="dark"] .plugin-debugger {
        background: #1a1a1a;
      }

      [data-theme="dark"] .debugger-content {
        background: #2d2d2d;
      }

      [data-theme="dark"] .debugger-statusbar {
        background: #1a1a1a;
        border-top-color: #4d4d4d;
        color: #b0b0b0;
      }

      [data-theme="dark"] .dialog-content {
        background: #2d2d2d;
        color: #e0e0e0;
      }

      [data-theme="dark"] .dialog-content h3 {
        color: #e0e0e0;
      }

      [data-theme="dark"] .dialog-body label {
        color: #b0b0b0;
      }

      [data-theme="dark"] .dialog-body input {
        background: #1a1a1a;
        border-color: #4d4d4d;
        color: #e0e0e0;
      }

      [data-theme="dark"] .dialog-btn-cancel {
        background: #3d3d3d;
        color: #b0b0b0;
      }

      [data-theme="dark"] .dialog-btn-cancel:hover {
        background: #4d4d4d;
      }
    `;
    document.head.appendChild(style);

    // 恢复保存的主题
    const savedTheme = localStorage.getItem('debugger-theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 重新加载按钮
    document.getElementById('reload-btn').addEventListener('click', () => {
      this.reloadPlugin();
    });

    // 选择插件按钮
    document.getElementById('select-plugin-btn').addEventListener('click', () => {
      this.selectPlugin();
    });

    // 主题切换按钮
    document.getElementById('theme-toggle-btn').addEventListener('click', () => {
      this.toggleTheme();
    });

    // DevTools 按钮
    document.getElementById('devtools-btn').addEventListener('click', () => {
      this.openDevTools();
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      // F5: 重新加载
      if (e.key === 'F5') {
        e.preventDefault();
        this.reloadPlugin();
      }
      // Ctrl+Shift+I: 打开 DevTools
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        this.openDevTools();
      }
    });
  }

  /**
   * 更新路径显示
   */
  updatePathDisplay() {
    const pathElement = document.getElementById('plugin-path');
    if (pathElement) {
      pathElement.textContent = this.pluginPath;
    }
  }

  /**
   * 加载插件（使用智能加载，支持回退）
   * @param {string} preferredPath - 首选路径（可选）
   */
  async loadPlugin(preferredPath = null) {
    try {
      this.updateStatus('正在加载插件...', 'loading');

      // 使用智能加载方法，自动尝试缓存路径和默认路径
      this.currentPlugin = await this.loader.loadPluginWithFallback(preferredPath);

      // 更新当前路径
      this.pluginPath = this.currentPlugin.pluginPath;
      this.updatePathDisplay();

      this.updateStatus(
        `✅ 插件加载成功 | bundle.js: ${this.loader.formatFileSize(this.currentPlugin.bundleCode.length)} | bundle.css: ${this.loader.formatFileSize(this.currentPlugin.cssCode.length)}`,
        'success'
      );

    } catch (error) {
      this.updateStatus(`❌ 加载失败: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 渲染插件
   */
  async renderPlugin() {
    try {
      if (!this.currentPlugin) {
        throw new Error('没有已加载的插件');
      }

      this.updateStatus('正在渲染插件...', 'loading');

      // 清空容器
      this.container.innerHTML = '';

      // 创建模拟的智能体数据
      const agentData = this.createMockAgentData();

      // 使用 DebugAgentRenderer 渲染
      await debugAgentRenderer.render(this.container, this.currentPlugin, agentData);

      this.updateStatus('✅ 插件渲染完成', 'success');

    } catch (error) {
      console.error(`❌ [PluginDebugger] 渲染失败:`, error);
      this.notificationCenter.error(error.message);
      this.updateStatus(`❌ 渲染失败: ${error.message}`, 'error');
    }
  }

  /**
   * 创建模拟的智能体数据
   */
  createMockAgentData() {
    return {
      id: this.currentPlugin.pluginName,
      name: this.currentPlugin.pluginName,
      description: '本地调试插件',
      version: 'dev',
      author: 'Developer',
      category: 'debug',
      tags: ['debug', 'local'],
      ui_config: {
        bundle_url: `file://${this.pluginPath}/bundle.js`,
        css_url: `file://${this.pluginPath}/bundle.css`
      },
      detail: {
        long_description: '这是一个本地调试插件',
        usage: '用于开发和调试智能体 UI'
      }
    };
  }

  /**
   * 重新加载插件
   */
  async reloadPlugin() {
    try {
      console.log(`🔄 [PluginDebugger] 重新加载插件`);

      // 清理旧的样式
      if (this.currentPlugin) {
        debugAgentRenderer.cleanup(this.currentPlugin.pluginName);
      }

      // 重新加载
      await this.loadPlugin();
      await this.renderPlugin();

      console.log(`✅ [PluginDebugger] 重新加载完成`);
    } catch (error) {
      console.error(`❌ [PluginDebugger] 重新加载失败:`, error);
    }
  }

  /**
   * 选择其他插件
   */
  async selectPlugin() {
    try {
      // 获取当前缓存的路径作为默认值
      const currentPath = this.pluginPath || this.loader.getCachedPluginPath() || '/src/plugins/example';

      // 创建自定义对话框
      const pluginPath = await this.showPluginSelector(currentPath);

      if (pluginPath) {
        // 保存选择的路径到缓存
        this.loader.cachePluginPath(pluginPath);

        // 重新加载插件
        this.pluginPath = pluginPath;
        this.updatePathDisplay();
        await this.reloadPlugin();
      }
    } catch (error) {
      console.error(`❌ [PluginDebugger] 选择插件失败:`, error);
      this.notificationCenter.error(`选择插件失败: ${error.message}`);
    }
  }

  /**
   * 显示插件选择器对话框
   * @param {string} defaultPath - 默认路径
   */
  async showPluginSelector(defaultPath = '/src/plugins/example') {
    return new Promise((resolve) => {
      // 创建对话框
      const dialog = document.createElement('div');
      dialog.className = 'plugin-selector-dialog';
      dialog.innerHTML = `
        <div class="dialog-overlay"></div>
        <div class="dialog-content">
          <h3>选择插件目录</h3>
          <div class="dialog-body">
            <label>插件路径:</label>
            <input type="text" id="plugin-path-input" value="${defaultPath}" placeholder="/src/plugins/your-plugin">
            <p class="dialog-hint">输入插件目录的相对路径（例如: /src/plugins/example/ai_translator）</p>
            <p class="dialog-hint">💡 提示：选择后会自动缓存，下次启动时优先加载此路径</p>
          </div>
          <div class="dialog-actions">
            <button class="dialog-btn dialog-btn-cancel">取消</button>
            <button class="dialog-btn dialog-btn-primary">确定</button>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      // 绑定事件
      const input = dialog.querySelector('#plugin-path-input');
      const cancelBtn = dialog.querySelector('.dialog-btn-cancel');
      const confirmBtn = dialog.querySelector('.dialog-btn-primary');

      input.focus();
      input.select();

      const close = (result) => {
        dialog.remove();
        resolve(result);
      };

      cancelBtn.addEventListener('click', () => close(null));
      confirmBtn.addEventListener('click', () => {
        const path = input.value.trim();
        if (path) {
          close(path);
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const path = input.value.trim();
          if (path) {
            close(path);
          }
        } else if (e.key === 'Escape') {
          close(null);
        }
      });
    });
  }

  /**
   * 切换主题
   */
  toggleTheme() {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    root.setAttribute('data-theme', newTheme);
    localStorage.setItem('debugger-theme', newTheme);

    console.log(`🎨 [PluginDebugger] 主题切换: ${currentTheme} → ${newTheme}`);
  }

  /**
   * 打开开发者工具
   */
  openDevTools() {
    try {
      // 尝试使用 Electron IPC
      if (window.electron && window.electron.ipcRenderer) {
        window.electron.ipcRenderer.send('open-devtools');
        console.log('🐛 [PluginDebugger] 已发送打开 DevTools 请求');
      } else if (window.require) {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('open-devtools');
        console.log('🐛 [PluginDebugger] 已发送打开 DevTools 请求 (require)');
      } else {
        // 浏览器环境，尝试打开浏览器 DevTools
        console.log('🐛 [PluginDebugger] 非 Electron 环境，请按 F12 打开 DevTools');
        this.notificationCenter.error('请按 F12 或 Ctrl+Shift+I 打开开发者工具');
      }
    } catch (error) {
      console.error('❌ [PluginDebugger] 打开 DevTools 失败:', error);
      this.notificationCenter.error('打开 DevTools 失败，请按 F12 手动打开');
    }
  }

  /**
   * 更新状态栏
   */
  updateStatus(text, type = 'info') {
    if (this.statusBarElement) {
      const statusText = this.statusBarElement.querySelector('.status-text');
      if (statusText) {
        statusText.textContent = text;
        statusText.className = `status-text status-${type}`;
      }
    }
  }

  /**
   * 显示错误
   */
  showError(message) {
    if (this.container) {
      this.container.innerHTML = `
        <div class="error-container">
          <div class="error-icon">❌</div>
          <div class="error-title">加载失败</div>
          <div class="error-message">${message}</div>
        </div>
      `;
    }
  }
}

