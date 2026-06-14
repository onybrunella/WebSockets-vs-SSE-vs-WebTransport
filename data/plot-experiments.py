#!/usr/bin/env python3
"""Génère les figures PDF (exp. 1–3) pour le rapport LaTeX.

Usage : python3 data/plot-experiments.py
Sortie : data/figures/exp1_latence.pdf, exp2_latence.pdf, exp3_reconnexion.pdf
"""

from __future__ import annotations

import csv
import random
import statistics
from collections import defaultdict
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.gridspec import GridSpec

DATA = Path(__file__).parent
FIG = DATA / "figures"

PROTOCOLS = ("websocket", "sse", "webtransport")
LABELS = {
    "websocket": "WebSocket",
    "sse": "SSE",
    "webtransport": "WebTransport",
}
COLORS = {
    "websocket": "#4a90e2",
    "sse": "#2ecc71",
    "webtransport": "#e67e22",
}
EXP2_PALIERS = (("1msg", 1), ("10msg", 10), ("50msg", 50), ("100msg", 100))

plt.rcParams.update(
    {
        "font.size": 10,
        "axes.labelsize": 11,
        "axes.titlesize": 12,
        "legend.fontsize": 9,
        "figure.dpi": 100,
        "savefig.dpi": 300,
        "pdf.fonttype": 42,
        "ps.fonttype": 42,
    }
)


def load_latencies(path: Path) -> dict[str, list[float]]:
    by_proto: dict[str, list[float]] = defaultdict(list)
    with path.open(newline="") as f:
        for row in csv.DictReader(f):
            by_proto[row["Protocol"].lower()].append(float(row["Latency(ms)"]))
    return by_proto


def latency_stats(path: Path) -> dict[str, dict[str, float]]:
    by_proto = load_latencies(path)
    dur = 0.0
    rows = list(csv.DictReader(path.open()))
    if rows:
        ts = [int(r["Timestamp(ms)"]) for r in rows]
        dur = (max(ts) - min(ts)) / 1000
    stats = {}
    for p, values in by_proto.items():
        stats[p] = {
            "mean": statistics.mean(values),
            "rate": len(values) / dur if dur > 0 else 0,
        }
    return stats


def exp3_reconnects(path: Path) -> dict[str, float]:
    out: dict[str, float] = {}
    with path.open(newline="") as f:
        for row in csv.DictReader(f):
            proto = row["Protocol"].lower()
            if proto in PROTOCOLS and float(row["Value"]) == 1:
                out[proto] = float(row["Latency(ms)"])
    return out


def latest_file(pattern: str, exclude: str | None = None) -> Path | None:
    files = sorted(DATA.glob(pattern))
    if exclude:
        files = [f for f in files if exclude not in f.name]
    return files[-1] if files else None


def save(fig: plt.Figure, name: str) -> Path:
    FIG.mkdir(parents=True, exist_ok=True)
    out = FIG / name
    fig.savefig(out, format="pdf", bbox_inches="tight")
    plt.close(fig)
    return out


def percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    k = (len(s) - 1) * p / 100
    f = int(k)
    c = min(f + 1, len(s) - 1)
    return s[f] + (s[c] - s[f]) * (k - f)


