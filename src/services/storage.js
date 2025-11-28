/**
 * 存储服务 - 本地存储管理
 */

export class StorageService {
  constructor() {
    this.prefix = 'Questech_';
    this.enableCompression = false;
    this.enableEncryption = false;
    this.maxStorageSize = 10 * 1024 * 1024; // 10MB
  }

  /**
   * 设置数据
   * @param {string} key 键名
   * @param {*} value 值
   * @param {Object} options 选项
   */
  set(key, value, options = {}) {
    try {
      const fullKey = this.getFullKey(key);
      const data = {
        value,
        timestamp: Date.now(),
        expires: options.expires || null,
        compressed: false,
        encrypted: false
      };

      let serializedData = JSON.stringify(data);

      // 压缩数据（如果启用）
      if (this.enableCompression && serializedData.length > 1024) {
        // 这里可以集成压缩库
        data.compressed = true;
      }

      // 加密数据（如果启用）
      if (this.enableEncryption) {
        // 这里可以集成加密库
        data.encrypted = true;
      }

      // 检查存储大小
      if (this.getStorageSize() + serializedData.length > this.maxStorageSize) {
        this.cleanup();
      }

      localStorage.setItem(fullKey, JSON.stringify(data));
      return true;

    } catch (error) {
      console.error('[StorageService] 设置数据失败:', error);
      return false;
    }
  }

  /**
   * 获取数据
   * @param {string} key 键名
   * @param {*} defaultValue 默认值
   */
  get(key, defaultValue = null) {
    try {
      const fullKey = this.getFullKey(key);
      const item = localStorage.getItem(fullKey);

      if (!item) {
        return defaultValue;
      }

      const data = JSON.parse(item);

      // 检查过期时间
      if (data.expires && Date.now() > data.expires) {
        this.remove(key);
        return defaultValue;
      }

      // 解密数据（如果需要）
      if (data.encrypted) {
        // 这里可以集成解密逻辑
      }

      // 解压数据（如果需要）
      if (data.compressed) {
        // 这里可以集成解压逻辑
      }

      return data.value;

    } catch (error) {
      console.error('[StorageService] 获取数据失败:', error);
      return defaultValue;
    }
  }

  /**
   * 移除数据
   * @param {string} key 键名
   */
  remove(key) {
    try {
      const fullKey = this.getFullKey(key);
      localStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      console.error('[StorageService] 移除数据失败:', error);
      return false;
    }
  }

  /**
   * 检查键是否存在
   * @param {string} key 键名
   */
  has(key) {
    const fullKey = this.getFullKey(key);
    return localStorage.getItem(fullKey) !== null;
  }

  /**
   * 清除所有数据
   */
  clear() {
    try {
      const keys = this.getAllKeys();
      keys.forEach(key => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.error('[StorageService] 清除数据失败:', error);
      return false;
    }
  }

  /**
   * 获取所有键名
   */
  getAllKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * 获取存储大小
   */
  getStorageSize() {
    let size = 0;
    const keys = this.getAllKeys();

    keys.forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        size += item.length;
      }
    });

    return size;
  }

  /**
   * 获取存储信息
   */
  getStorageInfo() {
    const keys = this.getAllKeys();
    const size = this.getStorageSize();

    return {
      totalKeys: keys.length,
      totalSize: size,
      maxSize: this.maxStorageSize,
      usagePercentage: (size / this.maxStorageSize) * 100,
      keys: keys.map(key => ({
        key: key.replace(this.prefix, ''),
        size: localStorage.getItem(key)?.length || 0
      }))
    };
  }

  /**
   * 清理过期数据
   */
  cleanup() {
    const keys = this.getAllKeys();
    let cleanedCount = 0;

    keys.forEach(fullKey => {
      try {
        const item = localStorage.getItem(fullKey);
        if (item) {
          const data = JSON.parse(item);

          // 移除过期数据
          if (data.expires && Date.now() > data.expires) {
            localStorage.removeItem(fullKey);
            cleanedCount++;
          }
        }
      } catch (error) {
        // 移除损坏的数据
        localStorage.removeItem(fullKey);
        cleanedCount++;
      }
    });

    console.log(`[StorageService] 清理完成，移除 ${cleanedCount} 个项目`);
    return cleanedCount;
  }

  /**
   * 导出数据
   */
  export() {
    const data = {};
    const keys = this.getAllKeys();

    keys.forEach(fullKey => {
      const key = fullKey.replace(this.prefix, '');
      const value = this.get(key);
      if (value !== null) {
        data[key] = value;
      }
    });

    return {
      version: '1.0.0',
      timestamp: Date.now(),
      data
    };
  }

  /**
   * 导入数据
   * @param {Object} exportData 导出的数据
   * @param {Object} options 选项
   */
  import(exportData, options = {}) {
    const { overwrite = false, validate = true } = options;

    try {
      // 验证数据格式
      if (validate && (!exportData.data || !exportData.version)) {
        throw new Error('无效的导入数据格式');
      }

      let importedCount = 0;
      let skippedCount = 0;

      Object.entries(exportData.data).forEach(([key, value]) => {
        if (!overwrite && this.has(key)) {
          skippedCount++;
          return;
        }

        if (this.set(key, value)) {
          importedCount++;
        }
      });

      console.log(`[StorageService] 导入完成: ${importedCount} 个项目，跳过 ${skippedCount} 个`);

      return {
        success: true,
        imported: importedCount,
        skipped: skippedCount
      };

    } catch (error) {
      console.error('[StorageService] 导入失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取完整键名
   * @param {string} key 键名
   */
  getFullKey(key) {
    return this.prefix + key;
  }

  /**
   * 设置配置
   * @param {Object} config 配置对象
   */
  setConfig(config) {
    if (config.prefix !== undefined) {
      this.prefix = config.prefix;
    }
    if (config.enableCompression !== undefined) {
      this.enableCompression = config.enableCompression;
    }
    if (config.enableEncryption !== undefined) {
      this.enableEncryption = config.enableEncryption;
    }
    if (config.maxStorageSize !== undefined) {
      this.maxStorageSize = config.maxStorageSize;
    }
  }

  /**
   * 检查存储是否可用
   */
  static isAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }
}
