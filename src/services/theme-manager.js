/**
 * 主题管理器 - 主题切换和颜色管理
 * 支持 Electron 和 Web 环境
 */

import { BaseComponent } from '../core/BaseComponent.js';
import { isElectron, isWeb } from '../utils/platform-detector.js';

export class ThemeManager extends BaseComponent {
  constructor(options = {}) {
    super(options);

    this.storageService = options.storageService;
    this.isElectron = isElectron();
    this.isWeb = isWeb();

    this.currentTheme = 'auto';
    this.themes = new Map();
    this.customThemes = new Map();
    this.colorVariables = new Map();
    this.mediaQuery = null;
    this.agentThemes = new Map();

    // 绑定方法
    this.handleSystemThemeChange = this.handleSystemThemeChange.bind(this);
  }

  /**
   * 初始化主题管理器
   */
  async initialize() {
    // 加载默认主题
    await this.loadDefaultThemes();

    // 加载自定义主题
    await this.loadCustomThemes();

    // 设置系统主题检测
    this.setupSystemThemeDetection();

    // 恢复用户主题偏好
    await this.restoreThemePreference();

    // 应用当前主题
    this.applyTheme(this.currentTheme);

    console.log('✅ ThemeManager 初始化完成');
  }

  /**
   * 加载默认主题
   */
  async loadDefaultThemes() {
    const defaultThemes = {
      light: {
        name: 'light',
        displayName: '浅色主题',
        type: 'light',
        colors: this.getLightThemeColors(),
        cssClass: 'theme-light'
      },
      dark: {
        name: 'dark',
        displayName: '深色主题',
        type: 'dark',
        colors: this.getDarkThemeColors(),
        cssClass: 'theme-dark'
      },
      auto: {
        name: 'auto',
        displayName: '跟随系统',
        type: 'auto',
        colors: this.getAutoThemeColors(),
        cssClass: 'theme-auto'
      }
    };

    Object.entries(defaultThemes).forEach(([name, theme]) => {
      this.themes.set(name, theme);
    });

    console.log('✅ 默认主题加载完成');
  }

  /**
   * 加载自定义主题
   */
  async loadCustomThemes() {
    try {
      const customThemes = this.storageService.get('customThemes', {});

      Object.entries(customThemes).forEach(([name, theme]) => {
        this.customThemes.set(name, theme);
      });

      console.log(`✅ 自定义主题加载完成: ${this.customThemes.size} 个`);

    } catch (error) {
      console.warn('⚠️ 自定义主题加载失败:', error);
    }
  }

  /**
   * 设置系统主题检测
   */
  setupSystemThemeDetection() {
    if (window.matchMedia) {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      // 使用统一的事件绑定方法
      this.addDOMListener(this.mediaQuery, 'change', this.handleSystemThemeChange);

      console.log('✅ 系统主题检测设置完成');
    }
  }

  /**
   * 处理系统主题变化
   */
  handleSystemThemeChange(e) {
    if (this.currentTheme === 'auto') {
      this.applySystemTheme();

      // 发送内部事件
      this.emit('systemThemeChange', {
        isDark: e.matches,
        theme: this.currentTheme
      });

      // 发送全局事件
      this.emitGlobal('theme:system-change', {
        isDark: e.matches,
        theme: this.currentTheme
      });
    }
  }

  /**
   * 切换主题
   * @param {string} themeName 主题名称
   */
  async switchTheme(themeName) {
    if (!this.isValidTheme(themeName)) {
      console.warn(`无效的主题: ${themeName}`);
      return false;
    }

    const oldTheme = this.currentTheme;
    this.currentTheme = themeName;

    // 应用主题
    this.applyTheme(themeName);

    // 保存偏好
    this.saveThemePreference(themeName);

    // 发送内部事件
    this.emit('themeChange', {
      from: oldTheme,
      to: themeName,
      theme: this.getTheme(themeName)
    });

    // 发送全局事件
    this.emitGlobal('theme:change', {
      from: oldTheme,
      to: themeName,
      theme: this.getTheme(themeName)
    });

    console.log(`🎨 主题已切换: ${oldTheme} -> ${themeName}`);
    return true;
  }

  /**
   * 应用主题
   * @param {string} themeName 主题名称
   */
  applyTheme(themeName) {
    const root = document.documentElement;
    const body = document.body;

    // 移除旧主题类
    this.removeAllThemeClasses(body);

    // 应用新主题类
    const theme = this.getTheme(themeName);
    if (theme && theme.cssClass) {
      body.classList.add(theme.cssClass);
    }

    // 更新CSS变量
    this.updateColorVariables(themeName);

    // 更新标题栏覆盖层颜色
    if (themeName !== 'auto') {
      this.updateTitleBarOverlay(themeName === 'dark');
    }

    // 如果是自动主题，应用系统主题
    if (themeName === 'auto') {
      this.applySystemTheme();
    }
  }

