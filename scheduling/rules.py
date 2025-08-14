from __future__ import annotations
from dataclasses import dataclass
from datetime import date
from typing import List, Dict, Any, Optional
import calendar


@dataclass(slots=True)
class RecurringRule:
    name: str  # identifier
    frequency: str  # monthly, weekly (extensible)
    weekday: int  # 0=Monday ... 6=Sunday
    nth: int  # e.g., 1 = first, 3 = third; negative for last (-1)
    kind: str  # combined | separate
    description: str | None = None
    groups_involved: List[str] | None = None  # None => all groups
    # responsibility: describes how "ownership" or leadership works that day
    # structure: { mode: group|leader|none, rotation_pool?: [group names] }
    responsibility: Dict[str, Any] | None = None
    start_time: Optional[str] = None  # 'HH:MM' 24h
    duration_minutes: Optional[int] = None

    def generate_dates(self,
                       year: int,
                       start: date | None = None,
                       end: date | None = None) -> List[date]:
        # For now only monthly nth weekday rules
        dates: List[date] = []
        for month in range(1, 13):
            # Skip out-of-range
            c = calendar.Calendar()
            month_days = [
                d for d in c.itermonthdates(year, month)
                if d.month == month and d.weekday() == self.weekday
            ]
            target: date | None = None
            if self.nth > 0:
                if len(month_days) >= self.nth:
                    target = month_days[self.nth - 1]
            else:  # negative index (e.g., -1 last)
                idx = self.nth
                if abs(idx) <= len(month_days):
                    target = month_days[idx]
            if target:
                if start and target < start:
                    continue
                if end and target > end:
                    continue
                dates.append(target)
        return dates


def parse_rules(raw_rules: Dict[str, Any]) -> List[RecurringRule]:
    rules: List[RecurringRule] = []
    for entry in raw_rules.get("recurring", []):
        rules.append(
            RecurringRule(
                name=entry["name"],
                frequency=entry.get("frequency", "monthly"),
                weekday=entry["weekday"],
                nth=entry["nth"],
                kind=entry.get("kind", "combined"),
                description=entry.get("description"),
                groups_involved=entry.get("groups_involved"),
                responsibility=entry.get("responsibility"),
                start_time=entry.get("start_time"),
                duration_minutes=entry.get("duration_minutes"),
            ))
    return rules
