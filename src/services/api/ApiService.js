/**
 * API服务
 */

import { API_CONFIG } from './api-config.js';

export class ApiService {
  constructor(options = {}) {
    // 从统一配置文件读取 baseURL，不再使用硬编码默认值
    this.baseURL = options.baseURL || API_CONFIG.baseURL;
    this.timeout = options.timeout || API_CONFIG.timeout;
    this.headers = {
      ...API_CONFIG.defaultHeaders,
      ...options.headers
    };

    this.interceptors = {
      request: [],
      response: []
    };

    // Token刷新相关
    this.isRefreshing = false;
    this.refreshPromise = null;
    this.pendingRequests = [];

    // UserManager引用（由外部注入）
    this.userManager = options.userManager || null;

    this.setupInterceptors();
  }
  
  /**
   * 设置拦截器
   */
  setupInterceptors() {
    // 请求拦截器
    this.addRequestInterceptor((config) => {
      // 添加认证token（只在没有手动设置 Authorization 的情况下）
      if (!config.headers.Authorization) {
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }

      // 添加请求ID
      config.headers['X-Request-ID'] = this.generateRequestId();

      console.log(`🚀 API请求: ${config.method.toUpperCase()} ${config.url}`);
      console.log(`🔑 Authorization header: ${config.headers.Authorization ? '存在' : '缺失'}`);
      return config;
    });
    
    // 响应拦截器
    this.addResponseInterceptor(
      (response) => {
        console.log(`✅ API响应: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error(`❌ API错误: ${error.message}`);
        return this.handleError(error);
      }
    );
  }
  
  /**
   * 添加请求拦截器
   */
  addRequestInterceptor(interceptor) {
    this.interceptors.request.push(interceptor);
  }
  
  /**
   * 添加响应拦截器
   */
  addResponseInterceptor(onFulfilled, onRejected) {
    this.interceptors.response.push({ onFulfilled, onRejected });
  }
  
  /**
   * 执行请求拦截器
   */
  async executeRequestInterceptors(config) {
    let processedConfig = config;
    
    for (const interceptor of this.interceptors.request) {
      try {
        processedConfig = await interceptor(processedConfig);
      } catch (error) {
        throw error;
      }
    }
    
    return processedConfig;
  }
  
  /**
   * 执行响应拦截器
   */
  async executeResponseInterceptors(response, isError = false) {
    let processedResponse = response;
    
    for (const interceptor of this.interceptors.response) {
      try {
        if (isError && interceptor.onRejected) {
          processedResponse = await interceptor.onRejected(processedResponse);
        } else if (!isError && interceptor.onFulfilled) {
          processedResponse = await interceptor.onFulfilled(processedResponse);
        }
      } catch (error) {
        throw error;
      }
    }
    
    return processedResponse;
  }
  
  /**
   * 发送请求
   * 支持两种调用方式：
   * 1. request(config) - 传入配置对象
   * 2. request(method, url, data, params, options) - 传入多个参数（兼容子类）
   */
  async request(methodOrConfig, url, data = null, params = {}, options = {}) {
    try {
      // 处理参数：支持两种调用方式
      let config;
      if (typeof methodOrConfig === 'string') {
        // 方式2：多参数调用
        config = {
          method: methodOrConfig,
          url,
          data,
          params,
          ...options
        };
      } else {
        // 方式1：配置对象调用
        config = methodOrConfig;
      }

      // 处理配置 - 先合并基础配置和用户配置
      const mergedConfig = {
        method: 'GET',
        timeout: this.timeout,
        params: {},
        ...config
      };

      // 单独处理headers合并，确保默认headers不被覆盖
      mergedConfig.headers = {
        ...this.headers,
        ...(config.headers || {})
      };

      // 处理URL
      mergedConfig.url = this.resolveURL(config.url, config.params);

      const processedConfig = await this.executeRequestInterceptors(mergedConfig);

      // 发送请求
      const response = await this.sendRequest(processedConfig);

      // 处理响应
      return await this.executeResponseInterceptors(response);

    } catch (error) {
      // 处理错误
      const processedError = await this.executeResponseInterceptors(error, true);
      throw processedError;
    }
  }
  
  /**
   * 发送实际请求
   */
  async sendRequest(config) {
    const { method, url, headers, data, timeout } = config;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchOptions = {
        method: method.toUpperCase(),
        headers,
        signal: controller.signal
      };

      if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        fetchOptions.body = JSON.stringify(data);
      }

      // 打印所有请求的详细信息（包括 headers）
      // console.log('🔍 [ApiService] 请求详情:', {
      //   method: method.toUpperCase(),
      //   url,
      //   hasAuthHeader: !!headers?.Authorization,
      //   authValue: headers?.Authorization,
      //   data
      // });

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      const responseData = await this.parseResponse(response);

      // 处理401错误 - 集中式Token管理
      if (response.status === 401 && !url.includes('/user/refresh/token/') && !url.includes('/user/login/')) {
        console.warn('⚠️ [ApiService] 检测到401错误，准备刷新Token');
        return await this.handleUnauthorizedRequest(config);
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: responseData,
        config
      };

    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('请求超时');
      }

      throw error;
    }
  }

  /**
   * 处理未授权请求（401）- 集中式Token刷新
   */
  async handleUnauthorizedRequest(originalConfig) {
    // 如果没有UserManager，抛出错误
    if (!this.userManager) {
      throw new Error('Authentication credentials were not provided');
    }

    // 🔥 如果已经有正在进行的刷新，等待它完成后重试请求
    if (this.refreshPromise) {
      console.log('🔄 [ApiService] 等待正在进行的Token刷新...');
      try {
        await this.refreshPromise;
        // 刷新完成，使用新Token重试原始请求
        return await this.sendRequest({
          ...originalConfig,
          headers: {
            ...originalConfig.headers,
            'Authorization': `Bearer ${this.getAuthToken()}`
          }
        });
      } catch (error) {
        throw error;
      }
    }

    // 🔥 开始新的Token刷新流程
    this.isRefreshing = true;
    console.log('🔄 [ApiService] 开始刷新Token...');

    // 创建刷新Promise（所有后续请求都会等待这个Promise）
    this.refreshPromise = (async () => {
      try {
        const currentUser = this.userManager.getCurrentUser();

        if (!currentUser || !currentUser.refresh_token) {
          throw new Error('No refresh token available');
        }

        // 调用刷新Token接口
        const refreshResponse = await fetch(this.resolveURL('user/refresh/token/'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            refresh_token: currentUser.refresh_token
          })
        });

        const refreshData = await refreshResponse.json();

        if (refreshResponse.ok && refreshData.success) {
          console.log('✅ [ApiService] Token刷新成功');

          // 更新Token（仅更新currentUser中的token）
          this.userManager.updateTokenOnly(refreshData.data);

          // 重试原始请求
          const retryResponse = await this.sendRequest({
            ...originalConfig,
            headers: {
              ...originalConfig.headers,
              'Authorization': `Bearer ${refreshData.data.access_token}`
            }
          });

          // 重试所有待处理的请求
          this.pendingRequests.forEach(({ resolve, config }) => {
            this.sendRequest({
              ...config,
              headers: {
                ...config.headers,
                'Authorization': `Bearer ${refreshData.data.access_token}`
              }
            }).then(resolve).catch(resolve);
          });
          this.pendingRequests = [];

          return retryResponse;
        } else {
          throw new Error('Token refresh failed');
        }
      } catch (error) {
        console.error('❌ [ApiService] Token刷新失败:', error);

        // 拒绝所有待处理的请求
        this.pendingRequests.forEach(({ reject }) => {
          reject(error);
        });
        this.pendingRequests = [];

        // 执行登出
        if (this.userManager) {
          await this.userManager.logout();
        }

        throw error;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    // 等待刷新完成并返回结果
    return await this.refreshPromise;
  }
  
  /**
   * 解析响应
   */
  async parseResponse(response) {
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else if (contentType && contentType.includes('text/')) {
      return await response.text();
    } else {
      return await response.blob();
    }
  }
  
  /**
   * 处理错误
   */
  handleError(error) {
    if (error.response) {
      // 服务器响应错误
      const { status, data } = error.response;

      // 401错误已经在sendRequest中集中处理，这里不再重复处理
      switch (status) {
        case 403:
          this.handleForbidden();
          break;
        case 404:
          this.handleNotFound();
          break;
        case 500:
          this.handleServerError();
          break;
      }

      throw new Error(data?.message || `请求失败: ${status}`);
    } else if (error.request) {
      // 网络错误
      throw new Error('网络连接失败，请检查网络设置');
    } else {
      // 其他错误
      throw error;
    }
  }

  /**
   * 处理禁止访问
   */
  handleForbidden() {
    console.warn('访问被禁止，权限不足');
  }

  /**
   * 处理未找到
   */
  handleNotFound() {
    console.warn('请求的资源不存在');
  }

  /**
   * 处理服务器错误
   */
  handleServerError() {
    console.error('服务器内部错误');
  }
  
  /**
   * 解析URL
   */
  resolveURL(url, params = {}) {
    let fullURL;

    if (url.startsWith('http://') || url.startsWith('https://')) {
      fullURL = url;
    } else {
      // 构建完整URL
      if (this.baseURL.startsWith('http')) {
        // 绝对URL
        const urlObj = new URL(url, this.baseURL);
        fullURL = urlObj.toString();
      } else {
        // 相对URL（代理路径）
        const baseUrl = window.location.origin;
        const relativePath = `${this.baseURL}${url.startsWith('/') ? url.substring(1) : url}`;
        fullURL = new URL(relativePath, baseUrl).toString();
      }
    }

    // 添加查询参数
    if (params && Object.keys(params).length > 0) {
      const urlObj = new URL(fullURL);
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          urlObj.searchParams.append(key, params[key]);
        }
      });
      fullURL = urlObj.toString();
    }

    return fullURL;
  }
  
  /**
   * 生成请求ID
   */
  generateRequestId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  /**
   * 获取认证token
   */
  getAuthToken() {
    // 首先尝试从 UserManager 获取token
    if (this.userManager && this.userManager.getCurrentUser()) {
      return this.userManager.getCurrentUser().access_token;
    }
    // 备用: 不应该喻取localStorage，但提供一个恢复机制
    return null;
  }

  /**
   * GET请求
   * @returns {Promise<Object>} 返回原始响应数据 { success, message, data }
   */
  async get(url, params = {}, config = {}) {
    const response = await this.request({
      method: 'GET',
      url,
      params,
      ...config
    });
    return response.data;
  }

  /**
   * POST请求
   * @returns {Promise<Object>} 返回原始响应数据 { success, message, data }
   */
  async post(url, data, config = {}) {
    console.log("post 请求参数：",data,config);

    const response = await this.request({
      method: 'POST',
      url,
      data,
      ...config
    });
    return response.data;
  }

  /**
   * PUT请求
   * @returns {Promise<Object>} 返回原始响应数据 { success, message, data }
   */
  async put(url, data, config = {}) {
    const response = await this.request({
      method: 'PUT',
      url,
      data,
      ...config
    });
    return response.data;
  }

  /**
   * PATCH请求
   * @returns {Promise<Object>} 返回原始响应数据 { success, message, data }
   */
  async patch(url, data, config = {}) {
    const response = await this.request({
      method: 'PATCH',
      url,
      data,
      ...config
    });
    return response.data;
  }

  /**
   * DELETE请求
   * @returns {Promise<Object>} 返回原始响应数据 { success, message, data }
   */
  async delete(url, config = {}) {
    const response = await this.request({
      method: 'DELETE',
      url,
      ...config
    });
    return response.data;
  }
  
  /**
   * 上传文件
   */
  upload(url, file, config = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.request({
      method: 'POST',
      url,
      data: formData,
      headers: {
        // 不设置Content-Type，让浏览器自动设置
      },
      ...config
    });
  }
  
  /**
   * 下载文件
   */
  async download(url, filename, config = {}) {
    const response = await this.request({
      method: 'GET',
      url,
      ...config
    });
    
    // 创建下载链接
    const blob = new Blob([response.data]);
    const downloadUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    link.click();
    
    URL.revokeObjectURL(downloadUrl);
    
    return response;
  }
}

/**
 * 创建默认API服务实例
 */
export const apiService = new ApiService();
