/**
 * 智能体安装管理器
 * 负责智能体的安装、卸载和版本管理
 */

import { electronAdapter } from '../../utils/electron-adapter.js';

export class AgentInstallManager {
  constructor(storageManager) {
    this.storageManager = storageManager;
    this.installedAgents = new Map();
    this.initialized = false;
  }

  /**
   * 初始化安装管理器
   */
  async initialize() {
    if (this.initialized) {
      console.log('✅ AgentInstallManager 已初始化');
      return;
    }

    try {
      // 加载已安装智能体列表
      await this.loadInstalledAgents();
      
      this.initialized = true;
      console.log('✅ AgentInstallManager 初始化完成');
      
    } catch (error) {
      console.error('❌ AgentInstallManager 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 安装智能体
   * @param {Object} agentData - 智能体数据
   * @param {Object} downloadTask - 下载任务对象
   * @param {Function} progressCallback - 进度回调
   * @returns {Promise<Object>} 安装结果
   */
  async installAgent(agentData, downloadTask, progressCallback = null) {
    const { agentId, version } = downloadTask;
    
    try {
      console.log(`🔧 开始安装智能体: ${agentId} v${version}`);
      
      // 更新进度: 安装中
      if (progressCallback) {
        progressCallback({ type: 'installing', message: '正在安装智能体...' });
      }

      // 1. 创建安装目录
      const installPath = await this.storageManager.getAgentInstallPath(agentId, version);
      await this.ensureDirectory(installPath);
      console.log(`📁 创建安装目录: ${installPath}`);

      // 2. 移动文件从cache到installed
      for (const file of downloadTask.files) {
        const targetPath = electronAdapter.isElectron
          ? await window.pathAPI.join(installPath, file.name)
          : `${installPath}/${file.name}`;
        await this.moveFile(file.localPath, targetPath);
        console.log(`📦 移动文件: ${file.name}`);

        // Unix系统设置可执行权限
        if (agentData.type === 'executable' && this.storageManager.getPlatform() !== 'win32') {
          await this.setExecutable(targetPath);
          console.log(`🔐 设置可执行权限: ${file.name}`);
        }
      }

      // 3. 生成manifest.json
      const manifest = this.generateManifest(agentData, downloadTask);
      const manifestPath = electronAdapter.isElectron
        ? await window.pathAPI.join(installPath, 'manifest.json')
        : `${installPath}/manifest.json`;
      await this.writeJsonFile(manifestPath, manifest);
      console.log(`📄 生成manifest.json`);

      // 4. 创建current软链接
      await this.createCurrentLink(agentId, version);
      console.log(`🔗 创建current软链接`);

      // 5. 更新已安装列表
      this.installedAgents.set(agentId, {
        id: agentId,
        version: version,
        installPath: installPath,
        installedAt: new Date().toISOString()
      });
      await this.saveInstalledAgents();
      console.log(`💾 更新已安装列表`);

      // 6. 安装完成 (依赖管理已移到服务器端)
      if (progressCallback) {
        progressCallback({ type: 'completed', message: '安装完成 ✓' });
      }

      console.log(`✅ 智能体安装完成: ${agentId} v${version}`);

      return {
        success: true,
        installPath: installPath,
        manifest: manifest
      };

    } catch (error) {
      console.error(`❌ 智能体安装失败: ${agentId}`, error);
      
      if (progressCallback) {
        progressCallback({ type: 'failed', message: `安装失败: ${error.message}` });
      }
      
      throw error;
    }
  }

  /**
   * 生成manifest.json
   * @param {Object} agentData - 智能体数据
   * @param {Object} downloadTask - 下载任务
   * @returns {Object} manifest对象
   */
  generateManifest(agentData, downloadTask) {
    return {
      id: agentData.id,
      name: agentData.name,
      description: agentData.description || '',
      version: agentData.version,
      type: agentData.type,
      installed_at: new Date().toISOString(),
      platform: {
        os: this.storageManager.getPlatform(),
        arch: electronAdapter.getArchitecture ? electronAdapter.getArchitecture() : 'x64'
      },
      files: downloadTask.files.map(f => ({
        name: f.name,
        path: f.name,
        hash: f.hash, // 保存文件的 hash 值，用于后续更新检查
        type: f.type, // 'executable' 或 'lib'
        checksum: f.checksum,
        size: f.size,
        downloaded_at: new Date().toISOString()
      })),
      entry_point: downloadTask.files[0].name,
      dependencies: agentData.dependencies || [],
      dependency_status: agentData.dependencies?.length > 0 ? 'pending' : 'none'
    };
  }


  /**
   * 创建current软链接
   * @param {string} agentId - 智能体ID
   * @param {string} version - 版本号
   */
  async createCurrentLink(agentId, version) {
    if (!electronAdapter.isElectron) {
      console.log('🌐 浏览器环境，跳过软链接创建');
      return;
    }

    const targetPath = await this.storageManager.getAgentInstallPath(agentId, version);
    const linkPath = await this.storageManager.getAgentCurrentPath(agentId);

    try {
      if (window.electronAPI && window.electronAPI.createSymlink) {
        await window.electronAPI.createSymlink(targetPath, linkPath);
      } else {
        console.warn('⚠️ createSymlink API 不可用');
      }
    } catch (error) {
      console.error('❌ 创建软链接失败:', error);
      // 软链接创建失败不影响安装，继续执行
    }
  }

  /**
   * 卸载智能体
   * @param {string} agentId - 智能体ID
   */
  async uninstallAgent(agentId) {
    const agent = this.installedAgents.get(agentId);
    
    if (!agent) {
      throw new Error(`智能体未安装: ${agentId}`);
    }

    try {
      console.log(`🗑️ 开始卸载智能体: ${agentId}`);

      // 删除智能体目录
      const agentRootPath = await this.storageManager.getAgentRootPath(agentId);
      await this.deleteDirectory(agentRootPath);
      console.log(`📁 删除智能体目录: ${agentRootPath}`);

      // 从已安装列表移除
      this.installedAgents.delete(agentId);
      await this.saveInstalledAgents();
      console.log(`💾 更新已安装列表`);

      console.log(`✅ 智能体卸载完成: ${agentId}`);

    } catch (error) {
      console.error(`❌ 智能体卸载失败: ${agentId}`, error);
      throw error;
    }
  }

  /**
   * 检查智能体是否已安装
   * @param {string} agentId - 智能体ID
   * @returns {boolean} 是否已安装
   */
  isInstalled(agentId) {
    return this.installedAgents.has(agentId);
  }

  /**
   * 验证智能体文件完整性
   * @param {string} agentId - 智能体ID
   * @returns {Promise<boolean>} 文件是否完整
   */
  async verifyAgentIntegrity(agentId) {
    try {
      // 检查是否在已安装列表中
      if (!this.installedAgents.has(agentId)) {
        console.log(`❌ 智能体不在已安装列表中: ${agentId}`);
        return false;
      }

      // 获取 manifest 路径
      const agent = this.installedAgents.get(agentId);
      const manifestPath = await this.storageManager.getManifestPath(agentId, agent.version);

      // 检查 manifest 文件是否存在
      const manifestExists = await electronAdapter.fileExists(manifestPath);
      if (!manifestExists) {
        console.log(`❌ Manifest 文件不存在: ${manifestPath}`);
        return false;
      }

      // 读取 manifest
      const manifest = await this.readJsonFile(manifestPath);

      // 检查所有文件是否存在
      const installPath = await this.storageManager.getAgentInstallPath(agentId, agent.version);

      for (const file of manifest.files) {
        const filePath = electronAdapter.isElectron
          ? await window.pathAPI.join(installPath, file.name)
          : `${installPath}/${file.name}`;

        const fileExists = await electronAdapter.fileExists(filePath);
        if (!fileExists) {
          console.log(`❌ 智能体文件缺失: ${filePath}`);
          return false;
        }
      }

      console.log(`✅ 智能体文件完整性验证通过: ${agentId}`);
      return true;

    } catch (error) {
      console.error(`❌ 验证智能体完整性失败: ${agentId}`, error);
      return false;
    }
  }

  /**
   * 获取已安装智能体信息
   * @param {string} agentId - 智能体ID
   * @returns {Object|null} 智能体信息
   */
  getInstalledAgent(agentId) {
    return this.installedAgents.get(agentId) || null;
  }

  /**
   * 获取所有已安装智能体
   * @returns {Array} 已安装智能体列表
   */
  getAllInstalledAgents() {
    return Array.from(this.installedAgents.values());
  }

  /**
   * 加载已安装智能体列表
   */
  async loadInstalledAgents() {
    const listPath = await this.storageManager.getInstalledAgentsListPath();

    try {
      const data = await this.readJsonFile(listPath);

      if (Array.isArray(data)) {
        data.forEach(agent => {
          this.installedAgents.set(agent.id, agent);
        });
        console.log(`📋 加载已安装智能体列表: ${data.length} 个`);
      }
    } catch (error) {
      console.log('ℹ️ 未找到已安装智能体列表，将创建新列表');
      this.installedAgents.clear();
    }
  }

  /**
   * 保存已安装智能体列表
   */
  async saveInstalledAgents() {
    const listPath = await this.storageManager.getInstalledAgentsListPath();
    const data = Array.from(this.installedAgents.values());

    await this.writeJsonFile(listPath, data);
    console.log(`💾 保存已安装智能体列表: ${data.length} 个`);
  }

  // ==================== 辅助方法 ====================

  async ensureDirectory(dirPath) {
    await this.storageManager.ensureDirectory(dirPath);
  }

  async moveFile(sourcePath, targetPath) {
    if (electronAdapter.isElectron && window.electronAPI && window.electronAPI.moveFile) {
      await window.electronAPI.moveFile(sourcePath, targetPath);
    } else {
      console.log(`🌐 浏览器环境，模拟移动文件: ${sourcePath} -> ${targetPath}`);
    }
  }

  async setExecutable(filePath) {
    if (electronAdapter.isElectron && window.electronAPI && window.electronAPI.setExecutable) {
      await window.electronAPI.setExecutable(filePath);
    }
  }

  async deleteDirectory(dirPath) {
    if (electronAdapter.isElectron && window.electronAPI && window.electronAPI.deleteDirectory) {
      await window.electronAPI.deleteDirectory(dirPath);
    }
  }

  async readJsonFile(filePath) {
    if (electronAdapter.isElectron) {
      const content = await electronAdapter.readFile(filePath);
      return JSON.parse(content);
    }
    return {};
  }

  async writeJsonFile(filePath, data) {
    try {
      const content = JSON.stringify(data, null, 2);
      console.log(`📝 准备写入JSON文件: ${filePath}`);
      console.log(`📝 内容长度: ${content.length} 字符`);

      if (electronAdapter.isElectron) {
        await electronAdapter.writeFile(filePath, content);
      }
    } catch (error) {
      console.error(`❌ 写入JSON文件失败: ${filePath}`, error);
      throw error;
    }
  }
}

