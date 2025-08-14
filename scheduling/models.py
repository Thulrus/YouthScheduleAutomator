from __future__ import annotations
from dataclasses import dataclass, field
from datetime import date
from typing import List, Optional, Dict

# -----------------
# Core Data Models
# -----------------


@dataclass(slots=True)
class Leader:
    name: str
    groups: List[
        str]  # groups this leader can serve (e.g., ["deacons", "teachers"])
    availability: List[str] = field(
        default_factory=list)  # ISO date strings or weekday tokens
    weight: int = 1  # for weighted assignment strategies

    def is_available_on(self, d: date) -> bool:
        if not self.availability:
            return True
        iso = d.isoformat()
        if iso in self.availability:
            return True
        weekday_token = d.strftime("%a").lower()  # mon, tue, etc.
        if weekday_token in self.availability:
            return True
        return False


@dataclass(slots=True)
class Group:
    name: str
    members: List[str]


@dataclass(slots=True)
class Event:
    date: date
    kind: str  # combined | separate
    description: str
    groups_involved: List[str]
    responsibility_mode: str = "none"  # group | leader | none
    responsible_group: Optional[
        str] = None  # resolved at scheduling if mode=group
    leader_required: bool = False  # whether to assign leader(s) based on mode/kind
    rotation_pool: Optional[
        List[str]] = None  # candidate groups when responsibility_mode=group
    start_time: Optional[str] = None  # HH:MM 24h
    duration_minutes: Optional[int] = None


@dataclass(slots=True)
class Assignment:
    event: Event
    leaders: List[Leader]
    responsible_group: Optional[str]


# -----------------
# Helper / Container
# -----------------


@dataclass(slots=True)
class Schedule:
    assignments: List[Assignment]

    def to_rows(self) -> List[Dict[str, str]]:
        rows = []
        for a in self.assignments:
            rows.append({
                "date":
                a.event.date.isoformat(),
                "kind":
                a.event.kind,
                "responsible":
                a.responsible_group or "-",
                "leaders":
                ",".join(leader.name for leader in a.leaders),
                "description":
                a.event.description,
            })
        return rows

    def filter_dates(self, start: date, end: date) -> "Schedule":
        return Schedule(
            [a for a in self.assignments if start <= a.event.date <= end])