def plot_exp1() -> Path | None:
    path = latest_file("exp1*.csv", exclude="exp1b")
    if not path:
        print("Exp. 1 : aucun CSV exp1_*.csv")
        return None

    by_proto = load_latencies(path)
    labels = [LABELS[p] for p in PROTOCOLS if p in by_proto]
    colors = [COLORS[p] for p in PROTOCOLS if p in by_proto]
    data = [by_proto[p] for p in PROTOCOLS if p in by_proto]

    fig = plt.figure(figsize=(10, 7))
    gs = GridSpec(2, 2, height_ratios=[1.15, 1], hspace=0.38, wspace=0.28)

    # --- A : zoom 0–6 ms — points + boîte (sans outliers lointains) ---
    ax_zoom = fig.add_subplot(gs[0, 0])
    rng = random.Random(42)
    for i, (vals, color, name) in enumerate(zip(data, colors, labels), start=1):
        jitter = [i + rng.uniform(-0.11, 0.11) for _ in vals]
        ax_zoom.scatter(
            jitter,
            vals,
            s=14,
            alpha=0.45,
            color=color,
            edgecolors="none",
            label=name,
            zorder=2,
        )
    bp = ax_zoom.boxplot(
        data,
        labels=labels,
        patch_artist=True,
        widths=0.5,
        showfliers=False,
        zorder=3,
    )
    for patch, color in zip(bp["boxes"], colors):
        patch.set_facecolor(color)
        patch.set_alpha(0.35)
        patch.set_edgecolor("black")
    for med in bp["medians"]:
        med.set_color("black")
        med.set_linewidth(1.5)
    ax_zoom.set_ylim(0, 6)
    ax_zoom.set_ylabel("Latence (ms)")
    ax_zoom.set_title("Zoom 0–6 ms (chaque point = 1 message)")
    ax_zoom.grid(axis="y", linestyle="--", alpha=0.35)
    ax_zoom.legend(loc="upper right", fontsize=8)

    # --- B : histogramme par tranches (où tombent les mesures ?) ---
    ax_hist = fig.add_subplot(gs[0, 1])
    bin_edges = [0, 1, 2, 5, 15, 50]
    bin_labels = ["0–1", "1–2", "2–5", "5–15", "15+"]
    x = np.arange(len(bin_labels))
    width = 0.24
    for i, (p, color) in enumerate(zip(PROTOCOLS, colors)):
        if p not in by_proto:
            continue
        counts, _ = np.histogram(by_proto[p], bins=bin_edges)
        offset = (i - 1) * width
        ax_hist.bar(
            x + offset,
            counts,
            width=width,
            label=LABELS[p],
            color=color,
            alpha=0.85,
            edgecolor="black",
            linewidth=0.4,
        )
    ax_hist.set_xticks(x)
    ax_hist.set_xticklabels(bin_labels)
    ax_hist.set_xlabel("Latence (ms)")
    ax_hist.set_ylabel("Nombre de messages")
    ax_hist.set_title("Répartition par tranche")
    ax_hist.legend(fontsize=8)
    ax_hist.grid(axis="y", linestyle="--", alpha=0.35)

    # --- C : indicateurs synthèse (moyenne, médiane, P95) ---
    ax_stats = fig.add_subplot(gs[1, 0])
    metrics = ("Médiane", "Moyenne", "P95")
    x = np.arange(len(metrics))
    width = 0.24
    for i, (p, color) in enumerate(zip(PROTOCOLS, colors)):
        if p not in by_proto:
            continue
        vals = by_proto[p]
        heights = [
            statistics.median(vals),
            statistics.mean(vals),
            percentile(vals, 95),
        ]
        offset = (i - 1) * width
        bars = ax_stats.bar(
            x + offset,
            heights,
            width=width,
            label=LABELS[p],
            color=color,
            alpha=0.85,
            edgecolor="black",
            linewidth=0.4,
        )
        for bar, h in zip(bars, heights):
            if h >= 0.05:
                ax_stats.text(
                    bar.get_x() + bar.get_width() / 2,
                    bar.get_height() + 0.02,
                    f"{h:.2f}",
                    ha="center",
                    va="bottom",
                    fontsize=7,
                )
    ax_stats.set_xticks(x)
    ax_stats.set_xticklabels(metrics)
    ax_stats.set_ylabel("Latence (ms)")
    ax_stats.set_ylim(0, max(1.2, ax_stats.get_ylim()[1]))
    ax_stats.set_title("Synthèse (hors pic isolé WT)")
    ax_stats.legend(fontsize=8)
    ax_stats.grid(axis="y", linestyle="--", alpha=0.35)

    # --- D : outliers > 5 ms ---
    ax_out = fig.add_subplot(gs[1, 1])
    outlier_threshold = 5
    has_any = False
    for i, (p, color, name) in enumerate(zip(PROTOCOLS, colors, labels), start=1):
        outs = [v for v in by_proto[p] if v > outlier_threshold]
        if not outs:
            continue
        has_any = True
        jitter = [i + rng.uniform(-0.08, 0.08) for _ in outs]
        ax_out.scatter(
            jitter,
            outs,
            s=80,
            color=color,
            edgecolors="black",
            linewidth=0.6,
            label=f"{name} ({len(outs)})",
            zorder=3,
        )
        for xi, yi in zip(jitter, outs):
            ax_out.annotate(
                f"{yi:.0f} ms",
                (xi, yi),
                textcoords="offset points",
                xytext=(6, 4),
                fontsize=8,
                color=color,
            )
    if has_any:
        ax_out.set_xticks([1, 2, 3])
        ax_out.set_xticklabels(labels)
        ax_out.set_ylabel("Latence (ms)")
        ax_out.set_title(f"Outliers > {outlier_threshold} ms")
        ax_out.grid(axis="y", linestyle="--", alpha=0.35)
        ax_out.legend(fontsize=8)
    else:
        ax_out.axis("off")
        ax_out.text(
            0.5,
            0.5,
            f"Aucune mesure > {outlier_threshold} ms",
            ha="center",
            va="center",
            transform=ax_out.transAxes,
        )

    fig.suptitle("Expérience 1 — latence à 1 msg/s (conditions locales)", y=0.98)
    fig.text(
        0.5,
        0.01,
        path.name,
        ha="center",
        fontsize=7,
        color="gray",
    )
    return save(fig, "exp1_latence.pdf")


