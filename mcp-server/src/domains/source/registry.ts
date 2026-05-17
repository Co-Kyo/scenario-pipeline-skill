/**
 * 信源注册表 — 动态 filter 架构
 *
 * T0：硬编码的高可信信源（官方文档、规范、大厂技术博客）
 * dynamic：运行时发现的优质信源，按 workDir 持久化到 {workDir}/.meta/sources/dynamic-sources.json
 * blacklist：已知低质/不可信域名
 */

import { SourceRegistry, DynamicSource, ClassifyResult } from "./types.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

/** T0 内置信源 — 域名 → 名称（不可变） */
const T0_BUILTIN: Record<string, string> = {
  // Web 标准与规范
  "developer.mozilla.org": "MDN Web Docs",
  "w3c.github.io": "W3C 规范",
  "whatwg.org": "WHATWG 规范",
  "tc39.es": "TC39 ECMAScript 规范",
  "httpwg.org": "HTTP Working Group",

  // 浏览器厂商
  "web.dev": "Google Web 技术博客",
  "developer.chrome.com": "Chrome 开发者文档",
  "v8.dev": "V8 官方博客",
  "chromestatus.com": "Chrome Platform Status",

  // 框架官方
  "vuejs.org": "Vue 官方文档",
  "react.dev": "React 官方文档",
  "legacy.reactjs.org": "React 旧文档",
  "angular.io": "Angular 官方文档",
  "svelte.dev": "Svelte 官方文档",
  "nextjs.org": "Next.js 官方文档",
  "nuxt.com": "Nuxt 官方文档",

  // 构建工具
  "webpack.js.org": "Webpack 官方文档",
  "vitejs.dev": "Vite 官方文档",
  "rollupjs.org": "Rollup 官方文档",
  "esbuild.github.io": "esbuild 官方文档",
  "turbopack.dev": "Turbopack 官方文档",

  // 运行时
  "nodejs.org": "Node.js 官方文档",
  "deno.land": "Deno 官方文档",
  "bun.sh": "Bun 官方文档",

  // 小程序
  "developers.weixin.qq.com": "微信小程序官方文档",

  // 大厂技术博客
  "developers.cloudflare.com": "Cloudflare 技术文档",
  "aws.amazon.com/blogs": "AWS 技术博客",
  "netflixtechblog.com": "Netflix 技术博客",
  "engineering.fb.com": "Meta 工程博客",
  "blog.chromium.org": "Chromium 博客",

  // TypeScript
  "www.typescriptlang.org": "TypeScript 官方文档",
};

/** 解析动态池文件路径 */
function getDynamicPoolPath(workDir: string): string {
  return join(workDir, ".meta", "sources", "dynamic-sources.json");
}

/** 加载动态池 — 若 workDir 无对应文件则返回空对象 */
function loadDynamicPool(workDir: string): Record<string, DynamicSource> {
  const poolPath = getDynamicPoolPath(workDir);
  if (existsSync(poolPath)) {
    try {
      return JSON.parse(readFileSync(poolPath, "utf-8"));
    } catch {
      return {};
    }
  }
  return {};
}

/** 保存动态池 — 写入 {workDir}/.meta/sources/dynamic-sources.json */
function saveDynamicPool(pool: Record<string, DynamicSource>, workDir: string): void {
  const poolPath = getDynamicPoolPath(workDir);
  mkdirSync(join(poolPath, ".."), { recursive: true });
  writeFileSync(poolPath, JSON.stringify(pool, null, 2), "utf-8");
}

/** 获取 T0 注册表（不含动态池，始终可用） */
export function getRegistry(): Pick<SourceRegistry, "t0" | "blacklist"> {
  return {
    t0: { ...T0_BUILTIN },
    blacklist: [],
  };
}

/** 分级：查询单个域名的 Tier */
export function classifyDomain(domain: string, workDir?: string): ClassifyResult {
  const d = domain.toLowerCase().trim();

  // T0 内置
  if (T0_BUILTIN[d]) {
    return { domain: d, tier: "T0", source: "builtin", name: T0_BUILTIN[d] };
  }

  // 动态池（按 workDir 加载）
  if (workDir) {
    const pool = loadDynamicPool(workDir);
    if (pool[d]) {
      const entry = pool[d];
      return {
        domain: d,
        tier: entry.tier,
        source: "dynamic",
        reason: entry.reason,
      };
    }
  }

  return { domain: d, tier: "unknown", source: "unknown" };
}

/** 注册新信源到动态池 */
export function registerSource(
  domain: string,
  tier: "T1" | "T2" | "T3",
  reason: string,
  discovered_by: string,
  workDir: string
): DynamicSource {
  const d = domain.toLowerCase().trim();
  const entry: DynamicSource = {
    domain: d,
    tier,
    reason,
    discovered_by,
    discovered_at: new Date().toISOString(),
  };

  // 写入到 workDir 的动态池文件（追加，不清空已有条目）
  const pool = loadDynamicPool(workDir);
  pool[d] = entry;
  saveDynamicPool(pool, workDir);

  return entry;
}

/** 批量分级 */
export function classifyDomains(domains: string[], workDir?: string): ClassifyResult[] {
  return domains.map((d) => classifyDomain(d, workDir));
}
