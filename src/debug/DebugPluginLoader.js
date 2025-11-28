/**
 * DebugPluginLoader - 调试插件加载器
 *
 * 用于从本地文件系统加载插件进行调试
 * 注意：此文件仅用于调试功能，不影响正常生产环境
 */

export class DebugPluginLoader {
  constructor() {
    this.currentPlugin = null;
    this.pluginPath = null;
  }

  /**
   * 从本地文件系统加载插件
   * @param {string} pluginPath - 插件目录路径 (例如: d:/code/repository/QuestechApp/src/plugins/example)
   * @returns {Promise<Object>} 插件数据 { bundleCode, cssCode, pluginPath, pluginName }
   */
  async loadLocalPlugin(pluginPath) {
    try {
      console.log(`📦 [DebugPluginLoader] 加载本地插件: ${pluginPath}`);

      // 1. 检查目录是否存在并包含必需文件
      const hasFiles = await this.checkPluginFiles(pluginPath);
      if (!hasFiles) {
        throw new Error(`插件目录不存在或缺少必需文件 (bundle.js/bundle.css): ${pluginPath}`);
      }

      // 2. 读取 bundle.js
      const bundlePath = this.joinPath(pluginPath, 'bundle.js');
      const bundleCode = await this.readFile(bundlePath, false);
      console.log(`✅ [DebugPluginLoader] bundle.js 加载成功 (${this.formatFileSize(bundleCode.length)})`);

      // 3. 读取 bundle.css（添加 ?raw 参数获取原始内容）
      const cssPath = this.joinPath(pluginPath, 'bundle.css');
      const cssCode = await this.readFile(cssPath, true);
      console.log(`✅ [DebugPluginLoader] bundle.css 加载成功 (${this.formatFileSize(cssCode.length)})`);

      // 4. 获取插件名称
      const pluginName = this.getBasename(pluginPath);

      // 5. 保存当前插件信息
      this.currentPlugin = {
        bundleCode,
        cssCode,
        pluginPath,
        pluginName,
        loadedAt: new Date().toISOString()
      };

      console.log(`🎉 [DebugPluginLoader] 插件加载完成: ${pluginName}`);
      return this.currentPlugin;

    } catch (error) {
      console.error(`❌ [DebugPluginLoader] 加载插件失败:`, error);
      throw error;
    }
  }

  /**
   * 智能加载插件：先尝试缓存路径，再尝试默认路径
   * @param {string} preferredPath - 首选路径（可选）
   * @returns {Promise<Object>} 插件数据
   */
  async loadPluginWithFallback(preferredPath = null) {
    const pathsToTry = [];

    // 1. 如果提供了首选路径，优先尝试
    if (preferredPath) {
      pathsToTry.push(preferredPath);
    }

    // 2. 尝试从缓存读取上次选择的路径
    const cachedPath = this.getCachedPluginPath();
    if (cachedPath && cachedPath !== preferredPath) {
      pathsToTry.push(cachedPath);
    }

    // 3. 最后尝试默认路径
    const defaultPath = DebugPluginLoader.getDefaultPluginPath();
    if (!pathsToTry.includes(defaultPath)) {
      pathsToTry.push(defaultPath);
    }

    console.log(`🔍 [DebugPluginLoader] 尝试加载插件，路径顺序:`, pathsToTry);

    // 依次尝试每个路径
    for (const path of pathsToTry) {
      try {
        console.log(`📂 [DebugPluginLoader] 尝试路径: ${path}`);
        const hasFiles = await this.checkPluginFiles(path);

        if (hasFiles) {
          console.log(`✅ [DebugPluginLoader] 找到有效插件: ${path}`);
          const plugin = await this.loadLocalPlugin(path);

          // 保存成功的路径到缓存
          this.cachePluginPath(path);

          return plugin;
        } else {
          console.log(`⚠️ [DebugPluginLoader] 路径无效（缺少文件）: ${path}`);
        }
      } catch (error) {
        console.log(`⚠️ [DebugPluginLoader] 路径加载失败: ${path} - ${error.message}`);
      }
    }

    // 所有路径都失败
    throw new Error(`无法加载插件。已尝试以下路径:\n${pathsToTry.map(p => `  - ${p}`).join('\n')}\n\n请确保插件目录包含 bundle.js 和 bundle.css 文件。`);
  }

