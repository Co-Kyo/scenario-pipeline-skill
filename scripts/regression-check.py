#!/usr/bin/env python3
"""
回归检测脚本

运行所有测试，检查是否有失败，输出回归报告。
支持与上次基线对比，检测新增失败。

用法：
    python scripts/regression-check.py
    python scripts/regression-check.py --save-baseline  # 保存当前结果为基线
    python scripts/regression-check.py --layer L1       # 只运行指定层
"""

import os
import sys
import re
import subprocess
import json
import time
from datetime import datetime

os.environ['PYTHONIOENCODING'] = 'utf-8'
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TESTS_DIR = os.path.join(SKILL_DIR, "tests")
BASELINE_PATH = os.path.join(TESTS_DIR, "reports", "regression-baseline.json")


def run_all_tests(layer=None):
    """运行所有测试（或指定层）"""
    cmd = [sys.executable, "-m", "pytest", "-v", "--tb=short"]

    if layer:
        layer_map = {
            "L1": os.path.join(TESTS_DIR, "unit"),
            "L2": os.path.join(TESTS_DIR, "property"),
            "L3": os.path.join(TESTS_DIR, "semantic"),
        }
        if layer not in layer_map:
            return {"error": f"Unknown layer: {layer}. Use L1, L2, or L3."}
        cmd.append(layer_map[layer])
    else:
        cmd.append(TESTS_DIR)

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        cwd=SKILL_DIR,
        timeout=300,
    )
    return {
        "stdout": result.stdout,
        "stderr": result.stderr,
        "returncode": result.returncode,
    }


def parse_test_results(output):
    """解析 pytest 输出，提取每个测试的状态"""
    results = {
        "passed": [],
        "failed": [],
        "skipped": [],
        "error": [],
    }

    for line in output.split("\n"):
        match = re.search(r"(tests/\S+::\S+::\S+)\s+(PASSED|FAILED|SKIPPED|ERROR)", line)
        if match:
            test_name = match.group(1)
            status = match.group(2)
            if status == "PASSED":
                results["passed"].append(test_name)
            elif status == "FAILED":
                results["failed"].append(test_name)
            elif status == "SKIPPED":
                results["skipped"].append(test_name)
            elif status == "ERROR":
                results["error"].append(test_name)

    return results


def extract_failure_reasons(output):
    """提取失败测试的原因"""
    reasons = {}
    lines = output.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        if "FAILED" in line:
            match = re.search(r"(tests/\S+::\S+::\S+)\s+FAILED", line)
            if match:
                test_name = match.group(1)
                # 向前查找失败原因（在 SHORT TEST SUMMARY 部分）
                reason = ""
                # 查找 FAILURES 部分
                if "FAILURES" in "".join(lines[max(0, i-50):i]):
                    for j in range(max(0, i-10), i):
                        if lines[j].strip() and not lines[j].startswith("="):
                            reason += lines[j].strip() + " "
                reasons[test_name] = reason.strip() or "See pytest output for details"
        i += 1

    return reasons