  /**
   * 应用系统主题
   */
  applySystemTheme() {
    if (!this.mediaQuery) return;

    const root = document.documentElement;
    const isDark = this.mediaQuery.matches;

    // 根据系统偏好应用对应的颜色变量
    const colors = isDark ? this.getDarkThemeColors() : this.getLightThemeColors();
    this.applyColorVariables(colors);

    // 更新标题栏覆盖层颜色
    this.updateTitleBarOverlay(isDark);

    console.log(`🎨 系统主题已应用: ${isDark ? '深色' : '浅色'}`);
  }

  /**
   * 更新颜色变量
   * @param {string} themeName 主题名称
   */
  updateColorVariables(themeName) {
    const theme = this.getTheme(themeName);
    if (!theme || !theme.colors) return;

    this.applyColorVariables(theme.colors);
  }

  /**
   * 应用颜色变量
   * @param {Object} colors 颜色对象
   */
  applyColorVariables(colors) {
    const root = document.documentElement;

    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
  }

  /**
   * 更新标题栏覆盖层颜色（仅 Electron 环境）
   * @param {boolean} isDark 是否为深色主题
   */
  async updateTitleBarOverlay(isDark) {
    // Web 环境跳过
    if (this.isWeb) return;

    if (this.isElectron && window.electronAPI && window.electronAPI.updateTitleBarOverlay) {
      try {
        const colors = {
          backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
          symbolColor: isDark ? '#ffffff' : '#000000'
        };

        await window.electronAPI.updateTitleBarOverlay(colors);
        console.log(`🎨 标题栏覆盖层颜色已更新: ${isDark ? '深色' : '浅色'}`);

      } catch (error) {
        console.warn('⚠️ 更新标题栏覆盖层颜色失败:', error);
      }
    }
  }

  /**
   * 创建自定义主题
   * @param {string} name 主题名称
   * @param {Object} config 主题配置
   */
  createCustomTheme(name, config) {
    if (this.themes.has(name)) {
      throw new Error(`主题名称已存在: ${name}`);
    }

    const theme = {
      name,
      displayName: config.displayName || name,
      type: 'custom',
      colors: config.colors || {},
      cssClass: `theme-${name}`,
      author: config.author || 'Unknown',
      version: config.version || '1.0.0',
      description: config.description || ''
    };

    this.customThemes.set(name, theme);
    this.saveCustomTheme(name, theme);

    // 发送内部事件
    this.emit('customThemeCreated', { name, theme });
    // 发送全局事件
    this.emitGlobal('theme:custom:created', { name, theme });

    console.log(`🎨 自定义主题已创建: ${name}`);
    return theme;
  }

  /**
   * 删除自定义主题
   * @param {string} name 主题名称
   */
  deleteCustomTheme(name) {
    if (!this.customThemes.has(name)) {
      return false;
    }

    this.customThemes.delete(name);

    // 从存储中删除
    const customThemes = this.storageService.get('customThemes', {});
    delete customThemes[name];
    this.storageService.set('customThemes', customThemes);

    // 如果当前使用的是被删除的主题，切换到默认主题
    if (this.currentTheme === name) {
      this.switchTheme('auto');
    }

    // 发送内部事件
    this.emit('customThemeDeleted', { name });
    // 发送全局事件
    this.emitGlobal('theme:custom:deleted', { name });

    console.log(`🗑️ 自定义主题已删除: ${name}`);
    return true;
  }

  /**
   * 应用智能体主题色
   * @param {string} agentId 智能体ID
   * @param {Object} colors 颜色配置
   */
  applyAgentTheme(agentId, colors) {
    const root = document.documentElement;
    const body = document.body;

    // 保存智能体主题
    this.agentThemes.set(agentId, colors);

    // 应用智能体主题色
    if (colors.primary) {
      root.style.setProperty('--agent-primary', colors.primary);
    }
    if (colors.secondary) {
      root.style.setProperty('--agent-secondary', colors.secondary);
    }
    if (colors.accent) {
      root.style.setProperty('--agent-accent', colors.accent);
    }
    if (colors.background) {
      root.style.setProperty('--agent-background', colors.background);
    }

    // 添加智能体主题类
    body.classList.add(`agent-theme-${agentId}`);

    // 发送内部事件
    this.emit('agentThemeApplied', { agentId, colors });
    // 发送全局事件
    this.emitGlobal('theme:agent:applied', { agentId, colors });

    console.log(`🎨 智能体主题已应用: ${agentId}`);
  }

  /**
   * 移除智能体主题
   * @param {string} agentId 智能体ID
   */
  removeAgentTheme(agentId) {
    const root = document.documentElement;
    const body = document.body;

    // 移除智能体主题
    this.agentThemes.delete(agentId);

    // 移除智能体主题类
    body.classList.remove(`agent-theme-${agentId}`);

    // 重置智能体主题变量
    root.style.removeProperty('--agent-primary');
    root.style.removeProperty('--agent-secondary');
    root.style.removeProperty('--agent-accent');
    root.style.removeProperty('--agent-background');

    // 发送内部事件
    this.emit('agentThemeRemoved', { agentId });
    // 发送全局事件
    this.emitGlobal('theme:agent:removed', { agentId });

    console.log(`🗑️ 智能体主题已移除: ${agentId}`);
  }

