// heavy.js — Code Splitting 验证模块
// 通过动态 import() 按需加载
// 预期：构建后生成独立的 heavy.[hash].js chunk

// 模拟重型计算（实际项目中可能是图表库、编辑器等）
export default function heavyCompute(n) {
  // 模拟耗时操作
  let result = 0;
  for (let i = 0; i < n * n; i++) {
    result += Math.sqrt(i) * Math.sin(i);
  }
  return Math.round(result * 100) / 100;
}

// 模拟大型库的多个导出
export const HeavyChart = {
  name: 'HeavyChart',
  render(data) {
    return `Rendering chart with ${data.length} points`;
  },
};

export const HeavyEditor = {
  name: 'HeavyEditor',
  init(config) {
    return `Editor initialized with ${Object.keys(config).length} options`;
  },
};
