import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../AuthContext";

const POPULAR_FINNHUB = [
    { symbol: "AAPL", name: "Apple", desc: "hardware, iPhone, ekosystem iOS" },
    { symbol: "MSFT", name: "Microsoft", desc: "software, chmura Azure" },
    { symbol: "AMZN", name: "Amazon", desc: "e-commerce, AWS" },
    { symbol: "GOOGL", name: "Alphabet (Google)", desc: "wyszukiwarka, reklama" },
    { symbol: "META", name: "Meta Platforms", desc: "Facebook, Instagram" },
    { symbol: "TSLA", name: "Tesla", desc: "samochody elektryczne" },
    { symbol: "NVDA", name: "NVIDIA", desc: "GPU, AI / data-center" },
    { symbol: "NFLX", name: "Netflix", desc: "VOD / streaming" },
    { symbol: "AMD", name: "AMD", desc: "procesory, karty graficzne" },
    { symbol: "INTC", name: "Intel", desc: "półprzewodniki" },
    { symbol: "JPM", name: "JPMorgan Chase", desc: "bank inwestycyjny" },
    { symbol: "BAC", name: "Bank of America", desc: "bank uniwersalny" },
    { symbol: "V", name: "Visa", desc: "płatności bezgotówkowe" },
    { symbol: "DIS", name: "Disney", desc: "media, parki rozrywki" },
    { symbol: "BRK.B", name: "Berkshire Hathaway B", desc: "holding inwestycyjny" },
];

const POPULAR_STOOQ = [
    { symbol: "wig20", name: "WIG20", desc: "indeks największych spółek GPW" },
    { symbol: "wig", name: "WIG", desc: "indeks szerokiego rynku" },
    { symbol: "mwig40", name: "mWIG40", desc: "indeks średnich spółek" },
    { symbol: "swig80", name: "sWIG80", desc: "indeks małych spółek" },

    { symbol: "pzu", name: "PZU", desc: "ubezpieczyciel" },
    { symbol: "pko", name: "PKO BP", desc: "bank" },
    { symbol: "pkn", name: "ORLEN (PKN)", desc: "paliwo, petrochemia" },
    { symbol: "cdr", name: "CD PROJEKT", desc: "producent gier" },
    { symbol: "kgh", name: "KGHM", desc: "miedź / surowce" },
    { symbol: "pge", name: "PGE", desc: "energetyka" },
    { symbol: "peo", name: "Bank Pekao", desc: "bank" },
    { symbol: "dnp", name: "Dino Polska", desc: "sieć marketów" },
    { symbol: "lpp", name: "LPP", desc: "odzież (Reserved, Cropp)" },
    { symbol: "mbk", name: "mBank", desc: "bank" },
    { symbol: "cps", name: "Cyfrowy Polsat", desc: "media, telekom" },

    { symbol: "ale", name: "Allegro", desc: "e-commerce" },
    { symbol: "alr", name: "Alior Bank", desc: "bank" },
    { symbol: "bdx", name: "Budimex", desc: "budownictwo" },
    { symbol: "ccc", name: "CCC", desc: "obuwie detaliczne" },
    { symbol: "ply", name: "PlayWay", desc: "holding gamingowy" },
    { symbol: "11b", name: "11 bit studios", desc: "producent gier" },
    { symbol: "tsg", name: "Ten Square Games", desc: "gry mobilne" },
    { symbol: "krx", name: "Kruk", desc: "windykacja" },
    { symbol: "lts", name: "Lotos (historyczny)", desc: "rafineria ropy" },
    { symbol: "atk", name: "Asseco SEE", desc: "IT / oprogramowanie" },
    { symbol: "acs", name: "AC S.A.", desc: "instalacje LPG/CNG" },
    { symbol: "zon", name: "Żywiec", desc: "browar" },
    { symbol: "att", name: "ATM Grupa", desc: "produkcja TV" },
    { symbol: "xtb", name: "XTB", desc: "dom maklerski / broker" },
];

