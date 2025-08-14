from __future__ import annotations
from pathlib import Path
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo
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
        return "| date | kind | responsible | leaders | description |\n|---|---|---|---|---|"
    header = "| date | kind | responsible | leaders | description |"
    sep = "|---|---|---|---|---|"
    lines = [header, sep]
    for r in rows:
        lines.append(
            f"| {r['date']} | {r['kind']} | {r['responsible']} | {r['leaders']} | {r['description']} |"
        )
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


def write_ics(schedule: Schedule, path: Path, timezone: str | None = None):
    cal = Calendar()
    for a in schedule.assignments:
        icse = ICSEvent()
        base_title = a.event.description or f"Event {a.event.date.isoformat()}"
        responsibility_bits = []
        if a.responsible_group:
            responsibility_bits.append(a.responsible_group)
        if a.leaders:
            if len(a.leaders) == 2:
                responsibility_bits.append(" & ".join(ld.name
                                                      for ld in a.leaders))
            else:
                responsibility_bits.append(", ".join(ld.name
                                                     for ld in a.leaders))
        if responsibility_bits:
            icse.name = f"{base_title} ({' | '.join(responsibility_bits)})"
        else:
            icse.name = base_title
        evt_time = time(0, 0)
        if a.event.start_time:
            try:
                hh, mm = a.event.start_time.split(":")
                evt_time = time(int(hh), int(mm))
            except Exception:
                pass  # fallback silently to midnight
        tzinfo = None
        if timezone and timezone.lower() != "floating":
            try:
                tzinfo = ZoneInfo(timezone)
            except Exception:
                tzinfo = None  # fallback to floating
        start_dt = datetime.combine(a.event.date, evt_time)
        if tzinfo:
            start_dt = start_dt.replace(tzinfo=tzinfo)
        icse.begin = start_dt
        if a.event.duration_minutes and a.event.duration_minutes > 0:
            end_dt = start_dt + timedelta(minutes=a.event.duration_minutes)
            icse.end = end_dt
        icse.description = ""
        cal.events.add(icse)
    path.write_text(str(cal), encoding="utf-8")


def print_rich(schedule: Schedule):  # convenience pretty print
    if Table is None:
        print(to_markdown(schedule))
        return
    table = Table(title="Schedule")
    for col in ["date", "kind", "responsible", "leaders", "description"]:
        table.add_column(col)
    for r in schedule.to_rows():
        table.add_row(r["date"], r["kind"], r["responsible"], r["leaders"],
                      r["description"])
    if Console:
        console = Console()
        console.print(table)
