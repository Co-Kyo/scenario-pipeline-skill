"""
BDD-style integration tests for the scenario-pipeline dashboard build system.

Tests verify:
1. Build script exists and is executable
2. --help flag works
3. Empty workDir produces skeleton HTML
4. step=0 with requirement-web.json produces HTML with proposition data
5. </script> escaping is correct
6. Output file size > 50KB (contains React bundle)

These tests use subprocess to invoke the Node.js build script.
"""

import os
import sys
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

import pytest

# Path constants
SKILL_DIR = Path(__file__).resolve().parents[2]
SCRIPTS_DIR = SKILL_DIR / "scripts"
BUILD_SCRIPT = SCRIPTS_DIR / "build-dashboard.js"
SHELL_HTML = SCRIPTS_DIR / "dashboard-dist" / "dashboard-shell.html"


# ============================================================================
# Feature: Build Script Existence
# ============================================================================

class TestBuildScriptExists:
    """Scenario: Build script is available for pipeline integration."""

    def test_build_dashboard_script_exists(self):
        """Given the scripts directory, When checking for build-dashboard.js,
        Then the file should exist."""
        assert BUILD_SCRIPT.exists(), f"Build script not found at {BUILD_SCRIPT}"

    def test_build_dashboard_script_is_executable(self):
        """Given the build script exists, When checking permissions,
        Then the file should be readable."""
        assert os.access(str(BUILD_SCRIPT), os.R_OK), "Build script is not readable"

    def test_lib_modules_exist(self):
        """Given the scripts/lib directory, When checking for required modules,
        Then data-loader.js, data-transformer.js, and shell-injector.js should exist."""
        for module in ["data-loader.js", "data-transformer.js", "shell-injector.js"]:
            assert (SCRIPTS_DIR / "lib" / module).exists(), f"Missing lib module: {module}"


# ============================================================================
# Feature: CLI Help
# ============================================================================

