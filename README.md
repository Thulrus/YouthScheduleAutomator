# Young Men's Class Scheduling Framework

Modular, extensible scheduler for managing leaders, groups (deacons, teachers, priests), and events (combined or separate) with configurable rules.

## Features

* Dataclass models (Leaders, Groups, Events, Assignments)
* YAML-configurable rules for recurring events (e.g., first Wednesday, third Sunday)
* Pluggable leader assignment strategies (round-robin, random, custom)
* Regenerate schedule for a range of dates without affecting others
* Export to Markdown table, CSV, or iCal (.ics)

## Quick Start

```bash
# Create a virtual environment
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Generate schedule for the configured year
python -m scheduling.main --year 2026 --out md csv --start 2026-01-01 --end 2026-12-31
```

## Config Files

* `scheduling/leaders.yaml` – leader definitions and availability
* `scheduling/groups.yaml` – group membership lists
* `scheduling/rules.yaml` – event recurrence & responsibility rules

## Extending

See inline comments in `scheduling/scheduler.py` & `scheduling/strategies.py` for extension points.

## Roadmap

* Validation layer for overlapping assignments
* CLI subcommands (e.g., `assign`, `validate`, `export`)
* Web UI / API