def plot_exp1b() -> Path | None:
    path = latest_file("exp1b*.csv")
    if not path:
        print("Exp. 1b : aucun CSV exp1b_*.csv (latence simulée tc netem)")
        return None

    by_proto = load_latencies(path)
    present = [p for p in PROTOCOLS if p in by_proto]
    if not present:
        print("Exp. 1b : aucune donnée par protocole dans le CSV")
        return None
    labels = [LABELS[p] for p in present]
    colors = [COLORS[p] for p in present]
    data = [by_proto[p] for p in present]

    fig, (ax_box, ax_mean) = plt.subplots(1, 2, figsize=(10, 4))

    # --- A : distribution complète (boxplot, échelle automatique) ---
    bp = ax_box.boxplot(
        data,
        labels=labels,
        patch_artist=True,
        widths=0.5,
        showfliers=True,
    )
    for patch, color in zip(bp["boxes"], colors):
        patch.set_facecolor(color)
        patch.set_alpha(0.35)
        patch.set_edgecolor("black")
    for med in bp["medians"]:
        med.set_color("black")
        med.set_linewidth(1.5)
    ax_box.set_ylabel("Latence (ms)")
    ax_box.set_title("Distribution des latences")
    ax_box.grid(axis="y", linestyle="--", alpha=0.35)

    # --- B : latence moyenne par protocole (barres + écart-type) ---
    means = [statistics.mean(v) for v in data]
    stds = [statistics.stdev(v) if len(v) > 1 else 0 for v in data]
    x = range(len(present))
    bars = ax_mean.bar(
        x,
        means,
        yerr=stds,
        capsize=5,
        color=colors,
        alpha=0.85,
        edgecolor="black",
        linewidth=0.6,
    )
    ax_mean.set_xticks(list(x))
    ax_mean.set_xticklabels(labels)
    ax_mean.set_ylabel("Latence moyenne (ms)")
    ax_mean.set_title("Latence moyenne par protocole")
    ax_mean.grid(axis="y", linestyle="--", alpha=0.4)
    top = max(means) if means else 1
    for bar, m in zip(bars, means):
        ax_mean.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + top * 0.02,
            f"{m:.1f}",
            ha="center",
            va="bottom",
            fontsize=9,
        )

    fig.suptitle(
        "Expérience 1b — latence simulée (tc netem delay 50 ms ± 10 ms sur lo)",
        y=1.02,
    )
    fig.text(0.5, -0.02, path.name, ha="center", fontsize=7, color="gray")
    fig.tight_layout()
    return save(fig, "exp1b_netem.pdf")


