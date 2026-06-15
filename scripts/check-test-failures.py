#!/usr/bin/env python3
"""
测试失败分析器

运行测试并分析失败原因，生成 Patch Prompt 供 LLM 读取。

用法：
    python scripts/check-test-failures.py [test_path]

示例：
    python scripts/check-test-failures.py tests/unit/test_00_brainstorm.py
    python scripts/check-test-failures.py tests/
"""

import os
import sys
import json
import subprocess
import re

# Fix encoding on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')


def run_tests(test_path="tests/"):
    """运行测试，返回结果"""
    result = subprocess.run(
        [sys.executable, "-m", "pytest", test_path, "-v", "--tb=short", "--json-report"],
        capture_output=True,
        text=True,
        cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    return result.stdout, result.returncode


def parse_failures(output):
    """解析失败的测试"""
    failures = []
    lines = output.split("\n")
    
    i = 0
    while i < len(lines):
        line = lines[i]
        if "FAILED" in line:
            # 提取测试名
            match = re.search(r"(\S+::\S+) FAILED", line)
            if match:
                test_name = match.group(1)
                
                # 查找失败原因
                reason = ""
                i += 1
                while i < len(lines) and not lines[i].startswith("="):
                    reason += lines[i] + "\n"
                    i += 1
                
                failures.append({
                    "test_name": test_name,
                    "reason": reason.strip()
                })
        i += 1
    
    return failures


def map_test_to_process(test_name):
    """将测试映射到对应的 processes 文件"""
    if "00_brainstorm" in test_name or "brainstorm" in test_name.lower():
        return "processes/00-brainstorm.md"
    elif "01_partition" in test_name or "partition" in test_name.lower():
        return "processes/01-partition.md"
    elif "02_scan" in test_name or "scan" in test_name.lower():
        return "processes/02-scan.md"
    elif "shared_conventions" in test_name:
        return "core/shared-conventions.md"
    elif "meta_paths" in test_name or "paths" in test_name.lower():
        return "meta/paths.md"
    else:
        return None


def generate_patch_prompt(failures):
    """生成 Patch Prompt"""
    prompt = """# 测试失败分析报告

## 失败测试列表

"""
    
    for i, f in enumerate(failures, 1):
        process_file = map_test_to_process(f["test_name"])
        prompt += f"""### {i}. {f['test_name']}

**关联文件**: `{process_file or '未知'}`

**失败原因**:
```
{f['reason']}
```

"""
    
    prompt += """## 修复指引

请根据上述失败分析，修改对应的 Skill 文件。

**步骤**：
1. 阅读失败测试的 docstring（= 需求说明）
2. 阅读关联的 Skill 文件
3. 修改 Skill 文件使测试通过
4. 运行 `pytest <test_path> -v` 验证

**约束**：
- 只修改必要的部分
- 保持 Markdown 格式
- 不要破坏其他功能
"""
    
    return prompt


def main():
    test_path = sys.argv[1] if len(sys.argv) > 1 else "tests/"
    
    print(f"运行测试: {test_path}")
    output, returncode = run_tests(test_path)
    
    if returncode == 0:
        print("✅ 所有测试通过")
        return
    
    print("❌ 存在失败测试")
    print()
    
    failures = parse_failures(output)
    print(f"失败数量: {len(failures)}")
    print()
    
    for f in failures:
        print(f"  - {f['test_name']}")
    
    print()
    
    prompt = generate_patch_prompt(failures)
    
    # 保存到文件
    prompt_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "tests",
        "reports",
        "patch-prompt.md"
    )
    os.makedirs(os.path.dirname(prompt_path), exist_ok=True)
    
    with open(prompt_path, "w", encoding="utf-8") as f:
        f.write(prompt)
    
    print(f"Patch Prompt 已保存到: {prompt_path}")
    print()
    print("请将此文件内容发送给 LLM，让它修复 Skill。")


if __name__ == "__main__":
    main()
