from __future__ import annotations
from pathlib import Path
from typing import Iterable  # future use (batch export) - retained intentionally
import csv
from .models import Schedule
from ics import Calendar, Event as ICSEvent

try:
    from rich.table import Table
    from rich.console import Console
except ImportError:  # fallback minimal
    Table = None
    Console = None


def to_markdown(schedule: Schedule) -> str:
    rows = schedule.to_rows()
    if not rows:
        return "| date | kind | groups | responsible | leaders | description |\n|---|---|---|---|---|---|"
    header = "| date | kind | groups | responsible | leaders | description |"
    sep = "|---|---|---|---|---|---|"
    lines = [header, sep]
    for r in rows:
        lines.append(f"| {r['date']} | {r['kind']} | {r['groups']} | {r['responsible']} | {r['leaders']} | {r['description']} |")
    return "\n".join(lines)


def write_csv(schedule: Schedule, path: Path):
    rows = schedule.to_rows()
    if not rows:
        return
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def write_markdown(schedule: Schedule, path: Path):
    path.write_text(to_markdown(schedule), encoding="utf-8")


def write_ics(schedule: Schedule, path: Path):
    cal = Calendar()
    for a in schedule.assignments:
        ev = ICSEvent()
        ev.name = a.event.description or f"Event {a.event.date.isoformat()}"
        ev.begin = a.event.date.isoformat()
        ev.description = f"Leaders: {', '.join(ld.name for ld in a.leaders)}; Responsible: {a.responsible_group or '-'}"
        cal.events.add(ev)
    path.write_text(str(cal), encoding="utf-8")


def print_rich(schedule: Schedule):  # convenience pretty print
    if Table is None:
        print(to_markdown(schedule))
        return
    table = Table(title="Schedule")
    for col in ["date", "kind", "groups", "responsible", "leaders", "description"]:
        table.add_column(col)
    for r in schedule.to_rows():
        table.add_row(r["date"], r["kind"], r["groups"], r["responsible"], r["leaders"], r["description"])
    if Console:
        console = Console()
        console.print(table)
