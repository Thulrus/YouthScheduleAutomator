from __future__ import annotations
import yaml
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List

CONFIG_DIR = Path(__file__).parent

@dataclass(slots=True)
class RawConfig:
    leaders: List[Dict[str, Any]]
    groups: List[Dict[str, Any]]
    rules: Dict[str, Any]


def load_yaml(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def load_raw_config(base_dir: Path = CONFIG_DIR) -> RawConfig:
    leaders = load_yaml(base_dir / "leaders.yaml")
    groups = load_yaml(base_dir / "groups.yaml")
    rules = load_yaml(base_dir / "rules.yaml")
    return RawConfig(leaders=leaders.get("leaders", []), groups=groups.get("groups", []), rules=rules)
