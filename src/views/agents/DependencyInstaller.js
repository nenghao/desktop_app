/**
 * 依赖安装器UI组件
 * @deprecated 此文件已废弃 - 依赖管理功能已迁移到服务器端
 * 智能体依赖现在由服务器自动处理，不再需要本地 Python 环境
 */

import { NotificationCenter } from '../../components/common/NotificationCenter.js';

class DependencyInstaller {
  constructor(agentData, container) {
    this.agentData = agentData;
    this.container = container;
    this.isInstalling = false;
  }

  /**
   * 检查依赖状态
   */
  async checkDependencies(pythonEnvironment) {
    try {
      if (!pythonEnvironment) {
        throw new Error('Python环境未初始化');
      }

      const agentName = this.agentData.id || 'math_calculator';
      const pluginFileName = this.agentData.plugin_file || 'math_calculator.py';
      const pluginPath = await pythonEnvironment.buildPluginPath(`${agentName}/${pluginFileName}`);

      // 调用Python脚本检查依赖状态
      const result = await pythonEnvironment.executePython(pluginPath, ['--check-deps']);

      if (result.success) {
        return JSON.parse(result.output);
      } else {
        throw new Error(result.error || '检查依赖失败');
      }
    } catch (error) {
      console.error('检查依赖状态失败:', error);
      if (window.notificationCenter) {
        window.notificationCenter.error('检查依赖状态失败: ' + error.message);
      }
      return {
        manager_available: false,
        dependencies: {},
        message: error.message
      };
    }
  }

  /**
   * 渲染依赖状态界面
   */
  async render() {
    this.container.innerHTML = `
      <div class="dependency-installer">
        <div class="dependency-header">
          <h3>📦 依赖管理</h3>
          <div class="dependency-status" id="dependency-status">
            <div class="loading-spinner"></div>
            <span>正在检查依赖状态...</span>
          </div>
        </div>
        
        <div class="dependency-content" id="dependency-content">
          <!-- 依赖状态将在这里显示 -->
        </div>
      </div>
    `;

    // 检查依赖状态
    await this.updateDependencyStatus();
  }

  /**
   * 更新依赖状态显示
   */
  async updateDependencyStatus() {
    const statusElement = this.container.querySelector('#dependency-status');
    const contentElement = this.container.querySelector('#dependency-content');

    try {
      const status = await this.checkDependencies();

      if (!status.manager_available) {
        statusElement.innerHTML = `
          <span class="status-error">❌ 依赖管理器不可用</span>
        `;
        contentElement.innerHTML = `
          <div class="dependency-error">
            <p>依赖管理器不可用，无法自动安装依赖包。</p>
            <p>请手动安装所需依赖：</p>
            <code>pip install numpy scipy</code>
          </div>
        `;
        return;
      }

      // 显示依赖状态
      if (status.has_missing) {
        statusElement.innerHTML = `
          <span class="status-warning">⚠️ 缺少依赖包</span>
        `;
        this.renderMissingDependencies(contentElement, status);
      } else {
        statusElement.innerHTML = `
          <span class="status-success">✅ 所有依赖已安装</span>
        `;
        this.renderInstalledDependencies(contentElement, status);
      }

    } catch (error) {
      statusElement.innerHTML = `
        <span class="status-error">❌ 检查失败</span>
      `;
      contentElement.innerHTML = `
        <div class="dependency-error">
          <p>检查依赖状态时出错：${error.message}</p>
          <button class="btn btn-secondary" onclick="location.reload()">重试</button>
        </div>
      `;
    }
  }

