/**
 * 路由配置
 */

export const routes = [
  {
    path: '/dashboard',
    name: 'dashboard',
    component: 'Dashboard',
    meta: {
      title: '小纸条',
      requiresAuth: false
    }
  },
  {
    path: '/chat',
    name: 'chat',
    component: 'ChatView',
    meta: {
      title: '聊天',
      requiresAuth: false
    }
  },
  {
    path: '/agents',
    name: 'agent-store',
    component: 'AgentStore',
    meta: {
      title: '智能体',
      requiresAuth: false
    }
  },
  {
    path: '/agent/:id',
    name: 'agent-detail',
    component: 'AgentDetail',
    meta: {
      title: '智能体详情',
      requiresAuth: false
    }
  },
  {
    path: '/news/daily',
    name: 'ai-daily-list',
    component: 'AIDailyList',
    meta: {
      title: 'AI 日报',
      requiresAuth: false
    }
  },
  {
    path: '/news/list',
    name: 'ai-news-list',
    component: 'AINewsList',
    meta: {
      title: 'AI 资讯',
      requiresAuth: false
    }
  },
  {
    path: '/news/detail',
    name: 'news-detail',
    component: 'NewsDetail',
    meta: {
      title: '新闻详情',
      requiresAuth: false
    }
  },
  {
    path: '/news',
    name: 'news',
    component: 'NewsList',
    meta: {
      title: '新闻资讯',
      requiresAuth: false
    }
  },

  {
    path: '/debug-plugin',
    name: 'debug-plugin',
    component: 'PluginDebugger',
    meta: {
      title: '插件调试器',
      requiresAuth: false
    }
  },
  {
    path: '/404',
    name: '404',
    component: () => import('../views/NotFound.js'),
    meta: {
      title: '页面未找到',
      requiresAuth: false
    }
  }
];

export default routes;
