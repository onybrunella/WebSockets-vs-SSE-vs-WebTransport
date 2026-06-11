#!/usr/bin/env python3
"""Analyse les CSV exp. 1, 2 et 3 dans data/."""

import csv
from collections import defaultdict
from pathlib import Path

DATA = Path(__file__).parent
PROTOCOLS = ("websocket", "sse", "webtransport")
TARGETS = {"1msg": 1, "10msg": 10, "50msg": 50, "100msg": 100}


def latency_stats(path):
    rows = list(csv.DictReader(path.open()))
    if not rows:
        return None
    dur = (max(int(r["Timestamp(ms)"]) for r in rows) - min(int(r["Timestamp(ms)"]) for r in rows)) / 1000
    by_proto = defaultdict(list)
    for r in rows:
        by_proto[r["Protocol"].lower()].append(float(r["Latency(ms)"]))
    stats = {}
    for p, v in by_proto.items():
        stats[p] = {"n": len(v), "mean": sum(v) / len(v), "min": min(v), "max": max(v), "rate": len(v) / dur}
    return dur, stats


def exp3_stats(path):
    rows = list(csv.DictReader(path.open()))
    reconnects = {}
    for r in rows:
        if r["Protocol"].lower() in PROTOCOLS and float(r["Value"]) == 1:
            reconnects[r["Protocol"].lower()] = float(r["Latency(ms)"])
    return reconnects


for label, pattern in [("Expérience 1", "exp1*.csv"), ("Expérience 2", "exp2_*.csv")]:
    files = sorted(DATA.glob(pattern))
    print(f"\n{label}")
    if not files:
        print("  (aucun fichier)")
        continue
    for path in files:
        result = latency_stats(path)
        if not result:
            continue
        dur, stats = result
        print(f"\n  {path.name}  (~{dur:.0f}s)")
        for p in PROTOCOLS:
            if p not in stats:
                continue
            s = stats[p]
            line = f"    {p:14}  n={s['n']:5}  moy={s['mean']:.2f} ms  min={s['min']:.0f}  max={s['max']:.0f}  débit={s['rate']:.2f} msg/s"
            if label.startswith("Expérience 2"):
                t = next((TARGETS[k] for k in TARGETS if k in path.name), 0)
                if t:
                    line += f"  ({100 * s['rate'] / t:.0f}% cible)"
            print(line)

print("\nExpérience 3")
files = sorted(DATA.glob("exp3_log*.csv"))
if not files:
    print("  (aucun fichier)")
else:
    for path in files:
        r = exp3_stats(path)
        print(f"\n  {path.name}")
        for p in PROTOCOLS:
            print(f"    {p:14}  reconnexion={r.get(p, '—')} ms")
