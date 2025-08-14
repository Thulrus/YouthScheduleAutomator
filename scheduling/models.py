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
            # Build unified "in_charge" column: either responsible group, leaders, or both if future logic allows
            if a.responsible_group and a.leaders:
                # Currently mutually exclusive by design, but handle gracefully
                in_charge = f"{a.responsible_group}; " + ", ".join(ld.name for ld in a.leaders)
            elif a.responsible_group:
                in_charge = a.responsible_group
            elif a.leaders:
                if len(a.leaders) == 2:
                    in_charge = " & ".join(ld.name for ld in a.leaders)
                else:
                    in_charge = ", ".join(ld.name for ld in a.leaders)
            else:
                in_charge = "-"
            rows.append({
                "date": a.event.date.isoformat(),  # canonical machine-friendly
                "type": a.event.kind,              # renamed from kind for presentation
                "in_charge": in_charge,
                "description": a.event.description,
            })
        return rows

    def filter_dates(self, start: date, end: date) -> "Schedule":
        return Schedule(
            [a for a in self.assignments if start <= a.event.date <= end])
