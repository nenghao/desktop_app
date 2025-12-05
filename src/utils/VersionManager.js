/**
 * 版本管理工具
 * 负责版本检查、比较和更新通知等功能
 */

import { appConfigApiService } from '../services/api/AppConfigApiService.js';

export class VersionManager {
  constructor(options = {}) {
    this.eventBus = options.eventBus;
  }

  /**
   * 处理应用启动时的版本检查
   * @param {string} currentVersion - 当前版本
   * @returns {Promise<Object>} 版本检查结果
   */
  async handleAppStartup(currentVersion = '1.0.0') {
    // 只在 Electron 环境中进行版本检查
    const platform = this.detectPlatform();
    if (!platform) {
      console.log('🌐 [VersionManager] Web环境，跳过版本检查');
      return;
    }

    try {
      console.log(`🚀 [VersionManager] 应用启动版本检查 (v${currentVersion}, ${platform})`);

      // 调用API进行版本检查
      const versionResponse = await appConfigApiService.fetchAppConfig(platform, currentVersion);

      if (versionResponse && versionResponse.success && versionResponse.data) {
        console.log("✅ [VersionManager] 版本检查成功:", versionResponse.data);

        // 检查是否需要更新
        const updateStatus = this.checkUpdateNeeded(versionResponse, currentVersion);

        if (updateStatus.needsUpdate) {
          console.log("🆕 [VersionManager] 发现新版本:", updateStatus.latestVersion);
        } else {
          console.log("✅ [VersionManager] 应用已是最新版本");
        }
      } else {
        console.warn("⚠️ [VersionManager] 版本检查响应格式错误");
      }
    } catch (error) {
      console.error("❌ [VersionManager] 版本检查失败:", error);
    }
  }

  /**
   * 检测当前运行平台
   * @returns {string|null} 平台标识，Web环境返回null
   */
  detectPlatform() {
    // 只在 Electron 环境中进行版本检查
    if (typeof window !== 'undefined' && window.electronAPI) {
      const platform = window.electronAPI?.getPlatform?.();
      if (platform) {
        switch (platform.toLowerCase()) {
          case 'win32':
            return 'Windows';
          case 'darwin':
            return 'macOS';
          case 'linux':
            return 'linux';
          default:
            return platform;
        }
      }
    }

    // Web 环境 - 根据用户代理检测
    if (typeof navigator !== 'undefined') {
      const userAgent = navigator.userAgent.toLowerCase();

      if (userAgent.includes('mac')) {
        return 'macOS';
      } else if (userAgent.includes('win')) {
        return 'Windows';
      } else if (userAgent.includes('linux')) {
        return 'linux';
      } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
        return 'iOS';
      } else if (userAgent.includes('android')) {
        return 'Android';
      }
    }

    // 默认返回 'Web'
    return 'undefined';
  }

  /**
   * 检查是否需要更新
   * @param {Object} versionResponse - 版本检查API响应
   * @param {string} currentVersion - 当前版本
   * @returns {Object} 更新检查结果
   */
  checkUpdateNeeded(versionResponse, currentVersion) {
    if (!versionResponse || !versionResponse.data) {
      return {
        needsUpdate: false,
        reason: 'invalid_response'
      };
    }

    // 版本比较
    const needsUpdate = this.compareVersions(currentVersion, versionResponse.data.latest_version) < 0;
    const forceUpdate = versionResponse.data.force_update || false;

    // 统一包装更新信息对象
    const updateInfo = {
      currentVersion,
      latestVersion: versionResponse.data.latest_version,
      updateInfo: versionResponse.data.update_info,
      downloadUrl: versionResponse.data.download_url,
      forceUpdate,
      needsUpdate,
      reason: forceUpdate ? '为了给您提供更好的使用体验，需要更新到最新版本。' :
        '发现新版本'
    };

    // 如果需要更新，发送通知
    if (updateInfo.needsUpdate) {
      this.sendUpdateNotification(updateInfo);
    }

    return updateInfo;
  }

  /**
   * 比较版本号
   * @param {string} version1 - 版本号1
   * @param {string} version2 - 版本号2
   * @returns {number} -1: version1 < version2, 0: version1 == version2, 1: version1 > version2
   */
  compareVersions(version1, version2) {
    try {
      const v1Parts = version1.split('.').map(Number);
      const v2Parts = version2.split('.').map(Number);

      const maxLength = Math.max(v1Parts.length, v2Parts.length);

      for (let i = 0; i < maxLength; i++) {
        const v1Part = v1Parts[i] || 0;
        const v2Part = v2Parts[i] || 0;

        if (v1Part < v2Part) return -1;
        if (v1Part > v2Part) return 1;
      }

      return 0;
    } catch (error) {
      console.error('❌ [VersionManager] 版本号比较失败:', error);
      return 0;
    }
  }

  /**
   * 发送更新通知事件
   * @param {Object} updateInfo - 更新信息
   */
  sendUpdateNotification(updateInfo) {
    if (this.eventBus) {
      this.eventBus.emit("app:update-version", updateInfo);
      console.log("📢 [VersionManager] 已发送版本更新通知事件");
    } else {
      console.warn("⚠️ [VersionManager] 没有事件总线，无法发送版本更新通知");
    }
  }
}

// 创建默认实例
export const versionManager = new VersionManager();