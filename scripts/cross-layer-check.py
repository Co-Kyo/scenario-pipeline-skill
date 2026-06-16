#!/usr/bin/env python3
"""
跨层一致性检查

比较 Layer 1（unit）、Layer 2（property）、Layer 3（semantic）的测试结果，
检查一致性问题：
- 同一 Skill 文件在不同层的测试是否一致
- Layer 2/3 的测试是否依赖 Layer 1 的假设
- 层间断言是否矛盾

用法：
    python scripts/cross-layer-check.py
    python scripts/cross-layer-check.py --verbose
"""

import os
import sys
import re
import subprocess
import json

os.environ['PYTHONIOENCODING'] = 'utf-8'
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TESTS_DIR = os.path.join(SKILL_DIR, "tests")

LAYERS = {
    "L1": {"dir": "unit", "desc": "单元测试（单步骤设计验证）"},
    "L2": {"dir": "property", "desc": "属性测试（跨步骤属性验证）"},
    "L3": {"dir": "semantic", "desc": "语义测试（端到端语义验证）"},
}


def run_layer(layer_name):
    """运行指定层的测试"""
    layer_dir = os.path.join(TESTS_DIR, LAYERS[layer_name]["dir"])
    if not os.path.isdir(layer_dir):
        return {
            "layer": layer_name,
            "status": "SKIP",
            "reason": f"目录不存在: {layer_dir}",
            "tests": [],
        }

    cmd = [sys.executable, "-m", "pytest", layer_dir, "-v", "--tb=short", "-q"]
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        cwd=SKILL_DIR,
        timeout=120,
    )
    output = result.stdout + result.stderr

    # 解析测试结果
    tests = []
    for line in output.split("\n"):
        # 匹配 PASSED/FAILED/SKIPPED 行
        match = re.search(r"(tests/\S+::\S+::\S+)\s+(PASSED|FAILED|SKIPPED|ERROR)", line)
        if match:
            tests.append({
                "name": match.group(1),
                "status": match.group(2),
            })

    # 解析统计
    passed = len([t for t in tests if t["status"] == "PASSED"])
    failed = len([t for t in tests if t["status"] == "FAILED"])
    skipped = len([t for t in tests if t["status"] == "SKIPPED"])

    return {
        "layer": layer_name,
        "desc": LAYERS[layer_name]["desc"],
        "status": "PASS" if result.returncode == 0 else "FAIL",
        "returncode": result.returncode,
        "passed": passed,
        "failed": failed,
        "skipped": skipped,
        "total": len(tests),
        "tests": tests,
        "output": output,
    }


def extract_skill_references(test_name):
    """从测试名提取引用的 Skill 文件"""
    refs = set()
    # 从测试类名推断
    for pattern, target in [
        (r"brainstorm", "processes/00-brainstorm.md"),
        (r"partition", "processes/01-partition.md"),
        (r"scan", "processes/02-scan.md"),
        (r"capability_graph", "processes/03-capability-graph.md"),
        (r"evaluate", "processes/04-evaluate-pool.md"),
        (r"capability_research", "processes/05-capability-research.md"),
        (r"briefing", "processes/06-briefing-assemble.md"),
        (r"assemble", "processes/07-assemble.md"),
        (r"learning_ladder", "processes/08-learning-ladder.md"),
        (r"dashboard", "processes/09-build-dashboard.md"),
        (r"shared_conventions", "core/shared-conventions.md"),
        (r"output_contracts", "meta/output-contracts.md"),
        (r"meta_paths", "meta/paths.md"),
        (r"dag_no_cycle", "processes/01-partition.md"),
        (r"level_weight", "processes/00-brainstorm.md"),
    ]:
        if re.search(pattern, test_name, re.IGNORECASE):
            refs.add(target)
    return refs


