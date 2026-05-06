// math.js — Tree Shaking 验证模块
// 导出 4 个函数，main.js 仅使用 add
// 预期：构建后 subtract/multiply/divide 被 Tree Shaking 消除

export function add(a, b) {
  return a + b;
}

export function subtract(a, b) {
  return a - b;
}

export function multiply(a, b) {
  return a * b;
}

export function divide(a, b) {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
}
