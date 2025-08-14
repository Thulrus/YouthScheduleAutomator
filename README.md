# Young Men's Class Scheduling Framework

Modular, extensible scheduler for managing leaders, groups (deacons, teachers, priests), and events (combined or separate) with configurable rules.

## Features

* Dataclass models (Leaders, Groups, Events, Assignments)
* YAML-configurable rules for recurring events (e.g., first Wednesday, third Sunday)
* Pluggable leader assignment strategies (round-robin, random, custom)
* Regenerate schedule for a range of dates without affecting others
* Export to Markdown table, CSV, or iCal (.ics) (columns: Date | Type | In Charge | Description)

## Quick Start

```bash
# Create a virtual environment
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Generate schedule for the configured year
python -m scheduling.main --year 2026 --out md csv --start 2026-01-01 --end 2026-12-31
```

## Examples

### 1. Generate Only Q1 (Markdown + CSV)

```bash
python -m scheduling.main --year 2026 --start 2026-01-01 --end 2026-03-31 --out md csv
```

### 2. Generate ICS With Mountain Time (America/Denver)

```bash
python -m scheduling.main --year 2026 --start 2026-01-01 --end 2026-06-30 --out ics --tz America/Denver
```

### 3. Floating (No Timezone Metadata)

```bash
python -m scheduling.main --year 2026 --out ics --tz floating
```

### 4. Use Random Leader Strategy For Variety

```bash
python -m scheduling.main --year 2026 --out md --strategy random
```

### 5. Weighted Strategy (Adjust `weight` in leaders.yaml)

```bash
python -m scheduling.main --year 2026 --strategy weighted --out csv
```

### 6. Regenerate A Narrow Date Range (e.g., after mid-year changes)

```bash
python -m scheduling.main --year 2026 --start 2026-07-01 --end 2026-08-31 --out md csv ics
```

### 7. Test Rotation Fairness (Pytest)

```bash
pytest -q tests/test_rotation.py
```

### 8. Example Rule With Group Rotation & Timing

```yaml
- name: "Second Wednesday - YW/YM Combined Activity (Rotating Group)"
	frequency: monthly
	weekday: 2        # Wednesday
	nth: 2            # second
	kind: combined
	responsibility:
		mode: group
		rotation_pool: [priests, teachers, deacons, yw_older, yw_younger]
	description: "Combined YW/YM Activity Night"
	start_time: "19:00"
	duration_minutes: 90
```

### 9. Example Leader With Limited Availability

```yaml
- name: "John Smith"
	groups: ["deacons"]
	availability: ["wed", "sun"]  # only assign on Wednesdays & Sundays
	weight: 2                       # appears more often in weighted strategy
```

### 10. Export All Formats With Local Timezone

```bash
python -m scheduling.main --year 2026 --out md csv ics --tz America/Denver
```

## Config Files

* `scheduling/leaders.yaml` – leader definitions and availability
* `scheduling/groups.yaml` – group membership lists
* `scheduling/rules.yaml` – event recurrence & responsibility rules

## Extending

See inline comments in `scheduling/scheduler.py` & `scheduling/strategies.py` for extension points.

Note: Dates in Markdown output are formatted as `Mon DD, YYYY` for readability, while CSV retains ISO `YYYY-MM-DD` for machine processing.

## Roadmap

* Validation layer for overlapping assignments
* CLI subcommands (e.g., `assign`, `validate`, `export`)
* Web UI / API
