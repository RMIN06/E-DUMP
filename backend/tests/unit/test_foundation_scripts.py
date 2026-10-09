import json
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]


@pytest.fixture
def skeleton(tmp_path: Path) -> Path:
    for folder in ["scripts", "mobile/app", "mobile/src/theme", "mobile/assets/fonts"]:
        (tmp_path / folder).mkdir(parents=True)
    (tmp_path / "mobile/package.json").write_text(
        json.dumps({"dependencies": {"expo": "55.0.31"}}), encoding="utf-8"
    )
    for script in ["check-slop.sh", "check-fonts.mjs"]:
        shutil.copyfile(ROOT / "scripts" / script, tmp_path / "scripts" / script)
    return tmp_path


@pytest.mark.parametrize(
    "source",
    [
        "const style = { shadowOpacity: 0.5 };",
        "const style = { backgroundColor: '#ffffff' };",
        "const style = { display: 'grid' };",
        "const style = { width: 360 };",
        "const style = { padding: 13 };",
        "const style = { borderColor: theme.moss };",
        "const size = Dimensions.get('window');",
        "const content = '\U0001f600';",
    ],
)
def test_slop_rejects_violations(skeleton: Path, source: str) -> None:
    """PRD §9 accessibility: enforce M0 layout and palette restrictions."""
    (skeleton / "mobile/app/index.tsx").write_text(source, encoding="utf-8")
    result = subprocess.run(
        ["bash", (skeleton / "scripts/check-slop.sh").as_posix()],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 1
    assert "SLOP:" in result.stderr


def test_slop_allows_tokens_and_rejects_unknown_dependencies(skeleton: Path) -> None:
    (skeleton / "mobile/src/theme/tokens.ts").write_text(
        "export const ink = '#121A1B';", encoding="utf-8"
    )
    command = ["bash", (skeleton / "scripts/check-slop.sh").as_posix()]
    assert subprocess.run(command, capture_output=True, check=False).returncode == 0
    (skeleton / "mobile/package.json").write_text(
        json.dumps({"dependencies": {"unapproved-package": "1.0.0"}}), encoding="utf-8"
    )
    assert subprocess.run(command, capture_output=True, check=False).returncode == 1


def test_fonts_fallback_only_in_development(skeleton: Path) -> None:
    command = ["node", str(skeleton / "scripts/check-fonts.mjs")]
    development = subprocess.run(
        [*command, "--prepare"], capture_output=True, check=False
    )
    assert development.returncode == 0
    assert "= {};" in (skeleton / "mobile/src/theme/fontAssets.ts").read_text()
    release = subprocess.run([*command, "--release"], capture_output=True, check=False)
    assert release.returncode == 1
    assert b"Missing licensed fonts" in release.stderr
