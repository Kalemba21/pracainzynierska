
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

                { }
                <g stroke="rgba(148,163,184,0.12)" strokeWidth="1">
                    {[0, 1, 2, 3, 4].map((k) => {
                        const y = pad + (k * (svgH - pad * 2)) / 4;
                        return <line key={k} x1={pad} y1={y} x2={svgW - pad} y2={y} />;
                    })}
                </g>

                { }
                <path d={areaPath} fill="url(#gqs2-area)" />

                { }
                <path
                    d={linePath}
                    fill="none"
                    stroke={lineColor}
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    filter="url(#gqs2-glow)"
                    className="gqs2__lineAnim"
                />

                { }
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


function MultiLineChart({ stockData }) {
    const [hoverX, setHoverX] = useState(null);
    const pad = 24;
    const svgW = 640;
    const svgH = 260;


    const COLORS = [
        '#4ade80', // green-400
        '#60a5fa', // blue-400
        '#c084fc', // purple-400
        '#fbbf24', // amber-400
        '#f87171', // red-400
        '#22d3ee', // cyan-400
        '#f472b6', // pink-400
        '#a3e635', // lime-400
    ];


    const normalizedData = useMemo(() => {
        if (!stockData?.length) return [];
        return stockData.map((stock, i) => {
            const points = stock.points || [];
            if (!points.length) return { ...stock, normPoints: [] };

            const startPrice = points[0].y;
            const normPoints = points.map((p, idx) => ({
                ...p,
                x: idx,
                originalY: p.y,
                y: startPrice !== 0 ? ((p.y - startPrice) / startPrice) * 100 : 0
            }));

            return { ...stock, normPoints, color: COLORS[i % COLORS.length] };
        });
    }, [stockData]);

    const { minY, maxY, maxLen } = useMemo(() => {
        if (!normalizedData.length) return { minY: -5, maxY: 5, maxLen: 0 };

        let mn = 0;
        let mx = 0;
        let len = 0;

        for (const stock of normalizedData) {
            len = Math.max(len, stock.normPoints?.length || 0);
            for (const p of stock.normPoints || []) {
                mn = Math.min(mn, p.y);
                mx = Math.max(mx, p.y);
            }
        }

        const range = mx - mn || 5;
        const padding = range * 0.15;
        return {
            minY: mn - padding,
            maxY: mx + padding,
            maxLen: len
        };
    }, [normalizedData]);

    const toX = (i) => {
        const n = Math.max(1, maxLen - 1);
        return pad + (i * (svgW - pad * 2)) / n;
    };

    const toY = (val) => {
        const denom = maxY - minY || 1;
        const t = (val - minY) / denom;
        return svgH - pad - t * (svgH - pad * 2);
    };

    if (!normalizedData.length) {
        return <div className="gqs2__chartEmpty">Brak danych do porównania.</div>;
    }

    const hoverIndex = hoverX === null ? null : Math.round(((hoverX - pad) / (svgW - pad * 2)) * (maxLen - 1));
    const validHover = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < maxLen;

    return (
        <div
            className="gqs2__chartBox"
            style={{ height: "auto", position: "relative" }}
            onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoverX(e.clientX - rect.left);
            }}
            onMouseLeave={() => setHoverX(null)}
        >
            <div style={{ position: "absolute", top: 5, left: pad, fontSize: "0.65rem", color: "#64748b", pointerEvents: "none" }}>
                ZMIANA %
            </div>

            <svg
                className="gqs2__svg"
                viewBox={`0 0 ${svgW} ${svgH}`}
                preserveAspectRatio="none"
                style={{ overflow: "visible" }}
            >
                <defs>
                    {normalizedData.map((stock, i) => (
                        <filter key={`glow-${i}`} id={`glow-${i}`} x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    ))}
                </defs>

                { }
                <line
                    x1={pad} y1={toY(0)}
                    x2={svgW - pad} y2={toY(0)}
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                />

                { }
                {[minY, 0, maxY].map((v, i) => (
                    <text key={i} x={svgW - pad + 6} y={toY(v)} fill="#64748b" fontSize="9" alignmentBaseline="middle">
                        {v > 0 ? "+" : ""}{v.toFixed(0)}%
                    </text>
                ))}

                { }
                {normalizedData.map((stock, idx) => {
                    if (!stock.normPoints.length) return null;
                    const path = stock.normPoints.map((p, i) =>
                        (i === 0 ? "M" : "L") + ` ${toX(i)} ${toY(p.y)}`
                    ).join(" ");

                    return (
                        <g key={idx}>
                            <path
                                d={path}
                                fill="none"
                                stroke={stock.color}
                                strokeWidth={validHover ? 1.5 : 2.2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ filter: `url(#glow-${idx})`, transition: "stroke-width 0.2s, opacity 0.2s" }}
                                opacity={validHover ? 0.35 : 0.85}
                            />
                        </g>
                    );
                })}


                { }
                {validHover && (
                    <line
                        x1={toX(hoverIndex)} y1={pad}
                        x2={toX(hoverIndex)} y2={svgH - pad}
                        stroke="#94a3b8" strokeWidth="1"
                        strokeDasharray="3 3" opacity="0.4"
                    />
                )}

                { }
                {validHover && normalizedData.map((stock, idx) => {
                    const pt = stock.normPoints[hoverIndex];
                    if (!pt) return null;
                    return (
                        <circle
                            key={idx}
                            cx={toX(hoverIndex)}
                            cy={toY(pt.y)}
                            r="3.5"
                            fill="#0f172a"
                            stroke={stock.color}
                            strokeWidth="2"
                        />
                    );
                })}
            </svg>

            { }
            {validHover && (
                <div style={{
                    position: "absolute",
                    top: "10px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "rgba(15, 23, 42, 0.90)",
                    backdropFilter: "blur(4px)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: "0.5rem",
                    padding: "0.5rem 0.8rem",
                    zIndex: 20,
                    pointerEvents: "none",
                    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
                    fontSize: "0.75rem",
                    display: "grid",
                    gridTemplateColumns: "auto auto auto",
                    gap: "0.2rem 1rem",
                    alignItems: "center"
                }}>
                    <div style={{ gridColumn: "1 / -1", textAlign: "center", color: "#94a3b8", fontSize: "0.7rem", paddingBottom: "0.3rem", borderBottom: "1px solid rgba(255,255,255,0.05)", marginBottom: "0.2rem" }}>
                        DZIEŃ {normalizedData[0]?.normPoints[hoverIndex]?.x + 1 || "-"}
                    </div>
                    {normalizedData
                        .sort((a, b) => (b.normPoints[hoverIndex]?.y || 0) - (a.normPoints[hoverIndex]?.y || 0))
                        .map((stock) => {
                            const pt = stock.normPoints[hoverIndex];
                            if (!pt) return null;
                            return (
                                <React.Fragment key={stock.symbol}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: stock.color, boxShadow: `0 0 5px ${stock.color}` }}></div>
                                        <span style={{ fontWeight: 600, color: "#f1f5f9" }}>{stock.symbol}</span>
                                    </div>
                                    <div style={{ color: "#cbd5e1", textAlign: "right" }}>{formatMoney(pt.originalY)}</div>
                                    <div style={{ color: pt.y >= 0 ? "#4ade80" : "#f87171", textAlign: "right", fontWeight: 600 }}>
                                        {pt.y > 0 ? "+" : ""}{pt.y.toFixed(1)}%
                                    </div>
                                </React.Fragment>
                            );
                        })}
                </div>
            )}

            { }
            <div style={{
                display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "0.5rem",
                justifyContent: "center", fontSize: "0.75rem", paddingTop: "0.8rem",
                borderTop: "1px solid rgba(148,163,184,0.08)"
            }}>
                {normalizedData.map((stock, idx) => {
                    const lastPt = stock.normPoints.at(-1);
                    return (
                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.4rem", opacity: 0.9 }}>
                            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: stock.color, boxShadow: `0 0 6px ${stock.color}` }}></div>
                            <span style={{ color: "#cbd5e1", fontWeight: 500 }}>{stock.symbol}</span>
                            {lastPt && (
                                <span style={{ color: lastPt.y >= 0 ? "#4ade80" : "#f87171", marginLeft: "0.1rem", fontSize: "0.7rem" }}>
                                    {lastPt.y >= 0 ? "+" : ""}{lastPt.y.toFixed(1)}%
                                </span>
                            )}
                        </div>
                    );
                })}
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

    triggerPlacement = "fab",
    triggerLabel = "Podgląd",
}) {
    const symbols = useMemo(() => Object.keys(priceHistory || {}).sort(), [priceHistory]);
    const selectedInitial = symbols[0] || "";
    const [selected, setSelected] = useState(selectedInitial);
    const [activeTab, setActiveTab] = useState("trades");
    const [tradeFilter, setTradeFilter] = useState("all");

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


        const symbolStats = {};
        arr.forEach(t => {
            const sym = t.symbol;
            if (!symbolStats[sym]) symbolStats[sym] = { hasBuy: false, hasSell: false };
            if (t.side === "BUY") symbolStats[sym].hasBuy = true;
            if (t.side === "SELL") symbolStats[sym].hasSell = true;
        });

        const completedSymbols = new Set(
            Object.entries(symbolStats)
                .filter(([_, stats]) => stats.hasBuy && stats.hasSell)
                .map(([sym, _]) => sym)
        );


        return arr
            .sort((a, b) => {
                const aCompleted = completedSymbols.has(a.symbol);
                const bCompleted = completedSymbols.has(b.symbol);

                if (aCompleted && !bCompleted) return -1;
                if (!aCompleted && bCompleted) return 1;

                return (b.id || 0) - (a.id || 0);
            })
            .slice(0, 20);
    }, [trades]);

    const filteredTrades = useMemo(() => {
        if (tradeFilter === "all") return lastTrades;
        return lastTrades.filter(t => {
            if (tradeFilter === "buy") return t.side === "BUY";
            if (tradeFilter === "sell") return t.side === "SELL";
            return true;
        });
    }, [lastTrades, tradeFilter]);

    const stats = useMemo(() => {
        const allTrades = Array.isArray(trades) ? trades : [];
        const buyTrades = allTrades.filter(t => t.side === "BUY");
        const sellTrades = allTrades.filter(t => t.side === "SELL");

        let totalPnL = 0;
        const positions = {};

        allTrades.forEach(t => {
            const sym = t.symbol;
            if (!positions[sym]) positions[sym] = { qty: 0, totalCost: 0 };

            if (t.side === "BUY") {
                positions[sym].qty += t.qty || 0;
                positions[sym].totalCost += (t.qty || 0) * (t.price || 0);
            } else if (t.side === "SELL") {
                const avgBuyPrice = positions[sym].qty > 0 ? positions[sym].totalCost / positions[sym].qty : 0;
                totalPnL += (t.qty || 0) * ((t.price || 0) - avgBuyPrice);
                positions[sym].qty -= t.qty || 0;
            }
        });

        return {
            totalTrades: allTrades.length,
            buyCount: buyTrades.length,
            sellCount: sellTrades.length,
            estimatedPnL: totalPnL,
        };
    }, [trades]);


    const purchasedSymbols = useMemo(() => {
        const arr = Array.isArray(trades) ? trades : [];
        const purchased = new Set();
        arr.forEach(t => {
            if (t.side === "BUY") purchased.add(t.symbol);
        });
        return purchased;
    }, [trades]);


    const comparisonData = useMemo(() => {
        const COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];
        const purchased = Array.from(purchasedSymbols);
        return purchased.map((symbol, idx) => {

            const lookupSymbol = symbol.toUpperCase();
            const history = priceHistory[lookupSymbol] || priceHistory[symbol] || [];

            return {
                symbol: lookupSymbol, // Display in uppercase
                color: COLORS[idx % COLORS.length],
                points: history
                    .filter(p => Number.isFinite(p.price))
                    .map((p, i) => ({ x: p.day, y: p.price }))
            };
        });
    }, [purchasedSymbols, priceHistory]);

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
                                    <option
                                        key={s}
                                        value={s}
                                        style={{
                                            fontWeight: purchasedSymbols.has(s) ? "600" : "400",
                                            color: purchasedSymbols.has(s) ? "#22c55e" : "inherit"
                                        }}
                                    >
                                        {purchasedSymbols.has(s) ? "[K] " : ""}{s}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="gqs2__body" style={{ animation: "gqs2FadeIn 0.3s ease-out" }}>
                    <SimpleLineChart points={points} />

                    { }
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", marginTop: "1rem", marginBottom: "1rem" }}>
                        <div style={{ padding: "0.65rem", background: "radial-gradient(circle at top left, rgba(15,23,42,0.98), rgba(15,23,42,0.94))", borderRadius: "0.7rem", border: "1px solid rgba(55, 65, 81, 0.9)" }}>
                            <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginBottom: "0.2rem" }}>Transakcje</div>
                            <div style={{ fontSize: "1.3rem", fontWeight: "700", color: "#e5e7eb" }}>{stats.totalTrades}</div>
                            <div style={{ fontSize: "0.68rem", color: "#9ca3af", marginTop: "0.1rem" }}>
                                <span style={{ color: "#22c55e" }}>{stats.buyCount}K</span> / <span style={{ color: "#ef4444" }}>{stats.sellCount}S</span>
                            </div>
                        </div>
                        <div style={{ padding: "0.65rem", background: "radial-gradient(circle at top left, rgba(15,23,42,0.98), rgba(15,23,42,0.94))", borderRadius: "0.7rem", border: `1px solid ${stats.estimatedPnL >= 0 ? "rgba(34, 197, 94, 0.6)" : "rgba(239, 68, 68, 0.6)"}` }}>
                            <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginBottom: "0.2rem" }}>Szacowany P/L</div>
                            <div style={{ fontSize: "1.15rem", fontWeight: "700", color: stats.estimatedPnL >= 0 ? "#22c55e" : "#ef4444" }}>
                                {stats.estimatedPnL >= 0 ? "+" : ""}{formatMoney(stats.estimatedPnL)} PLN
                            </div>
                        </div>
                        <div style={{ padding: "0.65rem", background: "radial-gradient(circle at top left, rgba(15,23,42,0.98), rgba(15,23,42,0.94))", borderRadius: "0.7rem", border: "1px solid rgba(59, 130, 246, 0.6)" }}>
                            <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginBottom: "0.2rem" }}>Eventy</div>
                            <div style={{ fontSize: "1.3rem", fontWeight: "700", color: "#60a5fa" }}>{eventHistory.length}</div>
                        </div>
                    </div>

                    { }
                    <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.75rem", borderBottom: "1px solid rgba(55, 65, 81, 0.7)", paddingBottom: "0.5rem" }}>
                        <button
                            onClick={() => setActiveTab("trades")}
                            style={{
                                padding: "0.4rem 1rem",
                                borderRadius: "0.5rem 0.5rem 0 0",
                                border: "none",
                                background: activeTab === "trades" ? "radial-gradient(circle at top left, rgba(22, 163, 74, 0.3), rgba(15, 23, 42, 0.96))" : "transparent",
                                color: activeTab === "trades" ? "#22c55e" : "#9ca3af",
                                fontSize: "0.85rem",
                                cursor: "pointer",
                                fontWeight: activeTab === "trades" ? "600" : "400",
                                borderBottom: activeTab === "trades" ? "2px solid #22c55e" : "none",
                                transition: "all 0.2s"
                            }}
                        >
                            Transakcje ({stats.totalTrades})
                        </button>
                        <button
                            onClick={() => setActiveTab("events")}
                            style={{
                                padding: "0.4rem 1rem",
                                borderRadius: "0.5rem 0.5rem 0 0",
                                border: "none",
                                background: activeTab === "events" ? "radial-gradient(circle at top left, rgba(59, 130, 246, 0.3), rgba(15, 23, 42, 0.96))" : "transparent",
                                color: activeTab === "events" ? "#60a5fa" : "#9ca3af",
                                fontSize: "0.85rem",
                                cursor: "pointer",
                                fontWeight: activeTab === "events" ? "600" : "400",
                                borderBottom: activeTab === "events" ? "2px solid #60a5fa" : "none",
                                transition: "all 0.2s"
                            }}
                        >
                            Eventy ({eventHistory.length})
                        </button>
                        <button
                            onClick={() => setActiveTab("logs")}
                            style={{
                                padding: "0.4rem 1rem",
                                borderRadius: "0.5rem 0.5rem 0 0",
                                border: "none",
                                background: activeTab === "logs" ? "radial-gradient(circle at top left, rgba(156, 163, 175, 0.3), rgba(15, 23, 42, 0.96))" : "transparent",
                                color: activeTab === "logs" ? "#d1d5db" : "#9ca3af",
                                fontSize: "0.85rem",
                                cursor: "pointer",
                                fontWeight: activeTab === "logs" ? "600" : "400",
                                borderBottom: activeTab === "logs" ? "2px solid #9ca3af" : "none",
                                transition: "all 0.2s"
                            }}
                        >
                            Dziennik ({dayLog.length})
                        </button>
                        {purchasedSymbols.size > 0 && (
                            <button
                                onClick={() => setActiveTab("comparison")}
                                style={{
                                    padding: "0.4rem 1rem",
                                    borderRadius: "0.5rem 0.5rem 0 0",
                                    border: "none",
                                    background: activeTab === "comparison" ? "radial-gradient(circle at top left, rgba(245, 158, 11, 0.3), rgba(15, 23, 42, 0.96))" : "transparent",
                                    color: activeTab === "comparison" ? "#fbbf24" : "#9ca3af",
                                    fontSize: "0.85rem",
                                    cursor: "pointer",
                                    fontWeight: activeTab === "comparison" ? "600" : "400",
                                    borderBottom: activeTab === "comparison" ? "2px solid #fbbf24" : "none",
                                    transition: "all 0.2s"
                                }}
                            >
                                Porównanie ({purchasedSymbols.size})
                            </button>
                        )}
                    </div>

                    { }
                    {activeTab === "trades" && (
                        <div>
                            { }
                            <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.6rem", flexWrap: "wrap" }}>
                                <button onClick={() => setTradeFilter("all")} style={{ padding: "0.3rem 0.75rem", borderRadius: "999px", border: tradeFilter === "all" ? "1px solid #22c55e" : "1px solid rgba(75, 85, 99, 0.9)", background: tradeFilter === "all" ? "rgba(22, 163, 74, 0.2)" : "rgba(15, 23, 42, 0.96)", color: "#e5e7eb", fontSize: "0.75rem", cursor: "pointer" }}>
                                    Wszystkie ({lastTrades.length})
                                </button>
                                <button onClick={() => setTradeFilter("buy")} style={{ padding: "0.3rem 0.75rem", borderRadius: "999px", border: tradeFilter === "buy" ? "1px solid #22c55e" : "1px solid rgba(75, 85, 99, 0.9)", background: tradeFilter === "buy" ? "rgba(22, 163, 74, 0.2)" : "rgba(15, 23, 42, 0.96)", color: "#e5e7eb", fontSize: "0.75rem", cursor: "pointer" }}>
                                    Kupno ({stats.buyCount})
                                </button>
                                <button onClick={() => setTradeFilter("sell")} style={{ padding: "0.3rem 0.75rem", borderRadius: "999px", border: tradeFilter === "sell" ? "1px solid #ef4444" : "1px solid rgba(75, 85, 99, 0.9)", background: tradeFilter === "sell" ? "rgba(239, 68, 68, 0.2)" : "rgba(15, 23, 42, 0.96)", color: "#e5e7eb", fontSize: "0.75rem", cursor: "pointer" }}>
                                    Sprzedaż ({stats.sellCount})
                                </button>
                            </div>

                            <div className="gqs2__card">
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
                                            {filteredTrades.length ? (
                                                filteredTrades.map((t) => (
                                                    <tr key={t.id ?? `${t.day}-${t.symbol}-${t.side}-${t.price}`} style={{ transition: "background 0.15s" }}>
                                                        <td>{t.id ?? "-"}</td>
                                                        <td>{t.day ?? "-"}</td>
                                                        <td>{String(t.symbol || "").toUpperCase()}</td>
                                                        <td>
                                                            <span style={{
                                                                display: "inline-block",
                                                                padding: "0.15rem 0.5rem",
                                                                borderRadius: "999px",
                                                                fontSize: "0.7rem",
                                                                fontWeight: "500",
                                                                background: t.side === "BUY" ? "rgba(22, 163, 74, 0.2)" : "rgba(239, 68, 68, 0.2)",
                                                                color: t.side === "BUY" ? "#bbf7d0" : "#fecaca",
                                                                border: t.side === "BUY" ? "1px solid rgba(34, 197, 94, 0.5)" : "1px solid rgba(239, 68, 68, 0.5)"
                                                            }}>
                                                                {t.side === "BUY" ? "✅ Kupno" : "❌ Sprzedaż"}
                                                            </span>
                                                        </td>
                                                        <td>{t.qty ?? "-"}</td>
                                                        <td className="gqs2__right" style={{ fontWeight: "600", color: t.side === "BUY" ? "#22c55e" : "#ef4444" }}>{formatMoney(t.price)}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={6} className="gqs2__empty ">
                                                        Brak transakcji
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    { }
                    {activeTab === "events" && (
                        <div className="gqs2__card">
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
                    )}

                    { }
                    {activeTab === "logs" && (
                        <div className="gqs2__card gqs2__logsCard">
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
                    )}

                    { }
                    {activeTab === "comparison" && (
                        <div style={{ padding: "1rem 0" }}>
                            <div style={{
                                padding: "0 0 0.75rem 0",
                                fontSize: "0.85rem",
                                color: "#9ca3af",
                                textAlign: "center"
                            }}>
                                Porównanie wykresów kupionych akcji
                            </div>
                            <MultiLineChart stockData={comparisonData} />
                        </div>
                    )}
                </div>
            </div>
        </div >
    );

    return createPortal(node, document.body);
}
