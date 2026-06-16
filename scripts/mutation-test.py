#!/usr/bin/env python3
"""
变异测试脚本

自动对 processes/*.md 和 core/*.md 引入变异（mutation），
运行测试套件，检查测试是否能捕获这些变异。
输出变异杀死率（mutation kill rate）报告。

用法：
    python scripts/mutation-test.py
    python scripts/mutation-test.py --dry-run  # 只列出变异，不执行
    python scripts/mutation-test.py --target tests/unit/test_skill_audit.py  # 只跑指定测试
"""

import os
import sys
import re
import shutil
import subprocess
import tempfile
import json
from pathlib import Path

os.environ['PYTHONIOENCODING'] = 'utf-8'
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESSES_DIR = os.path.join(SKILL_DIR, "processes")
CORE_DIR = os.path.join(SKILL_DIR, "core")
META_DIR = os.path.join(SKILL_DIR, "meta")


# --- 变异定义 ---

MUTATIONS = [
    {
        "id": "M01",
        "name": "添加 why 泄漏词（设计理念）",
        "desc": "在 process 文件中注入 why 泄漏词，应被 test_no_design_philosophy 捕获",
        "targets": "processes",
        "apply": lambda content: content + "\n\n<!-- 设计理念：本步骤选择此方案是因为性能更好 -->\n",
        "expected_test": "test_no_design_philosophy",
    },
    {
        "id": "M02",
        "name": "添加 why 泄漏词（之所以）",
        "desc": "注入另一种 why 泄漏词",
        "targets": "processes",
        "apply": lambda content: content + "\n\n之所以采用此方案，是因为旧方案性能差。\n",
        "expected_test": "test_no_design_philosophy",
    },
    {
        "id": "M03",
        "name": "删除前置条件章节",
        "desc": "移除 ## 前置条件，应被 test_has_prerequisites 捕获",
        "targets": "processes",
        "apply": lambda content: re.sub(r"## 前置条件[^\n]*\n", "## REMOVED\n", content, count=1),
        "expected_test": "test_has_prerequisites",
    },
    {
        "id": "M04",
        "name": "删除上下文隔离声明",
        "desc": "移除上下文隔离关键字",
        "targets": "processes",
        "apply": lambda content: content.replace("上下文隔离", "REMOVED_CONTEXT"),
        "expected_test": "test_context_isolation_declaration",
    },
    {
        "id": "M05",
        "name": "删除 _trace 定义",
        "desc": "从 shared-conventions.md 移除 _trace 定义",
        "targets": "core/shared-conventions.md",
        "apply": lambda content: content.replace("_trace", "REMOVED_TRACE"),
        "expected_test": "test_trace清单存在",
    },
    {
        "id": "M06",
        "name": "删除 §0 输出契约",
        "desc": "从 output-contracts.md 移除 §0",
        "targets": "meta/output-contracts.md",
        "apply": lambda content: content.replace("§0", "REMOVED_SECTION"),
        "expected_test": "test_has_section_0",
    },
    {
        "id": "M07",
        "name": "删除 §1 输出契约",
        "desc": "从 output-contracts.md 移除 §1",
        "targets": "meta/output-contracts.md",
        "apply": lambda content: content.replace("§1", "REMOVED_SECTION"),
        "expected_test": "test_has_section_1",
    },
    {
        "id": "M08",
        "name": "删除 DAG 关键字",
        "desc": "移除 DAG 关键字",
        "targets": "processes",
        "apply": lambda content: content.replace("DAG", "REMOVED_DAG").replace("依赖图", "REMOVED_GRAPH"),
        "expected_test": "test_dag_mentioned",
    },
    {
        "id": "M09",
        "name": "删除 requirement-web 引用",
        "desc": "从 partition 文件移除 requirement-web 引用",
        "targets": "processes/01-partition.md",
        "apply": lambda content: content.replace("requirement-web", "REMOVED_OUTPUT"),
        "expected_test": "test_references_previous_step_output",
    },
    {
        "id": "M10",
        "name": "删除 JSON 示例",
        "desc": "从 brainstorm 文件移除 JSON 示例",
        "targets": "processes/00-brainstorm.md",
        "apply": lambda content: content.replace("```json", "```removed"),
        "expected_test": "test_json_example_provided",
    },
    {
        "id": "M11",
        "name": "删除年限等级定义",
        "desc": "移除 L1-L4 等级定义",
        "targets": "processes",
        "apply": lambda content: content.replace("L1", "X1").replace("L2", "X2").replace("L3", "X3").replace("L4", "X4"),
        "expected_test": "test_year_levels_defined",
    },
    {
        "id": "M12",
        "name": "删除并行执行描述",
        "desc": "移除并行关键字",
        "targets": "processes",
        "apply": lambda content: content.replace("并行", "REMOVED_PARALLEL"),
        "expected_test": "test_parallel_execution_mentioned",
    },
    {
        "id": "M13",
        "name": "删除 year_inference_trace 定义",
        "desc": "从 shared-conventions.md 移除 year_inference_trace",
        "targets": "core/shared-conventions.md",
        "apply": lambda content: content.replace("year_inference_trace", "REMOVED_TRACE_FIELD"),
        "expected_test": "test_year_inference_trace定义",
    },
    {
        "id": "M14",
        "name": "删除 source_tier 定义",
        "desc": "从 shared-conventions.md 移除 source_tier",
        "targets": "core/shared-conventions.md",
        "apply": lambda content: content.replace("source_tier", "REMOVED_TIER"),
        "expected_test": "test_source_tier_trace定义",
    },
    {
        "id": "M15",
        "name": "删除环检测描述",
        "desc": "移除环检测关键字",
        "targets": "processes",
        "apply": lambda content: content.replace("环", "REMOVED_CYCLE").replace("循环", "REMOVED_LOOP"),
        "expected_test": "test_cycle_detection_mentioned",
    },
]


