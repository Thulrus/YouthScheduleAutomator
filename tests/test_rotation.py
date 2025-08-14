from scheduling.rules import parse_rules
from scheduling.config import load_raw_config
from scheduling.scheduler import build_schedule
from datetime import date


def test_group_rotation_no_duplicate_in_month():
    raw = load_raw_config()
    rules = parse_rules(raw.rules)
    schedule = build_schedule(raw.leaders, raw.groups, rules, start=date(2026,1,1), end=date(2026,12,31))
    # Map (year, month) -> set of (date,responsible_group) for group-mode events
    month_groups = {}
    for a in schedule.assignments:
        ev = a.event
        if ev.responsibility_mode == "group" and ev.responsible_group:
            key = (ev.date.year, ev.date.month)
            month_groups.setdefault(key, set())
            # Ensure group not repeated within month for rotation-mode rules with different names
            assert ev.responsible_group not in {g for (_, g) in month_groups[key]}, (
                f"Group {ev.responsible_group} repeated in month {key}")
            month_groups[key].add((ev.date, ev.responsible_group))
