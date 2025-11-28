/**
 * 智能体UI动态加载服务
 * 负责从服务器下载、缓存和加载智能体UI代码
 */

export class AgentUILoader {
  constructor() {
    this.dbName = 'AgentUICache';
    this.dbVersion = 1;
    this.storeName = 'ui_bundles';
    this.db = null;
    this.devConfig = null; // 延迟加载 devConfig
  }

  /**
   * 动态加载 devConfig（仅在开发模式下）
   */
  async loadDevConfig() {
    if (this.devConfig) {
      return this.devConfig;
    }

    // 检查是否为开发模式
    const isDev = this.checkIfDevMode();

    if (isDev) {
      try {
        const module = await import('../../utils/dev-config.js');
        this.devConfig = module.devConfig;
        console.log('✅ 开发配置已加载');
      } catch (error) {
        console.warn('⚠️ 无法加载开发配置:', error);
        this.devConfig = this.createMockDevConfig();
      }
    } else {
      // 生产模式使用空的 mock 配置
      this.devConfig = this.createMockDevConfig();
    }

    return this.devConfig;
  }

  /**
   * 检查是否为开发模式（不依赖 devConfig）
   */
  checkIfDevMode() {
    try {
      // 1. 检查 Electron preload 暴露的 isDev
      if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.isDev === 'boolean') {
        return window.electronAPI.isDev;
      }

      // 2. 检查 URL 参数
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('dev') === 'true') {
        return true;
      }

      // 3. 检查 hash 路由中的参数
      const hash = window.location.hash;
      if (hash.includes('dev=true')) {
        return true;
      }

