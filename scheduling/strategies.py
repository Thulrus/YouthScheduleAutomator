from __future__ import annotations
from typing import List, Sequence
import random
from . import models

# Strategy registry for pluggable leader assignment algorithms.
_STRATEGIES = {}


def register(name: str):

    def deco(fn):
        _STRATEGIES[name] = fn
        return fn

    return deco


def get_strategy(name: str):
    return _STRATEGIES[name]


@register("round_robin")
def round_robin(leaders: Sequence[models.Leader], count: int,
                state: dict) -> List[models.Leader]:
    # state persists across calls (passed in by scheduler)
    idx = state.setdefault("rr_idx", 0)
    selected = []
    for _ in range(count):
        if not leaders:
            break
        leader = leaders[idx % len(leaders)]
        selected.append(leader)
        idx += 1
    state["rr_idx"] = idx
    return selected


@register("random")
def random_pick(leaders: Sequence[models.Leader], count: int,
                state: dict) -> List[models.Leader]:
    return random.sample(list(leaders), k=min(count, len(leaders)))


# Placeholder for a weighted strategy extension point.
@register("weighted")
def weighted(leaders: Sequence[models.Leader], count: int,
             state: dict) -> List[models.Leader]:
    pool = []
    for ld in leaders:
        pool.extend([ld] * max(1, ld.weight))
    random.shuffle(pool)
    result = []
    seen = set()
    for candidate in pool:
        if candidate in seen:
            continue
        result.append(candidate)
        seen.add(candidate)
        if len(result) >= count:
            break
    return result


@register("fair")
def fair(leaders: Sequence[models.Leader], count: int,
         state: dict) -> List[models.Leader]:
    """Fair strategy: choose leaders with lowest total assignment count, then
    longest time since last assignment (recency), then name for determinism.
    Expects scheduler to set state['current_date'] before invoking.
    """
    if not leaders or count <= 0:
        return []
    counts = state.setdefault("fair_counts", {})  # name -> total assignments
    last_dates = state.setdefault("fair_last", {})  # name -> date
    current_date = state.get("current_date")
    blackout_days = 5  # desired minimum gap; >4 blocks Wed->Sun pattern

    # Pre-compute days since for filtering
    leader_infos = []  # (leader, days_since or large)
    for ld in leaders:
        if current_date and ld.name in last_dates:
            days_since = (current_date - last_dates[ld.name]).days
        else:
            days_since = 10_000
        leader_infos.append((ld, days_since))

    # Primary candidate set respects blackout
    primary = [ld for (ld, ds) in leader_infos if ds >= blackout_days]
    candidate_pool = primary if len(primary) >= count else [ld for (ld, _) in leader_infos]

    def sort_key(ld: models.Leader):
        c = counts.get(ld.name, 0)
        if current_date and ld.name in last_dates:
            days_since = (current_date - last_dates[ld.name]).days
        else:
            days_since = 10_000  # effectively infinite if never assigned
        return (c, -days_since, ld.name)
    ordered = sorted(candidate_pool, key=sort_key)
    chosen: List[models.Leader] = []
    used = set()
    for ld in ordered:
        if ld.name in used:
            continue
        chosen.append(ld)
        used.add(ld.name)
        if len(chosen) >= count:
            break
    # update state
    if current_date:
        for ld in chosen:
            counts[ld.name] = counts.get(ld.name, 0) + 1
            last_dates[ld.name] = current_date
    return chosen