def get_target_files(target_spec):
    """根据 target 规范获取文件列表"""
    files = []
    if "/" in target_spec and target_spec.endswith(".md"):
        path = os.path.join(SKILL_DIR, target_spec)
        if os.path.exists(path):
            files.append(path)
    elif target_spec == "processes":
        for f in os.listdir(PROCESSES_DIR):
            if f.endswith(".md"):
                files.append(os.path.join(PROCESSES_DIR, f))
    elif target_spec == "core":
        for f in os.listdir(CORE_DIR):
            if f.endswith(".md"):
                files.append(os.path.join(CORE_DIR, f))
    return files


def backup_file(filepath):
    """备份文件"""
    backup_path = filepath + ".mutation_backup"
    shutil.copy2(filepath, backup_path)
    return backup_path


def restore_file(filepath):
    """恢复文件"""
    backup_path = filepath + ".mutation_backup"
    if os.path.exists(backup_path):
        shutil.copy2(backup_path, filepath)
        os.remove(backup_path)


def run_tests(test_target=None, test_name=None):
    """运行测试，返回 (passed, failed_count, output)"""
    cmd = [sys.executable, "-m", "pytest", "-v", "--tb=line", "-q"]
    if test_target:
        cmd.append(test_target)
    if test_name:
        cmd.extend(["-k", test_name])

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
    # 解析 pytest 输出
    passed = result.returncode == 0
    failed_match = re.search(r"(\d+) failed", output)
    failed_count = int(failed_match.group(1)) if failed_match else 0
    return passed, failed_count, output


def run_mutation(mutation, dry_run=False, test_target=None):
    """执行单个变异测试"""
    target_files = get_target_files(mutation["targets"])
    if not target_files:
        return {
            "id": mutation["id"],
            "name": mutation["name"],
            "status": "SKIP",
            "reason": f"目标文件不存在: {mutation['targets']}",
        }

    if dry_run:
        return {
            "id": mutation["id"],
            "name": mutation["name"],
            "status": "DRY_RUN",
            "targets": [os.path.relpath(f, SKILL_DIR) for f in target_files],
        }

    # 备份所有目标文件
    backups = {}
    for filepath in target_files:
        backups[filepath] = backup_file(filepath)

    try:
        # 应用变异
        for filepath in target_files:
            with open(filepath, "r", encoding="utf-8") as f:
                original = f.read()
            mutated = mutation["apply"](original)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(mutated)

        # 运行测试
        passed, failed_count, output = run_tests(
            test_target=test_target,
            test_name=mutation.get("expected_test"),
        )

        if not passed and failed_count > 0:
            status = "KILLED"
            reason = f"测试捕获了变异（{failed_count} 个测试失败）"
        else:
            status = "SURVIVED"
            reason = "测试未捕获变异（所有测试仍通过）"

        return {
            "id": mutation["id"],
            "name": mutation["name"],
            "status": status,
            "reason": reason,
            "failed_count": failed_count,
            "targets": [os.path.relpath(f, SKILL_DIR) for f in target_files],
        }

    except subprocess.TimeoutExpired:
        return {
            "id": mutation["id"],
            "name": mutation["name"],
            "status": "TIMEOUT",
            "reason": "测试执行超时（120s）",
        }
    except Exception as e:
        return {
            "id": mutation["id"],
            "name": mutation["name"],
            "status": "ERROR",
            "reason": str(e),
        }
    finally:
        # 恢复所有文件
        for filepath in target_files:
            restore_file(filepath)


