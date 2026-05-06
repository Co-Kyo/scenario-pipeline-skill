// 三层缓存协作演示 - 应用逻辑

const logArea = document.getElementById('log');
const browserCacheStatus = document.getElementById('browser-cache');
const swCacheStatus = document.getElementById('sw-cache');
const networkStatus = document.getElementById('network-status');
const apiResponse = document.getElementById('api-response');

// 时间线节点
const nodeBrowser = document.getElementById('node-browser');
const nodeSW = document.getElementById('node-sw');
const nodeCDN = document.getElementById('node-cdn');
const nodeOrigin = document.getElementById('node-origin');

let requestCount = 0;

// 日志工具
function log(msg, type = 'info') {
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<span class="time">[${time}]</span> <span class="${type}">${msg}</span>`;
  logArea.appendChild(entry);
  logArea.scrollTop = logArea.scrollHeight;
}

// 更新状态徽章
function updateStatus(element, text, type) {
  element.textContent = text;
  element.className = `badge badge-${type}`;
}

// 重置时间线
function resetTimeline() {
  [nodeBrowser, nodeSW, nodeCDN, nodeOrigin].forEach(n => {
    n.querySelector('.dot').className = 'dot';
  });
}

// 标记时间线命中
function markTimeline(layer, hit) {
  const node = document.getElementById(`node-${layer}`);
  if (node) {
    node.querySelector('.dot').className = `dot ${hit ? 'active' : 'miss'}`;
  }
}

// 获取缓存状态
async function getCacheStatus() {
  // 浏览器缓存：通过 performance API 间接判断
  const entries = performance.getEntriesByType('resource');
  const lastApi = entries.filter(e => e.name.includes('/api/data')).pop();
  if (lastApi) {
    if (lastApi.transferSize === 0) {
      updateStatus(browserCacheStatus, 'HIT (from cache)', 'hit');
    } else if (lastApi.transferSize < lastApi.decodedBodySize) {
      updateStatus(browserCacheStatus, 'HIT (304)', 'hit');
    } else {
      updateStatus(browserCacheStatus, 'MISS', 'miss');
    }
  }

  // SW 缓存：通过 caches API 检查
  if ('caches' in window) {
    try {
      const cache = await caches.open('api-v1');
      const cached = await cache.match('/api/data');
      updateStatus(swCacheStatus, cached ? 'HIT' : 'MISS', cached ? 'hit' : 'miss');
    } catch (e) {
      updateStatus(swCacheStatus, 'N/A', 'pending');
    }
  }
}

// 请求 API 数据
async function fetchAPI() {
  requestCount++;
  resetTimeline();
  log(`--- 请求 #${requestCount} ---`, 'info');

  const startTime = performance.now();

  try {
    updateStatus(networkStatus, '请求中...', 'pending');

    // Service Worker 会在这里拦截请求
    markTimeline('sw', true);
    log('① Service Worker: fetch 事件拦截', 'info');

    const response = await fetch('/api/data', {
      headers: { 'Accept': 'application/json' }
    });

    const elapsed = (performance.now() - startTime).toFixed(1);
    const data = await response.json();

    // 分析响应来源
    const etag = response.headers.get('ETag');
    const cacheControl = response.headers.get('Cache-Control');
    const deployVersion = response.headers.get('X-Deploy-Version');
    const xCache = response.headers.get('X-Cache');
    const age = response.headers.get('Age');

    // 判断缓存状态
    const fromSWCache = response.headers.get('X-From-SW-Cache');
    if (fromSWCache) {
      log('② SW Cache API: 命中！直接返回缓存', 'hit');
      markTimeline('browser', false);
    } else {
      log('② SW Cache API: 未命中，转发到浏览器缓存层', 'miss');
      markTimeline('browser', true);
      markTimeline('cdn', true);
      markTimeline('origin', true);
    }

    log(`③ 响应: ${response.status} | 耗时: ${elapsed}ms`, 'info');
    log(`   ETag: ${etag || 'N/A'}`, 'info');
    log(`   Cache-Control: ${cacheControl}`, 'info');
    log(`   X-Cache: ${xCache} | Age: ${age}s`, 'info');
    log(`   版本: ${deployVersion}`, 'info');

    updateStatus(networkStatus, `${response.status} (${elapsed}ms)`, 'hit');

    // 显示响应
    apiResponse.textContent = JSON.stringify(data, null, 2);

    // 更新缓存状态
    await getCacheStatus();

  } catch (err) {
    log(`❌ 请求失败: ${err.message}`, 'miss');
    updateStatus(networkStatus, 'FAILED', 'miss');

    // 尝试从 SW 缓存获取
    if ('caches' in window) {
      try {
        const cached = await caches.match('/api/data');
        if (cached) {
          const data = await cached.json();
          apiResponse.textContent = JSON.stringify(data, null, 2);
          log('📦 Service Worker: 从缓存返回离线数据', 'hit');
          markTimeline('sw', true);
        }
      } catch (e) {
        log('📦 Service Worker: 无可用缓存', 'miss');
      }
    }
  }
}

// 清除所有缓存
async function clearAllCaches() {
  log('🗑️ 清除所有缓存...', 'info');

  // 清除 SW 缓存
  if ('caches' in window) {
    const names = await caches.keys();
    for (const name of names) {
      await caches.delete(name);
      log(`   删除缓存: ${name}`, 'info');
    }
  }

  // 注销 SW
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      await reg.unregister();
      log('   注销 Service Worker', 'info');
    }
  }

  updateStatus(swCacheStatus, '已清除', 'miss');
  updateStatus(browserCacheStatus, '已清除', 'miss');
  log('✅ 所有缓存已清除，刷新页面重新开始', 'info');
}

// 注册 Service Worker
async function registerSW() {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      log('✅ Service Worker 注册成功', 'hit');

      reg.addEventListener('updatefound', () => {
        log('🔄 发现新版本 Service Worker', 'info');
      });

      // 监听 SW 消息
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data.type === 'CACHE_UPDATED') {
          log('📦 SW 缓存已更新', 'info');
          getCacheStatus();
        }
      });

    } catch (err) {
      log(`❌ SW 注册失败: ${err.message}`, 'miss');
    }
  } else {
    log('⚠️ 浏览器不支持 Service Worker', 'miss');
  }
}

// 初始化
async function init() {
  log('🚀 三层缓存协作演示启动', 'info');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
  await registerSW();
  await getCacheStatus();

  // 自动请求一次
  setTimeout(fetchAPI, 500);
}

// 绑定事件
document.getElementById('btn-fetch').addEventListener('click', fetchAPI);
document.getElementById('btn-clear').addEventListener('click', clearAllCaches);
document.getElementById('btn-refresh').addEventListener('click', () => location.reload());

init();
