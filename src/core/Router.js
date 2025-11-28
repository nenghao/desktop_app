/**
 * 路由管理器 - SPA路由系统
 */

export class Router {
  constructor(options = {}) {
    this.routes = options.routes || [];
    this.eventBus = options.eventBus;
    this.stateManager = options.stateManager;
    this.componentLoader = options.componentLoader;
    this.agentManager = options.agentManager;

    this.currentRoute = null;
    this.previousRoute = null;
    this.isStarted = false;
    this.guards = [];
    this.middleware = [];

    // 路由历史栈
    this.routeHistory = [];
    this.historyIndex = -1;
    this.maxHistorySize = 50; // 最多保存50条历史记录

    // 路由模式：hash 或 history
    this.mode = options.mode || 'hash';
    this.base = options.base || '/';

    // 绑定方法
    this.handlePopState = this.handlePopState.bind(this);
    this.handleHashChange = this.handleHashChange.bind(this);
  }

  /**
   * 初始化路由器
   */
  async initialize() {
    // 处理路由配置
    this.processRoutes();

    // 设置事件监听
    this.setupEventListeners();

    console.log('✅ Router 初始化完成');
  }

  /**
   * 启动路由器
   */
  start() {
    if (this.isStarted) {
      console.warn('路由器已经启动');
      return;
    }

    this.isStarted = true;

    // 处理初始路由
    const initialPath = this.getCurrentPath();

    this.navigate(initialPath, { replace: true, initial: true });

    console.log('🚀 Router 启动完成，初始路径:', initialPath);
  }

  /**
   * 停止路由器
   */
  stop() {
    if (!this.isStarted) return;

    this.isStarted = false;
    this.removeEventListeners();

    console.log('⏹️ Router 已停止');
  }

  /**
   * 导航到指定路径
   * @param {string} path 路径
   * @param {Object} options 选项
   */
  async navigate(path, options = {}) {
    if (!this.isStarted && !options.initial) {
      console.warn('路由器未启动');
      return false;
    }

    // 防止重复导航到同一路径
    if (this.currentRoute && this.currentRoute.fullPath === path && !options.force) {
      console.log('🔄 路径未变化，跳过导航:', path);
      return true;
    }

    try {
      // 解析路径
      const location = this.parsePath(path);

      // 查找匹配的路由
      const matchedRoute = this.matchRoute(location.pathname);

      if (!matchedRoute) {
        console.warn(`未找到匹配的路由: ${path}`);
        return this.handleNotFound(location);
      }

      // 检查是否需要重定向
      if (matchedRoute.route.redirect) {
        return this.handleRedirect(matchedRoute.route, location);
      }

      // 执行路由守卫
      const guardResult = await this.executeGuards(matchedRoute, location);
      if (guardResult !== true) {
        if (typeof guardResult === 'string') {
          return this.navigate(guardResult, options);
        }
        return false;
      }

      // 执行中间件
      await this.executeMiddleware(matchedRoute, location);

      // 更新浏览器历史
      if (!options.initial) {
        this.updateHistory(path, options.replace);
      }

      // 保存当前路由为上一个路由
      this.previousRoute = this.currentRoute;

      // 创建新的路由对象
      this.currentRoute = {
        path: location.pathname,
        fullPath: path,
        query: location.query,
        params: matchedRoute.params,
        meta: matchedRoute.route.meta || {},
        component: matchedRoute.route.component,
        name: matchedRoute.route.name
      };

      // 更新路由历史栈（仅在非back/forward操作时）
      if (!options.isBackForward) {
        this.updateRouteHistory(path, options.replace);
      }

      // 更新状态
      this.updateRouterState();

      // 加载并渲染组件
      await this.renderRoute(matchedRoute);

      // 发布路由变化事件
      this.eventBus.emit('route:change', {
        to: this.currentRoute,
        from: this.previousRoute
      });

      return true;

    } catch (error) {
      console.error('路由导航失败:', error);
      this.eventBus.emit('route:error', { error, path });
      return false;
    }
  }

