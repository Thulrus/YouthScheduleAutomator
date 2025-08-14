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
