/**
 * 本地数据计算器服务
 * 提供数据导入、分析、计算和可视化功能
 */

export class LocalDataCalculator {
  constructor() {
    this.data = [];
    this.columns = [];
    this.results = {};
    this.isInitialized = false;
  }

  /**
   * 初始化计算器
   */
  initialize() {
    if (this.isInitialized) return;
    
    console.log('📊 本地数据计算器初始化...');
    this.isInitialized = true;
    console.log('✅ 本地数据计算器初始化完成');
  }

  /**
   * 导入CSV数据
   */
  importCSVData(csvText) {
    try {
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV数据至少需要包含标题行和一行数据');
      }

      // 解析标题行
      this.columns = this.parseCSVLine(lines[0]);
      
      // 解析数据行
      this.data = [];
      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        if (values.length === this.columns.length) {
          const row = {};
          this.columns.forEach((col, index) => {
            // 尝试转换为数字
            const value = values[index];
            row[col] = this.isNumeric(value) ? parseFloat(value) : value;
          });
          this.data.push(row);
        }
      }

      console.log(`✅ 成功导入 ${this.data.length} 行数据，${this.columns.length} 列`);
      return {
        success: true,
        rows: this.data.length,
        columns: this.columns.length,
        columnNames: this.columns
      };
    } catch (error) {
      console.error('❌ CSV数据导入失败:', error);
      throw error;
    }
  }

  /**
   * 导入JSON数据
   */
  importJSONData(jsonData) {
    try {
      let data;
      if (typeof jsonData === 'string') {
        data = JSON.parse(jsonData);
      } else {
        data = jsonData;
      }

      if (!Array.isArray(data)) {
        throw new Error('JSON数据必须是数组格式');
      }

      if (data.length === 0) {
        throw new Error('JSON数据不能为空');
      }

      // 获取列名
      this.columns = Object.keys(data[0]);
      this.data = data;

      console.log(`✅ 成功导入 ${this.data.length} 行数据，${this.columns.length} 列`);
      return {
        success: true,
        rows: this.data.length,
        columns: this.columns.length,
        columnNames: this.columns
      };
    } catch (error) {
      console.error('❌ JSON数据导入失败:', error);
      throw error;
    }
  }

  /**
   * 生成示例数据
   */
  generateSampleData() {
    const sampleData = [
      { 姓名: '张三', 年龄: 25, 工资: 8000, 部门: '技术部' },
      { 姓名: '李四', 年龄: 30, 工资: 12000, 部门: '销售部' },
      { 姓名: '王五', 年龄: 28, 工资: 9500, 部门: '技术部' },
      { 姓名: '赵六', 年龄: 35, 工资: 15000, 部门: '管理部' },
      { 姓名: '钱七', 年龄: 26, 工资: 7500, 部门: '销售部' },
      { 姓名: '孙八', 年龄: 32, 工资: 11000, 部门: '技术部' },
      { 姓名: '周九', 年龄: 29, 工资: 10000, 部门: '销售部' },
      { 姓名: '吴十', 年龄: 27, 工资: 8500, 部门: '技术部' }
    ];

    return this.importJSONData(sampleData);
  }

  /**
   * 描述性统计分析
   */
  calculateDescriptiveStats() {
    if (this.data.length === 0) {
      throw new Error('没有数据可供分析');
    }

    const stats = {};
    
    // 对每个数值列进行统计
    this.columns.forEach(column => {
      const values = this.data.map(row => row[column]).filter(val => this.isNumeric(val));
      
      if (values.length > 0) {
        const numValues = values.map(v => parseFloat(v));
        stats[column] = {
          count: numValues.length,
          sum: this.sum(numValues),
          mean: this.mean(numValues),
          median: this.median(numValues),
          min: Math.min(...numValues),
          max: Math.max(...numValues),
          std: this.standardDeviation(numValues),
          variance: this.variance(numValues)
        };
      } else {
        // 非数值列的统计
        const uniqueValues = [...new Set(this.data.map(row => row[column]))];
        stats[column] = {
          count: this.data.length,
          unique: uniqueValues.length,
          mode: this.mode(this.data.map(row => row[column])),
          type: 'categorical'
        };
      }
    });

    this.results.descriptiveStats = stats;
    return stats;
  }

  /**
   * 相关性分析
   */
  calculateCorrelation() {
    const numericColumns = this.columns.filter(col => {
      return this.data.some(row => this.isNumeric(row[col]));
    });

    if (numericColumns.length < 2) {
      throw new Error('至少需要两个数值列才能进行相关性分析');
    }

    const correlations = {};
    
    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = i + 1; j < numericColumns.length; j++) {
        const col1 = numericColumns[i];
        const col2 = numericColumns[j];
        
        const values1 = this.data.map(row => parseFloat(row[col1])).filter(v => !isNaN(v));
        const values2 = this.data.map(row => parseFloat(row[col2])).filter(v => !isNaN(v));
        
        if (values1.length === values2.length && values1.length > 1) {
          const correlation = this.pearsonCorrelation(values1, values2);
          correlations[`${col1}_${col2}`] = {
            column1: col1,
            column2: col2,
            correlation: correlation,
            strength: this.getCorrelationStrength(correlation)
          };
        }
      }
    }

    this.results.correlations = correlations;
    return correlations;
  }

  /**
   * 数据分组统计
   */
  groupByAnalysis(groupColumn, valueColumn) {
    if (!this.columns.includes(groupColumn)) {
      throw new Error(`分组列 "${groupColumn}" 不存在`);
    }

    if (!this.columns.includes(valueColumn)) {
      throw new Error(`数值列 "${valueColumn}" 不存在`);
    }

    const groups = {};
    
    this.data.forEach(row => {
      const groupKey = row[groupColumn];
      const value = row[valueColumn];
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      
      if (this.isNumeric(value)) {
        groups[groupKey].push(parseFloat(value));
      }
    });

    const result = {};
    Object.keys(groups).forEach(key => {
      const values = groups[key];
      if (values.length > 0) {
        result[key] = {
          count: values.length,
          sum: this.sum(values),
          mean: this.mean(values),
          min: Math.min(...values),
          max: Math.max(...values),
          std: this.standardDeviation(values)
        };
      }
    });

    return result;
  }

  /**
   * 获取数据预览
   */
  getDataPreview(limit = 10) {
    return {
      columns: this.columns,
      data: this.data.slice(0, limit),
      totalRows: this.data.length,
      preview: true
    };
  }

  /**
   * 导出结果
   */
  exportResults() {
    return {
      metadata: {
        rows: this.data.length,
        columns: this.columns.length,
        columnNames: this.columns,
        exportTime: new Date().toISOString()
      },
      data: this.data,
      results: this.results
    };
  }

  // 工具方法
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  isNumeric(value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
  }

  sum(values) {
    return values.reduce((a, b) => a + b, 0);
  }

  mean(values) {
    return this.sum(values) / values.length;
  }

  median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  variance(values) {
    const avg = this.mean(values);
    return this.mean(values.map(v => Math.pow(v - avg, 2)));
  }

  standardDeviation(values) {
    return Math.sqrt(this.variance(values));
  }

  mode(values) {
    const frequency = {};
    values.forEach(v => frequency[v] = (frequency[v] || 0) + 1);
    
    let maxFreq = 0;
    let mode = null;
    
    Object.keys(frequency).forEach(key => {
      if (frequency[key] > maxFreq) {
        maxFreq = frequency[key];
        mode = key;
      }
    });
    
    return mode;
  }

  pearsonCorrelation(x, y) {
    const n = x.length;
    const sumX = this.sum(x);
    const sumY = this.sum(y);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  getCorrelationStrength(correlation) {
    const abs = Math.abs(correlation);
    if (abs >= 0.8) return '强相关';
    if (abs >= 0.5) return '中等相关';
    if (abs >= 0.3) return '弱相关';
    return '无相关';
  }
}

// 创建全局实例
export const localDataCalculator = new LocalDataCalculator();
