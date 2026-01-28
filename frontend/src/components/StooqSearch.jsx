import React, { useMemo, useState } from "react";
import axios from "axios";


const STOOQ_SUGGESTIONS = [
    { symbol: "wig20", title: "WIG20", subtitle: "WIG20 – indeks największych spółek" },
    { symbol: "wig", title: "WIG", subtitle: "WIG – indeks szerokiego rynku" },
    { symbol: "mwig40", title: "MWIG40", subtitle: "mWIG40 – średnie spółki" },
    { symbol: "swig80", title: "SWIG80", subtitle: "sWIG80 – małe spółki" },

    { symbol: "ale", title: "ALE", subtitle: "Allegro.eu – ALE" },
    { symbol: "alr", title: "ALR", subtitle: "Alior Bank – ALR" },
    { symbol: "acp", title: "ACP", subtitle: "Asseco Poland – ACP" },
    { symbol: "lwb", title: "LWB", subtitle: "Bogdanka – LWB" },
    { symbol: "bdx", title: "BDX", subtitle: "Budimex – BDX" },
    { symbol: "ccc", title: "CCC", subtitle: "CCC – CCC" },

    { symbol: "cdr", title: "CDR", subtitle: "CD PROJEKT – CDR" },
    { symbol: "cps", title: "CPS", subtitle: "Cyfrowy Polsat / Polsat Box – CPS" },
    { symbol: "dnp", title: "DNP", subtitle: "Dino Polska – DNP" },
    { symbol: "ena", title: "ENA", subtitle: "Enea – ENA" },
    { symbol: "eur", title: "EUR", subtitle: "Eurocash – EUR" },

    { symbol: "att", title: "ATT", subtitle: "Grupa Azoty – ATT" },
    { symbol: "kty", title: "KTY", subtitle: "Grupa Kęty – KTY" },
    { symbol: "jsw", title: "JSW", subtitle: "JSW – JSW" },
    { symbol: "kgh", title: "KGH", subtitle: "KGHM Polska Miedź – KGH" },
    { symbol: "kru", title: "KRU", subtitle: "Kruk – KRU" },

    { symbol: "lpp", title: "LPP", subtitle: "LPP – LPP" },
    { symbol: "mbk", title: "MBK", subtitle: "mBank – MBK" },
    { symbol: "mil", title: "MIL", subtitle: "Bank Millennium – MIL" },
    { symbol: "opl", title: "OPL", subtitle: "Orange Polska – OPL" },
    { symbol: "peo", title: "PEO", subtitle: "Bank Pekao – PEO" },

    { symbol: "pco", title: "PCO", subtitle: "Pepco Group – PCO" },
    { symbol: "pge", title: "PGE", subtitle: "PGE – PGE" },
    { symbol: "pkn", title: "PKN", subtitle: "PKN Orlen – PKN" },
    { symbol: "pko", title: "PKO", subtitle: "PKO Bank Polski – PKO" },
    { symbol: "pzu", title: "PZU", subtitle: "PZU – PZU" },

    { symbol: "spl", title: "SPL", subtitle: "Santander Bank Polska – SPL" },
    { symbol: "tpe", title: "TPE", subtitle: "Tauron – TPE" },
    { symbol: "xtb", title: "XTB", subtitle: "Dom maklerski XTB – XTB" },
];