def load_baseline():
    """加载基线"""
    if os.path.exists(BASELINE_PATH):
        with open(BASELINE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def save_baseline(results, test_results):
    """保存基线"""
    os.makedirs(os.path.dirname(BASELINE_PATH), exist_ok=True)
    baseline = {
        "timestamp": datetime.now().isoformat(),
        "total": len(test_results["passed"]) + len(test_results["failed"]) + len(test_results["skipped"]) + len(test_results["error"]),
        "passed": len(test_results["passed"]),
        "failed": len(test_results["failed"]),
        "skipped": len(test_results["skipped"]),
        "failed_tests": test_results["failed"],
        "error_tests": test_results["error"],
    }
    with open(BASELINE_PATH, "w", encoding="utf-8") as f:
        json.dump(baseline, f, ensure_ascii=False, indent=2)
    return baseline


def compare_with_baseline(test_results, baseline):
    """与基线对比"""
    new_failures = []
    resolved = []

    baseline_failed = set(baseline.get("failed_tests", []) + baseline.get("error_tests", []))
    current_failed = set(test_results["failed"] + test_results["error"])

    new_failures = list(current_failed - baseline_failed)
    resolved = list(baseline_failed - current_failed)

    return {
        "new_failures": new_failures,
        "resolved": resolved,
        "baseline_failed_count": len(baseline_failed),
        "current_failed_count": len(current_failed),
    }


def print_report(test_results, failure_reasons, baseline=None, comparison=None, elapsed=0):
    """打印回归报告"""
    total = len(test_results["passed"]) + len(test_results["failed"]) + len(test_results["skipped"]) + len(test_results["error"])
    pass_rate = len(test_results["passed"]) / total * 100 if total > 0 else 0

    print()
    print("=" * 70)
    print("  REGRESSION CHECK REPORT")
    print("=" * 70)
    print()
    print(f"  Timestamp:          {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Total tests:        {total}")
    print(f"  Passed:             {len(test_results['passed'])}")
    print(f"  Failed:             {len(test_results['failed'])}")
    print(f"  Skipped:            {len(test_results['skipped'])}")
    print(f"  Errors:             {len(test_results['error'])}")
    print(f"  Pass rate:          {pass_rate:.1f}%")
    print(f"  Time:               {elapsed:.1f}s")
    print()

    # 失败详情
    if test_results["failed"] or test_results["error"]:
        print("  [!] FAILURES:")
        print("-" * 70)
        for test_name in test_results["failed"] + test_results["error"]:
            reason = failure_reasons.get(test_name, "See pytest output")
            print(f"    {test_name}")
            if reason and reason != "See pytest output for details":
                print(f"      -> {reason[:120]}")
        print()

    # 基线对比
    if baseline and comparison:
        print("  Baseline Comparison:")
        print("-" * 70)
        print(f"    Baseline:  {baseline.get('timestamp', 'N/A')}")
        print(f"    Baseline:  {baseline.get('passed', '?')} passed, {baseline.get('failed', '?')} failed")
        print(f"    Current:   {len(test_results['passed'])} passed, {len(test_results['failed'])} failed")
        print()

        if comparison["new_failures"]:
            print(f"    [!!!] NEW FAILURES ({len(comparison['new_failures'])}):")
            for t in comparison["new_failures"]:
                print(f"      + {t}")
            print()

        if comparison["resolved"]:
            print(f"    [OK] RESOLVED ({len(comparison['resolved'])}):")
            for t in comparison["resolved"]:
                print(f"      - {t}")
            print()

        if not comparison["new_failures"] and not comparison["resolved"]:
            print("    [OK] No regression detected — results match baseline")
            print()
    elif baseline is None:
        print("  [i] No baseline found. Use --save-baseline to create one.")
        print()

    # 结论
    print("=" * 70)
    if test_results["failed"] or test_results["error"]:
        print(f"  FAIL: {len(test_results['failed'])} failures, {len(test_results['error'])} errors")
    elif comparison and comparison.get("new_failures"):
        print(f"  REGRESSION: {len(comparison['new_failures'])} new failures since baseline")
    else:
        print(f"  PASS: All {len(test_results['passed'])} tests passed")
    print("=" * 70)

    return len(test_results["failed"]) + len(test_results["error"])


def main():
    import argparse

    save_baseline_flag = "--save-baseline" in sys.argv
    layer = None
    for arg in sys.argv[1:]:
        if arg.startswith("--layer="):
            layer = arg.split("=", 1)[1].upper()
        elif arg == "--layer":
            continue
        elif arg.startswith("L"):
            layer = arg.upper()

    print(f"Skill dir: {SKILL_DIR}")
    if layer:
        print(f"Layer: {layer}")
    print()

    # 加载基线
    baseline = load_baseline()
    if baseline:
        print(f"Baseline: {baseline.get('timestamp', 'N/A')} ({baseline.get('total', '?')} tests)")

    # 运行测试
    print("Running tests...")
    start_time = time.time()
    raw_results = run_all_tests(layer)
    elapsed = time.time() - start_time

    if "error" in raw_results:
        print(f"Error: {raw_results['error']}")
        sys.exit(1)

    # 解析结果
    test_results = parse_test_results(raw_results["stdout"])
    failure_reasons = extract_failure_reasons(raw_results["stdout"])

    # 对比基线
    comparison = None
    if baseline:
        comparison = compare_with_baseline(test_results, baseline)

    # 打印报告
    fail_count = print_report(test_results, failure_reasons, baseline, comparison, elapsed)

    # 保存基线
    if save_baseline_flag:
        saved = save_baseline(raw_results, test_results)
        print(f"\nBaseline saved: {BASELINE_PATH}")

    # 保存报告
    report_dir = os.path.join(SKILL_DIR, "tests", "reports")
    os.makedirs(report_dir, exist_ok=True)
    report_path = os.path.join(report_dir, "regression-report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "total": len(test_results["passed"]) + len(test_results["failed"]) + len(test_results["skipped"]) + len(test_results["error"]),
            "passed": len(test_results["passed"]),
            "failed": len(test_results["failed"]),
            "skipped": len(test_results["skipped"]),
            "errors": len(test_results["error"]),
            "failures": test_results["failed"],
            "failure_reasons": failure_reasons,
            "comparison": comparison,
            "elapsed": elapsed,
        }, f, ensure_ascii=False, indent=2)
    print(f"Report saved to: {report_path}")

    # 返回码
    if fail_count > 0 or (comparison and comparison.get("new_failures")):
        sys.exit(1)


if __name__ == "__main__":
    main()