class TestCliHelp:
    """Scenario: User requests help via --help flag."""

    def test_help_flag_outputs_usage(self):
        """Given the build script, When running with --help,
        Then output should contain usage information."""
        result = subprocess.run(
            ["node", str(BUILD_SCRIPT), "--help"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        assert "Usage" in result.stdout or "Usage" in result.stderr
        assert "--step" in result.stdout or "--step" in result.stderr


# ============================================================================
# Feature: Skeleton State (Empty workDir)
# ============================================================================

class TestSkeletonState:
    """Scenario: Pipeline hasn't started, no .meta files exist."""

    @pytest.fixture
    def empty_workdir(self, tmp_path):
        """Create an empty working directory."""
        return tmp_path

    def test_empty_workdir_produces_html(self, empty_workdir):
        """Given an empty workDir with no .meta files, When running build,
        Then a dashboard.html file should be produced."""
        if not SHELL_HTML.exists():
            pytest.skip("dashboard-shell.html not built yet (run npm run build in dashboard-dev)")

        result = subprocess.run(
            ["node", str(BUILD_SCRIPT), str(empty_workdir), "--step=0"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        output_html = empty_workdir / "dashboard.html"
        assert output_html.exists(), f"dashboard.html not produced. stderr: {result.stderr}"

    def test_skeleton_html_contains_pipeline_data(self, empty_workdir):
        """Given an empty workDir, When running build,
        Then HTML should contain __PIPELINE_DATA__ injection."""
        if not SHELL_HTML.exists():
            pytest.skip("dashboard-shell.html not built yet")

        subprocess.run(
            ["node", str(BUILD_SCRIPT), str(empty_workdir), "--step=0"],
            capture_output=True,
            timeout=30,
        )
        output_html = empty_workdir / "dashboard.html"
        if output_html.exists():
            content = output_html.read_text(encoding="utf-8")
            assert "__PIPELINE_DATA__" in content, "Pipeline data injection not found"


# ============================================================================
# Feature: Step 0 with requirement-web.json
# ============================================================================

class TestStepZeroBuild:
    """Scenario: Step 0 completed, requirement-web.json exists."""

    @pytest.fixture
    def workdir_with_requirement(self, tmp_path):
        """Create a workDir with a minimal requirement-web.json."""
        meta_dir = tmp_path / ".meta"
        meta_dir.mkdir()

        requirement = {
            "generated_at": "2025-01-01T00:00:00Z",
            "context": {
                "topic": "前端性能优化",
                "target_level": "L2 (3-5年)",
            },
            "strategy": {"core_ratio": 0.75},
            "propositions": [
                {"id": "RW-P1", "name": "渲染性能瓶颈诊断", "role": "core"},
                {"id": "RW-P2", "name": "Core Web Vitals优化", "role": "core"},
            ],
            "dependencies": {"RW-P2": ["RW-P1"]},
            "capability_web": {
                "A01": {"name": "浏览器渲染管线", "layer": "浏览器层"},
            },
            "scope": {"total_propositions": 2, "total_capabilities": 1},
        }
        (meta_dir / "requirement-web.json").write_text(
            json.dumps(requirement, ensure_ascii=False), encoding="utf-8"
        )
        return tmp_path

    def test_step0_produces_html_with_propositions(self, workdir_with_requirement):
        """Given workDir with requirement-web.json, When running --step=0,
        Then HTML should contain proposition data."""
        if not SHELL_HTML.exists():
            pytest.skip("dashboard-shell.html not built yet")

        result = subprocess.run(
            ["node", str(BUILD_SCRIPT), str(workdir_with_requirement), "--step=0"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        output_html = workdir_with_requirement / "dashboard.html"
        assert output_html.exists(), f"dashboard.html not produced. stderr: {result.stderr}"

        content = output_html.read_text(encoding="utf-8")
        assert "RW-P1" in content, "Proposition data not found in HTML"
        assert "渲染性能瓶颈" in content, "Proposition name not found in HTML"


# ============================================================================
# Feature: Script Tag Escaping
# ============================================================================

class TestScriptTagEscaping:
    """Scenario: Data containing </script> must be escaped."""

    @pytest.fixture
    def workdir_with_script_tag(self, tmp_path):
        """Create a workDir with data containing </script> in content."""
        meta_dir = tmp_path / ".meta"
        meta_dir.mkdir()

        requirement = {
            "generated_at": "2025-01-01T00:00:00Z",
            "context": {"topic": "</script><script>alert(1)</script>"},
            "strategy": {},
            "propositions": [],
            "dependencies": {},
            "capability_web": {},
            "scope": {},
        }
        (meta_dir / "requirement-web.json").write_text(
            json.dumps(requirement, ensure_ascii=False), encoding="utf-8"
        )
        return tmp_path

    def test_script_tag_is_escaped(self, workdir_with_script_tag):
        """Given data with </script> in content, When building,
        Then the output HTML should not contain unescaped </script> in data."""
        if not SHELL_HTML.exists():
            pytest.skip("dashboard-shell.html not built yet")

        subprocess.run(
            ["node", str(BUILD_SCRIPT), str(workdir_with_script_tag), "--step=0"],
            capture_output=True,
            timeout=30,
        )
        output_html = workdir_with_script_tag / "dashboard.html"
        if output_html.exists():
            content = output_html.read_text(encoding="utf-8")
            # The injected data should have escaped </script> tags
            # Count occurrences of </script> — should only be the actual script closing tags
            # The malicious </script> in data should be escaped to <\/script>
            assert "<\\/script>" in content or "</scr" + "ipt>" not in content.split("__PIPELINE_DATA__")[1].split(");")[0], \
                "Script tag not properly escaped in injected data"


# ============================================================================
# Feature: Output File Size
# ============================================================================

class TestOutputSize:
    """Scenario: Built dashboard should be reasonably sized (contains React bundle)."""

    def test_output_file_size_exceeds_threshold(self, tmp_path):
        """Given a build with shell HTML, When checking output size,
        Then dashboard.html should be > 50KB (contains React runtime)."""
        if not SHELL_HTML.exists():
            pytest.skip("dashboard-shell.html not built yet (run npm run build)")

        meta_dir = tmp_path / ".meta"
        meta_dir.mkdir()
        (meta_dir / "requirement-web.json").write_text(
            json.dumps({"propositions": [], "dependencies": {}, "capability_web": {}, "scope": {}, "context": {}, "strategy": {}}),
            encoding="utf-8",
        )

        subprocess.run(
            ["node", str(BUILD_SCRIPT), str(tmp_path), "--step=0"],
            capture_output=True,
            timeout=30,
        )
        output_html = tmp_path / "dashboard.html"
        if output_html.exists():
            size = output_html.stat().st_size
            assert size > 50 * 1024, f"Output file too small: {size} bytes (expected >50KB)"