function formatMoney(x) {
    if (x == null || Number.isNaN(x)) return "-";
    return x.toLocaleString("pl-PL", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("pl-PL");
}

function StooqBlock() {
    const [inputSymbol, setInputSymbol] = useState("");
    const [selectedSymbol, setSelectedSymbol] = useState("");
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const [activeIndex, setActiveIndex] = useState(null);

    const suggestions = useMemo(() => {
        const q = inputSymbol.trim().toLowerCase();
        if (!q) return STOOQ_SUGGESTIONS;
        return STOOQ_SUGGESTIONS.filter(
            (s) =>
                s.symbol.toLowerCase().includes(q) ||
                s.title.toLowerCase().includes(q) ||
                s.subtitle.toLowerCase().includes(q)
        );
    }, [inputSymbol]);

    const filteredRows = useMemo(() => {
        if (!rows || rows.length === 0) return [];

        return rows.filter((r) => {
            const dStr = r.Date || r.date;
            if (!dStr) return false;
            const d = new Date(dStr);
            if (Number.isNaN(d.getTime())) return false;

            if (fromDate) {
                const from = new Date(fromDate);
                if (d < from) return false;
            }
            if (toDate) {
                const to = new Date(toDate);

                if (d > new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59))
                    return false;
            }
            return true;
        });
    }, [rows, fromDate, toDate]);


    const activeRow =
        filteredRows.length === 0
            ? null
            : activeIndex != null && activeIndex >= 0 && activeIndex < filteredRows.length
                ? filteredRows[activeIndex]
                : filteredRows[filteredRows.length - 1];

    const effectiveSymbol =
        selectedSymbol || inputSymbol.trim().toLowerCase() || "";

    async function handleFetch(e) {
        if (e) e.preventDefault();
        const sym = effectiveSymbol;
        if (!sym) {
            setError("Podaj symbol (np. wig20, pzu, cdr) lub wybierz z listy.");
            setRows([]);
            return;
        }

        setLoading(true);
        setError(null);
        setRows([]);
        setActiveIndex(null);

        try {
            const res = await axios.get("http://localhost:4000/api/stooq/history", {
                params: { symbol: sym },
            });

            const data = res.data || [];

            if (!Array.isArray(data) || data.length === 0) {
                setError(
                    "Brak danych z Stooq dla tego symbolu. Możliwe powody: zły ticker, weekend / święto, " +
                    "lub limit zapytań po stronie Stooq."
                );
                setRows([]);
                return;
            }

            setRows(data);
        } catch (err) {
            console.error(err);
            const msg =
                err.response?.data?.error ||
                "Nie udało się pobrać danych z backendu (Stooq).";
            setError(msg);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }

    function handleSuggestionClick(sym) {
        setInputSymbol(sym);
        setSelectedSymbol(sym);
    }

    return (
        <div className="wig20-wrapper">
            <h2>Dane z Stooq </h2>
            <p className="hint">
                Wpisz ticker z Stooq (np. <strong>wig20</strong>, <strong>pzu</strong>,
                {" "}
                <strong>cdr</strong>, <strong>cps</strong>) albo kliknij jedną z
                podpowiedzi. Możesz zawęzić tabelę po zakresie dat
                <strong> UWAGA!</strong> przy pobieraniu dużej ilosci
                 danych trzeba chwilke odczekać.


            </p>

            <form className="search-form" onSubmit={handleFetch}>
                <input
                    placeholder="np. wig20, pzu, cdr, cps..."
                    value={inputSymbol}
                    onChange={(e) => setInputSymbol(e.target.value)}
                />
                <button type="submit" disabled={loading}>
                    {loading ? "Ładowanie..." : "Pobierz"}
                </button>
            </form>

            <ul className="stooq-suggestions">
                {suggestions.map((s) => (
                    <li
                        key={s.symbol}
                        className={
                            "stooq-suggestion-item" +
                            (selectedSymbol === s.symbol ? " stooq-active" : "")
                        }
                        onClick={() => handleSuggestionClick(s.symbol)}
                    >
                        <span className="stooq-suggestion-symbol">{s.title}</span>
                        <span className="stooq-suggestion-label">{s.subtitle}</span>
                    </li>
                ))}
            </ul>


            <div className="stooq-date-filters">
                <label>
                    Od:
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                    />
                </label>
                <label>
                    Do:
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                    />
                </label>
            </div>

            <div className="wig20-layout">
                <div className="wig20-list">
                    <div className="wig20-table-wrapper">
                        {loading ? (
                            <p style={{ padding: "0.5rem" }}>Ładowanie danych z Stooq...</p>
                        ) : filteredRows.length === 0 ? (
                            <p style={{ padding: "0.5rem" }} className="hint">
                                Brak wierszy do wyświetlenia. Upewnij się, że symbol jest poprawny
                                i zakres dat nie jest zbyt wąski.
                            </p>
                        ) : (
                            <table className="wig20-table">
                                <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Otwarcie</th>
                                    <th>Max</th>
                                    <th>Min</th>
                                    <th>Zamknięcie</th>
                                    <th>Wolumen</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredRows.map((row, idx) => (
                                    <tr
                                        key={row.Date || row.date || idx}
                                        className={
                                            activeRow === row ? "wig20-row-active" : undefined
                                        }
                                        onClick={() => setActiveIndex(idx)}
                                    >
                                        <td>{formatDate(row.Date || row.date)}</td>
                                        <td>{formatMoney(Number(row.Open))}</td>
                                        <td>{formatMoney(Number(row.High))}</td>
                                        <td>{formatMoney(Number(row.Low))}</td>
                                        <td>{formatMoney(Number(row.Close))}</td>
                                        <td>{row.Volume || "-"}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                <div className="wig20-details">
                    {activeRow ? (
                        <div className="quote-card">
                            <h3>
                                {effectiveSymbol
                                    ? effectiveSymbol.toUpperCase()
                                    : "Wybrany instrument"}{" "}
                                – {formatDate(activeRow.Date || activeRow.date)}
                            </h3>
                            <p>
                                Otwarcie:{" "}
                                <strong>
                                    {formatMoney(Number(activeRow.Open))} PLN
                                </strong>
                            </p>
                            <p>
                                Najwyższa:{" "}
                                <strong>
                                    {formatMoney(Number(activeRow.High))} PLN
                                </strong>
                            </p>
                            <p>
                                Najniższa:{" "}
                                <strong>
                                    {formatMoney(Number(activeRow.Low))} PLN
                                </strong>
                            </p>
                            <p>
                                Zamknięcie:{" "}
                                <strong>
                                    {formatMoney(Number(activeRow.Close))} PLN
                                </strong>
                            </p>
                            <p>
                                Wolumen:{" "}
                                <strong>{activeRow.Volume || "-"}</strong>
                            </p>
                            <p className="hint" style={{ marginTop: "0.35rem" }}>
                                Dane dzienne z{" "}
                                <strong>Stooq (CSV /q/d/l/)</strong>. Kliknij inny wiersz w
                                tabeli, aby zobaczyć szczegóły innego dnia.
                            </p>
                        </div>
                    ) : (
                        <p className="hint">
                            Po pobraniu danych kliknij dowolny wiersz w tabeli po lewej, żeby
                            zobaczyć szczegóły sesji (OHLC + wolumen).
                        </p>
                    )}
                </div>
            </div>

            {error && (
                <div className="error" style={{ marginTop: "0.5rem" }}>
                    {error}
                </div>
            )}
        </div>
    );
}

export default StooqBlock;