  /**
   * 检查插件目录是否包含必需的文件
   * @param {string} dirPath - 目录路径
   * @returns {Promise<boolean>}
   */
  async checkPluginFiles(dirPath) {
    try {
      // 检查 bundle.js
      const bundlePath = this.joinPath(dirPath, 'bundle.js');
      const bundleResponse = await fetch(bundlePath);

      if (!bundleResponse.ok) {
        return false;
      }

      // 检查 bundle.css
      const cssPath = this.joinPath(dirPath, 'bundle.css');
      const cssResponse = await fetch(`${cssPath}?raw`);

      if (!cssResponse.ok) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 重新加载当前插件
   * @returns {Promise<Object>} 插件数据
   */
  async reloadPlugin() {
    if (!this.pluginPath) {
      throw new Error('没有已加载的插件');
    }
    console.log(`🔄 [DebugPluginLoader] 重新加载插件: ${this.pluginPath}`);
    return await this.loadLocalPlugin(this.pluginPath);
  }

  /**
   * 缓存插件路径到 localStorage
   * @param {string} path - 插件路径
   */
  cachePluginPath(path) {
    try {
      localStorage.setItem('debug-plugin-path', path);
      console.log(`💾 [DebugPluginLoader] 已缓存插件路径: ${path}`);
    } catch (error) {
      console.warn(`⚠️ [DebugPluginLoader] 缓存路径失败:`, error);
    }
  }

  /**
   * 从 localStorage 获取缓存的插件路径
   * @returns {string|null} 缓存的路径，如果没有则返回 null
   */
  getCachedPluginPath() {
    try {
      const path = localStorage.getItem('debug-plugin-path');
      if (path) {
        console.log(`📦 [DebugPluginLoader] 读取缓存路径: ${path}`);
      }
      return path;
    } catch (error) {
      console.warn(`⚠️ [DebugPluginLoader] 读取缓存路径失败:`, error);
      return null;
    }
  }

  /**
   * 清除缓存的插件路径
   */
  clearCachedPluginPath() {
    try {
      localStorage.removeItem('debug-plugin-path');
      console.log(`🗑️ [DebugPluginLoader] 已清除缓存路径`);
    } catch (error) {
      console.warn(`⚠️ [DebugPluginLoader] 清除缓存路径失败:`, error);
    }
  }

  /**
   * 检查目录是否存在（通过尝试读取文件）
   * @param {string} dirPath - 目录路径
   * @returns {Promise<boolean>}
   * @deprecated 使用 checkPluginFiles 代替
   */
  async checkDirectoryExists(dirPath) {
    try {
      // 尝试读取 bundle.js 来检查目录是否存在
      const bundlePath = this.joinPath(dirPath, 'bundle.js');
      const response = await fetch(bundlePath);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * 读取文件内容（使用 fetch）
   * @param {string} filePath - 文件路径
   * @param {boolean} isCSS - 是否是 CSS 文件
   * @returns {Promise<string>} 文件内容
   */
  async readFile(filePath, isCSS = false) {
    try {
      // 对于 CSS 文件，添加 ?raw 参数以获取原始内容
      const url = isCSS ? `${filePath}?raw` : filePath;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`文件不存在: ${filePath}`);
      }
      const content = await response.text();
      return content;
    } catch (error) {
      throw new Error(`读取文件失败: ${filePath} - ${error.message}`);
    }
  }

  /**
   * 路径拼接（浏览器兼容）
   * @param {...string} parts - 路径部分
   * @returns {string} 拼接后的路径
   */
  joinPath(...parts) {
    return parts.join('/').replace(/\/+/g, '/');
  }

  /**
   * 获取路径的最后一部分（文件名或目录名）
   * @param {string} path - 路径
   * @returns {string} 基础名称
   */
  getBasename(path) {
    return path.split(/[/\\]/).filter(Boolean).pop() || '';
  }

  /**
   * 格式化文件大小
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的大小
   */
  formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * 获取默认插件路径
   * @returns {string} 默认插件路径（相对于应用根目录的 URL 路径）
   */
  static getDefaultPluginPath() {
    // 返回相对于应用根目录的路径
    return '/src/plugins/example';
  }

  /**
   * 列出所有可用的插件
   * @returns {Promise<Array>} 插件列表
   */
  static async listAvailablePlugins() {
    // 硬编码的插件列表（因为无法在浏览器中列出目录）
    const knownPlugins = [
      'example'
    ];

    const plugins = [];

    for (const pluginName of knownPlugins) {
      const pluginPath = `/src/plugins/${pluginName}`;

      try {
        // 尝试读取 bundle.js 来检查插件是否存在
        const bundleResponse = await fetch(`${pluginPath}/bundle.js`);
        const cssResponse = await fetch(`${pluginPath}/bundle.css`);

        if (bundleResponse.ok && cssResponse.ok) {
          plugins.push({
            name: pluginName,
            path: pluginPath
          });
        }
      } catch (error) {
        // 插件不存在，跳过
        console.log(`⚠️ 插件 ${pluginName} 不存在或无法访问`);
      }
    }

    return plugins;
  }
}

