/**
 * 智能体下载管理器
 * 负责智能体文件的下载、进度跟踪和文件验证
 */

import { electronAdapter } from '../../utils/electron-adapter.js';

export class AgentDownloadManager {
  constructor(storageManager) {
    this.storageManager = storageManager;
    this.activeDownloads = new Map();
    this.downloadQueue = [];
  }

  /**
   * 下载智能体
   * @param {Object} agentData - 智能体数据（从API获取）
   * @param {Function} progressCallback - 进度回调函数
   * @returns {Promise<Object>} 下载任务对象
   */
  async downloadAgent(agentData, progressCallback = null) {
    const downloadId = `${agentData.id}_${agentData.version}`;
    
    // 检查是否已在下载
    if (this.activeDownloads.has(downloadId)) {
      throw new Error(`智能体 ${agentData.id} 正在下载中`);
    }

    // 创建下载任务
    const task = this.createDownloadTask(agentData);
    
    // 添加到活动下载列表
    this.activeDownloads.set(downloadId, task);
    
    try {
      // 开始下载
      await this.processDownload(task, progressCallback);
      
      // 下载完成
      task.status = 'completed';
      task.endTime = Date.now();
      
      console.log(`✅ 智能体下载完成: ${agentData.id}`);
      
      return task;
      
    } catch (error) {
      // 下载失败
      task.status = 'failed';
      task.error = error.message;
      task.endTime = Date.now();
      
      console.error(`❌ 智能体下载失败: ${agentData.id}`, error);
      
      throw error;
      
    } finally {
      // 从活动下载列表移除
      this.activeDownloads.delete(downloadId);
    }
  }

  /**
   * 创建下载任务
   * @param {Object} agentData - 智能体数据
   * @returns {Object} 下载任务对象
   */
  createDownloadTask(agentData) {
    const task = {
      id: `${agentData.id}_${agentData.version}`,
      agentId: agentData.id,
      version: agentData.version,
      type: agentData.type,
      files: [],
      totalSize: 0,
      downloadedSize: 0,
      status: 'pending',
      startTime: Date.now(),
      endTime: null,
      error: null
    };

    // 确定要下载的文件
    task.files = [];

    // 从 detail 对象中获取 librarys 和 executables（新格式）
    // 如果没有 detail，则从顶层获取（兼容旧格式）
    const librarys = agentData.detail?.librarys || agentData.librarys || {};
    const executables = agentData.detail?.executables || agentData.executables || {};

    console.log('📦 检查下载文件:', {
      hasDetail: !!agentData.detail,
      librarysKeys: Object.keys(librarys),
      executablesKeys: Object.keys(executables)
    });

    // 下载 librarys（.pyd/.so文件）
    // 新格式: { "hash1": "url1", "hash2": "url2" }
    if (librarys && typeof librarys === 'object') {
      const libHashes = Object.keys(librarys);

      if (libHashes.length > 0) {
        const libFiles = libHashes.map((hash) => {
          const url = librarys[hash];
          const fileName = this.extractFileName(url);

          console.log(`📦 库文件 [${hash}]: ${url}`);
          console.log(`📦 文件名: ${fileName}`);

          return {
            url,
            name: fileName,
            type: 'lib',
            hash: hash,
            size: agentData.file_sizes?.[fileName] || 0,
            checksum: agentData.checksums?.[fileName] || null,
            downloaded: 0,
            localPath: null
          };
        });
        task.files.push(...libFiles);
        console.log(`📦 添加 ${libFiles.length} 个库文件到下载列表`);
      }
    }

    // 下载 executables（.exe文件）
    // 新格式: { "hash1": "url1", "hash2": "url2" }
    if (executables && typeof executables === 'object') {
      const exeHashes = Object.keys(executables);

      if (exeHashes.length > 0) {
        const exeFiles = exeHashes.map((hash) => {
          const url = executables[hash];
          const fileName = this.extractFileName(url);

          console.log(`📦 可执行文件 [${hash}]: ${url}`);
          console.log(`📦 文件名: ${fileName}`);

          return {
            url,
            name: fileName,
            type: 'executable',
            hash: hash,
            size: agentData.file_sizes?.[fileName] || 0,
            checksum: agentData.checksums?.[fileName] || null,
            downloaded: 0,
            localPath: null
          };
        });
        task.files.push(...exeFiles);
        console.log(`📦 添加 ${exeFiles.length} 个可执行文件到下载列表`);
      }
    }

    // 检查是否有文件需要下载
    if (task.files.length === 0) {
      throw new Error(`智能体 ${agentData.id} 没有可下载的文件（librarys和executables都为空）`);
    }

    // 计算总大小
    task.totalSize = task.files.reduce((sum, file) => sum + file.size, 0);

    console.log(`📦 总共需要下载 ${task.files.length} 个文件，总大小: ${task.totalSize} bytes`);

    return task;
  }

