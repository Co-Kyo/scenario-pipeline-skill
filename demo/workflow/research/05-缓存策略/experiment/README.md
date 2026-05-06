# 实验：三层缓存协作演示

## 目标

通过一个可运行的 HTML 实验，直观展示 HTTP 缓存、CDN 模拟、Service Worker 三层缓存的协作机制。观察请求在三层之间的流转、命中/未命中行为、以及缓存失效后的更新流程。

## 核心观察点

1. **浏览器缓存命中**：强缓存有效期内，请求不出浏览器（Network 面板显示 `from cache`）
2. **协商缓存**：强缓存过期后，发送条件请求，服务器返回 304
3. **Service Worker 拦截**：SW 在浏览器缓存之前拦截请求，返回 Cache API 中的副本
4. **缓存版本更新**：部署新版本后，SW activate 阶段清理旧缓存
5. **离线回退**：断网后，SW 从缓存中返回资源

## 运行方式

```bash
# 1. 安装依赖（仅 Node.js 内置模块）
cd experiment/

# 2. 启动模拟服务器
node src/server.js

# 3. 浏览器打开
# http://localhost:3000

# 4. 打开 DevTools → Network 面板，观察请求行为
# 5. 打开 DevTools → Application → Service Workers，观察 SW 状态
# 6. 勾选 Network → Offline，测试离线回退
```

## 预期行为

| 操作 | 浏览器缓存 | SW Cache API | 网络请求 | 预期结果 |
|------|-----------|-------------|----------|----------|
| 首次访问 | 空 | 空 | ✅ 发起 | 200，三层都存储 |
| 刷新（30s 内） | 命中 | 命中 | ❌ 不发起 | 200 from cache |
| 刷新（30s 后） | 过期 | 命中 | ✅ 条件请求 | 304 或 200 |
| 断网刷新 | 过期 | 命中 | ❌ 失败 | SW 返回缓存 |
| 更新版本 | 新版本 | 旧版本→清理 | ✅ 发起 | 200 新版本 |
| 清除 SW 缓存 | 有效 | 空 | ✅ 发起 | 200 重新缓存 |

## 文件结构

```
experiment/
├── README.md          # 本文件
└── src/
    ├── index.html     # 主页面（含 SW 注册和 UI）
    ├── style.css      # 样式
    ├── app.js         # 应用逻辑
    ├── sw.js          # Service Worker
    └── server.js      # 模拟服务器（Node.js）
```

## 延伸实验

- 修改 `server.js` 中的 `Cache-Control` 头，观察浏览器缓存行为变化
- 修改 `sw.js` 中的缓存策略（Cache-First → Network-First），对比体验差异
- 在 `sw.js` 中添加 `stale-while-revalidate` 策略，观察后台更新行为
- 模拟 CDN：在 server.js 中添加 `Age` 和 `X-Cache` 头
