
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

function formatMoney(x) {
    if (x == null || Number.isNaN(x)) return "-";
    return Number(x).toLocaleString("pl-PL", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function SimpleLineChart({ points }) {
    const pad = 18;
    const svgW = 640;
    const svgH = 220;

    const { minY, maxY } = useMemo(() => {
        if (!points?.length) return { minY: 0, maxY: 1 };
        let mn = Infinity;
        let mx = -Infinity;
        for (const p of points) {
            if (Number.isFinite(p.y)) {
                mn = Math.min(mn, p.y);
                mx = Math.max(mx, p.y);
            }
        }
        if (!Number.isFinite(mn) || !Number.isFinite(mx) || mn === mx) {
            return { minY: mn || 0, maxY: (mx || 1) + 1 };
        }
        const margin = (mx - mn) * 0.1;
        return { minY: mn - margin, maxY: mx + margin };
    }, [points]);

    const toX = (i) => {
        const n = Math.max(1, points.length - 1);
        return pad + (i * (svgW - pad * 2)) / n;
    };

    const toY = (val) => {
        const denom = maxY - minY || 1;
        const t = (val - minY) / denom;
        return svgH - pad - t * (svgH - pad * 2);
    };

    const trendUp = points.length > 1 && Number(points.at(-1)?.y) >= Number(points[0]?.y);
    const lineColor = trendUp ? "#22c55e" : "#ef4444";

    const linePath = useMemo(() => {
        if (!points?.length) return "";
        if (points.length === 1) {
            return `M ${toX(0)} ${toY(points[0].y)} L ${toX(0)} ${toY(points[0].y)}`;
        }

        const pts = points.map((p, i) => ({ x: toX(i), y: toY(p.y) }));

        let d = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[i - 1] || pts[i];
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const p3 = pts[i + 2] || p2;

            const t = 0.35;

            const cp1x = p1.x + (p2.x - p0.x) * t / 6;
            const cp1y = p1.y + (p2.y - p0.y) * t / 6;
            const cp2x = p2.x - (p3.x - p1.x) * t / 6;
            const cp2y = p2.y - (p3.y - p1.y) * t / 6;

            d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }
        return d;

    }, [points, minY, maxY]);

    const areaPath = useMemo(() => {
        if (!linePath || !points?.length) return "";
        return `${linePath}
                L ${toX(points.length - 1)} ${svgH - pad}
                L ${toX(0)} ${svgH - pad}
                Z`;

    }, [linePath, points.length]);

    if (!points?.length) {
        return <div className="gqs2__chartEmpty">Brak danych do wykresu.</div>;
    }

    const last = points.at(-1);

    return (
        <div className="gqs2__chartBox gqs2__chartBox--enhanced">
            <svg
                className="gqs2__svg"
                viewBox={`0 0 ${svgW} ${svgH}`}
                preserveAspectRatio="none"
                role="img"
                aria-label="Wykres ceny"
            >
                <defs>
                    <linearGradient id="gqs2-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={lineColor} stopOpacity="0.35" />
                        <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
                    </linearGradient>

                    <filter id="gqs2-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2.3" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {}
                <g stroke="rgba(148,163,184,0.12)" strokeWidth="1">
                    {[0, 1, 2, 3, 4].map((k) => {
                        const y = pad + (k * (svgH - pad * 2)) / 4;
                        return <line key={k} x1={pad} y1={y} x2={svgW - pad} y2={y} />;
                    })}
                </g>

                {}
                <path d={areaPath} fill="url(#gqs2-area)" />

                {}
                <path
                    d={linePath}
                    fill="none"
                    stroke={lineColor}
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    filter="url(#gqs2-glow)"
                    className="gqs2__lineAnim"
                />

                {}
                <circle
                    cx={toX(points.length - 1)}
                    cy={toY(last.y)}
                    r="5"
                    fill={lineColor}
                    stroke="#0b1220"
                    strokeWidth="2"
                />
            </svg>

            <div className="gqs2__chartMeta">
                <div>
                    <span className="gqs2__metaLabel">Ostatnia:</span>{" "}
                    <strong>{formatMoney(last.y)} PLN</strong>
                </div>
                <div>
                    <span className="gqs2__metaLabel">Dzień:</span>{" "}
                    <strong>{last.x}</strong>
                </div>
            </div>
        </div>
    );
}

export default function GameQuickSummary({
                                             open,
                                             onClose,
                                             onOpen,
                                             trades = [],
                                             eventHistory = [],
                                             dayLog = [],
                                             priceHistory = {},

                                             triggerPlacement = "fab", // "fab" | "inline"
                                             triggerLabel = "Podgląd",
                                         }) {
    const symbols = useMemo(() => Object.keys(priceHistory || {}).sort(), [priceHistory]);
    const [selected, setSelected] = useState(() => symbols[0] || "");

    useEffect(() => {
        if (!symbols.length) return;
        if (!selected || !symbols.includes(selected)) setSelected(symbols[0]);

    }, [symbols.join("|")]);

    const points = useMemo(() => {
        const arr = priceHistory?.[selected] || [];
        return arr
            .filter((p) => Number.isFinite(p.price))
            .map((p) => ({ x: p.day, y: p.price }));
    }, [priceHistory, selected]);

    const lastTrades = useMemo(() => {
        const arr = Array.isArray(trades) ? [...trades] : [];
        return arr.sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 8);
    }, [trades]);

    const lastEvents = useMemo(() => {
        const arr = Array.isArray(eventHistory) ? [...eventHistory] : [];
        return arr.slice(-8).reverse();
    }, [eventHistory]);

    const lastLogs = useMemo(() => {
        const arr = Array.isArray(dayLog) ? [...dayLog] : [];
        return arr.slice(-8).reverse();
    }, [dayLog]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === "Escape") onClose?.();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    if (!open) {
        if (triggerPlacement === "inline") {
            return (
                <div className="gqs2__inlineTrigger">
                    <button
                        type="button"
                        className="gqs2__inlineBtn"
                        onClick={onOpen}
                        title="Pokaż szybki podgląd"
                    >
                        {triggerLabel}
                    </button>
                </div>
            );
        }

        return (
            <button
                type="button"
                className="gqs2__fab"
                onClick={onOpen}
                title="Pokaż szybki podgląd"
            >
                {triggerLabel}
            </button>
        );
    }

    const node = (
        <div className="gqs2__overlay" onClick={onClose} role="presentation">
            <div
                className="gqs2__panel"
                role="dialog"
                aria-label="Szybki podgląd"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="gqs2__header">
                    <div className="gqs2__headerInner">
                        <div className="gqs2__headerRow">
                            <div className="gqs2__title">Szybki podgląd (ostatnie dane)</div>
                            <button
                                type="button"
                                className="gqs2__closeBtn"
                                onClick={onClose}
                                aria-label="Zamknij"
                                title="Zamknij"
                            >
                                ×
                            </button>
                        </div>

                        <div className="gqs2__controls">
                            <span className="gqs2__muted">
                                Wykres (wybrana spółka): <strong>{selected || "-"}</strong>
                            </span>

                            <select
                                className="gqs2__select"
                                value={selected}
                                onChange={(e) => setSelected(e.target.value)}
                            >
                                {symbols.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="gqs2__body">
                    <SimpleLineChart points={points} />

                    <div className="gqs2__grid">
                        <div className="gqs2__card">
                            <div className="gqs2__cardTitle">Ostatnie transakcje</div>
                            <div className="gqs2__scroll gqs2__scroll--210">
                                <table className="gqs2__table">
                                    <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Dzień</th>
                                        <th>Spółka</th>
                                        <th>Strona</th>
                                        <th>Ilość</th>
                                        <th className="gqs2__right">Cena</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {lastTrades.length ? (
                                        lastTrades.map((t) => (
                                            <tr key={t.id ?? `${t.day}-${t.symbol}-${t.side}-${t.price}`}>
                                                <td>{t.id ?? "-"}</td>
                                                <td>{t.day ?? "-"}</td>
                                                <td>{String(t.symbol || "").toUpperCase()}</td>
                                                <td>{t.side === "BUY" ? "Kupno" : "Sprzedaż"}</td>
                                                <td>{t.qty ?? "-"}</td>
                                                <td className="gqs2__right">{formatMoney(t.price)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="gqs2__empty">
                                                Brak transakcji
                                            </td>
                                        </tr>
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="gqs2__card">
                            <div className="gqs2__cardTitle">Ostatnie eventy</div>
                            <div className="gqs2__scroll gqs2__scroll--210">
                                <table className="gqs2__table">
                                    <thead>
                                    <tr>
                                        <th>Dzień</th>
                                        <th>Spółka</th>
                                        <th>Event</th>
                                        <th className="gqs2__right">Wpływ</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {lastEvents.length ? (
                                        lastEvents.map((e, idx) => {
                                            const impact = Number(e.impactPct || 0);
                                            const cls =
                                                impact > 0
                                                    ? "gqs2__impactPos"
                                                    : impact < 0
                                                        ? "gqs2__impactNeg"
                                                        : "gqs2__impactNeu";
                                            return (
                                                <tr key={`${e.day}-${e.symbol}-${idx}`}>
                                                    <td>{e.day ?? "-"}</td>
                                                    <td>{String(e.symbol || "").toUpperCase()}</td>
                                                    <td>{e.label ?? "-"}</td>
                                                    <td className={`gqs2__right ${cls}`}>
                                                        {impact > 0 ? "+" : ""}
                                                        {impact.toFixed(1)}%
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="gqs2__empty">
                                                Brak eventów
                                            </td>
                                        </tr>
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="gqs2__card gqs2__logsCard">
                            <div className="gqs2__cardTitle">Dziennik dni</div>
                            <div className="gqs2__scroll gqs2__scroll--220">
                                {lastLogs.length ? (
                                    lastLogs.map((l, idx) => (
                                        <div key={`${l.day}-${idx}`} className="gqs2__logRow">
                                            <div className="gqs2__logDay">D{l.day ?? "-"}</div>
                                            <div>{l.text ?? "-"}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="gqs2__empty">Brak wpisów</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(node, document.body);
}
