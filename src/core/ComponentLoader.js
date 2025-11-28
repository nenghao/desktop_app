/**
 * 组件加载器 - 动态组件加载和缓存
 */

export class ComponentLoader {
  constructor() {
    this.cache = new Map();
    this.loading = new Map();
    this.maxCacheSize = 50;
    this.debug = false;
  }

  /**
   * 加载组件
   * @param {string} componentPath 组件路径
   * @param {Object} options 选项
   */
  async load(componentPath, options = {}) {
    const { useCache = true, timeout = 10000 } = options;

    // 检查缓存
    if (useCache && this.cache.has(componentPath)) {
      if (this.debug) {
        console.log(`[ComponentLoader] 从缓存加载组件: ${componentPath}`);
      }
      return this.cache.get(componentPath);
    }

    // 检查是否正在加载
    if (this.loading.has(componentPath)) {
      if (this.debug) {
        console.log(`[ComponentLoader] 等待组件加载: ${componentPath}`);
      }
      return this.loading.get(componentPath);
    }

    // 开始加载
    const loadPromise = this.loadComponent(componentPath, timeout);
    this.loading.set(componentPath, loadPromise);

    try {
      const component = await loadPromise;

      // 缓存组件
      if (useCache) {
        this.cacheComponent(componentPath, component);
      }

      if (this.debug) {
        console.log(`[ComponentLoader] 组件加载成功: ${componentPath}`);
      }

      return component;

    } catch (error) {
      console.error(`[ComponentLoader] 组件加载失败: ${componentPath}`, error);
      throw error;
    } finally {
      this.loading.delete(componentPath);
    }
  }

  /**
   * 预加载组件
   * @param {string[]} componentPaths 组件路径数组
   */
  async preload(componentPaths) {
    const promises = componentPaths.map(path =>
      this.load(path).catch(error => {
        console.warn(`[ComponentLoader] 预加载组件失败: ${path}`, error);
        return null;
      })
    );

    const results = await Promise.allSettled(promises);
    const successful = results.filter(result => result.status === 'fulfilled').length;

    console.log(`[ComponentLoader] 预加载完成: ${successful}/${componentPaths.length}`);
    return results;
  }

  /**
   * 卸载组件
   * @param {string} componentPath 组件路径
   */
  unload(componentPath) {
    const component = this.cache.get(componentPath);

    if (component && typeof component.unmount === 'function') {
      try {
        component.unmount();
      } catch (error) {
        console.error(`[ComponentLoader] 组件卸载失败: ${componentPath}`, error);
      }
    }

    this.cache.delete(componentPath);

    if (this.debug) {
      console.log(`[ComponentLoader] 组件已卸载: ${componentPath}`);
    }
  }

