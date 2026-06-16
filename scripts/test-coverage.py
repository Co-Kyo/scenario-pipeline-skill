#!/usr/bin/env python3
"""
测试覆盖率报告

统计哪些 Skill 文件有测试覆盖，哪些没有。
基于测试文件名和内容分析映射关系。

用法：
    python scripts/test-coverage.py
    python scripts/test-coverage.py --verbose  # 显示详细映射
"""

import os
import sys
import re
from pathlib import Path

os.environ['PYTHONIOENCODING'] = 'utf-8'
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TESTS_DIR = os.path.join(SKILL_DIR, "tests")


def scan_skill_files():
    """扫描所有 Skill 文件"""
    files = {}

    # processes/*.md
    processes_dir = os.path.join(SKILL_DIR, "processes")
    if os.path.isdir(processes_dir):
        for f in sorted(os.listdir(processes_dir)):
            if f.endswith(".md"):
                files[f"processes/{f}"] = {
                    "path": os.path.join(processes_dir, f),
                    "type": "process",
                    "step": re.match(r"(\d+)", f),
                }

    # core/*.md
    core_dir = os.path.join(SKILL_DIR, "core")
    if os.path.isdir(core_dir):
        for f in sorted(os.listdir(core_dir)):
            if f.endswith(".md"):
                files[f"core/{f}"] = {
                    "path": os.path.join(core_dir, f),
                    "type": "core",
                }

    # meta/*.md
    meta_dir = os.path.join(SKILL_DIR, "meta")
    if os.path.isdir(meta_dir):
        for f in sorted(os.listdir(meta_dir)):
            if f.endswith(".md"):
                files[f"meta/{f}"] = {
                    "path": os.path.join(meta_dir, f),
                    "type": "meta",
                }

    # plugins/*.md
    plugins_dir = os.path.join(SKILL_DIR, "plugins")
    if os.path.isdir(plugins_dir):
        for f in sorted(os.listdir(plugins_dir)):
            if f.endswith(".md"):
                files[f"plugins/{f}"] = {
                    "path": os.path.join(plugins_dir, f),
                    "type": "plugin",
                }

    # SKILL.md
    skill_md = os.path.join(SKILL_DIR, "SKILL.md")
    if os.path.exists(skill_md):
        files["SKILL.md"] = {"path": skill_md, "type": "entry"}

    return files


def scan_test_files():
    """扫描所有测试文件，提取引用的 Skill 文件"""
    test_files = {}

    for root, dirs, files in os.walk(TESTS_DIR):
        for f in files:
            if f.startswith("test_") and f.endswith(".py"):
                filepath = os.path.join(root, f)
                relpath = os.path.relpath(filepath, SKILL_DIR)
                with open(filepath, "r", encoding="utf-8") as fh:
                    content = fh.read()

                # 提取引用的 Skill 文件
                referenced = set()

                # 通过文件名推断
                fname = f.replace("test_", "").replace(".py", "")
                step_match = re.match(r"(\d+)_", fname)
                if step_match:
                    step_num = step_match.group(1)
                    referenced.add(f"processes/{step_num}-*.md")

                # 通过内容搜索引用
                for pattern, target in [
                    (r"00-brainstorm", "processes/00-brainstorm.md"),
                    (r"01-partition", "processes/01-partition.md"),
                    (r"02-scan", "processes/02-scan.md"),
                    (r"03-capability-graph", "processes/03-capability-graph.md"),
                    (r"04-evaluate-pool", "processes/04-evaluate-pool.md"),
                    (r"05-capability-research", "processes/05-capability-research.md"),
                    (r"06-briefing-assemble", "processes/06-briefing-assemble.md"),
                    (r"07-assemble", "processes/07-assemble.md"),
                    (r"08-learning-ladder", "processes/08-learning-ladder.md"),
                    (r"09-build-dashboard", "processes/09-build-dashboard.md"),
                    (r"shared-conventions", "core/shared-conventions.md"),
                    (r"capability-graph\.md", "core/capability-graph.md"),
                    (r"strategic-highground", "core/strategic-highground.md"),
                    (r"scenario-matrix", "core/scenario-matrix.md"),
                    (r"output-contracts", "meta/output-contracts.md"),
                    (r"meta/paths", "meta/paths.md"),
                    (r"paths\.md", "meta/paths.md"),
                    (r"partition-analysis-schema", "meta/partition-analysis-schema.md"),
                    (r"sources\.md", "meta/sources.md"),
                    (r"anti-crawl-fetch", "plugins/anti-crawl-fetch.md"),
                    (r"year-granularity", "plugins/year-granularity.md"),
                    (r"capability-research-mode", "plugins/capability-research-mode.md"),
                    (r"SKILL\.md", "SKILL.md"),
                ]:
                    if re.search(pattern, content):
                        referenced.add(target)

                # 也通过路径关键词推断
                if "shared_conventions" in fname:
                    referenced.add("core/shared-conventions.md")
                if "meta_paths" in fname:
                    referenced.add("meta/paths.md")
                if "skill_audit" in fname:
                    referenced.add("processes/*.md")
                    referenced.add("core/shared-conventions.md")
                if "output_contracts" in fname:
                    referenced.add("meta/output-contracts.md")
                if "core_files" in fname:
                    referenced.add("core/capability-graph.md")
                    referenced.add("core/strategic-highground.md")
                    referenced.add("core/scenario-matrix.md")
                if "dag_no_cycle" in fname:
                    referenced.add("processes/01-partition.md")
                if "level_weight" in fname:
                    referenced.add("processes/00-brainstorm.md")
                if "proposition_coverage" in fname:
                    referenced.add("processes/00-brainstorm.md")

                test_files[relpath] = {
                    "path": filepath,
                    "referenced": referenced,
                    "test_count": len(re.findall(r"def test_", content)),
                    "class_count": len(re.findall(r"class Test", content)),
                }

    return test_files