def check_cross_layer_consistency(results):
    """检查跨层一致性"""
    issues = []

    # 收集每层对每个 Skill 文件的测试结果
    skill_status = {}  # {skill_file: {layer: {passed, failed, tests}}}
    for layer_name, result in results.items():
        if result["status"] == "SKIP":
            continue
        for test in result["tests"]:
            refs = extract_skill_references(test["name"])
            for ref in refs:
                if ref not in skill_status:
                    skill_status[ref] = {}
                if layer_name not in skill_status[ref]:
                    skill_status[ref][layer_name] = {"passed": 0, "failed": 0, "skipped": 0, "tests": []}
                if test["status"] == "PASSED":
                    skill_status[ref][layer_name]["passed"] += 1
                elif test["status"] == "FAILED":
                    skill_status[ref][layer_name]["failed"] += 1
                elif test["status"] == "SKIPPED":
                    skill_status[ref][layer_name]["skipped"] += 1
                skill_status[ref][layer_name]["tests"].append(test["name"])

    # 检查 1: L1 通过但 L2/L3 失败
    for skill_file, layers in skill_status.items():
        l1 = layers.get("L1", {})
        l2 = layers.get("L2", {})
        l3 = layers.get("L3", {})

        l1_pass = l1.get("passed", 0) > 0 and l1.get("failed", 0) == 0
        l2_fail = l2.get("failed", 0) > 0
        l3_fail = l3.get("failed", 0) > 0

        if l1_pass and l2_fail:
            issues.append({
                "type": "L1_PASS_L2_FAIL",
                "severity": "HIGH",
                "skill_file": skill_file,
                "desc": f"L1 通过但 L2 失败 — 层间不一致",
                "l1_tests": l1.get("tests", []),
                "l2_tests": l2.get("tests", []),
            })

        if l1_pass and l3_fail:
            issues.append({
                "type": "L1_PASS_L3_FAIL",
                "severity": "HIGH",
                "skill_file": skill_file,
                "desc": f"L1 通过但 L3 失败 — 层间不一致",
                "l1_tests": l1.get("tests", []),
                "l3_tests": l3.get("tests", []),
            })

    # 检查 2: L2 通过但 L3 失败
    for skill_file, layers in skill_status.items():
        l2 = layers.get("L2", {})
        l3 = layers.get("L3", {})

        l2_pass = l2.get("passed", 0) > 0 and l2.get("failed", 0) == 0
        l3_fail = l3.get("failed", 0) > 0

        if l2_pass and l3_fail:
            issues.append({
                "type": "L2_PASS_L3_FAIL",
                "severity": "MEDIUM",
                "skill_file": skill_file,
                "desc": f"L2 通过但 L3 失败 — 属性与语义不一致",
                "l2_tests": l2.get("tests", []),
                "l3_tests": l3.get("tests", []),
            })

    # 检查 3: 全层跳过
    for skill_file, layers in skill_status.items():
        all_skipped = all(
            l.get("skipped", 0) > 0 and l.get("passed", 0) == 0 and l.get("failed", 0) == 0
            for l in layers.values()
        )
        if all_skipped and layers:
            issues.append({
                "type": "ALL_SKIPPED",
                "severity": "LOW",
                "skill_file": skill_file,
                "desc": "所有层的测试都被跳过 — 可能缺少测试数据",
            })

    # 检查 4: 同一 Skill 文件在同一层有矛盾结果
    for skill_file, layers in skill_status.items():
        for layer_name, layer_info in layers.items():
            if layer_info["passed"] > 0 and layer_info["failed"] > 0:
                issues.append({
                    "type": "CONTRADICTION",
                    "severity": "MEDIUM",
                    "skill_file": skill_file,
                    "layer": layer_name,
                    "desc": f"同层内有通过和失败的测试 — 可能存在矛盾",
                    "passed": layer_info["passed"],
                    "failed": layer_info["failed"],
                })

    return issues


def print_report(results, issues, verbose=False):
    """打印跨层一致性报告"""
    print()
    print("=" * 70)
    print("  CROSS-LAYER CONSISTENCY REPORT")
    print("=" * 70)
    print()

    # 各层结果
    print("  Layer Results:")
    print("-" * 70)
    for layer_name, result in results.items():
        status_icon = "OK" if result["status"] == "PASS" else ("SKIP" if result["status"] == "SKIP" else "FAIL")
        if result["status"] == "SKIP":
            print(f"    [{status_icon}] {layer_name}: {result['desc']} — {result['reason']}")
        else:
            print(f"    [{status_icon}] {layer_name}: {result['desc']}")
            print(f"         Passed: {result['passed']}  Failed: {result['failed']}  Skipped: {result['skipped']}  Total: {result['total']}")
    print()

    # 一致性问题
    if issues:
        high = [i for i in issues if i["severity"] == "HIGH"]
        medium = [i for i in issues if i["severity"] == "MEDIUM"]
        low = [i for i in issues if i["severity"] == "LOW"]

        print(f"  Issues Found: {len(issues)} (HIGH: {len(high)}, MEDIUM: {len(medium)}, LOW: {len(low)})")
        print("-" * 70)

        for issue in issues:
            severity_icon = {"HIGH": "!!!", "MEDIUM": "!! ", "LOW": "!  "}[issue["severity"]]
            print(f"    [{severity_icon}] {issue['type']}: {issue['desc']}")
            print(f"         File: {issue['skill_file']}")
            if verbose:
                for key in ["l1_tests", "l2_tests", "l3_tests"]:
                    if key in issue:
                        print(f"         {key}: {issue[key][:3]}")
            print()
    else:
        print("  [OK] No consistency issues found across layers.")
        print()

    # 结论
    print("=" * 70)
    high_count = len([i for i in issues if i["severity"] == "HIGH"])
    if high_count > 0:
        print(f"  FAIL: {high_count} HIGH severity issues — 需要修复")
    elif issues:
        print(f"  WARN: {len(issues)} non-critical issues — 建议检查")
    else:
        print(f"  PASS: 跨层一致性良好")
    print("=" * 70)

    return issues


def main():
    verbose = "--verbose" in sys.argv

    print(f"Skill dir: {SKILL_DIR}")
    print()

    # 运行各层测试
    results = {}
    for layer_name in LAYERS:
        print(f"Running {layer_name} ({LAYERS[layer_name]['desc']})...", end=" ", flush=True)
        results[layer_name] = run_layer(layer_name)
        print(results[layer_name]["status"])

    # 检查一致性
    issues = check_cross_layer_consistency(results)
    print_report(results, issues, verbose=verbose)

    # 保存报告
    report_dir = os.path.join(SKILL_DIR, "tests", "reports")
    os.makedirs(report_dir, exist_ok=True)
    report_path = os.path.join(report_dir, "cross-layer-report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump({
            "layers": {
                name: {
                    "status": r["status"],
                    "passed": r.get("passed", 0),
                    "failed": r.get("failed", 0),
                    "skipped": r.get("skipped", 0),
                }
                for name, r in results.items()
            },
            "issues": issues,
            "issue_count": len(issues),
            "high_count": len([i for i in issues if i["severity"] == "HIGH"]),
        }, f, ensure_ascii=False, indent=2)
    print(f"\nReport saved to: {report_path}")


if __name__ == "__main__":
    main()