function formatMoney(x) {
    const n = Number(x);
    if (!Number.isFinite(n)) return "-";
    return n.toLocaleString("pl-PL", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function findMetaForSymbol(sym) {
    const s = sym.toUpperCase();
    return (
        POPULAR_FINNHUB.find((x) => x.symbol === s) ||
        POPULAR_STOOQ.find((x) => x.symbol.toUpperCase() === s) ||
        null
    );
}

function inferSourceFromSymbol(sym) {
    const s = sym.toUpperCase();
    if (POPULAR_FINNHUB.some((x) => x.symbol === s)) return "finnhub";
    if (POPULAR_STOOQ.some((x) => x.symbol.toUpperCase() === s)) return "stooq";
    return "finnhub";
}

function Portfolio() {
    const { user, token } = useAuth();
    const [portfolio, setPortfolio] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [prices, setPrices] = useState({});
    const [pricesLoading, setPricesLoading] = useState(false);

    const [tradeSymbol, setTradeSymbol] = useState("");
    const [tradeQty, setTradeQty] = useState("");
    const [priceSource, setPriceSource] = useState(null);
    const [tradePrice, setTradePrice] = useState(null);
    const [priceLoading, setPriceLoading] = useState(false);
    const [priceError, setPriceError] = useState(null);
    const [tradeMessage, setTradeMessage] = useState("");

    async function fetchOnePrice(symUpper, src) {
        const sym = symUpper.toUpperCase();
        const source = src || inferSourceFromSymbol(sym);

        try {
            if (source === "finnhub") {
                const res = await axios.get("http://localhost:4000/api/quote", {
                    params: { symbol: sym },
                });
                const data = res.data || {};
                const p = data.current ?? data.c ?? (data.quote && data.quote.c) ?? null;

                return Number.isFinite(p) && p > 0 ? Number(p) : null;
            }

            const res = await axios.get("http://localhost:4000/api/stooq/history", {
                params: { symbol: sym.toLowerCase() },
            });
            const rows = res.data || [];
            const closes = rows
                .map((r) => parseFloat(r.Close))
                .filter((v) => Number.isFinite(v) && v > 0);

            return closes.length ? closes[closes.length - 1] : null;
        } catch (e) {
            console.error("fetchOnePrice error:", sym, source, e);
            return null;
        }
    }

    async function fetchPricesForPortfolio(rows) {
        const list = Array.isArray(rows) ? rows : [];
        const symbols = list
            .map((r) => (r.symbol || "").trim())
            .filter(Boolean)
            .map((s) => s.toUpperCase());

        if (!symbols.length) {
            setPrices({});
            return;
        }

        setPricesLoading(true);
        try {
            const results = await Promise.all(
                symbols.map(async (sym) => {
                    const src = inferSourceFromSymbol(sym);
                    const p = await fetchOnePrice(sym, src);
                    return [sym, p];
                })
            );

            const map = {};
            for (const [sym, p] of results) {
                if (p != null) map[sym] = p;
            }
            setPrices(map);
        } finally {
            setPricesLoading(false);
        }
    }

    const fetchPortfolio = async () => {
        if (!user || !token) {
            setError("Brak zalogowanego użytkownika lub tokenu. Zaloguj się.");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const res = await axios.get("http://localhost:4000/api/portfolio", {
                headers: { Authorization: `Bearer ${token}` },
            });

            const rows = res.data.portfolio || [];
            setPortfolio(rows);
            await fetchPricesForPortfolio(rows);
        } catch (err) {
            console.error("Błąd GET /api/portfolio:", err);
            const msg =
                err.response?.data?.error ||
                `Błąd ${err.response?.status || ""}: Nie udało się pobrać portfela.`;
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPortfolio();
    }, [user, token]);

    async function handleRowClick(row) {
        if (!row?.symbol) return;
        const sym = row.symbol.toUpperCase();
        const src = inferSourceFromSymbol(sym);

        setTradeSymbol(sym);
        setPriceSource(src);
        setTradeMessage("");
        setPriceError(null);

        await handleFetchPrice(sym, src);
    }

    async function handleFetchPrice(symbolArg, sourceArg) {
        setPriceError(null);
        const sym = (symbolArg || tradeSymbol || "").trim().toUpperCase();
        if (!sym) {
            setPriceError("Podaj symbol spółki (np. AAPL, CDR, PZU).");
            return;
        }

        const src = sourceArg || priceSource || inferSourceFromSymbol(sym);
        setPriceSource(src);

        try {
            setPriceLoading(true);
            const price = await fetchOnePrice(sym, src);

            if (!Number.isFinite(price) || price <= 0) {
                setTradePrice(null);
                setPriceError("Nie udało się odczytać poprawnej ceny z wybranego źródła.");
                return;
            }

            setTradePrice(price);

            setPrices((prev) => ({ ...prev, [sym]: price }));

            const meta = findMetaForSymbol(sym);
            const srcLabel = src === "finnhub" ? "Finnhub (cache)" : "Stooq (cache)";
            setTradeMessage(
                `Pobrano cenę ${formatMoney(price)} PLN (${srcLabel})${
                    meta ? ` dla ${sym} – ${meta.name}.` : "."
                }`
            );
        } catch (err) {
            console.error("Błąd przy pobieraniu ceny:", err);
            const msg =
                err.response?.data?.error ||
                `Błąd ${err.response?.status || ""}: Nie udało się pobrać ceny.`;
            setPriceError(msg);
            setTradePrice(null);
        } finally {
            setPriceLoading(false);
        }
    }

    function findHolding(symbol) {
        return portfolio.find((p) => p.symbol?.toUpperCase() === symbol.toUpperCase());
    }

    async function handleBuy() {
        setTradeMessage("");
        setError(null);

        const sym = (tradeSymbol || "").trim().toUpperCase();
        if (!sym) return setError("Podaj symbol spółki.");

        const qty = parseInt(tradeQty, 10);
        if (!qty || qty <= 0) return setError("Podaj dodatnią ilość akcji do kupna.");

        if (!Number.isFinite(tradePrice) || tradePrice <= 0) {
            return setError("Najpierw pobierz aktualną cenę akcji (kliknij ticker).");
        }

        const holding = findHolding(sym);
        let newQty;
        let newAvg;

        if (!holding) {
            newQty = qty;
            newAvg = tradePrice;
        } else {
            const oldQty = Number(holding.quantity) || 0;
            const oldAvg = Number(holding.avg_price) || 0;
            newQty = oldQty + qty;
            newAvg = newQty > 0 ? (oldQty * oldAvg + qty * tradePrice) / newQty : tradePrice;
        }

        try {
            await axios.post(
                "http://localhost:4000/api/portfolio",
                { symbol: sym, quantity: newQty, avg_price: newAvg },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setTradeMessage(
                `Kupiono ${qty} szt. ${sym} po ${formatMoney(tradePrice)} PLN. Zaktualizowano pozycję w portfelu.`
            );
            setError(null);
            await fetchPortfolio();
        } catch (err) {
            console.error("Błąd POST /api/portfolio (BUY):", err);
            const msg =
                err.response?.data?.error ||
                `Błąd ${err.response?.status || ""}: Nie udało się zapisać pozycji.`;
            setError(msg);
        }
    }

    async function handleSell() {
        setTradeMessage("");
        setError(null);

        const sym = (tradeSymbol || "").trim().toUpperCase();
        if (!sym) return setError("Podaj symbol spółki.");

        const qty = parseInt(tradeQty, 10);
        if (!qty || qty <= 0) return setError("Podaj dodatnią ilość akcji do sprzedaży.");

        const holding = findHolding(sym);
        if (!holding) return setError("Nie masz takiej spółki w portfelu.");

        const oldQty = Number(holding.quantity) || 0;
        if (qty > oldQty) {
            return setError(`Nie możesz sprzedać ${qty} szt., bo masz tylko ${oldQty} szt. w portfelu.`);
        }

        const newQty = oldQty - qty;

        try {
            if (newQty === 0) {
                await axios.delete(`http://localhost:4000/api/portfolio/${encodeURIComponent(sym)}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            } else {
                await axios.post(
                    "http://localhost:4000/api/portfolio",
                    { symbol: sym, quantity: newQty, avg_price: holding.avg_price },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }

            setTradeMessage(`Sprzedano ${qty} szt. ${sym}. Po sprzedaży zostaje ${newQty} szt.`);
            setError(null);
            await fetchPortfolio();
        } catch (err) {
            console.error("Błąd sprzedaży (POST/DELETE /api/portfolio):", err);
            const msg =
                err.response?.data?.error ||
                `Błąd ${err.response?.status || ""}: Nie udało się zaktualizować portfela.`;
            setError(msg);
        }
    }


    async function handleClickPopular(meta, sourceHint) {
        const sym = meta.symbol.toUpperCase();
        const src = sourceHint || inferSourceFromSymbol(sym);

        setTradeSymbol(sym);
        setPriceSource(src);
        setPriceError(null);

        setTradeMessage(
            `${sym} – ${meta.name} (${meta.desc}). Źródło ceny: ${
                src === "finnhub" ? "Finnhub (USA/global)" : "Stooq (GPW/WIG20)"
            }.`
        );

        await handleFetchPrice(sym, src);
    }

    if (!user) {
        return (
            <div>
                <h2>📊 Mój portfel</h2>
                <p className="hint">Zaloguj się, aby zobaczyć i edytować swój portfel akcji powiązany z kontem.</p>
            </div>
        );
    }

    const metaForCurrent =
        tradeSymbol && tradeSymbol.trim() ? findMetaForSymbol(tradeSymbol.trim()) : null;

    const holdingForTrade = tradeSymbol ? findHolding(tradeSymbol.trim()) : null;
    const holdingAvg = holdingForTrade ? Number(holdingForTrade.avg_price) : null;
    const tradeDiff =
        Number.isFinite(tradePrice) && Number.isFinite(holdingAvg) && holdingAvg > 0
            ? Number(tradePrice) - holdingAvg
            : null;
    const tradeDiffPct = tradeDiff != null && holdingAvg > 0 ? (tradeDiff / holdingAvg) * 100 : null;

    const tradeDiffIcon =
        tradeDiff == null ? "" : Math.abs(tradeDiff) < 0.0000001 ? "■" : tradeDiff > 0 ? "▲" : "▼";
    const tradeDiffColor = tradeDiff == null ? "#e5e7eb" : tradeDiff >= 0 ? "#22c55e" : "#ef4444";

    return (
        <div>
            <h2>📊 Mój portfel</h2>
            <p className="hint">
                Portfel jest przechowywany w bazie danych i powiązany z Twoim kontem. Kliknij w wiersz, aby
                podstawić symbol do formularza, albo wybierz popularny ticker poniżej (automatycznie pobierzemy
                cenę z cache Finnhub/Stooq).
            </p>

            {loading && <p>Ładowanie portfela...</p>}
            {error && <div className="error">{error}</div>}

            {!loading && !error && portfolio.length === 0 && (
                <p className="hint">Nie masz jeszcze żadnych pozycji w portfelu. Użyj formularza poniżej.</p>
            )}

            {!loading && !error && portfolio.length > 0 && (
                <div className="portfolio" style={{ marginTop: "0.5rem" }}>
                    {pricesLoading && (
                        <p className="hint" style={{ marginTop: "0.25rem" }}>
                            Odświeżam ceny rynkowe dla portfela...
                        </p>
                    )}

                    <table>
                        <thead>
                        <tr>
                            <th>Spółka</th>
                            <th>Ilość</th>
                            <th>Średnia cena zakupu</th>
                            <th>Cena rynkowa</th>
                            <th>Wartość rynkowa (≈)</th>
                            <th>Niezreal. P/L (≈)</th>
                        </tr>
                        </thead>
                        <tbody>
                        {portfolio.map((row, idx) => {
                            const sym = row.symbol?.toUpperCase() || "";
                            const qty = Number.isFinite(Number(row.quantity)) ? Number(row.quantity) : 0;
                            const avg = Number.isFinite(Number(row.avg_price)) ? Number(row.avg_price) : null;

                            const mkt = sym ? prices[sym] : null;
                            const hasMkt = Number.isFinite(mkt);

                            const priceDiff = hasMkt && avg != null && avg > 0 ? Number(mkt) - avg : null;
                            const priceDiffPct = priceDiff != null && avg > 0 ? (priceDiff / avg) * 100 : null;

                            const diffIcon =
                                priceDiff == null
                                    ? ""
                                    : Math.abs(priceDiff) < 0.0000001
                                        ? "■"
                                        : priceDiff > 0
                                            ? "▲"
                                            : "▼";

                            const diffColor = priceDiff == null ? "#e5e7eb" : priceDiff >= 0 ? "#22c55e" : "#ef4444";

                            const marketValue = hasMkt ? Number(mkt) * qty : null;
                            const unrealized = priceDiff != null ? qty * priceDiff : null;

                            const unrealizedPct =
                                unrealized != null && avg != null && avg > 0 && qty > 0
                                    ? (unrealized / (qty * avg)) * 100
                                    : null;

                            return (
                                <tr
                                    key={row.id || `${sym}-${idx}`}
                                    style={{ cursor: "pointer" }}
                                    onClick={() => handleRowClick(row)}
                                >
                                    <td>{sym}</td>
                                    <td>{qty}</td>
                                    <td>{avg == null ? "-" : `${formatMoney(avg)} PLN`}</td>

                                    <td style={{ whiteSpace: "nowrap" }}>
                                        {hasMkt ? (
                                            <>
                                                <div>{formatMoney(mkt)} PLN</div>
                                                <div
                                                    style={{
                                                        fontSize: "0.85em",
                                                        marginTop: "0.15rem",
                                                        color: diffColor,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "0.35rem",
                                                    }}
                                                >
                                                    {priceDiff != null ? (
                                                        <>
                                                            <span style={{ lineHeight: 1 }}>{diffIcon}</span>
                                                            <span>
                                  {`${priceDiff >= 0 ? "+" : ""}${formatMoney(priceDiff)} PLN`}
                                                                {priceDiffPct != null
                                                                    ? ` (${priceDiffPct >= 0 ? "+" : ""}${priceDiffPct.toFixed(2)}%)`
                                                                    : ""}
                                </span>
                                                        </>
                                                    ) : (
                                                        "-"
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            "-"
                                        )}
                                    </td>

                                    <td>{marketValue != null ? `${formatMoney(marketValue)} PLN` : "-"}</td>

                                    <td
                                        style={{
                                            color: unrealized == null ? "#e5e7eb" : unrealized >= 0 ? "#22c55e" : "#ef4444",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {unrealized != null
                                            ? `${formatMoney(unrealized)} PLN${
                                                unrealizedPct != null
                                                    ? ` (${unrealizedPct >= 0 ? "+" : ""}${unrealizedPct.toFixed(2)}%)`
                                                    : ""
                                            }`
                                            : "-"}
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="game-block" style={{ marginTop: "0.9rem" }}>
                <h3>Nowa transakcja na portfelu</h3>

                <div className="game-order-row">
                    <label>
                        Symbol spółki
                        <input
                            type="text"
                            value={tradeSymbol}
                            onChange={(e) => {
                                setTradeSymbol(e.target.value.toUpperCase());
                                setTradeMessage("");
                                setPriceError(null);
                            }}
                            placeholder="np. AAPL, CDR, PZU"
                        />
                        <span className="hint-inline">Możesz kliknąć w wiersz w tabeli powyżej.</span>
                    </label>
                </div>

                <div className="portfolio-ticker-row">
                    <div className="portfolio-ticker-col">
                        <div className="portfolio-ticker-title">Popularne (USA / Finnhub):</div>
                        <div className="portfolio-ticker-list">
                            {POPULAR_FINNHUB.map((meta) => (
                                <button
                                    key={meta.symbol}
                                    type="button"
                                    className="portfolio-ticker-chip"
                                    onClick={() => handleClickPopular(meta, "finnhub")}
                                >
                                    {meta.symbol}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="portfolio-ticker-col">
                        <div className="portfolio-ticker-title">Popularne (GPW / Stooq):</div>
                        <div className="portfolio-ticker-list">
                            {POPULAR_STOOQ.map((meta) => (
                                <button
                                    key={meta.symbol}
                                    type="button"
                                    className="portfolio-ticker-chip"
                                    onClick={() => handleClickPopular(meta, "stooq")}
                                >
                                    {meta.symbol.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {metaForCurrent && (
                    <p className="hint-inline" style={{ marginTop: "0.3rem" }}>
                        {metaForCurrent.symbol.toUpperCase()} – <strong>{metaForCurrent.name}</strong> ({metaForCurrent.desc}).
                    </p>
                )}

                <div className="game-order-row" style={{ marginTop: "0.5rem" }}>
                    <button type="button" className="auth-submit-btn" onClick={() => handleFetchPrice()} disabled={priceLoading}>
                        {priceLoading ? "Pobieranie ceny..." : "Pobierz aktualną cenę"}
                    </button>

                    {tradePrice != null && !priceLoading && (
                        <div className="hint" style={{ marginTop: "0.25rem" }}>
                            <div>
                                Aktualna cena: <strong>{formatMoney(tradePrice)} PLN</strong> (źródło:{" "}
                                {priceSource === "stooq" ? "Stooq (GPW/WIG20)" : "Finnhub"}).
                            </div>

                            {holdingForTrade && Number.isFinite(holdingAvg) && holdingAvg > 0 && tradeDiff != null && (
                                <div
                                    style={{
                                        marginTop: "0.15rem",
                                        color: tradeDiffColor,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.35rem",
                                    }}
                                >
                                    <span style={{ lineHeight: 1 }}>{tradeDiffIcon}</span>
                                    <span>
                    Różnica vs zakup: {`${tradeDiff >= 0 ? "+" : ""}${formatMoney(tradeDiff)} PLN`}
                                        {tradeDiffPct != null ? ` (${tradeDiffPct >= 0 ? "+" : ""}${tradeDiffPct.toFixed(2)}%)` : ""}
                  </span>
                                </div>
                            )}
                        </div>
                    )}

                    {priceError && (
                        <div className="error" style={{ marginTop: "0.3rem" }}>
                            {priceError}
                        </div>
                    )}
                </div>

                <div className="game-order-row" style={{ marginTop: "0.4rem" }}>
                    <label>
                        Ilość akcji
                        <input
                            type="number"
                            min="1"
                            step="1"
                            value={tradeQty}
                            onChange={(e) => {
                                setTradeQty(e.target.value);
                                setTradeMessage("");
                            }}
                        />
                    </label>
                </div>

                <div className="game-order-actions" style={{ marginTop: "0.4rem" }}>
                    <button type="button" onClick={handleBuy}>
                        Kup do portfela
                    </button>
                    <button type="button" onClick={handleSell}>
                        Sprzedaj z portfela
                    </button>
                </div>

                {tradeMessage && (
                    <div className="auth-info" style={{ marginTop: "0.4rem" }}>
                        {tradeMessage}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Portfolio;
