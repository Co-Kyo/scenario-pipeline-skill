// utils.js — sideEffects 验证模块
// 包含副作用代码，用于验证 sideEffects 声明的影响

// ⚠️ 副作用：模块加载时执行
console.log('[utils.js] 模块已加载 — 这是一条副作用日志');

// ⚠️ 副作用：修改全局变量
if (typeof window !== 'undefined') {
  window.__UTILS_LOADED__ = true;
}

// 纯函数导出（无副作用）
export function formatDate(date) {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function throttle(fn, ms) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  };
}