  /**
   * 处理下载任务
   * @param {Object} task - 下载任务
   * @param {Function} progressCallback - 进度回调
   */
  async processDownload(task, progressCallback) {
    task.status = 'downloading';

    for (let i = 0; i < task.files.length; i++) {
      const file = task.files[i];

      // 生成缓存文件路径
      const targetPath = await this.storageManager.getCacheFilePath(
        task.agentId,
        task.version,
        file.name
      );

      console.log(`📥 开始下载文件 (${i + 1}/${task.files.length}): ${file.name}`);

      // 下载单个文件
      await this.downloadFile(file, targetPath, (progress) => {
        // 更新文件下载进度
        file.downloaded = progress.loaded;
        
        // 计算总进度
        task.downloadedSize = task.files.reduce((sum, f) => sum + f.downloaded, 0);
        
        // 触发进度回调
        if (progressCallback) {
          progressCallback({
            type: 'downloading',
            current: i + 1,
            total: task.files.length,
            fileName: file.name,
            fileProgress: file.size > 0 ? (progress.loaded / file.size * 100).toFixed(1) : 0,
            totalProgress: task.totalSize > 0 ? (task.downloadedSize / task.totalSize * 100).toFixed(1) : 0
          });
        }
      });

      // 验证文件完整性
      if (file.checksum) {
        console.log(`🔍 验证文件校验和: ${file.name}`);
        const isValid = await this.verifyChecksum(targetPath, file.checksum);
        
        if (!isValid) {
          throw new Error(`文件校验失败: ${file.name}`);
        }
        
        console.log(`✅ 文件校验通过: ${file.name}`);
      }

      // 保存本地路径
      file.localPath = targetPath;
    }

    console.log(`✅ 所有文件下载完成: ${task.agentId}`);
  }

  /**
   * 下载单个文件
   * @param {Object} file - 文件对象
   * @param {string} targetPath - 目标路径
   * @param {Function} onProgress - 进度回调
   */
  async downloadFile(file, targetPath, onProgress) {
    try {
      const response = await fetch(file.url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const totalSize = parseInt(response.headers.get('content-length') || file.size);
      
      const reader = response.body.getReader();
      let receivedSize = 0;
      const chunks = [];
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        receivedSize += value.length;
        
        // 触发进度回调
        if (onProgress) {
          onProgress({
            loaded: receivedSize,
            total: totalSize
          });
        }
      }
      
      // 合并数据
      const blob = new Blob(chunks);
      const buffer = await blob.arrayBuffer();

      // 写入文件
      if (electronAdapter.isElectron) {
        // 使用 Uint8Array 代替 Buffer（渲染进程中没有 Buffer）
        const uint8Array = new Uint8Array(buffer);
        await electronAdapter.writeFile(targetPath, uint8Array);
      } else {
        // 浏览器环境：保存到内存（用于测试）
        console.log(`🌐 浏览器环境，文件保存到内存: ${targetPath}`);
      }
      
      console.log(`✅ 文件下载成功: ${file.name} (${receivedSize} bytes)`);
      
    } catch (error) {
      console.error(`❌ 文件下载失败: ${file.name}`, error);
      throw error;
    }
  }

  /**
   * 验证文件校验和
   * @param {string} filePath - 文件路径
   * @param {string} expectedChecksum - 期望的校验和（格式：sha256:xxx）
   * @returns {Promise<boolean>} 是否验证通过
   */
  async verifyChecksum(filePath, expectedChecksum) {
    if (!electronAdapter.isElectron) {
      console.log('🌐 浏览器环境，跳过文件校验');
      return true;
    }

    try {
      // 通过Electron IPC计算文件哈希
      if (window.electronAPI && window.electronAPI.calculateFileHash) {
        const actualChecksum = await window.electronAPI.calculateFileHash(filePath);
        const expected = expectedChecksum.replace('sha256:', '');
        
        return actualChecksum === expected;
      } else {
        console.warn('⚠️ calculateFileHash API 不可用，跳过校验');
        return true;
      }
    } catch (error) {
      console.error('❌ 文件校验失败:', error);
      return false;
    }
  }

  /**
   * 从URL提取文件名
   * @param {string} url - URL
   * @returns {string} 文件名
   */
  extractFileName(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.split('/').pop() || 'unknown';
    } catch (error) {
      // 如果URL解析失败，尝试简单分割
      return url.split('/').pop() || 'unknown';
    }
  }

  /**
   * 取消下载
   * @param {string} agentId - 智能体ID
   * @param {string} version - 版本号
   */
  async cancelDownload(agentId, version) {
    const downloadId = `${agentId}_${version}`;
    const task = this.activeDownloads.get(downloadId);
    
    if (task) {
      task.status = 'cancelled';
      this.activeDownloads.delete(downloadId);
      
      console.log(`🚫 下载已取消: ${agentId}`);
    }
  }

  /**
   * 获取下载进度
   * @param {string} agentId - 智能体ID
   * @param {string} version - 版本号
   * @returns {Object|null} 下载进度信息
   */
  getDownloadProgress(agentId, version) {
    const downloadId = `${agentId}_${version}`;
    const task = this.activeDownloads.get(downloadId);
    
    if (!task) {
      return null;
    }

    return {
      agentId: task.agentId,
      version: task.version,
      status: task.status,
      totalSize: task.totalSize,
      downloadedSize: task.downloadedSize,
      progress: task.totalSize > 0 ? (task.downloadedSize / task.totalSize * 100).toFixed(1) : 0,
      currentFile: task.files.findIndex(f => f.downloaded < f.size) + 1,
      totalFiles: task.files.length
    };
  }

  /**
   * 获取所有活动下载
   * @returns {Array} 活动下载列表
   */
  getActiveDownloads() {
    return Array.from(this.activeDownloads.values());
  }
}