def plot_exp2() -> Path | None:
    means: dict[str, list[float]] = {p: [] for p in PROTOCOLS}
    rates: dict[str, list[float]] = {p: [] for p in PROTOCOLS}
    charges: list[int] = []

    for slug, charge in EXP2_PALIERS:
        path = latest_file(f"exp2_{slug}_*.csv")
        if not path:
            print(f"Exp. 2 : CSV manquant pour {slug}")
            return None
        stats = latency_stats(path)
        charges.append(charge)
        for p in PROTOCOLS:
            means[p].append(stats.get(p, {}).get("mean", float("nan")))
            rates[p].append(stats.get(p, {}).get("rate", float("nan")))

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4))

    linestyles = {"websocket": "-", "sse": "--", "webtransport": "-."}
    markers = {"websocket": "o", "sse": "s", "webtransport": "^"}

    for p in PROTOCOLS:
        ax1.plot(
            charges,
            means[p],
            linestyle=linestyles[p],
            marker=markers[p],
            linewidth=2,
            markersize=7,
            label=LABELS[p],
            color=COLORS[p],
        )
    ax1.set_xlabel("Charge cible (msg/s)")
    ax1.set_ylabel("Latence moyenne (ms)")
    ax1.set_title("Latence moyenne")
    ax1.set_xticks(charges)
    ax1.grid(True, linestyle="--", alpha=0.4)
    ax1.legend()

    # Barres groupées : les 3 débits sont quasi identiques (courbes superposées sinon)
    width = 0.22
    x = range(len(charges))
    for i, p in enumerate(PROTOCOLS):
        offset = (i - 1) * width
        ax2.bar(
            [xi + offset for xi in x],
            rates[p],
            width=width,
            label=LABELS[p],
            color=COLORS[p],
            alpha=0.85,
            edgecolor="black",
            linewidth=0.5,
        )
    ax2.plot(
        list(x),
        charges,
        "k--",
        linewidth=1.2,
        marker="x",
        markersize=6,
        label="Cible",
        zorder=5,
    )
    ax2.set_xlabel("Charge cible (msg/s)")
    ax2.set_ylabel("Débit observé (msg/s)")
    ax2.set_title("Débit reçu (barres par protocole)")
    ax2.set_xticks(list(x))
    ax2.set_xticklabels([str(c) for c in charges])
    ax2.grid(axis="y", linestyle="--", alpha=0.4)
    ax2.legend(loc="upper left", fontsize=8)

    fig.suptitle("Expérience 2 — latence et débit sous charge croissante", y=1.02)
    fig.tight_layout()
    return save(fig, "exp2_charge.pdf")


def plot_exp3() -> Path | None:
    files = sorted(DATA.glob("exp3_log*.csv"))
    if not files:
        print("Exp. 3 : aucun journal exp3_log_*.csv")
        return None

    per_run: list[dict[str, float]] = [exp3_reconnects(f) for f in files]
    if not any(per_run):
        print("Exp. 3 : pas de lignes reconnect dans les journaux")
        return None

    avgs: list[float] = []
    stds: list[float] = []
    labels: list[str] = []

    for p in PROTOCOLS:
        values = [r[p] / 1000 for r in per_run if p in r]
        if not values:
            continue
        labels.append(LABELS[p])
        avgs.append(statistics.mean(values))
        stds.append(statistics.stdev(values) if len(values) > 1 else 0)

    fig, ax = plt.subplots(figsize=(6, 4))
    x = range(len(labels))
    bars = ax.bar(
        x,
        avgs,
        yerr=stds,
        capsize=5,
        color=[COLORS[p] for p in PROTOCOLS if LABELS[p] in labels],
        alpha=0.85,
        edgecolor="black",
        linewidth=0.6,
    )
    ax.set_xticks(list(x))
    ax.set_xticklabels(labels)
    ax.set_ylabel("Temps de reconnexion (s)")
    ax.set_title(f"Expérience 3 — reconnexion après coupure 5 s (n={len(files)} runs)")
    ax.grid(axis="y", linestyle="--", alpha=0.4)

    for bar, val in zip(bars, avgs):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + 0.15,
            f"{val:.2f}",
            ha="center",
            va="bottom",
            fontsize=9,
        )

    return save(fig, "exp3_reconnexion.pdf")


def main() -> None:
    generated = []
    for plot_fn in (plot_exp1, plot_exp1b, plot_exp2, plot_exp3):
        path = plot_fn()
        if path:
            generated.append(path)

    if not generated:
        print("Aucune figure générée.")
        return

    print("Figures PDF générées :")
    for p in generated:
        print(f"  {p}")


if __name__ == "__main__":
    main()
