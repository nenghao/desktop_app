import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // 基础配置
  base: './',

  // 开发服务器配置
  server: {
    port: 5173,
    host: true,
    open: false,  // 关闭自动打开浏览器
    cors: true,
    // 添加API代理,绕过CSP限制和CORS问题
    proxy: {
      '/api': {
        target: 'http://192.168.0.103:10089',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // 确保转发 Authorization header
            if (req.headers.authorization) {
              proxyReq.setHeader('Authorization', req.headers.authorization);
            }
            console.log('🔀 [Vite Proxy /api] 转发请求:', {
              path: req.url,
              hasAuth: !!req.headers.authorization
            });
          });
        }
      },
      // 代理智能体资源请求,解决后端返回 0.0.0.0:10089 导致的 CORS 问题
      '^/agent_store/': {
        target: 'http://192.168.0.103:10089',
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('🔀 [Vite Proxy /agent_store] 转发请求:', req.url);
          });
        }
      },
      // 代理文件上传请求,解决后端返回 0.0.0.0 导致的 CORS 问题
      '^/common/upload/': {
        target: 'http://192.168.0.103:10089',
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('🔀 [Vite Proxy /common/upload] 转发请求:', req.url);
          });
        }
      }
    }
  },

  // 构建配置
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',

    // 代码分割配置
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        // 分包策略
        manualChunks: {
          // 核心框架
          'core': [
            './src/core/Router.js',
            './src/core/StateManager.js',
            './src/core/ComponentLoader.js',
            './src/core/EventBus.js'
          ],
          // 服务层
          'services': [
            './src/services/theme-manager.js',
            './src/services/storage.js'
          ],
          // 布局组件
          'layout': [
            './src/components/layout/AppLayout.js',
            './src/components/layout/Sidebar.js',
            './src/components/layout/Header.js',
            './src/components/layout/ContentArea.js'
          ],
          // 通用组件
          'components': [
            './src/components/common/Modal.js',
            './src/components/common/LoadingSpinner.js',
          ]
        },
        // 文件命名
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(css)$/.test(assetInfo.name)) {
            return `css/[name]-[hash].${ext}`;
          }
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(assetInfo.name)) {
            return `images/[name]-[hash].${ext}`;
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name)) {
            return `fonts/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        }
      }
    },

    // 压缩配置
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },

  // 路径别名
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@views': resolve(__dirname, 'src/views'),
      '@services': resolve(__dirname, 'src/services'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@assets': resolve(__dirname, 'src/assets'),
      '@core': resolve(__dirname, 'src/core'),
      '@store': resolve(__dirname, 'src/store')
    }
  },

  // CSS 配置
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      css: {
        charset: false
      }
    }
  },

  // 优化配置
  optimizeDeps: {
    include: ['lit', 'marked'],
    exclude: []
  },

  // 环境变量
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
});