  /**
   * 返回上一页
   */
  back() {
    // 使用路由历史栈实现真正的返回
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const previousPath = this.routeHistory[this.historyIndex];
      console.log('🔙 返回上一页:', previousPath, '(历史栈索引:', this.historyIndex, ')');
      return this.navigate(previousPath, { isBackForward: true });
    } else {
      console.log('🔙 已到达历史栈底部，使用浏览器返回');
      window.history.back();
    }
  }

  /**
   * 检查是否可以返回
   */
  canGoBack() {
    return this.historyIndex > 0;
  }

  /**
   * 前进到下一页
   */
  forward() {
    window.history.forward();
  }

  /**
   * 替换当前路由
   */
  replace(path) {
    return this.navigate(path, { replace: true });
  }

  /**
   * 添加路由守卫
   * @param {Function} guard 守卫函数
   */
  addGuard(guard) {
    this.guards.push(guard);
  }

  /**
   * 添加中间件
   * @param {Function} middleware 中间件函数
   */
  addMiddleware(middleware) {
    this.middleware.push(middleware);
  }

  /**
   * 获取当前路径
   */
  getCurrentPath() {
    if (this.mode === 'hash') {
      return window.location.hash.slice(1) || '/dashboard';
    } else {
      return window.location.pathname + window.location.search;
    }
  }

  /**
   * 解析路径
   */
  parsePath(path) {
    const [pathname, search] = path.split('?');
    const query = this.parseQuery(search || '');

    return {
      pathname: pathname || '/',
      search: search || '',
      query
    };
  }

  /**
   * 解析查询参数
   */
  parseQuery(search) {
    const query = {};
    const params = new URLSearchParams(search);

    for (const [key, value] of params) {
      query[key] = value;
    }

    return query;
  }

  /**
   * 匹配路由
   */
  matchRoute(pathname) {
    for (const route of this.routes) {
      const match = this.matchPath(route.path, pathname);
      if (match) {
        return {
          route,
          params: match.params
        };
      }
    }

    return null;
  }

  /**
   * 处理路由重定向
   */
  async handleRedirect(route, location) {
    if (route.redirect) {
      console.log('🔄 路由重定向:', route.path, '->', route.redirect);
      return this.navigate(route.redirect, { replace: true });
    }
    return false;
  }

  /**
   * 匹配路径
   */
  matchPath(routePath, pathname) {
    // 处理根路径的特殊情况
    if (routePath === '/' && pathname === '/') {
      return { params: {} };
    }

    // 简单的路径匹配实现
    const routeSegments = routePath.split('/').filter(Boolean);
    const pathSegments = pathname.split('/').filter(Boolean);

    // 如果路由路径是根路径但当前路径不是，不匹配
    if (routePath === '/' && pathSegments.length > 0) {
      return null;
    }

    // 如果当前路径是根路径但路由路径不是，不匹配
    if (pathname === '/' && routeSegments.length > 0) {
      return null;
    }

    // 检查段数是否匹配
    if (routeSegments.length !== pathSegments.length) {
      // 检查是否有通配符或动态参数
      if (!routePath.includes('*') && !routePath.includes(':')) {
        return null;
      }
    }

    const params = {};

    // 确保有足够的段数进行匹配
    const maxLength = Math.max(routeSegments.length, pathSegments.length);

    for (let i = 0; i < maxLength; i++) {
      const routeSegment = routeSegments[i];
      const pathSegment = pathSegments[i];

      // 如果路由段不存在但路径段存在，不匹配
      if (!routeSegment && pathSegment) {
        return null;
      }

      // 如果路径段不存在但路由段存在，不匹配
      if (!pathSegment && routeSegment && !routeSegment.startsWith(':') && routeSegment !== '*') {
        return null;
      }

      if (routeSegment && routeSegment.startsWith(':')) {
        // 动态参数
        const paramName = routeSegment.slice(1);
        params[paramName] = pathSegment;
      } else if (routeSegment === '*') {
        // 通配符
        break;
      } else if (routeSegment && pathSegment && routeSegment !== pathSegment) {
        return null;
      }
    }

    return { params };
  }

  /**
   * 执行路由守卫
   */
  async executeGuards(matchedRoute, location) {
    for (const guard of this.guards) {
      try {
        const result = await guard(matchedRoute, location, this.currentRoute);
        if (result !== true) {
          return result;
        }
      } catch (error) {
        console.error('路由守卫执行失败:', error);
        return false;
      }
    }

    return true;
  }

  /**
   * 执行中间件
   */
  async executeMiddleware(matchedRoute, location) {
    for (const middleware of this.middleware) {
      try {
        await middleware(matchedRoute, location, this.currentRoute);
      } catch (error) {
        console.error('路由中间件执行失败:', error);
      }
    }
  }

  /**
   * 渲染路由
   */
  async renderRoute(matchedRoute) {
    const { route, params } = matchedRoute;

    try {
      // 检查是否是智能体路由
      if (route.path.startsWith('/agent/')) {
        const agentId = params.agentId;
        if (agentId) {
          await this.agentManager.loadAgent(agentId);
        }
      }

      // 不在这里直接渲染组件，而是通过事件通知ContentArea处理
      // 这样避免了重复渲染的问题
      console.log('🔄 路由渲染完成，等待ContentArea处理视图渲染');

    } catch (error) {
      console.error('路由渲染失败:', error);
      throw error;
    }
  }

  /**
   * 处理未找到的路由
   */
  async handleNotFound(location) {
    console.warn('404 - 页面未找到:', location.pathname);

    // 可以导航到404页面
    const notFoundRoute = this.routes.find(route => route.name === '404');
    if (notFoundRoute) {
      return this.renderRoute({ route: notFoundRoute, params: {} });
    }

    return false;
  }

  /**
   * 更新路由历史栈
   */
  updateRouteHistory(path, replace = false) {
    if (replace) {
      // replace模式：替换当前历史记录
      if (this.historyIndex >= 0) {
        this.routeHistory[this.historyIndex] = path;
      } else {
        this.routeHistory.push(path);
        this.historyIndex = 0;
      }
    } else {
      // push模式：添加新的历史记录
      // 如果当前不在历史栈顶部，删除当前位置之后的所有历史
      if (this.historyIndex < this.routeHistory.length - 1) {
        this.routeHistory = this.routeHistory.slice(0, this.historyIndex + 1);
      }

      // 添加新路由到历史栈
      this.routeHistory.push(path);
      this.historyIndex = this.routeHistory.length - 1;

      // 限制历史栈大小
      if (this.routeHistory.length > this.maxHistorySize) {
        this.routeHistory.shift();
        this.historyIndex--;
      }
    }

    console.log('📚 路由历史栈更新:', {
      history: this.routeHistory,
      index: this.historyIndex,
      current: path
    });
  }

  /**
   * 更新浏览器历史
   */
  updateHistory(path, replace = false) {
    if (this.mode === 'hash') {
      if (replace) {
        window.location.replace('#' + path);
      } else {
        window.location.hash = path;
      }
    } else {
      if (replace) {
        window.history.replaceState(null, '', this.base + path);
      } else {
        window.history.pushState(null, '', this.base + path);
      }
    }
  }

  /**
   * 更新路由状态
   */
  updateRouterState() {
    if (this.stateManager) {
      this.stateManager.setState('router', {
        currentRoute: this.currentRoute?.fullPath || '/',
        previousRoute: this.previousRoute?.fullPath || null,
        params: this.currentRoute?.params || {},
        query: this.currentRoute?.query || {}
      });
    }
  }

  /**
   * 处理路由配置
   */
  processRoutes() {
    // 这里可以对路由进行预处理，如添加默认配置等
    this.routes.forEach(route => {
      if (!route.meta) {
        route.meta = {};
      }
    });
  }

  /**
   * 设置事件监听
   */
  setupEventListeners() {
    if (this.mode === 'hash') {
      window.addEventListener('hashchange', this.handleHashChange);
    } else {
      window.addEventListener('popstate', this.handlePopState);
    }
  }

  /**
   * 移除事件监听
   */
  removeEventListeners() {
    if (this.mode === 'hash') {
      window.removeEventListener('hashchange', this.handleHashChange);
    } else {
      window.removeEventListener('popstate', this.handlePopState);
    }
  }

  /**
   * 处理 popstate 事件
   */
  handlePopState(event) {
    const path = this.getCurrentPath();
    this.navigate(path, { replace: true });
  }

  /**
   * 处理 hashchange 事件
   */
  handleHashChange(event) {
    const path = this.getCurrentPath();
    this.navigate(path, { replace: true });
  }
}
