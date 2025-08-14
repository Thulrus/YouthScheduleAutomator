from __future__ import annotations
from datetime import date, timedelta
from typing import List, Dict
from .models import Leader, Group, Event, Assignment, Schedule
from .rules import RecurringRule

# ---------------
# Builder helpers
# ---------------


def build_leaders(raw) -> List[Leader]:
    leaders: List[Leader] = []
    for entry in raw:
        leaders.append(
            Leader(
                name=entry["name"],
                groups=entry.get("groups", []),
                availability=entry.get("availability", []),
                weight=entry.get("weight", 1),
            ))
    return leaders


def build_groups(raw) -> Dict[str, Group]:
    groups: Dict[str, Group] = {}
    for entry in raw:
        g = Group(name=entry["name"], members=entry.get("members", []))
        groups[g.name] = g
    return groups


def expand_events(rules: List[RecurringRule],
                  all_groups: List[str],
                  start: date,
                  end: date) -> List[Event]:
    events: List[Event] = []
    span_years = range(start.year, end.year + 1)
    for rule in rules:
        dates: List[date] = []
        for yr in span_years:
            dates.extend(rule.generate_dates(yr, start=start, end=end))
        involved = rule.groups_involved or all_groups
        responsibility = rule.responsibility or {}
        mode = responsibility.get("mode", "none")
        rotation_pool = responsibility.get("rotation_pool", [])
        for d in dates:
            leader_required = (mode == "leader") or (rule.kind == "separate")
            events.append(
                Event(
                    date=d,
                    kind=rule.kind,
                    description=rule.description or rule.name,
                    groups_involved=involved,
                    responsibility_mode=mode,
                    leader_required=leader_required,
                    rotation_pool=rotation_pool if mode == "group" else None,
                    start_time=rule.start_time,
                    duration_minutes=rule.duration_minutes,
                ))
    events.sort(key=lambda e: e.date)
    return events


GAP_DAYS = 5  # standard minimum gap between leader assignments


def assign_leaders(events: List[Event],
                   leaders: List[Leader],
                   leaders_per_event: int = 2) -> List[Assignment]:
    from .strategies import fair as strategy
    # Heterogeneous strategy state (indices, counts, dates)
    state: Dict[str, object] = {}
    assignments: List[Assignment] = []
    # Pre-pass: fairly distribute responsible groups for events with rotation_pool
    # Strategy: process month by month; for each event needing a group, pick group with lowest (month,count) usage and not already used that month if avoidable.
    events_by_month: Dict[tuple[int, int], List[Event]] = {}
    for ev in events:
        events_by_month.setdefault((ev.date.year, ev.date.month),
                                   []).append(ev)
    global_usage: Dict[str, int] = {}
    for _ym, evs in events_by_month.items():
        month_used = set()
        # sort to have deterministic order (e.g., by day then name)
        evs_sorted = sorted(evs, key=lambda e: (e.date, e.description))
        for ev in evs_sorted:
            if ev.responsibility_mode == "group" and ev.rotation_pool:
                # candidate groups sorted by (already-used-this-month, total-usage, name)
                candidates = []
                for g in ev.rotation_pool:
                    candidates.append(
                        (g in month_used, global_usage.get(g, 0), g))
                candidates.sort(key=lambda t: (t[0], t[1], t[2]))
                chosen = candidates[0][2]
                ev.responsible_group = chosen
                month_used.add(chosen)
                global_usage[chosen] = global_usage.get(chosen, 0) + 1
    last_assigned: Dict[str, date] = {}
    for ev in events:
        # Provide current date to strategies needing temporal context (e.g., fair)
        state["current_date"] = ev.date
        if not ev.leader_required:
            assignments.append(
                Assignment(event=ev,
                           leaders=[],
                           responsible_group=ev.responsible_group))
            continue
        if ev.kind == "combined":
            # If leader mode: exactly one leader, else allow configured count (fallback to 0 if none required)
            eligible = [
                ld for ld in leaders
                if any(g in ev.groups_involved for g in ld.groups)
                and ld.is_available_on(ev.date)
            ]
            # Enforce gap: filter out leaders whose last assignment too recent (soft if insufficient)
            filtered = [ld for ld in eligible if (
                ld.name not in last_assigned or (ev.date - last_assigned[ld.name]).days >= GAP_DAYS
            )]
            if filtered:
                eligible = filtered
            needed = 1 if ev.responsibility_mode == "leader" else min(leaders_per_event, len(eligible))
            chosen = strategy(eligible, needed, state) if needed > 0 else []
            for ch in chosen:
                last_assigned[ch.name] = ev.date
            assignments.append(
                Assignment(event=ev,
                           leaders=chosen,
                           responsible_group=ev.responsible_group))
        else:  # separate: one leader per group involved
            group_to_leader: Dict[str, Leader] = {}
            for grp in ev.groups_involved:
                eligible = [ld for ld in leaders if grp in ld.groups and ld.is_available_on(ev.date)]
                filtered = [ld for ld in eligible if (
                    ld.name not in last_assigned or (ev.date - last_assigned[ld.name]).days >= GAP_DAYS
                )]
                if filtered:
                    eligible = filtered
                chosen_list = strategy(eligible, 1, state) if eligible else []
                if chosen_list:
                    group_to_leader[grp] = chosen_list[0]
                    last_assigned[chosen_list[0].name] = ev.date
            unique: List[Leader] = []
            seen = set()
            for ld in group_to_leader.values():
                if ld.name not in seen:
                    unique.append(ld)
                    seen.add(ld.name)
            assignments.append(
                Assignment(event=ev,
                           leaders=unique,
                           responsible_group=ev.responsible_group))
    return assignments


def build_schedule(leaders_raw,
                   groups_raw,
                   rules_objs: List[RecurringRule],
                   start: date,
                   end: date | None = None) -> Schedule:
    leaders = build_leaders(leaders_raw)
    groups = build_groups(groups_raw)
    all_group_names = list(groups.keys())
    if end is None:
        end = start + timedelta(days=365)
    events = expand_events(rules_objs, all_group_names, start, end)
    assignments = assign_leaders(events, leaders)
    return Schedule(assignments=assignments)
