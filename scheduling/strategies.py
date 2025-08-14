from __future__ import annotations
from typing import List, Sequence
from . import models


def fair(leaders: Sequence[models.Leader], count: int,
         state: dict) -> List[models.Leader]:
    """Single remaining strategy: fairly distribute assignments.

    Order by (total assignments, -days since last, name) with a blackout of 5 days
    that is relaxed if insufficient candidates.
    """
    if not leaders or count <= 0:
        return []
    counts = state.setdefault("fair_counts", {})
    last_dates = state.setdefault("fair_last", {})
    current_date = state.get("current_date")
    blackout_days = 5

    infos = []
    for ld in leaders:
        if current_date and ld.name in last_dates:
            ds = (current_date - last_dates[ld.name]).days
        else:
            ds = 10_000
        infos.append((ld, ds))
    primary = [ld for (ld, ds) in infos if ds >= blackout_days]
    pool = primary if len(primary) >= count else [ld for (ld, _) in infos]

    def key(ld: models.Leader):
        c = counts.get(ld.name, 0)
        ds = (current_date - last_dates[ld.name]).days if current_date and ld.name in last_dates else 10_000
        return (c, -ds, ld.name)

    ordered = sorted(pool, key=key)
    chosen: List[models.Leader] = []
    used = set()
    for ld in ordered:
        if ld.name in used:
            continue
        chosen.append(ld)
        used.add(ld.name)
        if len(chosen) >= count:
            break
    if current_date:
        for ld in chosen:
            counts[ld.name] = counts.get(ld.name, 0) + 1
            last_dates[ld.name] = current_date
    return chosen

__all__ = ["fair"]