def print_report(results, elapsed):
    """打印变异测试报告"""
    killed = [r for r in results if r["status"] == "KILLED"]
    survived = [r for r in results if r["status"] == "SURVIVED"]
    skipped = [r for r in results if r["status"] in ("SKIP", "DRY_RUN")]
    errors = [r for r in results if r["status"] in ("ERROR", "TIMEOUT")]

    total_executed = len(killed) + len(survived) + len(errors)
    kill_rate = (len(killed) / total_executed * 100) if total_executed > 0 else 0

    print()
    print("=" * 70)
    print("  MUTATION TEST REPORT")
    print("=" * 70)
    print()
    print(f"  Total mutations:    {len(results)}")
    print(f"  Executed:           {total_executed}")
    print(f"  Killed:             {len(killed)}")
    print(f"  Survived:           {len(survived)}")
    print(f"  Skipped:            {len(skipped)}")
    print(f"  Errors:             {len(errors)}")
    print(f"  Kill rate:          {kill_rate:.1f}%")
    print(f"  Time:               {elapsed:.1f}s")
    print()

    if survived:
        print("  [!] SURVIVED (tests did NOT catch this mutation):")
        print("-" * 70)
        for r in survived:
            print(f"    {r['id']}: {r['name']}")
            print(f"      Reason: {r['reason']}")
            print(f"      Targets: {', '.join(r.get('targets', []))}")
        print()

    if killed:
        print("  [OK] KILLED (tests caught this mutation):")
        print("-" * 70)
        for r in killed:
            print(f"    {r['id']}: {r['name']}")
        print()

    if errors:
        print("  [!!] ERRORS:")
        print("-" * 70)
        for r in errors:
            print(f"    {r['id']}: {r['name']} — {r['reason']}")
        print()

    # 结论
    print("=" * 70)
    if kill_rate >= 80:
        print(f"  PASS: Kill rate {kill_rate:.1f}% >= 80% — 测试套件质量良好")
    elif kill_rate >= 50:
        print(f"  WARN: Kill rate {kill_rate:.1f}% — 测试套件有盲区，建议补充测试")
    else:
        print(f"  FAIL: Kill rate {kill_rate:.1f}% < 50% — 测试套件质量不足")
    print("=" * 70)

    return kill_rate


def main():
    import time

    dry_run = "--dry-run" in sys.argv
    test_target = None
    for arg in sys.argv[1:]:
        if arg.startswith("--target="):
            test_target = arg.split("=", 1)[1]
        elif arg == "--target":
            continue
        elif arg.startswith("tests/"):
            test_target = arg

    if dry_run:
        print("=== DRY RUN: 只列出变异，不执行 ===\n")

    print(f"Skill dir: {SKILL_DIR}")
    print(f"Mutations: {len(MUTATIONS)}")
    if test_target:
        print(f"Test target: {test_target}")
    print()

    # 先运行一次基准测试确认全部通过
    if not dry_run:
        print("Running baseline tests...")
        passed, _, baseline_output = run_tests(test_target)
        if not passed:
            print("[!] WARNING: 基准测试存在失败，变异测试结果可能不准确")
            print()
        else:
            print("Baseline: all tests passed\n")

    results = []
    start_time = time.time()

    for i, mutation in enumerate(MUTATIONS, 1):
        print(f"[{i}/{len(MUTATIONS)}] {mutation['id']}: {mutation['name']}...", end=" ", flush=True)
        result = run_mutation(mutation, dry_run=dry_run, test_target=test_target)
        results.append(result)
        print(result["status"])

    elapsed = time.time() - start_time

    if dry_run:
        print("\n=== DRY RUN 完成 ===")
        for r in results:
            print(f"  {r['id']}: {r['name']} -> targets: {r.get('targets', 'N/A')}")
    else:
        kill_rate = print_report(results, elapsed)

        # 保存报告
        report_dir = os.path.join(SKILL_DIR, "tests", "reports")
        os.makedirs(report_dir, exist_ok=True)
        report_path = os.path.join(report_dir, "mutation-report.json")
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump({
                "kill_rate": kill_rate,
                "total": len(results),
                "killed": len([r for r in results if r["status"] == "KILLED"]),
                "survived": len([r for r in results if r["status"] == "SURVIVED"]),
                "results": results,
            }, f, ensure_ascii=False, indent=2)
        print(f"\nReport saved to: {report_path}")


if __name__ == "__main__":
    main()