  /**
   * 渲染缺失依赖的界面
   */
  renderMissingDependencies(container, status) {
    const missingList = status.missing_dependencies.map(dep => `<li>${dep}</li>`).join('');

    container.innerHTML = `
      <div class="missing-dependencies">
        <div class="missing-info">
          <h4>缺失的依赖包：</h4>
          <ul class="missing-list">${missingList}</ul>
          <p class="missing-description">
            这些依赖包提供高级数学功能，如矩阵运算、微积分、概率分布等。
            安装后可以使用完整的数学计算功能。
          </p>
        </div>
        
        <div class="install-section">
          <div class="install-options">
            <label>
              <input type="radio" name="mirror" value="auto" checked>
              自动选择最快镜像源
            </label>
            <label>
              <input type="radio" name="mirror" value="tsinghua">
              清华大学镜像源
            </label>
            <label>
              <input type="radio" name="mirror" value="aliyun">
              阿里云镜像源
            </label>
            <label>
              <input type="radio" name="mirror" value="douban">
              豆瓣镜像源
            </label>
          </div>
          
          <div class="install-actions">
            <button id="install-deps-btn" class="btn btn-primary">
              📦 安装依赖包
            </button>
            <button id="skip-deps-btn" class="btn btn-secondary">
              跳过（使用基础功能）
            </button>
          </div>
          
          <div class="install-progress" id="install-progress" style="display: none;">
            <div class="progress-bar">
              <div class="progress-fill"></div>
            </div>
            <div class="progress-text">准备安装...</div>
          </div>
        </div>
      </div>
    `;

    // 绑定事件
    this.bindInstallEvents();
  }

