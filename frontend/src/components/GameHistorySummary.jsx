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


    useEffect(() => {
        if (!token) {
            setItems([]);
            return;
        }

        setLoading(true);
        setError(null);

        axios
            .get(`${API_BASE}/api/game/history`, {
                params: { limit: 10 },
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
                        {items.map((g, idx) => {
                            const created = g.created_at || g.createdAt || null;
                            const pnl = Number(g.pnl);
                            const pnlPct = g.pnl_pct ?? g.pnlPct;
                            const pnlCls = pnl > 0 ? "gh-pos" : pnl < 0 ? "gh-neg" : "";

                            return (
                                <tr
                                    key={g.id ?? idx}
                                    className="gh-row"
                                    onClick={() => openQuickSummary(g)}
                                    title="Kliknij, aby otworzyć szybki podgląd"
                                >
                                    <td>{idx + 1}</td>
                                    <td>{created ? new Date(created).toLocaleString("pl-PL") : "-"}</td>
                                    <td>{statusLabel(g.status)}</td>
                                    <td>{g.days_played ?? "-"}</td>
                                    <td>{g.initial_capital != null ? `${formatMoney(g.initial_capital)} PLN` : "-"}</td>
                                    <td>{g.final_value != null ? `${formatMoney(g.final_value)} PLN` : "-"}</td>
                                    <td className={pnlCls}>
                                        {g.pnl != null ? `${formatMoney(g.pnl)} PLN` : "-"}
                                        {pnlPct != null &&
                                            ` (${pnlPct >= 0 ? "+" : ""}${Number(pnlPct).toFixed(2)}%)`}
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
            )}

            {}
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
