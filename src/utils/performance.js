/**
 * 性能监控工具
 */

export class PerformanceMonitor {
  constructor() {
    this.marks = new Map();
    this.measures = new Map();
    this.enabled = true;
  }
  
  /**
   * 开始监控
   */
  start() {
    if (!this.enabled) return;
    
    this.mark('app-start');
    
    // 监控页面加载性能
    if (document.readyState === 'complete') {
      this.recordPageLoad();
    } else {
      window.addEventListener('load', () => {
        this.recordPageLoad();
      });
    }
  }
  
  /**
   * 创建性能标记
   */
  mark(name) {
    if (!this.enabled) return;
    
    const timestamp = performance.now();
    this.marks.set(name, timestamp);
    
    if (performance.mark) {
      performance.mark(name);
    }    
  }
  
  /**
   * 测量性能
   */
  measure(name, startMark, endMark) {
    if (!this.enabled) return;
    
    const startTime = this.marks.get(startMark);
    const endTime = endMark ? this.marks.get(endMark) : performance.now();
    
    if (startTime === undefined) {
      console.warn(`[Performance] Start mark "${startMark}" not found`);
      return;
    }
    
    const duration = endTime - startTime;
    this.measures.set(name, duration);
    
    if (performance.measure) {
      try {
        performance.measure(name, startMark, endMark);
      } catch (e) {
        console.warn('[Performance] Failed to create performance measure:', e);
      }
    }
    
    console.log(`[Performance] Measure: ${name} = ${duration.toFixed(2)}ms`);
    return duration;
  }
  
  /**
   * 记录页面加载性能
   */
  recordPageLoad() {
    if (!performance.timing) return;
    
    const timing = performance.timing;
    const navigation = performance.navigation;
    
    const metrics = {
      // DNS查询时间
      dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
      // TCP连接时间
      tcpConnect: timing.connectEnd - timing.connectStart,
      // 请求响应时间
      request: timing.responseEnd - timing.requestStart,
      // DOM解析时间
      domParse: timing.domContentLoadedEventEnd - timing.domLoading,
      // 页面加载完成时间
      pageLoad: timing.loadEventEnd - timing.navigationStart,
      // 首次内容绘制时间
      firstContentfulPaint: this.getFirstContentfulPaint(),
      // 导航类型
      navigationType: navigation.type
    };
    
    console.log('[Performance] Page Load Metrics:', metrics);
    return metrics;
  }
  
  /**
   * 获取首次内容绘制时间
   */
  getFirstContentfulPaint() {
    if (!performance.getEntriesByType) return null;
    
    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    
    return fcpEntry ? fcpEntry.startTime : null;
  }
  
  /**
   * 获取内存使用情况
   */
  getMemoryUsage() {
    if (!performance.memory) return null;
    
    return {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    };
  }
  
  /**
   * 获取所有标记
   */
  getMarks() {
    return new Map(this.marks);
  }
  
  /**
   * 获取所有测量
   */
  getMeasures() {
    return new Map(this.measures);
  }
  
  /**
   * 清除性能数据
   */
  clear() {
    this.marks.clear();
    this.measures.clear();
    
    if (performance.clearMarks) {
      performance.clearMarks();
    }
    
    if (performance.clearMeasures) {
      performance.clearMeasures();
    }
  }
  
  /**
   * 生成性能报告
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      marks: Object.fromEntries(this.marks),
      measures: Object.fromEntries(this.measures),
      memory: this.getMemoryUsage(),
      navigation: performance.navigation ? {
        type: performance.navigation.type,
        redirectCount: performance.navigation.redirectCount
      } : null
    };
    
    return report;
  }
}