  /**
   * 清除缓存
   * @param {string} pattern 可选的路径模式
   */
  clearCache(pattern) {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const [path, component] of this.cache) {
        if (regex.test(path)) {
          this.unload(path);
        }
      }
    } else {
      // 清除所有缓存
      for (const [path] of this.cache) {
        this.unload(path);
      }
      this.cache.clear();
    }

    console.log(`[ComponentLoader] 缓存已清除${pattern ? `: ${pattern}` : ''}`);
  }

  /**
   * 获取缓存信息
   */
  getCacheInfo() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      components: Array.from(this.cache.keys()),
      loading: Array.from(this.loading.keys())
    };
  }

  /**
   * 实际加载组件
   */
  async loadComponent(componentPath, timeout) {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`组件加载超时: ${componentPath}`));
      }, timeout);

      try {
        let component;

        // 根据路径类型加载组件
        if (componentPath.startsWith('http')) {
          // 远程组件
          component = await this.loadRemoteComponent(componentPath);
        } else if (componentPath.endsWith('.js')) {
          // ES模块
          component = await this.loadESModule(componentPath);
        } else {
          // 内置组件
          component = await this.loadBuiltinComponent(componentPath);
        }

        clearTimeout(timeoutId);
        resolve(component);

      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * 加载ES模块
   */
  async loadESModule(modulePath) {
    try {
      const module = await import(/* @vite-ignore */ modulePath);

      // 支持默认导出和命名导出
      const component = module.default || module;

      if (!component) {
        throw new Error(`模块没有导出组件: ${modulePath}`);
      }

      return this.wrapComponent(component, modulePath);

    } catch (error) {
      throw new Error(`ES模块加载失败: ${modulePath} - ${error.message}`);
    }
  }

  /**
   * 加载内置组件
   */
  async loadBuiltinComponent(componentName) {
    // 内置组件映射
    const builtinComponents = {
      'AgentStore': () => import('../views/agents/AgentStore.js'),
      'AgentDetail': () => import('../views/agents/AgentDetail.js'),
      // 'ChatView': () => import('../views/ChatView.js')
    };

    const loader = builtinComponents[componentName];
    if (!loader) {
      throw new Error(`未知的内置组件: ${componentName}`);
    }

    try {
      const module = await loader();
      const component = module.default || module;

      return this.wrapComponent(component, componentName);

    } catch (error) {
      throw new Error(`内置组件加载失败: ${componentName} - ${error.message}`);
    }
  }

  /**
   * 加载远程组件
   */
  async loadRemoteComponent(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const code = await response.text();

      // 创建模块
      const module = this.createModuleFromCode(code, url);
      const component = module.default || module;

      return this.wrapComponent(component, url);

    } catch (error) {
      throw new Error(`远程组件加载失败: ${url} - ${error.message}`);
    }
  }

  /**
   * 从代码创建模块
   */
  createModuleFromCode(code, url) {
    // 这里可以使用更安全的方式来执行远程代码
    // 例如使用 Web Workers 或沙箱环境

    try {
      // 简单的实现，生产环境需要更安全的方式
      const moduleFunction = new Function('exports', 'require', 'module', code);
      const module = { exports: {} };

      moduleFunction(module.exports, null, module);

      return module.exports;

    } catch (error) {
      throw new Error(`代码执行失败: ${error.message}`);
    }
  }

  /**
   * 包装组件
   */
  wrapComponent(component, path) {
    // 如果组件已经是包装过的，直接返回
    if (component._isWrapped) {
      return component;
    }

    // 创建组件包装器
    const wrapper = {
      _isWrapped: true,
      _path: path,
      _loadTime: Date.now(),

      // 原始组件
      component,

      // 渲染方法
      render: async (container, props = {}) => {
        // 检查是否是类构造函数
        if (typeof component === 'function' && component.prototype && component.prototype.constructor === component) {
          // ES6 类组件
          const instance = new component();
          wrapper._instance = instance; // 保存实例引用
          if (typeof instance.render === 'function') {
            return instance.render(container, props);
          } else {
            throw new Error(`类组件没有render方法: ${path}`);
          }
        } else if (typeof component.render === 'function') {
          // 对象组件
          return component.render(container, props);
        } else if (typeof component === 'function') {
          // 函数组件
          return component(container, props);
        } else {
          throw new Error(`组件没有render方法: ${path}`);
        }
      },

      // 卸载方法
      unmount: () => {
        // 如果有实例，调用实例的卸载方法
        if (wrapper._instance && typeof wrapper._instance.destroy === 'function') {
          return wrapper._instance.destroy();
        } else if (wrapper._instance && typeof wrapper._instance.unmount === 'function') {
          return wrapper._instance.unmount();
        } else if (typeof component.unmount === 'function') {
          return component.unmount();
        }
      },

      // 获取组件信息
      getInfo: () => ({
        path,
        loadTime: wrapper._loadTime,
        type: typeof component,
        hasRender: typeof component.render === 'function',
        hasUnmount: typeof component.unmount === 'function'
      })
    };

    return wrapper;
  }

  /**
   * 缓存组件
   */
  cacheComponent(path, component) {
    // 检查缓存大小限制
    if (this.cache.size >= this.maxCacheSize) {
      // 移除最旧的组件
      const oldestPath = this.cache.keys().next().value;
      this.unload(oldestPath);
    }

    this.cache.set(path, component);
  }

  /**
   * 设置最大缓存大小
   */
  setMaxCacheSize(size) {
    this.maxCacheSize = size;

    // 如果当前缓存超过限制，清理旧的组件
    while (this.cache.size > this.maxCacheSize) {
      const oldestPath = this.cache.keys().next().value;
      this.unload(oldestPath);
    }
  }

  /**
   * 启用/禁用调试模式
   */
  setDebug(enabled) {
    this.debug = enabled;
  }
}
