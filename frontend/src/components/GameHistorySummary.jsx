import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../AuthContext";
import GameQuickSummary from "./GameQuickSummary";

const API_BASE =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
    "http://localhost:4000";

function formatMoney(x) {
    if (x == null || Number.isNaN(x)) return "-";
    return Number(x).toLocaleString("pl-PL", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function statusLabel(s) {
    if (s === "won") return "✅ wygrana";
    if (s === "lost") return "❌ przegrana";
    if (s === "abandoned") return "⏹ przerwana";
    return s || "-";
}

export default function GameHistorySummary() {
    const { token } = useAuth();

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [qsOpen, setQsOpen] = useState(false);
    const [qsData, setQsData] = useState(null);

    const [statusFilter, setStatusFilter] = useState("all"); // all, won, lost, abandoned

    useEffect(() => {
        if (!token) {
            setItems([]);
            return;
        }

        setLoading(true);
        setError(null);

        axios
            .get(`${API_BASE}/api/game/history`, {
                params: { limit: 50 },
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                setItems(Array.isArray(res.data?.items) ? res.data.items : []);
            })
            .catch((e) => {
                console.error("[GAME HISTORY] load list error:", e.response?.status, e.response?.data || e.message);
                setError("Nie udało się pobrać historii gier z bazy.");
                setItems([]);
            })
            .finally(() => setLoading(false));
    }, [token]);

    // Filter items based on status
    const filteredItems = items.filter(item => {
        if (statusFilter === "all") return true;
        return item.status === statusFilter;
    });

    // Calculate statistics
    const stats = {
        total: items.length,
        won: items.filter(g => g.status === "won").length,
        lost: items.filter(g => g.status === "lost").length,
        abandoned: items.filter(g => g.status === "abandoned").length,
        winRate: items.length > 0 ? (items.filter(g => g.status === "won").length / items.length * 100) : 0,
        totalPnL: items.reduce((sum, g) => sum + (Number(g.pnl) || 0), 0),
        avgPnL: items.length > 0 ? items.reduce((sum, g) => sum + (Number(g.pnl) || 0), 0) / items.length : 0,
    };

    async function openQuickSummary(row) {
        if (!token || !row?.id) return;

        try {
            const res = await axios.get(`${API_BASE}/api/game/history/${row.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const item = res.data?.item || {};
            const payload =
                item.payload && typeof item.payload === "object" ? item.payload : {};

            const mapped = {
                trades: Array.isArray(payload.trades) ? payload.trades : [],
                eventHistory: Array.isArray(payload.eventHistory) ? payload.eventHistory : [],
                dayLog: Array.isArray(payload.dayLog) ? payload.dayLog : [],
                priceHistory:
                    payload.priceHistory && typeof payload.priceHistory === "object"
                        ? payload.priceHistory
                        : {},
            };

            setQsData(mapped);
            setQsOpen(true);
        } catch (e) {
            console.error("[GAME HISTORY] load details error:", e.response?.status, e.response?.data || e.message);
            setError("Nie udało się pobrać szczegółów gry.");
        }
    }

    return (
        <div className="admin-users gh-wrap">
            <h2>Historia ostatnich gier (z bazy)</h2>

            {!token && <p className="hint">Musisz być zalogowany.</p>}
            {loading && <div className="auth-info">Ładowanie historii…</div>}
            {error && <div className="error">{error}</div>}

            {!loading && !error && items.length === 0 && (
                <p className="hint">Brak zapisanej historii w bazie.</p>
            )}

            {!loading && !error && items.length > 0 && (
                <>
                    {/* Statistics Summary */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
                        <div style={{ padding: "0.75rem", background: "radial-gradient(circle at top left, rgba(15,23,42,0.98), rgba(15,23,42,0.94))", borderRadius: "0.8rem", border: "1px solid rgba(55, 65, 81, 0.9)" }}>
                            <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "0.25rem" }}>Liczba gier</div>
                            <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#e5e7eb" }}>{stats.total}</div>
                        </div>
                        <div style={{ padding: "0.75rem", background: "radial-gradient(circle at top left, rgba(15,23,42,0.98), rgba(15,23,42,0.94))", borderRadius: "0.8rem", border: "1px solid rgba(34, 197, 94, 0.6)" }}>
                            <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "0.25rem" }}>Win Rate</div>
                            <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#22c55e" }}>
                                {stats.winRate.toFixed(1)}%
                            </div>
                            <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: "0.15rem" }}>
                                {stats.won}W / {stats.lost}L / {stats.abandoned}A
                            </div>
                        </div>
                        <div style={{ padding: "0.75rem", background: "radial-gradient(circle at top left, rgba(15,23,42,0.98), rgba(15,23,42,0.94))", borderRadius: "0.8rem", border: `1px solid ${stats.avgPnL >= 0 ? "rgba(34, 197, 94, 0.6)" : "rgba(239, 68, 68, 0.6)"}` }}>
                            <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "0.25rem" }}>Średni P/L</div>
                            <div style={{ fontSize: "1.2rem", fontWeight: "700", color: stats.avgPnL >= 0 ? "#22c55e" : "#ef4444" }}>
                                {stats.avgPnL >= 0 ? "+" : ""}{formatMoney(stats.avgPnL)} PLN
                            </div>
                        </div>
                    </div>

                    {/* Filter Buttons */}
                    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                        <button onClick={() => setStatusFilter("all")} style={{ padding: "0.4rem 0.9rem", borderRadius: "999px", border: statusFilter === "all" ? "1px solid #22c55e" : "1px solid rgba(75, 85, 99, 0.9)", background: statusFilter === "all" ? "radial-gradient(circle at top left, rgba(22, 163, 74, 0.45), rgba(15, 23, 42, 0.96))" : "linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(17, 24, 39, 0.96))", color: "#e5e7eb", fontSize: "0.8rem", cursor: "pointer", fontWeight: statusFilter === "all" ? "500" : "400" }}>
                            Wszystkie ({stats.total})
                        </button>
                        <button onClick={() => setStatusFilter("won")} style={{ padding: "0.4rem 0.9rem", borderRadius: "999px", border: statusFilter === "won" ? "1px solid #22c55e" : "1px solid rgba(75, 85, 99, 0.9)", background: statusFilter === "won" ? "radial-gradient(circle at top left, rgba(22, 163, 74, 0.45), rgba(15, 23, 42, 0.96))" : "linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(17, 24, 39, 0.96))", color: "#e5e7eb", fontSize: "0.8rem", cursor: "pointer", fontWeight: statusFilter === "won" ? "500" : "400" }}>
                            Wygrane ({stats.won})
                        </button>
                        <button onClick={() => setStatusFilter("lost")} style={{ padding: "0.4rem 0.9rem", borderRadius: "999px", border: statusFilter === "lost" ? "1px solid #ef4444" : "1px solid rgba(75, 85, 99, 0.9)", background: statusFilter === "lost" ? "radial-gradient(circle at top left, rgba(239, 68, 68, 0.45), rgba(15, 23, 42, 0.96))" : "linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(17, 24, 39, 0.96))", color: "#e5e7eb", fontSize: "0.8rem", cursor: "pointer", fontWeight: statusFilter === "lost" ? "500" : "400" }}>
                            Przegrane ({stats.lost})
                        </button>
                        <button onClick={() => setStatusFilter("abandoned")} style={{ padding: "0.4rem 0.9rem", borderRadius: "999px", border: statusFilter === "abandoned" ? "1px solid #9ca3af" : "1px solid rgba(75, 85, 99, 0.9)", background: statusFilter === "abandoned" ? "radial-gradient(circle at top left, rgba(156, 163, 175, 0.35), rgba(15, 23, 42, 0.96))" : "linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(17, 24, 39, 0.96))", color: "#e5e7eb", fontSize: "0.8rem", cursor: "pointer", fontWeight: statusFilter === "abandoned" ? "500" : "400" }}>
                            Przerwane ({stats.abandoned})
                        </button>
                    </div>

                    <div className="admin-users-table-wrapper gh-card">
                        <table className="admin-users-table gh-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Data</th>
                                    <th>Status</th>
                                    <th>Dni</th>
                                    <th>Start</th>
                                    <th>Koniec</th>
                                    <th>P/L</th>
                                    <th>Tryb</th>
                                    <th>Trudność</th>
                                    <th>Transakcje</th>
                                    <th>Panic</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map((g, idx) => {
                                    const created = g.created_at || g.createdAt || null;
                                    const pnl = Number(g.pnl);
                                    const pnlPct = g.pnl_pct ?? g.pnlPct;

                                    return (
                                        <tr
                                            key={g.id ?? idx}
                                            className="gh-row"
                                            onClick={() => openQuickSummary(g)}
                                            title="Kliknij, aby otworzyć szybki podgląd"
                                            style={{ cursor: "pointer" }}
                                        >
                                            <td>{idx + 1}</td>
                                            <td style={{ fontSize: "0.78rem" }}>{created ? new Date(created).toLocaleString("pl-PL") : "-"}</td>
                                            <td>
                                                <span style={{ display: "inline-block", padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: "500", background: g.status === "won" ? "rgba(22, 163, 74, 0.2)" : g.status === "lost" ? "rgba(239, 68, 68, 0.2)" : "rgba(107, 114, 128, 0.2)", color: g.status === "won" ? "#bbf7d0" : g.status === "lost" ? "#fecaca" : "#d1d5db", border: g.status === "won" ? "1px solid rgba(34, 197, 94, 0.5)" : g.status === "lost" ? "1px solid rgba(239, 68, 68, 0.5)" : "1px solid rgba(107, 114, 128, 0.5)" }}>
                                                    {g.status === "won" ? "✅ Wygrana" : g.status === "lost" ? "❌ Przegrana" : "⏹ Przerwana"}
                                                </span>
                                            </td>
                                            <td>{g.days_played ?? "-"}</td>
                                            <td>{g.initial_capital != null ? `${formatMoney(g.initial_capital)} PLN` : "-"}</td>
                                            <td>{g.final_value != null ? `${formatMoney(g.final_value)} PLN` : "-"}</td>
                                            <td>
                                                <div style={{ display: "inline-block", padding: "0.25rem 0.6rem", borderRadius: "0.4rem", background: pnl > 0 ? "rgba(22, 163, 74, 0.15)" : pnl < 0 ? "rgba(239, 68, 68, 0.15)" : "transparent", color: pnl > 0 ? "#22c55e" : pnl < 0 ? "#ef4444" : "#e5e7eb", fontWeight: "600", fontSize: "0.85rem" }}>
                                                    {g.pnl != null ? `${pnl >= 0 ? "+" : ""}${formatMoney(pnl)} PLN` : "-"}
                                                    {pnlPct != null &&
                                                        <div style={{ fontSize: "0.75rem", marginTop: "0.1rem" }}>
                                                            ({pnlPct >= 0 ? "+" : ""}{Number(pnlPct).toFixed(2)}%)
                                                        </div>
                                                    }
                                                </div>
                                            </td>
                                            <td>{g.sim_mode || "-"}</td>
                                            <td>{g.difficulty_id || "-"}</td>
                                            <td>{g.trades_count ?? 0}</td>
                                            <td>{g.panic_sell_count ?? 0}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            { }
            {qsData && (
                <GameQuickSummary
                    open={qsOpen}
                    onOpen={() => setQsOpen(true)}
                    onClose={() => setQsOpen(false)}
                    trades={qsData.trades}
                    eventHistory={qsData.eventHistory}
                    dayLog={qsData.dayLog}
                    priceHistory={qsData.priceHistory}
                    triggerPlacement="inline"
                />
            )}
        </div>
    );
}