  /**
   * 获取主题
   * @param {string} name 主题名称
   */
  getTheme(name) {
    return this.themes.get(name) || this.customThemes.get(name);
  }

  /**
   * 获取所有主题
   */
  getAllThemes() {
    const allThemes = new Map();

    // 添加默认主题
    for (const [name, theme] of this.themes) {
      allThemes.set(name, theme);
    }

    // 添加自定义主题
    for (const [name, theme] of this.customThemes) {
      allThemes.set(name, theme);
    }

    return allThemes;
  }

  /**
   * 获取当前主题
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * 获取当前主题颜色
   * @param {string} colorName 颜色名称
   */
  getThemeColor(colorName) {
    const root = document.documentElement;
    return getComputedStyle(root).getPropertyValue(`--color-${colorName}`).trim();
  }

  /**
   * 检查主题是否有效
   * @param {string} themeName 主题名称
   */
  isValidTheme(themeName) {
    return this.themes.has(themeName) || this.customThemes.has(themeName);
  }

  /**
   * 移除所有主题类
   * @param {Element} element 目标元素
   */
  removeAllThemeClasses(element) {
    const themeClasses = ['theme-light', 'theme-dark', 'theme-auto'];

    // 移除默认主题类
    themeClasses.forEach(className => {
      element.classList.remove(className);
    });

    // 移除自定义主题类
    for (const theme of this.customThemes.values()) {
      if (theme.cssClass) {
        element.classList.remove(theme.cssClass);
      }
    }

    // 移除智能体主题类（保留其他类）
    const classesToRemove = [];
    element.classList.forEach(className => {
      if (className.startsWith('agent-theme-')) {
        classesToRemove.push(className);
      }
    });
    classesToRemove.forEach(className => {
      element.classList.remove(className);
    });
  }

  /**
   * 保存主题偏好
   * @param {string} themeName 主题名称
   */
  saveThemePreference(themeName) {
    this.storageService.set('themePreference', themeName);
  }

  /**
   * 恢复主题偏好
   */
  async restoreThemePreference() {
    const savedTheme = this.storageService.get('themePreference', 'auto');

    if (this.isValidTheme(savedTheme)) {
      this.currentTheme = savedTheme;
    } else {
      this.currentTheme = 'auto';
    }

    console.log(`🎨 主题偏好已恢复: ${this.currentTheme}`);
  }

  /**
   * 保存自定义主题
   * @param {string} name 主题名称
   * @param {Object} theme 主题对象
   */
  saveCustomTheme(name, theme) {
    const customThemes = this.storageService.get('customThemes', {});
    customThemes[name] = theme;
    this.storageService.set('customThemes', customThemes);
  }

  /**
   * 获取浅色主题颜色
   * 从CSS变量中动态获取，确保与样式表保持同步
   */
  getLightThemeColors() {
    return this.getThemeColorsFromCSS('light');
  }

  /**
   * 获取深色主题颜色
   * 从CSS变量中动态获取，确保与样式表保持同步
   */
  getDarkThemeColors() {
    return this.getThemeColorsFromCSS('dark');
  }

  /**
   * 获取自动主题颜色
   * 根据当前系统偏好返回对应的颜色
   */
  getAutoThemeColors() {
    const isDark = this.mediaQuery && this.mediaQuery.matches;
    return isDark ? this.getDarkThemeColors() : this.getLightThemeColors();
  }

  /**
   * 从CSS变量中获取主题颜色
   * @param {string} themeName 主题名称
   * @returns {Object} 颜色对象
   */
  getThemeColorsFromCSS(themeName) {
    // 创建临时元素来获取计算后的样式
    const testElement = document.createElement('div');
    testElement.className = `theme-${themeName}`;
    testElement.style.position = 'absolute';
    testElement.style.left = '-9999px';
    testElement.style.visibility = 'hidden';

    document.body.appendChild(testElement);

    try {
      const computedStyle = getComputedStyle(testElement);

      // 提取主要颜色变量
      const colors = {};
      const colorNames = [
        'primary', 'primary-hover', 'primary-active',
        'background', 'background-secondary', 'surface',
        'text-primary', 'text-secondary', 'border'
      ];

      colorNames.forEach(colorName => {
        const value = computedStyle.getPropertyValue(`--color-${colorName}`).trim();
        if (value) {
          colors[colorName.replace('-', '')] = value;
        }
      });

      return colors;
    } finally {
      document.body.removeChild(testElement);
    }
  }

  /**
   * 组件销毁前的清理工作
   */
  onBeforeUnmount() {
    // BaseComponent会自动清理所有事件监听器
    super.onBeforeUnmount();

    // 清理组件特定的状态
    this.themes.clear();
    this.customThemes.clear();
    this.colorVariables.clear();
    this.agentThemes.clear();
    this.mediaQuery = null;
  }

  /**
   * 销毁组件
   */
  destroy() {
    // 调用BaseComponent的销毁方法，会自动清理所有事件监听器
    super.destroy();
  }
}