def build_coverage_map(skill_files, test_files):
    """构建覆盖映射"""
    coverage = {}

    for skill_file in skill_files:
        coverage[skill_file] = {
            "covered_by": [],
            "test_count": 0,
        }

    for test_file, info in test_files.items():
        for ref in info["referenced"]:
            if ref in coverage:
                coverage[ref]["covered_by"].append(test_file)
                coverage[ref]["test_count"] += info["test_count"]
            elif ref.endswith("*"):
                # 通配符匹配
                prefix = ref.replace("*.md", "")
                for sf in skill_files:
                    if sf.startswith(prefix):
                        coverage[sf]["covered_by"].append(test_file)
                        coverage[sf]["test_count"] += info["test_count"]

    return coverage


def count_tests_per_file(test_files):
    """统计每个测试文件的测试数量"""
    total = 0
    for info in test_files.values():
        total += info["test_count"]
    return total


def print_report(skill_files, test_files, coverage, verbose=False):
    """打印覆盖率报告"""
    total_skill = len(skill_files)
    covered = sum(1 for v in coverage.values() if v["covered_by"])
    uncovered = total_skill - covered
    total_tests = count_tests_per_file(test_files)

    print()
    print("=" * 70)
    print("  TEST COVERAGE REPORT")
    print("=" * 70)
    print()
    print(f"  Skill files:        {total_skill}")
    print(f"  Test files:         {len(test_files)}")
    print(f"  Total test cases:   {total_tests}")
    print(f"  Covered files:      {covered}")
    print(f"  Uncovered files:    {uncovered}")
    print(f"  Coverage rate:      {covered/total_skill*100:.1f}%")
    print()

    # 按类型分组
    by_type = {}
    for sf, info in skill_files.items():
        t = info["type"]
        if t not in by_type:
            by_type[t] = {"total": 0, "covered": 0, "files": []}
        by_type[t]["total"] += 1
        if coverage[sf]["covered_by"]:
            by_type[t]["covered"] += 1
        by_type[t]["files"].append(sf)

    print("  Coverage by type:")
    print("-" * 70)
    for t, info in sorted(by_type.items()):
        rate = info["covered"] / info["total"] * 100 if info["total"] > 0 else 0
        bar_len = int(rate / 5)
        bar = "█" * bar_len + "░" * (20 - bar_len)
        print(f"    {t:12s}  {bar}  {info['covered']}/{info['total']}  ({rate:.0f}%)")
    print()

    # 未覆盖文件
    uncovered_files = [sf for sf in skill_files if not coverage[sf]["covered_by"]]
    if uncovered_files:
        print("  [!] UNCOVERED files:")
        print("-" * 70)
        for sf in uncovered_files:
            print(f"    {sf}  (type: {skill_files[sf]['type']})")
        print()

    # 已覆盖文件详情
    if verbose:
        print("  [OK] COVERED files:")
        print("-" * 70)
        for sf in sorted(coverage.keys()):
            if coverage[sf]["covered_by"]:
                tests = coverage[sf]["test_count"]
                test_files_str = ", ".join(coverage[sf]["covered_by"][:3])
                if len(coverage[sf]["covered_by"]) > 3:
                    test_files_str += f" (+{len(coverage[sf]['covered_by'])-3} more)"
                print(f"    {sf}")
                print(f"      Tests: {tests} | By: {test_files_str}")
        print()

    # 测试文件统计
    print("  Test files:")
    print("-" * 70)
    for tf in sorted(test_files.keys()):
        info = test_files[tf]
        layer = "L1" if "\\unit\\" in tf or "/unit/" in tf else ("L2" if "\\property\\" in tf or "/property/" in tf else "L3")
        print(f"    [{layer}] {tf}: {info['test_count']} tests, {info['class_count']} classes")
    print()

    # 结论
    print("=" * 70)
    if covered / total_skill >= 0.8:
        print(f"  PASS: Coverage {covered/total_skill*100:.1f}% >= 80% — 覆盖率良好")
    elif covered / total_skill >= 0.5:
        print(f"  WARN: Coverage {covered/total_skill*100:.1f}% — 建议补充测试")
    else:
        print(f"  FAIL: Coverage {covered/total_skill*100:.1f}% < 50% — 覆盖率不足")
    print("=" * 70)

    return covered / total_skill


def main():
    verbose = "--verbose" in sys.argv

    print(f"Skill dir: {SKILL_DIR}")

    skill_files = scan_skill_files()
    test_files = scan_test_files()
    coverage = build_coverage_map(skill_files, test_files)
    rate = print_report(skill_files, test_files, coverage, verbose=verbose)

    # 保存报告
    import json
    report_dir = os.path.join(SKILL_DIR, "tests", "reports")
    os.makedirs(report_dir, exist_ok=True)
    report_path = os.path.join(report_dir, "coverage-report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump({
            "coverage_rate": rate,
            "total_skill_files": len(skill_files),
            "total_test_files": len(test_files),
            "covered": sum(1 for v in coverage.values() if v["covered_by"]),
            "uncovered": [sf for sf in skill_files if not coverage[sf]["covered_by"]],
            "details": {
                sf: {
                    "covered_by": v["covered_by"],
                    "test_count": v["test_count"],
                }
                for sf, v in coverage.items()
            },
        }, f, ensure_ascii=False, indent=2)
    print(f"Report saved to: {report_path}")


if __name__ == "__main__":
    main()
