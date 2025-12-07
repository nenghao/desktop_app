/**
 * 开发模式配置工具
 * 用于管理前端本地调试模式的配置和路径转换
 */

class DevConfig {
  constructor() {
    this.devMode = this.detectDevMode();
    this.devAgents = this.getDevAgents();
  }

  /**
   * 检测开发模式
   * 支持方式：
   * 1. URL 参数：?dev=true
   * 2. hash 路由：#/agents/pdf_tools?dev=true
   * 3. localStorage：localStorage.setItem('DEV_MODE', 'true')
   */
  detectDevMode() {
    // 优先使用 Electron preload 暴露的 isDev（如果存在）
    try {
      if (
        typeof window !== "undefined" &&
        window.electronAPI &&
        typeof window.electronAPI.isDev === "boolean"
      ) {
        return window.electronAPI.isDev;
      }
    } catch (e) {
      // ignore
    }

    // 检查 URL 参数
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("dev") === "true") {
      return true;
    }

    // 检查 hash 路由中的参数
    const hash = window.location.hash;
    if (hash.includes("dev=true")) {
      return true;
    }

    // 检查 localStorage
    const stored = localStorage.getItem("DEV_MODE");
    if (stored === "true") {
      return true;
    }

    return false;
  }

  /**
   * 获取开发模式中指定的智能体列表
   * 从 URL 参数或 localStorage 中读取
   */
  getDevAgents() {
    // 写死开发中的智能体列表
    return ["pdf_tools", "math_calculator", "data_calculator", "ocr"];
  }

  /**
   * 检查某个智能体是否处于开发模式
   * @param {string} agentId - 智能体ID
   * @returns {boolean}
   */
  isAgentInDevMode(agentId) {
    if (!this.devMode) return false;

    // 如果没有指定具体的智能体，所有智能体都在开发模式
    if (this.devAgents.length === 0) return true;

    // 否则检查指定的列表
    return this.devAgents.includes(agentId);
  }

  /**
   * 将后端 bundle URL 转换为本地开发路径
   * @param {string} bundleUrl - 原始 bundle URL
   * @param {string} agentId - 智能体ID
   * @returns {string} 转换后的 URL
   */
  convertToDevPath(bundleUrl, agentId) {
    if (!this.isAgentInDevMode(agentId)) {
      return bundleUrl;
    }

    // 开发模式优先加载源文件 index.js（便于调试）；生产环境使用服务器上的 bundle.js
    const devPath = `/standalone/${agentId}/index.js`;

    return devPath;
  }

  /**
   * 转换 CSS URL（同样需要转换）
   * @param {string} cssUrl - 原始 CSS URL
   * @param {string} agentId - 智能体ID
   * @returns {string} 转换后的 URL
   */
  convertCssToDevPath(cssUrl, agentId) {
    if (!this.isAgentInDevMode(agentId)) {
      return cssUrl;
    }

    const devCssPath = `/standalone/${agentId}/bundle.css`;

    if (!devCssPath) {
      return cssUrl;
    }

    return devCssPath;
  }

  /**
   * 输出调试信息
   */
  logDevInfo() {
    if (this.devMode) {
      console.log(
        "%c✅ [DEV MODE] 本地调试模式已启用",
        "color: green; font-weight: bold; font-size: 14px;"
      );
      console.log(
        `  📁 开发智能体: ${this.devAgents.length > 0 ? this.devAgents.join(", ") : "全部"}`
      );
      console.log("  🔄 缓存: 已禁用");
      console.log("  💡 提示: 修改源文件后刷新页面即可生效");
    }
  }

  /**
   * 启用开发模式（动态启用）
   * @param {string|string[]} agentIds - 需要开发模式的智能体ID
   */
  enableDevMode(agentIds) {
    this.devMode = true;
    if (typeof agentIds === "string") {
      this.devAgents = [agentIds];
    } else if (Array.isArray(agentIds)) {
      this.devAgents = agentIds;
    }
    localStorage.setItem("DEV_MODE", "true");
    localStorage.setItem("DEV_AGENTS", this.devAgents.join(","));
    this.logDevInfo();
  }

  /**
   * 禁用开发模式
   */
  disableDevMode() {
    this.devMode = false;
    this.devAgents = [];
    localStorage.removeItem("DEV_MODE");
    localStorage.removeItem("DEV_AGENTS");
    console.log("✅ 开发模式已关闭，切换为生产模式");
  }
}

// 创建全局单例
const devConfig = new DevConfig();

// 输出初始状态
devConfig.logDevInfo();

export { devConfig, DevConfig };