      // 4. 检查 localStorage
      const stored = localStorage.getItem('DEV_MODE');
      if (stored === 'true') {
        return true;
      }
    } catch (e) {
      // ignore
    }

    return false;
  }

  /**
   * 创建 mock devConfig（生产模式使用）
   */
  createMockDevConfig() {
    return {
      isAgentInDevMode: () => false,
      convertToDevPath: (url) => url,
      convertCssToDevPath: (url) => url
    };
  }

  /**
   * 初始化 IndexedDB
   */
  async initDB() {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('❌ IndexedDB 打开失败:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB 初始化成功');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 创建对象存储
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { keyPath: 'agentId' });
          
          // 创建索引
          objectStore.createIndex('version', 'version', { unique: false });
          objectStore.createIndex('cachedAt', 'cachedAt', { unique: false });
          
          console.log('✅ IndexedDB 对象存储创建成功');
        }
      };
    });
  }

  /**
   * 加载智能体UI（带缓存和版本检测）
   * 完全依赖版本号，不发送 HEAD 请求检查文件更新
   * @param {string} agentId - 智能体ID
   * @param {Object} uiConfig - UI配置对象
   * @param {Object} options - 选项 { disableCache: boolean }
   * @returns {Promise<Object>} UI Bundle对象
   */
  async loadAgentUI(agentId, uiConfig, options = {}) {
    try {
      // 初始化数据库
      await this.initDB();

      // 加载 devConfig（如果需要）
      const devConfig = await this.loadDevConfig();

      // 调试：输出 uiConfig
      console.log(`🔍 [AgentUILoader] uiConfig:`, {
        bundle_url: uiConfig.bundle_url,
        css_url: uiConfig.css_url,
        version: uiConfig.version
      });

      // 检查是否禁用缓存（开发模式或强制刷新）
      const isDevMode = devConfig.isAgentInDevMode(agentId);
      const disableCache = options.disableCache || isDevMode || false;

      // 如果禁用缓存，直接下载
      if (disableCache) {
          const uiBundle = await this.downloadUIBundle(uiConfig, true, agentId);
        return uiBundle;
      }

      // 检查缓存
      const cachedUI = await this.getCachedUI(agentId);

      // 调试：输出缓存信息
      if (cachedUI) {
        console.log(`🔍 [AgentUILoader] 缓存信息:`, {
          version: cachedUI.version,
          cachedAt: cachedUI.cachedAt
        });
      }

      // 如果有缓存且版本一致，直接使用缓存
      if (cachedUI && cachedUI.version === uiConfig.version) {
        console.log(`✅ [AgentUILoader] 使用缓存 (版本: ${cachedUI.version})`);
        return cachedUI;
      }

      // 如果缓存版本不一致或没有缓存，重新下载
      if (cachedUI) {
        console.log(`🔄 [AgentUILoader] 版本变化，重新下载 (缓存: ${cachedUI.version} → 新版本: ${uiConfig.version})`);
      } else {
        console.log(`📥 [AgentUILoader] 无缓存，下载UI资源 (版本: ${uiConfig.version})`);
      }

      // 调试日志：检查开发模式和路径转换
      console.log(`🔍 [AgentUILoader] 加载智能体UI: ${agentId}`);
      console.log(`  - 开发模式: ${isDevMode}`);
      console.log(`  - 原始 bundle_url: ${uiConfig.bundle_url}`);
      console.log(`  - 原始 css_url: ${uiConfig.css_url}`);

      // 下载UI资源（传递 agentId 以支持开发模式路径转换）
      const uiBundle = await this.downloadUIBundle(uiConfig, true, agentId);

      // 调试日志：下载完成后
      console.log(`✅ [AgentUILoader] UI资源下载完成: ${agentId}`);
      console.log(`  - bundle_code: ${uiBundle.bundleCode ? '已加载' : '未加载'}`);
      console.log(`  - css_code: ${uiBundle.cssCode ? '已加载' : '未加载'}`);

      // 保存到缓存
      await this.saveUIToCache(agentId, uiConfig.version, uiBundle);

      return uiBundle;

    } catch (error) {
      console.error('❌ [AgentUILoader] 加载UI失败:', error);

      // 尝试使用旧缓存（即使版本不一致）
      const cachedUI = await this.getCachedUI(agentId);
      if (cachedUI) {
        console.warn('⚠️ [AgentUILoader] 加载失败，使用旧版本缓存:', agentId);
        return cachedUI;
      }

      throw error;
    }
  }

  /**
   * 下载UI资源
   * @param {Object} uiConfig - UI配置对象
   * @param {boolean} bustCache - 是否绕过浏览器缓存
   * @param {string} agentId - 智能体ID（可选，用于开发模式路径转换）
   * @returns {Promise<Object>} UI Bundle对象
   */
  async downloadUIBundle(uiConfig, bustCache = false, agentId = null) {
    let { bundle_url, css_url } = uiConfig;

    // 转换后端返回的绝对 URL 为相对路径（解决 CORS 问题）
    bundle_url = this.normalizeUrl(bundle_url);
    css_url = this.normalizeUrl(css_url);

    // 加载 devConfig（如果需要）
    const devConfig = await this.loadDevConfig();

    // 检查是否为开发模式
    const isDevMode = agentId && devConfig.isAgentInDevMode(agentId);

    try {
      // 开发模式：使用 <script> 标签动态加载（支持全局作用域和模块导入）
      if (isDevMode) {
        console.log(`🔄 [DevMode] 开发模式下载UI资源`, uiConfig);
        bundle_url = devConfig.convertToDevPath(bundle_url, agentId);
        css_url = devConfig.convertCssToDevPath(css_url, agentId);

        // 如果需要绕过缓存，添加时间戳参数
        if (bustCache) {
          const timestamp = Date.now();
          const separator = url => url.includes('?') ? '&' : '?';
          bundle_url = `${bundle_url}${separator(bundle_url)}_t=${timestamp}`;
          css_url = `${css_url}${separator(css_url)}_t=${timestamp}`;
        }

        // CSS 仍然使用 fetch 加载
        const cssCode = await this.fetchText(css_url, bustCache);

        // JavaScript 使用 <script> 标签加载，并等待全局变量
        const bundleCode = await this.loadScriptTag(bundle_url, agentId);

        return {
          bundleCode,
          cssCode,
          config: {},
          isDevMode: true // 标记为开发模式
        };
      }

      // 生产模式：直接使用服务器 URL
      // 如果需要绕过缓存，添加时间戳参数
      if (bustCache) {
        const timestamp = Date.now();
        const separator = url => url.includes('?') ? '&' : '?';
        bundle_url = `${bundle_url}${separator(bundle_url)}_t=${timestamp}`;
        css_url = `${css_url}${separator(css_url)}_t=${timestamp}`;
      }

      // 生产模式：并行下载所有资源
      const [bundleCode, cssCode] = await Promise.all([
        this.fetchText(bundle_url, bustCache),
        this.fetchText(css_url, bustCache)
      ]);

      return {
        bundleCode,
        cssCode,
        config: {} // 返回空配置对象，保持兼容性
      };

    } catch (error) {
      console.error('❌ [AgentUILoader] 下载UI资源失败:', error);
      throw new Error(`下载UI资源失败: ${error.message}`);
    }
  }

  /**
   * 标准化 URL（将后端返回的绝对地址转换为相对路径）
   * @param {string} url - 原始 URL
   * @returns {string} 标准化后的 URL
   */
  normalizeUrl(url) {
    if (!url) return url;

    // 生产环境直接使用后端返回的 URL
    if (import.meta.env.PROD) {
      return url;
    }

    // 开发环境：将后端返回的绝对 URL 转换为相对路径，通过 Vite 代理转发
    // 匹配 http://0.0.0.0:10089/xxx 或 http://192.168.0.103:10089/xxx
    const pattern = /^https?:\/\/(0\.0\.0\.0|192\.168\.0\.103|localhost):10089\/(.*)$/;
    const match = url.match(pattern);

    if (match) {
      const path = match[2];
      return `/${path}`;
    }

    return url;
  }

  /**
   * 使用 <script> 标签动态加载 JavaScript（开发模式）
   * @param {string} url - 脚本 URL
   * @param {string} agentId - 智能体 ID
   * @returns {Promise<string>} 返回特殊标记，表示已通过 script 标签加载
   */
  async loadScriptTag(url, agentId) {
    return new Promise((resolve, reject) => {
      // 移除之前可能存在的同名脚本
      const oldScript = document.querySelector(`script[data-agent-id="${agentId}"]`);
      if (oldScript) {
        oldScript.remove();
        console.log('🗑️ 已移除旧的 script 标签');
      }

      // 创建新的 script 标签
      const script = document.createElement('script');
      script.src = url;
      script.dataset.agentId = agentId;

      script.onload = () => {
        console.log(`✅ Script 标签加载成功: ${url}`);
        // 返回特殊标记，告知 AgentDetail 已通过 script 标签加载
        resolve(`__DEV_MODE_SCRIPT_LOADED__:${agentId}`);
      };

      script.onerror = () => {
        console.error(`❌ Script 标签加载失败: ${url}`);
        reject(new Error(`无法加载脚本: ${url}`));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * 获取文本资源
   * @param {string} url - 资源URL
   * @param {boolean} bustCache - 是否绕过浏览器缓存
   * @returns {Promise<string>} 文本内容
   */
  async fetchText(url, bustCache = false) {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain, application/javascript, text/css',
        'Cache-Control': bustCache ? 'no-cache, no-store, must-revalidate' : 'default',
        'Pragma': bustCache ? 'no-cache' : 'default',
        'Expires': bustCache ? '0' : 'default'
      },
      cache: bustCache ? 'no-store' : 'default'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  }

  /**
   * 获取JSON资源
   * @param {string} url - 资源URL
   * @param {boolean} bustCache - 是否绕过浏览器缓存
   * @returns {Promise<Object>} JSON对象
   */
  async fetchJSON(url, bustCache = false) {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      cache: bustCache ? 'no-cache' : 'default'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * 获取缓存的UI
   * @param {string} agentId - 智能体ID
   * @returns {Promise<Object|null>} UI Bundle对象或null
   */
  async getCachedUI(agentId) {
    try {
      await this.initDB();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const objectStore = transaction.objectStore(this.storeName);
        const request = objectStore.get(agentId);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          console.error('❌ 获取缓存失败:', request.error);
          reject(request.error);
        };
      });

    } catch (error) {
      console.error('❌ 获取缓存失败:', error);
      return null;
    }
  }

  /**
   * 保存UI到缓存
   * @param {string} agentId - 智能体ID
   * @param {string} version - 版本号
   * @param {Object} uiBundle - UI Bundle对象
   */
  async saveUIToCache(agentId, version, uiBundle) {
    try {
      await this.initDB();

      const cacheData = {
        agentId,
        version,
        bundleCode: uiBundle.bundleCode,
        cssCode: uiBundle.cssCode,
        config: uiBundle.config,
        cachedAt: Date.now()
      };

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const objectStore = transaction.objectStore(this.storeName);
        const request = objectStore.put(cacheData);

        request.onsuccess = () => {
          console.log('✅ [AgentUILoader] UI缓存保存成功:', agentId);
          resolve();
        };

        request.onerror = () => {
          console.error('❌ 保存缓存失败:', request.error);
          reject(request.error);
        };
      });

    } catch (error) {
      console.error('❌ 保存缓存失败:', error);
      // 缓存失败不影响主流程，只记录错误
    }
  }

  /**
   * 测试直接请求 bundle.js
   * @param {string} url - bundle.js 的 URL
   */
  async testDirectFetch(url) {
    console.log('🧪 [测试] 开始直接请求:', url);
    console.log('🧪 [测试] 当前时间:', new Date().toLocaleString());

    try {
      // 方法1: 使用 XMLHttpRequest（绕过所有缓存）
      console.log('\n📡 方法1: XMLHttpRequest');
      const xhr = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url + '?_xhr=' + Date.now(), true);
        xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        xhr.setRequestHeader('Pragma', 'no-cache');
        xhr.setRequestHeader('Expires', '0');

        xhr.onload = function() {
          if (xhr.status === 200) {
            resolve(xhr.responseText);
          } else {
            reject(new Error(`HTTP ${xhr.status}`));
          }
        };

        xhr.onerror = function() {
          reject(new Error('Network error'));
        };

        xhr.send();
      });

      console.log('✅ XMLHttpRequest 成功');
      console.log('📦 内容长度:', xhr.length);
      console.log('📦 前500字符:', xhr.substring(0, 500));
      console.log('📦 后500字符:', xhr.substring(xhr.length - 500));
      console.log('🔍 是否包含 "function init":', xhr.includes('function init'));
      console.log('🔍 是否包含 "return init":', xhr.includes('return init'));

      // 方法2: 使用 fetch with no-store
      console.log('\n📡 方法2: fetch with no-store');
      const response = await fetch(url + '?_fetch=' + Date.now(), {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      });

      const text = await response.text();
      console.log('✅ fetch 成功');
      console.log('📦 内容长度:', text.length);
      console.log('📦 前500字符:', text.substring(0, 500));
      console.log('📦 后500字符:', text.substring(text.length - 500));
      console.log('🔍 是否包含 "function init":', text.includes('function init'));
      console.log('🔍 是否包含 "return init":', text.includes('return init'));

      // 比较两种方法的结果
      console.log('\n🔍 结果比较:');
      console.log('  - 长度是否一致:', xhr.length === text.length);
      console.log('  - 内容是否一致:', xhr === text);

      if (xhr !== text) {
        console.warn('⚠️ 两种方法获取的内容不一致！');
      }

      return {
        xhr: xhr,
        fetch: text,
        same: xhr === text
      };

    } catch (error) {
      console.error('❌ 测试失败:', error);
      throw error;
    }
  }

  /**
   * 清除缓存
   * @param {string} agentId - 智能体ID（可选，不传则清除所有）
   */
  async clearCache(agentId = null) {
    try {
      await this.initDB();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const objectStore = transaction.objectStore(this.storeName);

        let request;
        if (agentId) {
          // 清除指定智能体的缓存
          request = objectStore.delete(agentId);
        } else {
          // 清除所有缓存
          request = objectStore.clear();
        }

        request.onsuccess = () => {
          console.log('✅ [AgentUILoader] 缓存清除成功:', agentId || '全部');
          resolve();
        };

        request.onerror = () => {
          console.error('❌ 清除缓存失败:', request.error);
          reject(request.error);
        };
      });

    } catch (error) {
      console.error('❌ 清除缓存失败:', error);
      throw error;
    }
  }

  /**
   * 预加载UI（后台静默下载）
   * @param {string} agentId - 智能体ID
   * @param {Object} uiConfig - UI配置对象
   */
  async preloadAgentUI(agentId, uiConfig) {
    try {
      console.log('🔄 [AgentUILoader] 预加载UI:', agentId);
      await this.loadAgentUI(agentId, uiConfig);
    } catch (error) {
      console.warn('⚠️ [AgentUILoader] 预加载失败:', error);
      // 预加载失败不影响主流程
    }
  }

  /**
   * 清理过期缓存（超过30天）
   */
  async cleanExpiredCache() {
    try {
      await this.initDB();

      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const objectStore = transaction.objectStore(this.storeName);
        const index = objectStore.index('cachedAt');
        const range = IDBKeyRange.upperBound(thirtyDaysAgo);
        const request = index.openCursor(range);

        let deletedCount = 0;

        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            deletedCount++;
            cursor.continue();
          } else {
            console.log(`✅ [AgentUILoader] 清理过期缓存完成，删除 ${deletedCount} 条记录`);
            resolve(deletedCount);
          }
        };

        request.onerror = () => {
          console.error('❌ 清理过期缓存失败:', request.error);
          reject(request.error);
        };
      });

    } catch (error) {
      console.error('❌ 清理过期缓存失败:', error);
    }
  }
}