  /**
   * 渲染已安装依赖的界面
   */
  renderInstalledDependencies(container, status) {
    const depsList = Object.entries(status.dependencies)
      .map(([name, installed]) => `
        <li class="dep-item ${installed ? 'installed' : 'missing'}">
          <span class="dep-name">${name}</span>
          <span class="dep-status">${installed ? '✅ 已安装' : '❌ 未安装'}</span>
        </li>
      `).join('');

    container.innerHTML = `
      <div class="installed-dependencies">
        <div class="deps-list">
          <h4>依赖状态：</h4>
          <ul class="dependencies-list">${depsList}</ul>
        </div>
        
        <div class="deps-info">
          <div class="info-item">
            <span class="info-label">占用空间：</span>
            <span class="info-value">${status.dependency_size}</span>
          </div>
          ${status.dependency_info.install_time ? `
            <div class="info-item">
              <span class="info-label">安装时间：</span>
              <span class="info-value">${new Date(status.dependency_info.install_time).toLocaleString()}</span>
            </div>
          ` : ''}
          ${status.dependency_info.mirror_used ? `
            <div class="info-item">
              <span class="info-label">镜像源：</span>
              <span class="info-value">${status.dependency_info.mirror_used}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="deps-actions">
          <button id="uninstall-deps-btn" class="btn btn-secondary">
            🗑️ 卸载依赖
          </button>
          <button id="reinstall-deps-btn" class="btn btn-secondary">
            🔄 重新安装
          </button>
        </div>
      </div>
    `;

    // 绑定事件
    this.bindManageEvents();
  }

  /**
   * 绑定安装相关事件
   */
  bindInstallEvents() {
    const installBtn = this.container.querySelector('#install-deps-btn');
    const skipBtn = this.container.querySelector('#skip-deps-btn');

    if (installBtn) {
      installBtn.addEventListener('click', () => {
        const pythonEnvironment = window.app.getService('pythonEnvironment');
        this.installDependencies(pythonEnvironment);
      });
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        // 触发跳过事件，让父组件处理
        this.container.dispatchEvent(new CustomEvent('dependenciesSkipped'));
      });
    }
  }

  /**
   * 绑定管理相关事件
   */
  bindManageEvents() {
    const uninstallBtn = this.container.querySelector('#uninstall-deps-btn');
    const reinstallBtn = this.container.querySelector('#reinstall-deps-btn');

    if (uninstallBtn) {
      uninstallBtn.addEventListener('click', () => {
        const pythonEnvironment = window.app.getService('pythonEnvironment');
        this.uninstallDependencies(pythonEnvironment);
      });
    }

    if (reinstallBtn) {
      reinstallBtn.addEventListener('click', () => {
        const pythonEnvironment = window.app.getService('pythonEnvironment');
        this.installDependencies(pythonEnvironment);
      });
    }
  }

  /**
   * 安装依赖
   */
  async installDependencies(pythonEnvironment) {
    if (this.isInstalling) return;

    if (!pythonEnvironment) {
      throw new Error('Python环境未初始化');
    }

    this.isInstalling = true;
    const installBtn = this.container.querySelector('#install-deps-btn');
    const progressElement = this.container.querySelector('#install-progress');
    const progressText = progressElement.querySelector('.progress-text');

    // 获取选择的镜像源
    const selectedMirror = this.container.querySelector('input[name="mirror"]:checked')?.value || 'auto';

    try {
      // 显示进度
      installBtn.disabled = true;
      progressElement.style.display = 'block';

      // 调用Python安装依赖
      const agentName = this.agentData.id || 'math_calculator';
      const pluginFileName = this.agentData.plugin_file || 'math_calculator.py';
      const pluginPath = await pythonEnvironment.buildPluginPath(`${agentName}/${pluginFileName}`);

      const args = ['--install-deps'];
      if (selectedMirror !== 'auto') {
        args.push('--mirror', selectedMirror);
      }

      progressText.textContent = '正在安装依赖包...';
      const result = await pythonEnvironment.executePython(pluginPath, args);

      if (result.success) {
        const installResult = JSON.parse(result.output);
        if (installResult.success) {
          progressText.textContent = '安装完成！';
          setTimeout(() => {
            // 重新检查依赖状态
            this.updateDependencyStatus();
            // 触发安装完成事件
            this.container.dispatchEvent(new CustomEvent('dependenciesInstalled'));
          }, 1000);
        } else {
          throw new Error(installResult.message);
        }
      } else {
        throw new Error(result.error || '安装失败');
      }

    } catch (error) {
      console.error('安装依赖失败:', error);
      if (window.notificationCenter) {
        window.notificationCenter.error('安装依赖失败: ' + error.message);
      }
      progressText.textContent = `安装失败: ${error.message}`;
      installBtn.disabled = false;
    } finally {
      this.isInstalling = false;
    }
  }

  async installDependency(dependencyName, progressCallback, pythonEnvironment) {
    if (this.isInstalling) {
      console.warn('已有安装任务在进行中');
      return;
    }

    if (!pythonEnvironment) {
      throw new Error('Python环境未初始化');
    }

    this.isInstalling = true;

    try {
      // 获取选中的镜像源
      const selectedMirror = document.querySelector('input[name="mirror"]:checked')?.value || 'auto';

      // 调用Python安装依赖
      const agentName = this.agentData.id || 'math_calculator';
      const pluginFileName = this.agentData.plugin_file || 'math_calculator.py';
      const pluginPath = await pythonEnvironment.buildPluginPath(`${agentName}/${pluginFileName}`);

      const args = ['--install-deps'];
      if (selectedMirror !== 'auto') {
        args.push('--mirror', selectedMirror);
      }

      progressCallback('正在安装依赖包...');
      const result = await pythonEnvironment.executePython(pluginPath, args);

      if (result.success) {
        const installResult = JSON.parse(result.output);
        if (installResult.success) {
          progressCallback('安装完成！');
          setTimeout(() => {
            // 重新检查依赖状态
            this.updateDependencyStatus();
            // 触发安装完成事件
            this.container.dispatchEvent(new CustomEvent('dependenciesInstalled'));
          }, 1000);
        } else {
          throw new Error(installResult.message);
        }
      } else {
        throw new Error(result.error || '安装失败');
      }

    } catch (error) {
      console.error('安装依赖失败:', error);
      if (window.notificationCenter) {
        window.notificationCenter.error('安装依赖失败: ' + error.message);
      }
      progressCallback(`安装失败: ${error.message}`);
    } finally {
      this.isInstalling = false;
    }
  }

  /**
   * 卸载依赖
   */
  async uninstallDependencies() {
    if (!confirm('确定要卸载依赖包吗？这将删除所有已安装的依赖。')) {
      return;
    }

    try {
      const agentName = this.agentData.id || 'math_calculator';
      const pluginFileName = this.agentData.plugin_file || 'math_calculator.py';
      const pluginPath = await pythonEnvironment.buildPluginPath(`${agentName}/${pluginFileName}`);

      const result = await pythonEnvironment.executePython(pluginPath, ['--uninstall-deps']);

      if (result.success) {
        const uninstallResult = JSON.parse(result.output);
        if (uninstallResult.success) {
          // 重新检查依赖状态
          await this.updateDependencyStatus();
        } else {
          if (window.notificationCenter) {
            window.notificationCenter.error(`卸载失败: ${uninstallResult.message}`);
          }
        }
      } else {
        if (window.notificationCenter) {
          window.notificationCenter.error(`卸载失败: ${result.error}`);
        }
      }

    } catch (error) {
      console.error('卸载依赖失败:', error);
      if (window.notificationCenter) {
        window.notificationCenter.error(`卸载失败: ${error.message}`);
      }
    }
  }
}

// 导出类
window.DependencyInstaller = DependencyInstaller;
