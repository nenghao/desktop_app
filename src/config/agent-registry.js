/**
 * 智能体注册表
 * 管理所有可用的智能体配置
 */

export const agentRegistry = {
  // 内置智能体
  builtin: [
    {
      id: 'math-tools',
      name: '数学工具助手',
      displayName: '数学工具助手',
      description: '提供各种数学计算功能，包括基础运算、统计分析、几何计算等',
      version: '1.0.0',
      author: 'Questech Team',
      category: 'tools',
      tags: ['数学', '计算', '工具'],
      icon: '🔧',
      iconUrl: './assets/icons/agent-icons/math-tools.svg',
      themeColor: '#4CAF50',
      status: 'active',
      installed: true,
      enabled: true,
      path: './views/agents/math-tools/index.js',
      permissions: ['file-access'],
      dependencies: ['python-math'],
      config: {
        defaultPrecision: 6,
        enableHistory: true,
        maxHistoryItems: 100
      }
    },
    {
      id: 'pdf-tools',
      name: 'PDF转换工具',
      displayName: 'PDF转换工具',
      description: '强大的PDF处理工具，支持PDF与图片、HTML、Word的相互转换，以及PDF合并拆分等功能',
      version: '1.0.0',
      author: 'Questech Team',
      category: 'document',
      tags: ['PDF', '转换', '文档'],
      icon: '📄',
      iconUrl: './assets/icons/agent-icons/pdf-tools.svg',
      themeColor: '#F44336',
      status: 'active',
      installed: true,
      enabled: true,
      path: './views/agents/pdf-tools/index.js',
      permissions: ['file-access', 'network-access'],
      dependencies: ['python-pdf'],
      config: {
        maxFileSize: 100 * 1024 * 1024, // 100MB
        supportedFormats: ['pdf', 'jpg', 'png', 'html', 'docx'],
        enableBatch: true
      }
    },
    {
      id: 'text-tools',
      name: '文本处理专家',
      displayName: '文本处理专家',
      description: '强大的文本处理和分析工具，支持正则表达式、格式转换等功能',
      version: '1.0.0',
      author: 'Questech Team',
      category: 'data',
      tags: ['文本', '处理', '分析'],
      icon: '📊',
      iconUrl: './assets/icons/agent-icons/text-tools.svg',
      themeColor: '#FF9800',
      status: 'development',
      installed: false,
      enabled: false,
      path: './views/agents/text-tools/index.js',
      permissions: ['file-access'],
      dependencies: ['python-text'],
      config: {
        maxTextLength: 1000000,
        enableRegex: true,
        enableBatch: true
      }
    },
    {
      id: 'image-tools',
      name: '图像处理大师',
      displayName: '图像处理大师',
      description: '专业的图像处理工具，支持格式转换、尺寸调整、滤镜效果等',
      version: '1.0.0',
      author: 'Questech Team',
      category: 'image',
      tags: ['图像', '处理', '创意'],
      icon: '🖼️',
      iconUrl: './assets/icons/agent-icons/image-tools.svg',
      themeColor: '#9C27B0',
      status: 'development',
      installed: false,
      enabled: false,
      path: './views/agents/image-tools/index.js',
      permissions: ['file-access'],
      dependencies: ['python-image'],
      config: {
        maxImageSize: 50 * 1024 * 1024, // 50MB
        supportedFormats: ['jpg', 'png', 'gif', 'bmp', 'webp'],
        enableBatch: true
      }
    }
  ],
  
  // 第三方智能体
  thirdParty: [
    // 这里将来可以添加第三方智能体
  ],
  
  // 用户自定义智能体
  custom: [
    // 用户创建的智能体将存储在这里
  ]
};

/**
 * 获取所有智能体
 */
export function getAllAgents() {
  return [
    ...agentRegistry.builtin,
    ...agentRegistry.thirdParty,
    ...agentRegistry.custom
  ];
}

/**
 * 根据ID获取智能体
 */
export function getAgentById(id) {
  const allAgents = getAllAgents();
  return allAgents.find(agent => agent.id === id);
}

/**
 * 根据分类获取智能体
 */
export function getAgentsByCategory(category) {
  if (category === 'all') {
    return getAllAgents();
  }
  
  const allAgents = getAllAgents();
  return allAgents.filter(agent => agent.category === category);
}

/**
 * 获取已安装的智能体
 */
export function getInstalledAgents() {
  const allAgents = getAllAgents();
  return allAgents.filter(agent => agent.installed);
}

/**
 * 获取已启用的智能体
 */
export function getEnabledAgents() {
  const allAgents = getAllAgents();
  return allAgents.filter(agent => agent.enabled);
}

/**
 * 搜索智能体
 */
export function searchAgents(query) {
  if (!query || query.trim() === '') {
    return getAllAgents();
  }
  
  const searchTerm = query.toLowerCase().trim();
  const allAgents = getAllAgents();
  
  return allAgents.filter(agent => {
    return (
      agent.name.toLowerCase().includes(searchTerm) ||
      agent.displayName.toLowerCase().includes(searchTerm) ||
      agent.description.toLowerCase().includes(searchTerm) ||
      agent.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      agent.category.toLowerCase().includes(searchTerm)
    );
  });
}

/**
 * 注册新智能体
 */
export function registerAgent(agentConfig, type = 'custom') {
  if (!agentConfig.id) {
    throw new Error('智能体配置必须包含ID');
  }
  
  // 检查ID是否已存在
  if (getAgentById(agentConfig.id)) {
    throw new Error(`智能体ID "${agentConfig.id}" 已存在`);
  }
  
  // 验证必需字段
  const requiredFields = ['name', 'description', 'version', 'category'];
  for (const field of requiredFields) {
    if (!agentConfig[field]) {
      throw new Error(`智能体配置缺少必需字段: ${field}`);
    }
  }
  
  // 设置默认值
  const defaultConfig = {
    displayName: agentConfig.name,
    author: 'Unknown',
    tags: [],
    icon: '🤖',
    themeColor: '#2196F3',
    status: 'active',
    installed: false,
    enabled: false,
    permissions: [],
    dependencies: [],
    config: {}
  };
  
  const finalConfig = { ...defaultConfig, ...agentConfig };
  
  // 添加到对应的注册表
  switch (type) {
    case 'builtin':
      agentRegistry.builtin.push(finalConfig);
      break;
    case 'thirdParty':
      agentRegistry.thirdParty.push(finalConfig);
      break;
    case 'custom':
    default:
      agentRegistry.custom.push(finalConfig);
      break;
  }
  
  return finalConfig;
}

/**
 * 卸载智能体
 */
export function unregisterAgent(agentId) {
  const registries = [agentRegistry.builtin, agentRegistry.thirdParty, agentRegistry.custom];
  
  for (const registry of registries) {
    const index = registry.findIndex(agent => agent.id === agentId);
    if (index !== -1) {
      return registry.splice(index, 1)[0];
    }
  }
  
  return null;
}

/**
 * 更新智能体配置
 */
export function updateAgentConfig(agentId, updates) {
  const agent = getAgentById(agentId);
  if (!agent) {
    throw new Error(`智能体 "${agentId}" 不存在`);
  }
  
  Object.assign(agent, updates);
  return agent;
}

export default agentRegistry;
