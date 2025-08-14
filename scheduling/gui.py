
"""Tkinter GUI for the scheduling engine."""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from pathlib import Path
from datetime import date
from typing import List

try:  # package usage
    from .config import load_raw_config
    from .rules import parse_rules
    from .scheduler import build_schedule
    from . import exporters
except ImportError:  # script fallback
    import sys as _sys, pathlib as _pl
    _sys.path.append(str(_pl.Path(__file__).resolve().parents[1]))
    from scheduling.config import load_raw_config  # type: ignore
    from scheduling.rules import parse_rules  # type: ignore
    from scheduling.scheduler import build_schedule  # type: ignore
    from scheduling import exporters  # type: ignore

STRATEGIES = ["fair", "round_robin", "random", "weighted"]
OUTPUT_FORMATS = ["md", "csv", "ics"]


class SchedulerGUI:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Scheduler GUI")
        pad = {"padx": 6, "pady": 4}
        frm = ttk.Frame(self.root)
        frm.pack(fill="both", expand=True)

        # Row 0
        ttk.Label(frm, text="Year:").grid(row=0, column=0, sticky="e", **pad)
        self.year_var = tk.StringVar(value=str(date.today().year))
        ttk.Entry(frm, textvariable=self.year_var, width=8).grid(row=0, column=1, sticky="w", **pad)
        ttk.Label(frm, text="Timezone:").grid(row=0, column=2, sticky="e", **pad)
        self.tz_var = tk.StringVar(value="America/Denver")
        ttk.Entry(frm, textvariable=self.tz_var, width=18).grid(row=0, column=3, sticky="w", **pad)

        # Row 1 dates
        ttk.Label(frm, text="Start:").grid(row=1, column=0, sticky="e", **pad)
        self.start_year = tk.StringVar(value=str(date.today().year))
        self.start_month = tk.StringVar(value="1")
        self.start_day = tk.StringVar(value="1")
        ttk.Spinbox(frm, from_=date.today().year - 1, to=date.today().year + 2, textvariable=self.start_year, width=6).grid(row=1, column=1, sticky="w", **pad)
        ttk.Combobox(frm, values=[str(i) for i in range(1, 13)], textvariable=self.start_month, width=4, state="readonly").grid(row=1, column=2, sticky="w", **pad)
        ttk.Combobox(frm, values=[str(i) for i in range(1, 32)], textvariable=self.start_day, width=4, state="readonly").grid(row=1, column=3, sticky="w", **pad)
        ttk.Label(frm, text="End:").grid(row=1, column=4, sticky="e", **pad)
        self.end_year = tk.StringVar(value=str(date.today().year))
        self.end_month = tk.StringVar(value="12")
        self.end_day = tk.StringVar(value="31")
        ttk.Spinbox(frm, from_=date.today().year - 1, to=date.today().year + 2, textvariable=self.end_year, width=6).grid(row=1, column=5, sticky="w", **pad)
        ttk.Combobox(frm, values=[str(i) for i in range(1, 13)], textvariable=self.end_month, width=4, state="readonly").grid(row=1, column=6, sticky="w", **pad)
        ttk.Combobox(frm, values=[str(i) for i in range(1, 32)], textvariable=self.end_day, width=4, state="readonly").grid(row=1, column=7, sticky="w", **pad)

        # Row 2 strategy
        ttk.Label(frm, text="Strategy:").grid(row=2, column=0, sticky="e", **pad)
        self.strategy_var = tk.StringVar(value="fair")
        ttk.Combobox(frm, textvariable=self.strategy_var, values=STRATEGIES, width=14, state="readonly").grid(row=2, column=1, sticky="w", **pad)
        ttk.Label(frm, text="Min Gap Days:").grid(row=2, column=2, sticky="e", **pad)
        self.gap_var = tk.IntVar(value=5)
        ttk.Spinbox(frm, from_=0, to=30, textvariable=self.gap_var, width=6).grid(row=2, column=3, sticky="w", **pad)
        ttk.Label(frm, text="Leaders / Combined:").grid(row=2, column=4, sticky="e", **pad)
        self.leaders_per_var = tk.IntVar(value=2)
        ttk.Spinbox(frm, from_=1, to=5, textvariable=self.leaders_per_var, width=6).grid(row=2, column=5, sticky="w", **pad)

        # Row 3 outputs
        ttk.Label(frm, text="Output Dir:").grid(row=3, column=0, sticky="e", **pad)
        self.out_dir_var = tk.StringVar(value="./output")
        ttk.Entry(frm, textvariable=self.out_dir_var, width=30).grid(row=3, column=1, columnspan=3, sticky="we", **pad)
        ttk.Button(frm, text="Browse", command=self._browse_dir).grid(row=3, column=4, sticky="w", **pad)
        ttk.Label(frm, text="Formats:").grid(row=3, column=5, sticky="e", **pad)
        self.format_vars = {}
        for i, fmt in enumerate(OUTPUT_FORMATS):
            var = tk.BooleanVar(value=True if fmt == "md" else False)
            self.format_vars[fmt] = var
            ttk.Checkbutton(frm, text=fmt.upper(), variable=var).grid(row=3, column=6 + i, sticky="w", **pad)

        # Row 4 buttons
        ttk.Button(frm, text="Generate", command=self._on_generate).grid(row=4, column=0, columnspan=2, sticky="ew", **pad)
        ttk.Button(frm, text="Quit", command=self.root.destroy).grid(row=4, column=2, columnspan=2, sticky="ew", **pad)

        # Row 5 preview
        ttk.Label(frm, text="Preview (first 25 rows):").grid(row=5, column=0, columnspan=9, sticky="w", **pad)
        self.preview = tk.Text(frm, height=18, width=140, wrap="none")
        yscroll = ttk.Scrollbar(frm, orient="vertical", command=self.preview.yview)
        self.preview.configure(yscrollcommand=yscroll.set)
        self.preview.grid(row=6, column=0, columnspan=8, sticky="nsew", **pad)
        yscroll.grid(row=6, column=8, sticky="ns", **pad)
        frm.rowconfigure(6, weight=1)

        self.status_var = tk.StringVar(value="Ready.")
        ttk.Label(frm, textvariable=self.status_var).grid(row=7, column=0, columnspan=9, sticky="w", **pad)

    def _browse_dir(self):
        chosen = filedialog.askdirectory()
        if chosen:
            self.out_dir_var.set(chosen)

    def _selected_formats(self) -> List[str]:
        return [fmt for fmt, v in self.format_vars.items() if v.get()]

    def _on_generate(self):
        try:
            year = int(self.year_var.get())
        except ValueError:
            messagebox.showerror("Invalid Year", "Year must be an integer")
            return

        def _build_date(y, m, d):
            try:
                return date(int(y), int(m), int(d))
            except Exception:
                return None

        start = _build_date(self.start_year.get(), self.start_month.get(), self.start_day.get())
        end = _build_date(self.end_year.get(), self.end_month.get(), self.end_day.get())
        if start and end and start > end:
            messagebox.showerror("Invalid Range", "Start date must be before or equal to End date")
            return

        strategy = self.strategy_var.get()
        gap = self.gap_var.get()
        tz = self.tz_var.get().strip() or "floating"
        out_dir = Path(self.out_dir_var.get()).expanduser().resolve()
        out_dir.mkdir(parents=True, exist_ok=True)

        try:
            raw = load_raw_config()
            rules = parse_rules(raw.rules)
            schedule = build_schedule(
                year,
                raw.leaders,
                raw.groups,
                rules,
                start=start,
                end=end,
                strategy=strategy,
                min_gap_days=gap,
            )
        except Exception as e:  # pragma: no cover
            messagebox.showerror("Generation Error", str(e))
            return

        fmts = self._selected_formats()
        for fmt in fmts:
            try:
                if fmt == "md":
                    exporters.write_markdown(schedule, out_dir / "schedule.md")
                elif fmt == "csv":
                    exporters.write_csv(schedule, out_dir / "schedule.csv")
                elif fmt == "ics":
                    exporters.write_ics(schedule, out_dir / "schedule.ics", timezone=tz)
            except Exception as ex:  # pragma: no cover
                messagebox.showwarning("Export Error", f"{fmt}: {ex}")

        rows = schedule.to_rows()[:25]
        try:
            from .exporters import _fmt_date  # type: ignore
        except Exception:  # fallback
            def _fmt_date(iso: str) -> str:  # noqa: N801
                from datetime import datetime as _dt
                try:
                    return _dt.fromisoformat(iso).strftime("%Y %b %d")
                except Exception:
                    return iso

        lines = ["Date | Type | In Charge | Description", "-----|------|----------|-----------"]
        for r in rows:
            lines.append(f"{_fmt_date(r['date'])} | {r['type'].title()} | {r['in_charge']} | {r['description']}")
        self.preview.delete("1.0", tk.END)
        self.preview.insert("1.0", "\n".join(lines))
        self.status_var.set(
            f"Generated {len(schedule.assignments)} events -> {', '.join(fmts)} in {out_dir}"
        )


def main():  # pragma: no cover
    root = tk.Tk()
    SchedulerGUI(root)
    root.mainloop()


if __name__ == "__main__":  # pragma: no cover
    main()
