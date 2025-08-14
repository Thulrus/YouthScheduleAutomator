from __future__ import annotations
import argparse
from pathlib import Path
from datetime import date
from .config import load_raw_config
from .rules import parse_rules
from .scheduler import build_schedule
from . import exporters

# CLI Entrypoint demonstrating how to generate and export a schedule.
# Extend: add subcommands, validation, interactive reassignment, etc.


def parse_args():
    p = argparse.ArgumentParser(description="Young Men's Scheduling Tool")
    p.add_argument("--start", type=str, required=True, help="Start date ISO (YYYY-MM-DD)")
    p.add_argument("--end", type=str, help="End date ISO (optional; default start + 1 year)")
    p.add_argument("--out",
                   nargs="+",
                   default=["md"],
                   help="Output formats: md csv ics")
    p.add_argument("--output-dir", type=str, default="./output")
    p.add_argument(
        "--tz",
        type=str,
        default="America/Denver",
        help=
        "IANA timezone for event times (e.g., America/Denver). Use 'floating' for no timezone."
    )
    return p.parse_args()


def main():
    args = parse_args()
    start = date.fromisoformat(args.start)
    end = date.fromisoformat(args.end) if args.end else None

    raw = load_raw_config()
    rules = parse_rules(raw.rules)
    schedule = build_schedule(raw.leaders,
                              raw.groups,
                              rules,
                              start=start,
                              end=end)

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if "md" in args.out:
        exporters.write_markdown(schedule, out_dir / "schedule.md")
    if "csv" in args.out:
        exporters.write_csv(schedule, out_dir / "schedule.csv")
    if "ics" in args.out:
        exporters.write_ics(schedule,
                            out_dir / "schedule.ics",
                            timezone=args.tz)

    exporters.print_rich(schedule)


if __name__ == "__main__":  # pragma: no cover
    main()
