#!/usr/bin/env python3
"""Generate briefings for all 7 propositions from summary JSONs."""
import json, os

SUMM_DIR = "/root/.openclaw/workspace/workflow/research/.meta/summaries"
BRIEF_DIR = "/root/.openclaw/workspace/workflow/research/.meta/briefings"
os.makedirs(BRIEF_DIR, exist_ok=True)

def load_summary(fid):
    """Load a summary JSON by capability ID, normalize fields."""
    # Find the file
    for f in os.listdir(SUMM_DIR):
        if f.startswith(fid + "-") or f.startswith(fid + " "):
            d = json.load(open(os.path.join(SUMM_DIR, f)))
            # Normalize mechanism_summary
            mech = d.get("mechanism_summary") or d.get("summary") or ""
            # Normalize bottlenecks
            bns = d.get("bottlenecks") or d.get("keyPoints") or d.get("bottleneck") or []
            # Normalize tradeoffs
            tos = d.get("tradeoffs") or d.get("tradeoff") or d.get("trade_offs") or []
            # Normalize experiment
            exp = d.get("experiment_code") or d.get("experiment") or None
            # Normalize references
            refs = d.get("references") or []
            return {
                "id": d.get("id", fid),
                "name": d.get("name", fid),
                "mechanism": mech,
                "bottlenecks": bns,
                "tradeoffs": tos,
                "experiment": exp,
                "references": refs,
            }
    return None

def format_bn(bn):
    """Format a bottleneck item."""
    if isinstance(bn, dict):
        name = bn.get("name", "")
        trigger = bn.get("trigger", "")
        symptom = bn.get("symptom", "")
        return f"  - **{name}**：{trigger} → {symptom}"
    return f"  - {bn}"

def format_to(to):
    """Format a tradeoff item."""
    if isinstance(to, dict):
        dim = to.get("dimension", "")
        a = to.get("option_a", "")
        b = to.get("option_b", "")
        sug = to.get("suggestion", "")
        return f"  - **{dim}**：{a} vs {b}，建议：{sug}"
    return f"  - {to}"

def format_ref(ref):
    """Format a reference item."""
    if isinstance(ref, dict):
        tier = ref.get("tier", "")
        url = ref.get("url", "")
        title = ref.get("title", "")
        return f"- [{tier}] {title}: {url}"
    return f"- {ref}"

# Proposition definitions
PROPS = [
    {
        "id": "P1", "num": "01", "name": "长列表渲染",
        "full": "长列表渲染：万级数据的流畅滚动方案",
        "qualifier": "通用（React/Vue）",
        "weight": "70%",
        "caps": ["A1","A2","A3","A4","A5","A27","A30","R1","V1"],
    },
    {
        "id": "P2", "num": "02", "name": "首屏白屏",
        "full": "首屏白屏：从 FCP 到 LCP 的全链路优化",
        "qualifier": "SSR/SSG/SPA",
        "weight": "65%",
        "caps": ["A1","A6","A7","A8","A9","A10","A11","R2","V2","N1"],
    },
    {
        "id": "P3", "num": "03", "name": "内存泄漏",
        "full": "内存泄漏：长时间运行页面的性能退化排查",
        "qualifier": "通用",
        "weight": "85%",
        "caps": ["A12","A13","A14","A15","A16","A17"],
    },
    {
        "id": "P4", "num": "04", "name": "网络优化",
        "full": "网络优化：弱网环境下的资源加载策略",
        "qualifier": "通用",
        "weight": "95%",
        "caps": ["A6","A7","A18","A19","A20","A21","A22","A23"],
    },
    {
        "id": "P5", "num": "05", "name": "图片优化",
        "full": "图片优化：大图量场景下的加载与渲染性能",
        "qualifier": "通用",
        "weight": "90%",
        "caps": ["A5","A24","A25","A26","A27"],
    },
    {
        "id": "P6", "num": "06", "name": "构建优化",
        "full": "构建优化：Webpack/Vite 的产物体积与加载速度",
        "qualifier": "Webpack/Vite",
        "weight": "50%",
        "caps": ["A10","A11","A28","A29","W1","VI1","W2"],
    },
    {
        "id": "P7", "num": "07", "name": "渲染性能",
        "full": "渲染性能：避免掉帧的 JS 执行与 DOM 操作策略",
        "qualifier": "通用",
        "weight": "90%",
        "caps": ["A1","A3","A17","A30","A31","A32","A33"],
    },
]

for prop in PROPS:
    print(f"Generating briefing for {prop['id']}-{prop['name']}...")
    caps_data = []
    for cid in prop["caps"]:
        s = load_summary(cid)
        if s:
            caps_data.append(s)
        else:
            print(f"  WARNING: Summary for {cid} not found")

    lines = []
    lines.append(f"# {prop['full']} — 组装 Briefing\n")
    lines.append("## 命题信息")
    lines.append(f"命题：{prop['full']}")
    lines.append(f"通用占比：{prop['weight']}")
    lines.append(f"限定词：{prop['qualifier']}\n")

    lines.append("## 涉及能力摘要\n")
    for c in caps_data:
        lines.append(f"### {c['id']}-{c['name']}")
        if c["mechanism"]:
            lines.append(f"机制：{c['mechanism'][:300]}")
        if c["bottlenecks"]:
            lines.append("瓶颈：")
            for bn in c["bottlenecks"][:5]:
                lines.append(format_bn(bn))
        if c["tradeoffs"]:
            lines.append("权衡：")
            for to in c["tradeoffs"][:3]:
                lines.append(format_to(to))
        if c["experiment"]:
            exp_str = c["experiment"] if isinstance(c["experiment"], str) else json.dumps(c["experiment"], ensure_ascii=False)[:200]
            lines.append(f"实验代码：{exp_str[:200]}")
        if c["references"]:
            lines.append("参考：")
            for ref in c["references"][:3]:
                lines.append(format_ref(ref))
        lines.append("")

    lines.append("## 内容比例约束")
    lines.append(f"开篇 10-15%：从 {prop['qualifier']} 痛点切入")
    lines.append("主体 70-80%：通用工程原理")
    lines.append(f"收尾 10-15%：回到 {prop['qualifier']} 给落地方案\n")

    # Collect all references
    all_refs = []
    seen_urls = set()
    for c in caps_data:
        for ref in c.get("references", []):
            if isinstance(ref, dict):
                url = ref.get("url", "")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    all_refs.append(ref)
    lines.append("## 参考资料（已去重，按 Tier 排序）")
    for ref in sorted(all_refs, key=lambda r: r.get("tier", "T3")):
        lines.append(format_ref(ref))

    content = "\n".join(lines)
    fpath = os.path.join(BRIEF_DIR, f"{prop['num']}-{prop['name']}.md")
    with open(fpath, "w") as f:
        f.write(content)
    print(f"  Written: {fpath} ({len(content)} bytes)")

print("\nAll 7 briefings generated.")
