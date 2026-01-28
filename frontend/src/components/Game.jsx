
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "../AuthContext";
import GameQuickSummary from "./GameQuickSummary";

const STOOQ_COMPANIES = [
    { symbol: "ale", label: "Allegro.eu – ALE" },
    { symbol: "alr", label: "Alior Bank – ALR" },
    { symbol: "acp", label: "Asseco Poland – ACP" },
    { symbol: "lwb", label: "Lubelski Węgiel Bogdanka – LWB" },
    { symbol: "bdx", label: "Budimex – BDX" },
    { symbol: "ccc", label: "CCC – CCC" },
    { symbol: "cdr", label: "CD Projekt – CDR" },
    { symbol: "cps", label: "Cyfrowy Polsat (Polsat Plus) – CPS" },
    { symbol: "dnp", label: "Dino Polska – DNP" },
    { symbol: "ena", label: "Enea – ENA" },
    { symbol: "eur", label: "Eurocash – EUR" },
    { symbol: "att", label: "Grupa Azoty – ATT" },
    { symbol: "kty", label: "Grupa Kęty – KTY" },
    { symbol: "jsw", label: "Jastrzębska Spółka Węglowa – JSW" },
    { symbol: "kgh", label: "KGHM Polska Miedź – KGH" },
    { symbol: "kru", label: "Kruk – KRU" },
    { symbol: "lpp", label: "LPP – LPP" },
    { symbol: "mbk", label: "mBank – MBK" },
    { symbol: "mil", label: "Bank Millennium – MIL" },
    { symbol: "opl", label: "Orange Polska – OPL" },
    { symbol: "peo", label: "Bank Pekao – PEO" },
    { symbol: "pco", label: "Pepco Group – PCO" },
    { symbol: "pge", label: "PGE Polska Grupa Energetyczna – PGE" },
    { symbol: "pkn", label: "PKN Orlen – PKN" },
    { symbol: "pko", label: "PKO Bank Polski – PKO" },
    { symbol: "pzu", label: "PZU – PZU" },
    { symbol: "spl", label: "Santander Bank Polska – SPL" },
    { symbol: "tpe", label: "Tauron Polska Energia – TPE" },
    { symbol: "ten", label: "Ten Square Games – TEN" },
    { symbol: "xtb", label: "XTB – XTB" },
];

const DIFFICULTIES = [
    {
        id: "easy",
        label: "Łatwy – start 100 000, cel +5%",
        startCapital: 100000,
        targetMultiplier: 1.05,
    },
    {
        id: "normal",
        label: "Normalny – start 50 000, cel +20%",
        startCapital: 50000,
        targetMultiplier: 1.2,
    },
    {
        id: "hard",
        label: "Trudny – start 10 000, cel +100%",
        startCapital: 10000,
        targetMultiplier: 2.0,
    },
    {
        id: "custom",
        label: "Własne wartości – ustaw poniżej",
        startCapital: 10000,
        targetMultiplier: 1.5,
    },
];

const STORAGE_KEY = "stock-sim-game-v1";
const HISTORY_KEY = "stock-sim-game-history-v1";

function formatMoney(x) {
    if (x == null || Number.isNaN(x)) return "-";
    return Number(x).toLocaleString("pl-PL", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function rollRandomEvent(basePrice, shouldRoll, eventBias = "neutral") {
    function pickDirection(bias) {
        if (bias === "up") return true;
        if (bias === "down") return false;
        return Math.random() < 0.5;
    }

    if (!shouldRoll) {
        return {
            price: basePrice,
            event: {
                type: "none",
                sentiment: "neutral",
                label: "Spokojny dzień dla tej spółki",
                description:
                    "W tym dniu ta spółka nie została wylosowana do zdarzenia rynkowego.",
                impactPct: 0,
                rngValue: null,
            },
        };
    }

    const rngMain = Math.random();

    if (rngMain < 0.8) {
        return {
            price: basePrice,
            event: {
                type: "none",
                sentiment: "neutral",
                label: "Brak istotnych informacji",
                description:
                    "Rynek zachowuje się spokojnie – brak istotnych zdarzeń wpływających na kurs.",
                impactPct: 0,
                rngValue: Math.round(rngMain * 1000),
            },
        };
    }

    if (rngMain < 0.95) {
        const smallTier = Math.random();
        let magnitude;
        let type;
        let baseLabel;
        let baseDescription;

        if (smallTier < 0.65) {
            magnitude = 0.01 + Math.random() * 0.01;
            type = "soft_rumor";
            baseLabel = "Soft plotka / delikatny szum informacyjny";
            baseDescription =
                "Pojawiają się drobne plotki lub szum informacyjny – lekka zmiana kursu.";
        } else {
            magnitude = 0.02 + Math.random() * 0.01;
            type = "strong_rumor";
            baseLabel = "Mocniejsza plotka / newsik";
            baseDescription =
                "Pojawia się konkretniejsza informacja lub news – kurs rusza się zauważalnie.";
        }

        const isUp = pickDirection(eventBias);
        const signedMag = isUp ? magnitude : -magnitude;
        const newPrice = basePrice * (1 + signedMag);
        const impactPct = signedMag * 100;

        const sentiment = isUp ? "positive" : "negative";
        const directionText = isUp ? "pozytywnie" : "negatywnie";

        return {
            price: newPrice,
            event: {
                type,
                sentiment,
                label: baseLabel,
                description: `${baseDescription} Sentyment działa ${directionText} na notowania.`,
                impactPct,
                rngValue: Math.round(rngMain * 1000),
            },
        };
    }

    const bigTier = Math.random();
    let magnitude;
    let bigType;
    let bigLabel;
    let bigDescription;

    if (bigTier < 0.9) {
        magnitude = 0.07 + Math.random() * 0.05;
        bigType = "big_event";
        bigLabel = "Bardzo duży event rynkowy";
        bigDescription =
            "Silne informacje, zmiana otoczenia makro lub duże zaskoczenie wynikami – bardzo mocny ruch.";
    } else {
        magnitude = 0.12 + Math.random() * 0.08;
        bigType = "ultra_event";
        bigLabel = "ULTRA duży event rynkowy";
        bigDescription =
            "Sytuacja ekstremalna – skrajna panika lub euforia. Świeca, którą się długo pamięta.";
    }

    const isUp = pickDirection(eventBias);
    const signedMag = isUp ? magnitude : -magnitude;
    const newPrice = basePrice * (1 + signedMag);
    const impactPct = signedMag * 100;

    const sentiment = isUp ? "extreme_positive" : "extreme_negative";
    const directionText = isUp ? "w górę" : "w dół";

    return {
        price: newPrice,
        event: {
            type: bigType,
            sentiment,
            label: bigLabel,
            description: `${bigDescription} Kurs przesuwa się jedną świecą ${directionText} o kilkanaście procent.`,
            impactPct,
            rngValue: Math.round(rngMain * 1000),
        },
    };
}

function computeTotalValue(cash, positions, prices) {
    let total = cash;
    for (const [symbol, qty] of Object.entries(positions)) {
        const p = prices[symbol];
        if (!p || !Number.isFinite(p)) continue;
        total += qty * p;
    }
    return total;
}

function buildSymbolStatsMap(trades) {
    const map = {};
    const sorted = [...trades].sort((a, b) => a.id - b.id);

    for (const t of sorted) {
        const sym = t.symbol;
        if (!map[sym]) {
            map[sym] = {
                position: 0,
                costBasis: 0,
                realizedPnl: 0,
            };
        }
        const entry = map[sym];

        if (t.side === "BUY") {
            entry.position += t.qty;
            entry.costBasis += t.qty * t.price;
        } else if (t.side === "SELL") {
            const posBefore = entry.position;
            if (posBefore <= 0) continue;

            const avgPrice = posBefore > 0 ? entry.costBasis / posBefore : t.price;

            const sharesToClose = Math.min(t.qty, posBefore);
            const pnlOnThis = sharesToClose * (t.price - avgPrice);

            entry.realizedPnl += pnlOnThis;
            entry.costBasis -= avgPrice * sharesToClose;
            entry.position -= sharesToClose;
        }
    }

    const out = {};
    for (const [sym, e] of Object.entries(map)) {
        out[sym] = {
            position: e.position,
            avgBuyPrice: e.position > 0 ? e.costBasis / e.position : null,
            realizedPnl: e.realizedPnl,
        };
    }
    return out;
}

function appendGameToLocalHistory(entry) {
    try {
        if (typeof window === "undefined") return;

        const raw = window.localStorage.getItem(HISTORY_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        const safe = Array.isArray(arr) ? arr : [];

        safe.push(entry);

        const trimmed = safe.slice(-50);
        window.localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    } catch (e) {
        console.error("[GAME HISTORY] local save error:", e);
    }
}

function Game() {
    const { user, token: ctxToken } = useAuth();
    const token = ctxToken || user?.token || null;

    const [selectedSymbol, setSelectedSymbol] = useState(STOOQ_COMPANIES[0].symbol);
    const [difficultyId, setDifficultyId] = useState(DIFFICULTIES[1].id);

    const [simMode, setSimMode] = useState("neutral");

    const [prices, setPrices] = useState({});
    const [loadingPrice, setLoadingPrice] = useState(false);
    const [error, setError] = useState(null);

    const [cash, setCash] = useState(0);
    const [positions, setPositions] = useState({});
    const [target, setTarget] = useState(0);
    const [step, setStep] = useState(0);

    const [gameDay, setGameDay] = useState(1);
    const [orderQty, setOrderQty] = useState("");
    const [status, setStatus] = useState("idle");
    const [message, setMessage] = useState("");

    const [initialCapital, setInitialCapital] = useState(null);
    const [trades, setTrades] = useState([]);

    const [customStart, setCustomStart] = useState("");
    const [customTarget, setCustomTarget] = useState("");

    const [lastEvent, setLastEvent] = useState(null);
    const [eventHistory, setEventHistory] = useState([]);
    const [popupEvent, setPopupEvent] = useState(null);

    const [panicSellCount, setPanicSellCount] = useState(0);

    const [dayLog, setDayLog] = useState([]);

    const [priceHistory, setPriceHistory] = useState({});

    const [endSummary, setEndSummary] = useState(null);
    const [gameSaved, setGameSaved] = useState(false);
    const [abandonConfirm, setAbandonConfirm] = useState(null);

    const [quickOpen, setQuickOpen] = useState(false);

    const [hasGameStarted, setHasGameStarted] = useState(false);

    const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);

    const company = useMemo(
        () => STOOQ_COMPANIES.find((c) => c.symbol === selectedSymbol) || STOOQ_COMPANIES[0],
        [selectedSymbol]
    );

    const difficulty = useMemo(
        () => DIFFICULTIES.find((d) => d.id === difficultyId) || DIFFICULTIES[0],
        [difficultyId]
    );

    const price = prices[selectedSymbol] ?? null;
    const effectiveInitialCapital =
        initialCapital != null ? initialCapital : difficultyId !== "custom" ? difficulty.startCapital : null;

    const totalValue = computeTotalValue(cash, positions, prices);

    const pnl =
        effectiveInitialCapital != null && totalValue != null ? totalValue - effectiveInitialCapital : null;

    const pnlPct =
        pnl != null && effectiveInitialCapital > 0 ? (pnl / effectiveInitialCapital) * 100 : null;

    const sharesForSelected = positions[selectedSymbol] ?? 0;
    const distinctHoldings = Object.values(positions).filter((q) => q > 0).length;

    const symbolStatsMap = useMemo(() => buildSymbolStatsMap(trades), [trades]);
    const selectedStats = symbolStatsMap[selectedSymbol] || null;

    const selectedUnrealizedPnl = useMemo(() => {
        if (
            !selectedStats ||
            !price ||
            !selectedStats.avgBuyPrice ||
            (selectedStats.position ?? sharesForSelected) <= 0
        ) {
            return null;
        }
        const pos =
            selectedStats.position != null && selectedStats.position > 0 ? selectedStats.position : sharesForSelected;
        return pos * (price - selectedStats.avgBuyPrice);
    }, [selectedStats, price, sharesForSelected]);

    const selectedUnrealizedPct =
        selectedUnrealizedPnl != null &&
        selectedStats &&
        selectedStats.avgBuyPrice &&
        (selectedStats.position ?? sharesForSelected) > 0
            ? (selectedUnrealizedPnl /
                ((selectedStats.position || sharesForSelected) * selectedStats.avgBuyPrice)) *
            100
            : null;

    function buildLocalHistoryEntry(summary) {
        return {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            userId: user?.id ?? null,
            createdAt: new Date().toISOString(),

            status: summary.status,
            days: summary.days,

            initial_capital: initialCapital,
            final_value: summary.total,
            pnl: summary.pnl,
            pnl_pct: summary.pnlPct,

            difficulty_id: difficultyId,
            sim_mode: simMode,

            trades_count: summary.tradesCount,
            panic_sell_count: panicSellCount,

            trades,
            eventHistory,
            dayLog,
            priceHistory,
        };
    }

    async function saveGameResult(summary) {
        try {
            console.log("[GAME HISTORY] Wysyłam do backendu:", summary);

            await axios.post(
                "http://localhost:4000/api/game/history",
                {
                    status: summary.status,
                    days: summary.days,
                    total: summary.total,
                    pnl: summary.pnl,
                    pnlPct: summary.pnlPct,
                    tradesCount: summary.tradesCount,
                    panicSellCount,
                    difficultyId,
                    simMode,
                    initialCapital,
                    target,
                    trades,
                    eventHistory,
                    dayLog,
                    priceHistory,
                    userId: user?.id ?? null,
                },
                token
                    ? {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                    : undefined
            );

            console.log("[GAME HISTORY] Zapisano sesję w bazie.");
        } catch (err) {
            console.error(
                "[GAME HISTORY] Błąd przy zapisie historii gry:",
                err.response?.status,
                err.response?.data || err.message
            );
        }
    }

    useEffect(() => {
        if (typeof window === "undefined") return;

        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                if (data) {
                    if (data.selectedSymbol) setSelectedSymbol(data.selectedSymbol);
                    if (data.difficultyId) setDifficultyId(data.difficultyId);
                    if (data.simMode) setSimMode(data.simMode);

                    setPrices(data.prices || {});
                    setCash(data.cash ?? 0);
                    setPositions(data.positions || {});
                    setTarget(data.target ?? 0);
                    setStep(data.step ?? 0);
                    setGameDay(data.gameDay ?? 1);
                    setOrderQty(data.orderQty ?? "");
                    setStatus(data.status ?? "idle");
                    setMessage(
                        data.message ||
                        "Wczytano zapis gry – możesz kontynuować rozgrywkę od ostatniego stanu."
                    );
                    setInitialCapital(data.initialCapital != null ? data.initialCapital : null);
                    setTrades(data.trades || []);
                    setCustomStart(data.customStart ?? "");
                    setCustomTarget(data.customTarget ?? "");
                    setLastEvent(data.lastEvent ?? null);
                    setEventHistory(data.eventHistory || []);
                    setPanicSellCount(data.panicSellCount ?? 0);
                    setDayLog(data.dayLog || []);
                    setPriceHistory(data.priceHistory || {});
                    setHasGameStarted(data.hasGameStarted ?? false);
                    setEndSummary(data.endSummary ?? null);
                    setGameSaved(data.gameSaved ?? false);

                    const hasPrices = data.prices && Object.keys(data.prices).length > 0;
                    if (!hasPrices) {
                        fetchInitialPrices();
                    }

                    console.log("[GAME] Przywrócono stan gry z localStorage.");
                }
            } else {
                resetGame();
                fetchInitialPrices();
            }
        } catch (err) {
            console.error("[GAME] Problem z odczytem zapisu gry – startuję nową sesję:", err);
            resetGame();
            fetchInitialPrices();
        } finally {
            setHasLoadedFromStorage(true);
        }

    }, []);

    useEffect(() => {
        if (!hasLoadedFromStorage) return;
        if (typeof window === "undefined") return;

        const stateToSave = {
            selectedSymbol,
            difficultyId,
            simMode,
            prices,
            cash,
            positions,
            target,
            step,
            gameDay,
            orderQty,
            status,
            message,
            initialCapital,
            trades,
            customStart,
            customTarget,
            lastEvent,
            eventHistory,
            panicSellCount,
            dayLog,
            priceHistory,
            hasGameStarted,
            endSummary,
            gameSaved,
        };

        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (err) {
            console.error("[GAME] Nie udało się zapisać stanu gry:", err);
        }
    }, [
        hasLoadedFromStorage,
        selectedSymbol,
        difficultyId,
        simMode,
        prices,
        cash,
        positions,
        target,
        step,
        gameDay,
        orderQty,
        status,
        message,
        initialCapital,
        trades,
        customStart,
        customTarget,
        lastEvent,
        eventHistory,
        panicSellCount,
        dayLog,
        priceHistory,
        hasGameStarted,
        endSummary,
        gameSaved,
    ]);

    function buildSummary(statusOverride) {
        const effInit = initialCapital ?? 0;
        const totalNow = computeTotalValue(cash, positions, prices);
        const pnlNow = effInit > 0 ? totalNow - effInit : null;
        const pnlPctNow = pnlNow != null && effInit > 0 ? (pnlNow / effInit) * 100 : null;

        return {
            status: statusOverride,
            days: gameDay,
            total: totalNow,
            pnl: pnlNow,
            pnlPct: pnlPctNow,
            tradesCount: trades.length,
            panicSellCount,
        };
    }

    useEffect(() => {
        const isFinished = status === "won" || status === "lost";

        if (isFinished && !gameSaved) {
            const summary = buildSummary(status);

            setEndSummary(summary);
            setPopupEvent(null);

            saveGameResult(summary);

            setGameSaved(true);
        } else if (!isFinished) {
            setEndSummary(null);
        }

    }, [status, gameSaved]);

    function resetGame(nextDifficultyId) {
        const effectiveDifficultyId = nextDifficultyId || difficultyId;

        const diff =
            DIFFICULTIES.find((d) => d.id === effectiveDifficultyId) || DIFFICULTIES[0];

        let start = diff.startCapital;
        let tgt = diff.startCapital * diff.targetMultiplier;

        if (effectiveDifficultyId === "custom") {
            const startNum = parseFloat(customStart);
            const targetNum = parseFloat(customTarget);

            if (
                !startNum ||
                !targetNum ||
                Number.isNaN(startNum) ||
                Number.isNaN(targetNum) ||
                startNum <= 0 ||
                targetNum <= startNum
            ) {
                setCash(0);
                setPositions({});
                setTarget(0);
                setInitialCapital(null);
                setTrades([]);
                setStep(0);
                setGameDay(1);
                setStatus("idle");
                setOrderQty("");
                setError(null);
                setPrices({});
                setMessage(
                    "Ustaw poprawnie własny kapitał początkowy i docelowy (cel musi być większy niż start), a następnie kliknij „Start z własnymi parametrami”."
                );
                setLastEvent(null);
                setEventHistory([]);
                setPopupEvent(null);
                setPanicSellCount(0);
                setDayLog([]);
                setPriceHistory({});
                setEndSummary(null);
                setSimMode("neutral");
                setGameSaved(false);
                setHasGameStarted(false);
                return;
            }

            start = startNum;
            tgt = targetNum;
        }

        setCash(start);
        setPositions({});
        setTarget(tgt);
        setInitialCapital(start);
        setTrades([]);
        setStep(0);
        setGameDay(1);
        setStatus("idle");
        setOrderQty("");
        setError(null);
        setPrices({});
        setMessage(
            effectiveDifficultyId === "custom"
                ? "Parametry gry zaktualizowane – pobieram ceny ze Stooq dla wszystkich spółek."
                : "Gra zresetowana – pobieram ceny ze Stooq."
        );
        setLastEvent(null);
        setEventHistory([]);
        setPopupEvent(null);
        setPanicSellCount(0);
        setDayLog([]);
        setPriceHistory({});
        setEndSummary(null);
        setSimMode("neutral");
        setGameSaved(false);
        setHasGameStarted(false);
    }

    async function fetchInitialPrices() {
        setLoadingPrice(true);
        setError(null);
        try {
            const requests = STOOQ_COMPANIES.map((c) =>
                axios
                    .get("http://localhost:4000/api/stooq/history", {
                        params: { symbol: c.symbol },
                    })
                    .then((res) => {
                        const rows = res.data || [];
                        const closes = rows
                            .map((r) => parseFloat(r.Close))
                            .filter((v) => Number.isFinite(v) && v > 0);
                        if (!closes.length) return [c.symbol, null];
                        return [c.symbol, closes[closes.length - 1]];
                    })
                    .catch((err) => {
                        console.error("Błąd przy pobieraniu", c.symbol, err);
                        return [c.symbol, null];
                    })
            );

            const results = await Promise.all(requests);
            const priceMap = {};
            for (const [symbol, p] of results) {
                if (p != null) priceMap[symbol] = p;
            }

            setPrices(priceMap);
            setGameDay(1);

            setPriceHistory(() => {
                const ph = {};
                for (const [sym, p] of Object.entries(priceMap)) {
                    const up = String(sym).toUpperCase();
                    const pn = Number(p);
                    if (Number.isFinite(pn) && pn > 0) {
                        ph[up] = [{ day: 1, price: pn }];
                    }
                }
                return ph;
            });

            if (Object.keys(priceMap).length === 0) {
                setError("Nie udało się pobrać cen ze Stooq dla żadnej spółki.");
                setStatus("idle");
            } else {
                setStatus("idle");
                if (difficultyId === "custom") {
                    setMessage(
                        "Ceny dla spółek załadowane. Ustaw własny kapitał i cel, a potem kliknij „Start z własnymi parametrami”."
                    );
                } else {
                    setMessage(
                        "Ceny dla spółek zostały pobrane. Ustaw parametry i kliknij „Start gry”, aby rozpocząć symulację."
                    );
                }
            }
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.error || "Nie udało się pobrać danych z backendu Stooq";
            setError(msg);
            setStatus("idle");
        } finally {
            setLoadingPrice(false);
        }
    }

    function ensurePlaying() {
        if (status === "won" || status === "lost") {
            setMessage("Gra zakończona – zmień spółkę, poziom trudności lub parametry, żeby zacząć od nowa.");
            return false;
        }
        if (status === "idle") {
            setMessage("Gra nie wystartowała – poczekaj na ceny ze Stooq (jeśli się jeszcze ładują) i kliknij „Start gry”.");
            return false;
        }
        return true;
    }

    function checkWinLose(nextCash, nextPositions, maybePrices) {
        const priceMap = maybePrices || prices;
        const total = computeTotalValue(nextCash, nextPositions, priceMap);

        if (target > 0 && total >= target) {
            setStatus("won");
            setMessage("🔥 Brawo! Osiągnąłeś wyznaczony cel kapitałowy dla całego portfela.");
        } else {
            const sumShares = Object.values(nextPositions).reduce((acc, q) => acc + (q || 0), 0);
            if (total < 1 && sumShares === 0) {
                setStatus("lost");
                setMessage("💀 Kapitał wyzerowany i brak jakichkolwiek akcji w portfelu – gra przegrana.");
            }
        }
    }

    function handleBuy() {
        if (!ensurePlaying()) return;

        const qty = parseInt(orderQty, 10);
        if (!qty || qty <= 0) {
            setMessage("Podaj dodatnią liczbę sztuk do kupna.");
            return;
        }
        const priceNow = prices[selectedSymbol];
        if (priceNow == null) {
            setMessage("Brak ceny dla wybranej spółki – poczekaj na dane ze Stooq lub wybierz inną.");
            return;
        }

        const cost = qty * priceNow;
        if (cost > cash) {
            setMessage("Za mało gotówki na takie zlecenie.");
            return;
        }

        const nextCash = cash - cost;
        const currentPos = positions[selectedSymbol] || 0;
        const nextPositions = {
            ...positions,
            [selectedSymbol]: currentPos + qty,
        };

        setCash(nextCash);
        setPositions(nextPositions);
        setStep((s) => s + 1);
        setMessage(`Kupiono ${qty} szt. ${selectedSymbol.toUpperCase()} po ${formatMoney(priceNow)}.`);

        setTrades((prev) => [
            ...prev,
            {
                id: prev.length + 1,
                symbol: selectedSymbol,
                side: "BUY",
                qty,
                price: priceNow,
                value: cost,
                cashAfter: nextCash,
                positionsAfter: nextPositions,
                day: gameDay,
            },
        ]);

        checkWinLose(nextCash, nextPositions);
    }

    function handleSell() {
        if (!ensurePlaying()) return;

        const qty = parseInt(orderQty, 10);
        if (!qty || qty <= 0) {
            setMessage("Podaj dodatnią liczbę sztuk do sprzedaży.");
            return;
        }

        const currentPos = positions[selectedSymbol] || 0;
        if (qty > currentPos) {
            setMessage("Nie masz tylu akcji tej spółki na sprzedaż.");
            return;
        }
        const priceNow = prices[selectedSymbol];
        if (priceNow == null) {
            setMessage("Brak ceny dla wybranej spółki – poczekaj na dane ze Stooq lub wybierz inną.");
            return;
        }

        const revenue = qty * priceNow;
        const nextCash = cash + revenue;
        const nextPositions = {
            ...positions,
            [selectedSymbol]: currentPos - qty,
        };

        setCash(nextCash);
        setPositions(nextPositions);
        setStep((s) => s + 1);
        setMessage(`Sprzedano ${qty} szt. ${selectedSymbol.toUpperCase()} po ${formatMoney(priceNow)}.`);

        setTrades((prev) => [
            ...prev,
            {
                id: prev.length + 1,
                symbol: selectedSymbol,
                side: "SELL",
                qty,
                price: priceNow,
                value: revenue,
                cashAfter: nextCash,
                positionsAfter: nextPositions,
                day: gameDay,
            },
        ]);

        checkWinLose(nextCash, nextPositions);
    }

    function handleSellAllSelected(symbolOverride) {
        if (!ensurePlaying()) return;

        const symbol = symbolOverride || selectedSymbol;

        const currentPos = positions[symbol] || 0;
        if (currentPos <= 0) {
            setMessage(`Nie masz żadnych akcji ${symbol.toUpperCase()} do sprzedaży.`);
            return;
        }

        const currentPrice = prices[symbol];
        if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
            setMessage("Brak aktualnej ceny dla tej spółki – nie można sprzedać wszystkich akcji.");
            return;
        }

        const revenue = currentPos * currentPrice;
        const nextCash = cash + revenue;
        const nextPositions = {
            ...positions,
            [symbol]: 0,
        };

        setCash(nextCash);
        setPositions(nextPositions);
        setStep((s) => s + 1);
        setMessage(
            `Sprzedano WSZYSTKIE (${currentPos} szt.) ${symbol.toUpperCase()} po ${formatMoney(currentPrice)}.`
        );

        setTrades((prev) => [
            ...prev,
            {
                id: prev.length + 1,
                symbol,
                side: "SELL",
                qty: currentPos,
                price: currentPrice,
                value: revenue,
                cashAfter: nextCash,
                positionsAfter: nextPositions,
                day: gameDay,
            },
        ]);

        checkWinLose(nextCash, nextPositions);
    }

    function handleSellAllPortfolio() {
        if (!ensurePlaying()) return;

        const holdings = Object.entries(positions).filter(([, qty]) => (qty || 0) > 0);

        if (holdings.length === 0) {
            setMessage("Nie masz żadnych akcji w portfelu do sprzedaży.");
            return;
        }

        const confirmed = window.confirm(
            "Na pewno chcesz sprzedać wszystkie posiadane akcje w portfelu po bieżących cenach rynkowych?"
        );
        if (!confirmed) {
            setMessage("Anulowano sprzedaż całego portfela.");
            return;
        }

        let workingCash = cash;
        const nextPositions = { ...positions };
        const tradesToAppend = [];

        for (const [symbol, qty] of holdings) {
            const qNum = qty || 0;
            const p = prices[symbol];
            if (!Number.isFinite(p) || p <= 0 || qNum <= 0) continue;

            const value = qNum * p;
            workingCash += value;
            nextPositions[symbol] = 0;

            tradesToAppend.push({
                symbol,
                side: "SELL",
                qty: qNum,
                price: p,
                value,
                cashAfter: workingCash,
                positionsAfter: { ...nextPositions },
                day: gameDay,
            });
        }

        if (tradesToAppend.length === 0) {
            setMessage("Brak aktualnych cen dla spółek w portfelu – nie udało się sprzedać żadnych pozycji.");
            return;
        }

        setCash(workingCash);
        setPositions(nextPositions);
        setStep((s) => s + 1);
        setPanicSellCount((c) => c + 1);
        setMessage("Sprzedano wszystkie dostępne akcje w portfelu po bieżących cenach rynkowych.");

        setTrades((prev) => {
            let baseId = prev.length;
            const withIds = tradesToAppend.map((t, idx) => ({
                ...t,
                id: baseId + idx + 1,
            }));
            return [...prev, ...withIds];
        });

        checkWinLose(workingCash, nextPositions);
    }

    async function handleNextDay() {
        if (!ensurePlaying()) return;

        const symbols = Object.keys(prices);
        if (!symbols.length) {
            setMessage("Brak cen – poczekaj na pobranie danych ze Stooq.");
            return;
        }

        const prevPrices = { ...prices };
        const newPrices = {};
        const eventsBySymbol = {};
        let anyError = false;

        const newDay = gameDay + 1;

        const modeForBackend =
            simMode.startsWith("positive") ? "positive" : simMode.startsWith("negative") ? "negative" : "neutral";

        const eventBias =
            simMode === "positive_events" ? "up" : simMode === "negative_events" ? "down" : "neutral";

        const dayRoll = Math.random();
        let selectedSymbols = [];

        if (dayRoll >= 0.88) {
            const cappedMax = Math.min(4, symbols.length);
            const numEventSymbols = Math.floor(Math.random() * cappedMax) + 1;

            const indices = [...Array(symbols.length).keys()];
            indices.sort(() => Math.random() - 0.5);
            selectedSymbols = indices.slice(0, numEventSymbols).map((i) => symbols[i]);
        }

        const selectedSymbolsSet = new Set(selectedSymbols);

        console.log(
            "[EVENT RNG DEBUG] Dzień",
            newDay,
            "| dayRoll=",
            dayRoll.toFixed(3),
            "| dzień eventowy:",
            dayRoll >= 0.88,
            "| spółki z eventami:",
            selectedSymbols
        );

        const debugEvents = [];

        for (const symbol of symbols) {
            const currentPrice = prevPrices[symbol];
            if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
                newPrices[symbol] = currentPrice;
                continue;
            }

            try {
                const res = await axios.post("http://localhost:4000/api/game/next-price-gjr", {
                    symbol,
                    currentPrice,
                    mode: modeForBackend,
                });

                const nextRaw = res.data?.nextPrice;
                const simPrice = Number(nextRaw);

                if (!Number.isFinite(simPrice) || simPrice <= 0) {
                    newPrices[symbol] = currentPrice;
                    continue;
                }

                const shouldRoll = selectedSymbolsSet.has(symbol);
                const { price: adjPrice, event } = rollRandomEvent(simPrice, shouldRoll, eventBias);

                newPrices[symbol] = adjPrice;
                eventsBySymbol[symbol] = event;

                if (event && event.rngValue != null && shouldRoll) {
                    debugEvents.push({
                        symbol,
                        rngValue: event.rngValue,
                        impactPct: event.impactPct,
                        type: event.type,
                    });
                }

                if (event && event.type !== "none") {
                    setEventHistory((prev) => [
                        ...prev,
                        {
                            day: newDay,
                            symbol,
                            label: event.label,
                            description: event.description,
                            impactPct: event.impactPct,
                            priceBefore: simPrice,
                            priceAfter: adjPrice,
                        },
                    ]);
                }
            } catch (err) {
                console.error("Błąd GJR dla", symbol, err);
                anyError = true;
                newPrices[symbol] = currentPrice;
            }
        }

        if (debugEvents.length > 0) {
            console.log("[EVENT RNG DEBUG] Wyniki losowania dla dnia", newDay);
            debugEvents.forEach((e) => {
                console.log(
                    `  ${e.symbol.toUpperCase()}: rng=${e.rngValue.toFixed(0)} | impact=${e.impactPct.toFixed(
                        2
                    )}% | type=${e.type}`
                );
            });
        }

        setPrices(newPrices);
        setGameDay(newDay);
        setStep((s) => s + 1);

        setPriceHistory((prev) => {
            const next = { ...(prev || {}) };
            for (const [sym, p] of Object.entries(newPrices || {})) {
                const pu = String(sym).toUpperCase();
                const priceNum = Number(p);
                if (!Number.isFinite(priceNum) || priceNum <= 0) continue;

                const arr = Array.isArray(next[pu]) ? [...next[pu]] : [];
                const last = arr.length ? arr[arr.length - 1] : null;

                if (last && last.day === newDay) {
                    arr[arr.length - 1] = { day: newDay, price: priceNum };
                } else {
                    arr.push({ day: newDay, price: priceNum });
                }
                next[pu] = arr;
            }
            return next;
        });

        const eventForSelected = eventsBySymbol[selectedSymbol];

        const heldSymbols = Object.entries(positions)
            .filter(([, qty]) => qty > 0)
            .map(([symbol]) => symbol);

        const holdsSelected = heldSymbols.includes(selectedSymbol);

        let portfolioEvent = null;
        for (const symbol of heldSymbols) {
            const ev = eventsBySymbol[symbol];
            if (ev && ev.type !== "none") {
                portfolioEvent = { symbol, ...ev };
                break;
            }
        }

        let eventToShow = null;
        if (eventForSelected && eventForSelected.type !== "none" && holdsSelected) {
            eventToShow = { symbol: selectedSymbol, ...eventForSelected };
        } else if (portfolioEvent) {
            eventToShow = portfolioEvent;
        }

        if (eventToShow) {
            setLastEvent(eventToShow);
        } else if (eventForSelected) {
            setLastEvent({
                symbol: selectedSymbol,
                ...eventForSelected,
            });
        }

        let baseMsg = `Dzień ${gameDay} → ${newDay}. Zaktualizowano ceny wszystkich spółek (GJR-GARCH(1,1), tryb: ${simMode}).`;

        if (anyError) {
            baseMsg += " Uwaga: dla części spółek nie udało się policzyć nowej ceny – zostały bez zmian.";
        }

        if (eventToShow) {
            const e = eventToShow;
            const sign = e.impactPct > 0 ? "+" : e.impactPct < 0 ? "" : "";
            const impactText = `${sign}${e.impactPct.toFixed(1)}%`;

            let moodPrefix = "";
            if (e.sentiment === "positive" || e.sentiment === "extreme_positive") {
                moodPrefix = "Losowy event pozytywny: ";
            } else if (e.sentiment === "negative" || e.sentiment === "extreme_negative") {
                moodPrefix = "Losowy event negatywny: ";
            } else {
                moodPrefix = "Losowy event neutralny: ";
            }

            baseMsg += ` ${moodPrefix}${e.label} (${impactText}) dla ${e.symbol.toUpperCase()}. ${e.description}`;
        } else if (eventForSelected) {
            const e = eventForSelected;
            if (e.type === "none") {
                if (dayRoll < 0.88) {
                    baseMsg += " To był spokojny dzień – w ogóle nie losowano eventów dla żadnej spółki.";
                } else {
                    baseMsg += ` Dla ${selectedSymbol.toUpperCase()} tym razem brak istotnych wydarzeń (wynik losowania).`;
                }
            } else {
                const sign = e.impactPct > 0 ? "+" : e.impactPct < 0 ? "" : "";
                const impactText = `${sign}${e.impactPct.toFixed(1)}%`;

                let moodPrefix = "";
                if (e.sentiment === "positive" || e.sentiment === "extreme_positive") {
                    moodPrefix = "Losowy event pozytywny: ";
                } else if (e.sentiment === "negative" || e.sentiment === "extreme_negative") {
                    moodPrefix = "Losowy event negatywny: ";
                } else {
                    moodPrefix = "Losowy event neutralny: ";
                }

                baseMsg += ` ${moodPrefix}${e.label} (${impactText}) dla ${selectedSymbol.toUpperCase()}. ${e.description}`;
            }
        } else if (dayRoll < 0.88) {
            baseMsg += " To był spokojny dzień – nie wystąpiły żadne eventy rynkowe.";
        }

        setMessage(baseMsg);

        const totalAfter = computeTotalValue(cash, positions, newPrices);
        let logLine = `Dzień ${newDay}: wartość portfela ${formatMoney(totalAfter)} PLN.`;
        if (eventToShow && eventToShow.type !== "none") {
            const e = eventToShow;
            const sign = e.impactPct > 0 ? "+" : e.impactPct < 0 ? "" : "";
            const impactText = `${sign}${e.impactPct.toFixed(1)}%`;
            logLine += ` Event: ${e.label} (${impactText}) na ${e.symbol.toUpperCase()}.`;
        } else if (dayRoll < 0.88) {
            logLine += " Spokojny dzień, brak eventów.";
        } else {
            logLine += " Losowano eventy, ale nie dotknęły Twojego portfela.";
        }
        setDayLog((prev) => [...prev, { day: newDay, text: logLine }]);

        if (eventToShow && eventToShow.type !== "none") {
            setPopupEvent({
                ...eventToShow,
                day: newDay,
            });
        }

        checkWinLose(cash, positions, newPrices);
    }

    function handleStartGame() {
        if (status === "won" || status === "lost") {
            setMessage(
                "Ta sesja jest zakończona – zresetuj grę (np. zmieniając poziom trudności), żeby zacząć od nowa."
            );
            return;
        }

        if (!initialCapital || !target) {
            setMessage(
                "Najpierw ustaw poziom trudności (lub własne parametry), żeby zdefiniować kapitał początkowy i cel."
            );
            return;
        }

        if (!Object.keys(prices).length) {
            setMessage(
                "Ceny spółek jeszcze się ładują – poczekaj aż się pojawią i dopiero wtedy wystartuj grę."
            );
            return;
        }

        setStatus("playing");
        setHasGameStarted(true);
        if (gameDay <= 0) setGameDay(1);
        setMessage("Gra wystartowała – możesz składać zlecenia i przechodzić do kolejnych dni.");
    }

    function handleAbandonGame() {
        const hasProgress =
            status === "playing" ||
            trades.length > 0 ||
            gameDay > 1 ||
            Object.values(positions).some((q) => (q || 0) > 0);

        const text = hasProgress
            ? "Porzucenie rozgrywki spowoduje utratę całego obecnego postępu (dzień gry, pozycje, historia zleceń). Czy na pewno chcesz rozpocząć nową grę od początku?"
            : "Rozpocząć nową, pustą rozgrywkę od początku?";

        setAbandonConfirm({ text });
    }

    function handleAbandonGameConfirm() {
        const summary = buildSummary("abandoned");

        saveGameResult(summary);
        setGameSaved(true);

        setAbandonConfirm(null);
        setPopupEvent(null);
        setEndSummary(null);

        resetGame(difficultyId);
        fetchInitialPrices();

        setMessage("Rozgrywka została przerwana, wynik zapisano w historii i rozpoczęto nową grę od początku.");
    }

    function handleAbandonGameCancel() {
        setAbandonConfirm(null);
        setMessage("Anulowano porzucenie rozgrywki.");
    }

    function handleApplyCustom() {
        if (difficultyId !== "custom") return;

        const startNum = parseFloat(customStart);
        const targetNum = parseFloat(customTarget);

        if (
            !startNum ||
            !targetNum ||
            Number.isNaN(startNum) ||
            Number.isNaN(targetNum) ||
            startNum <= 0 ||
            targetNum <= startNum
        ) {
            setMessage("Ustaw poprawnie własny kapitał (większy od 0) i cel (musi być większy niż kapitał początkowy).");
            return;
        }

        setCash(startNum);
        setPositions({});
        setTarget(targetNum);
        setInitialCapital(startNum);
        setTrades([]);
        setStep(0);
        setGameDay(1);
        setError(null);
        setLastEvent(null);
        setEventHistory([]);
        setPopupEvent(null);
        setPanicSellCount(0);
        setDayLog([]);
        setPriceHistory({});
        setEndSummary(null);
        setGameSaved(false);

        if (Object.keys(prices).length > 0) {
            setStatus("playing");
            setHasGameStarted(true);

            setPriceHistory(() => {
                const ph = {};
                for (const [sym, p] of Object.entries(prices)) {
                    const up = String(sym).toUpperCase();
                    const pn = Number(p);
                    if (Number.isFinite(pn) && pn > 0) {
                        ph[up] = [{ day: 1, price: pn }];
                    }
                }
                return ph;
            });

            setMessage("Gra wystartowała z własnymi parametrami – dzień 1, powodzenia!");
        } else {
            setStatus("idle");
            setHasGameStarted(false);
            setMessage("Parametry zapisane. Poczekaj jeszcze na ceny ze Stooq (pierwsze pobranie dnia może chwilę potrwać).");
        }
    }

    function handleDifficultyChange(nextId) {
        if (status === "playing") {
            const confirmed = window.confirm("Zmiana poziomu trudnosci zresetuje aktualna rozgrywke. Czy na pewno chcesz zaczac od nowa?");
            if (!confirmed) return;
        }

        setDifficultyId(nextId);
        setCustomStart("");
        setCustomTarget("");
        setSimMode("neutral");
        setHasGameStarted(false);
        setEndSummary(null);
        setGameSaved(false);

        resetGame(nextId);
        fetchInitialPrices();
    }

    function handleClosePopup() {
        setPopupEvent(null);
    }

    function sentimentLabel(sentiment) {
        switch (sentiment) {
            case "positive":
            case "extreme_positive":
                return "Pozytywny event rynkowy";
            case "negative":
            case "extreme_negative":
                return "Negatywny event rynkowy";
            default:
                return "Event rynkowy";
        }
    }

    const holdings = Object.entries(positions).filter(([, qty]) => (qty || 0) > 0);

    const canShowSetupPanel = !hasGameStarted && status !== "won" && status !== "lost";

    function handleSimModeClick(nextMode) {
        if (hasGameStarted || status === "won" || status === "lost") {
            setMessage("Nie możesz zmienić modelu w trakcie gry.");
            return;
        }
        setSimMode(nextMode);
    }

    return (
        <div className="game-root">
            <h2>Symulator gry na giełdzie</h2>
            <p className="hint">
                Gra na danych z GPW (Stooq). Aby rozpocząc rozgrywke należy wybrać poziom trudności i tryb rynku który użytkownik chce przesymulować
                i następnie kliknać start gry. Gra zakonczy sie gdy użytkownik ja porzuci lub osiagnie swój cel. W wypadku straty całego kapitału użytkownik musi porzucic rozgrywke.
                istnieje opcja podgladu zmiany ceny w formie wykresu w formie przycisku podglad
            </p>

            <div className="game-summary-row">
                <div className="game-summary-card">
                    <div className="game-summary-title">Aktualna spółka</div>
                    <div className="game-summary-main">{company.symbol.toUpperCase()}</div>
                    <div className="game-summary-sub">
                        {company.label}
                        <br />
                        Cena:{" "}
                        {loadingPrice ? "ładowanie..." : price != null ? `${formatMoney(price)} PLN` : "-"}
                        <div
                            style={{
                                marginTop: "0.5rem",
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.25rem",
                            }}
                        >
                            <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Zmień spółkę (Stooq):</span>
                            <select
                                value={selectedSymbol}
                                onChange={(e) => setSelectedSymbol(e.target.value)}
                                className="game-summary-select"
                            >
                                {STOOQ_COMPANIES.map((c) => (
                                    <option key={c.symbol} value={c.symbol}>
                                        {c.symbol.toUpperCase()} – {c.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="game-summary-card">
                    <div className="game-summary-title">Portfel</div>
                    <div className="game-summary-main">{formatMoney(totalValue)} PLN</div>
                    <div className="game-summary-sub">
                        P/L globalnie:{" "}
                        {pnl != null ? (
                            <>
                                {formatMoney(pnl)} PLN{" "}
                                {pnlPct != null && (
                                    <span style={{ color: pnl >= 0 ? "#22c55e" : "#ef4444" }}>
                                        ({pnlPct >= 0 ? "+" : ""}
                                        {pnlPct.toFixed(2)}%)
                                    </span>
                                )}
                            </>
                        ) : (
                            "-"
                        )}
                        <br />
                        Różne spółki w portfelu: {distinctHoldings}
                    </div>
                </div>

                <div className="game-summary-card">
                    <div className="game-summary-title">Stan gry</div>
                    <div className="game-summary-main">Dzień {gameDay}</div>
                    <div className="game-summary-sub">
                        Gotówka: {formatMoney(cash)} PLN
                        <br />
                        Status:{" "}
                        {status === "won"
                            ? "✅ Cel osiągnięty"
                            : status === "lost"
                                ? "❌ Przegrana"
                                : status === "playing"
                                    ? "W trakcie"
                                    : "Nie wystartowała"}
                    </div>
                </div>
            </div>

            <div className="game-section">
                {canShowSetupPanel && (
                    <div className="game-row">
                        <div className="game-block">
                            <h3>1. Parametry gry (trudność i tryb rynku)</h3>

                            <div style={{ marginTop: "0.7rem" }}>
                                <div className="game-field-label">Poziom trudności:</div>
                                <div className="game-diff-list">
                                    {DIFFICULTIES.map((d) => (
                                        <button
                                            key={d.id}
                                            type="button"
                                            className={
                                                d.id === difficultyId ? "game-diff-btn game-diff-btn-active" : "game-diff-btn"
                                            }
                                            onClick={() => handleDifficultyChange(d.id)}
                                        >
                                            {d.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginTop: "0.8rem" }}>
                                <div className="game-field-label">Tryb rynku (model GJR + eventy):</div>
                                <div className="sim-toggle">
                                    <button
                                        type="button"
                                        className={
                                            simMode === "negative_events"
                                                ? "sim-toggle-btn sim-toggle-btn-active"
                                                : "sim-toggle-btn"
                                        }
                                        onClick={() => handleSimModeClick("negative_events")}
                                    >
                                        Negatywny + złe eventy
                                    </button>
                                    <button
                                        type="button"
                                        className={simMode === "negative" ? "sim-toggle-btn sim-toggle-btn-active" : "sim-toggle-btn"}
                                        onClick={() => handleSimModeClick("negative")}
                                    >
                                        Negatywny
                                    </button>
                                    <button
                                        type="button"
                                        className={simMode === "neutral" ? "sim-toggle-btn sim-toggle-btn-active" : "sim-toggle-btn"}
                                        onClick={() => handleSimModeClick("neutral")}
                                    >
                                        Neutralny
                                    </button>
                                    <button
                                        type="button"
                                        className={simMode === "positive" ? "sim-toggle-btn sim-toggle-btn-active" : "sim-toggle-btn"}
                                        onClick={() => handleSimModeClick("positive")}
                                    >
                                        Pozytywny
                                    </button>
                                    <button
                                        type="button"
                                        className={
                                            simMode === "positive_events" ? "sim-toggle-btn sim-toggle-btn-active" : "sim-toggle-btn"
                                        }
                                        onClick={() => handleSimModeClick("positive_events")}
                                    >
                                        Pozytywny + dobre eventy
                                    </button>
                                </div>
                                <p className="hint" style={{ marginTop: "0.3rem" }}>
                                    Ustaw poziom trudności i tryb rynku przed kliknięciem „Start gry”.
                                    Po rozpoczęciu gry ten panel znika, ale spółkę możesz wciąż zmieniać z górnego podsumowania.
                                </p>
                            </div>

                            {difficultyId === "custom" && (
                                <div style={{ marginTop: "0.7rem" }}>
                                    <h4>Własne parametry gry</h4>
                                    <div className="game-order-row">
                                        <label>
                                            Kapitał początkowy (PLN)
                                            <input
                                                type="number"
                                                min="1"
                                                step="100"
                                                value={customStart}
                                                onChange={(e) => setCustomStart(e.target.value)}
                                            />
                                        </label>
                                    </div>
                                    <div className="game-order-row">
                                        <label>
                                            Kapitał docelowy (PLN)
                                            <input
                                                type="number"
                                                min="1"
                                                step="100"
                                                value={customTarget}
                                                onChange={(e) => setCustomTarget(e.target.value)}
                                            />
                                        </label>
                                    </div>
                                    <button
                                        type="button"
                                        className="auth-submit-btn"
                                        style={{ marginTop: "0.3rem" }}
                                        onClick={handleApplyCustom}
                                    >
                                        Start z własnymi parametrami
                                    </button>
                                    <p className="hint">
                                        Cel musi być większy niż kapitał początkowy. Im mniejszy kapitał i większy cel, tym trudniej.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="game-row">
                    <div className="game-block">
                        <h3>3. Zlecenia i zmiana dnia</h3>

                        <div className="game-order-row" style={{ marginBottom: "0.6rem", display: "flex", gap: "0.5rem" }}>
                            <button
                                type="button"
                                className="auth-submit-btn"
                                onClick={handleStartGame}
                                disabled={loadingPrice || status === "playing" || status === "won" || status === "lost"}
                            >
                                {status === "playing" ? "Gra w toku" : "Start gry"}
                            </button>
                            <button
                                type="button"
                                className="auth-submit-btn"
                                style={{ backgroundColor: "#4b5563" }}
                                onClick={handleAbandonGame}
                            >
                                Porzuć rozgrywkę
                            </button>
                        </div>

                        <div className="game-order-row">
                            <label>
                                Ilość sztuk (dla {selectedSymbol.toUpperCase()}):
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={orderQty}
                                    onChange={(e) => setOrderQty(e.target.value)}
                                />
                            </label>
                        </div>

                        <div className="game-order-row game-prefix-row">
                            <div className="game-prefix-col">
                                <span className="game-field-label">Ilość:</span>
                                <div className="game-prefix-btn-row">
                                    <button type="button" className="game-prefix-btn" onClick={() => setOrderQty("10")}>
                                        10 szt.
                                    </button>
                                    <button type="button" className="game-prefix-btn" onClick={() => setOrderQty("50")}>
                                        50 szt.
                                    </button>
                                    <button type="button" className="game-prefix-btn" onClick={() => setOrderQty("100")}>
                                        100 szt.
                                    </button>
                                </div>
                            </div>

                            <div className="game-prefix-col">
                                <span className="game-field-label">Kapitał:</span>
                                <div className="game-prefix-btn-row">
                                    <button
                                        type="button"
                                        className="game-prefix-btn"
                                        onClick={() => {
                                            if (!price || price <= 0) {
                                                setMessage("Brak aktualnej ceny – nie można policzyć ilości z procentu kapitału.");
                                                return;
                                            }
                                            const qty = Math.floor((cash * 0.1) / price);
                                            if (qty <= 0) {
                                                setMessage("Za mały kapitał, żeby przeznaczyć 10% na tę spółkę.");
                                                return;
                                            }
                                            setOrderQty(String(qty));
                                        }}
                                    >
                                        10% kapitału
                                    </button>

                                    <button
                                        type="button"
                                        className="game-prefix-btn"
                                        onClick={() => {
                                            if (!price || price <= 0) {
                                                setMessage("Brak aktualnej ceny – nie można policzyć ilości z procentu kapitału.");
                                                return;
                                            }
                                            const qty = Math.floor((cash * 0.25) / price);
                                            if (qty <= 0) {
                                                setMessage("Za mały kapitał, żeby przeznaczyć 25% na tę spółkę.");
                                                return;
                                            }
                                            setOrderQty(String(qty));
                                        }}
                                    >
                                        25% kapitału
                                    </button>

                                    <button
                                        type="button"
                                        className="game-prefix-btn"
                                        onClick={() => {
                                            if (!price || price <= 0) {
                                                setMessage("Brak aktualnej ceny – nie można policzyć ilości z procentu kapitału.");
                                                return;
                                            }
                                            const qty = Math.floor((cash * 0.5) / price);
                                            if (qty <= 0) {
                                                setMessage("Za mały kapitał, żeby przeznaczyć 50% na tę spółkę.");
                                                return;
                                            }
                                            setOrderQty(String(qty));
                                        }}
                                    >
                                        50% kapitału
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="game-order-actions game-order-actions-stacked">
                            <div className="game-order-main-row">
                                <button type="button" onClick={handleBuy}>
                                    Kup Akcje ({selectedSymbol.toUpperCase()})
                                </button>
                                <button type="button" onClick={handleSell}>
                                    Sprzedaj Akcje ({selectedSymbol.toUpperCase()})
                                </button>
                                <button type="button" onClick={() => handleSellAllSelected()}>
                                    Sprzedaj wszystkie akcje  ({selectedSymbol.toUpperCase()})
                                </button>
                            </div>

                            <div className="game-order-sub-row">
                                <button type="button" onClick={handleSellAllPortfolio}>
                                    Sprzedaj cały portfel
                                </button>
                            </div>

                            <div className="game-order-nextday-row">
                                <button type="button" onClick={handleNextDay}>
                                    Zacznij kolejny dzień
                                </button>
                            </div>

                            {message && (
                                <div className="auth-info" style={{ marginTop: "0.6rem" }}>
                                    {message}
                                </div>
                            )}

                            {}
                            <GameQuickSummary
                                open={quickOpen}
                                onOpen={() => setQuickOpen(true)}
                                onClose={() => setQuickOpen(false)}
                                trades={trades}
                                eventHistory={eventHistory}
                                dayLog={dayLog}
                                priceHistory={priceHistory}
                                triggerPlacement="inline"
                                triggerLabel="Podgląd"
                            />
                        </div>

                        <p className="hint"></p>
                    </div>

                    <div className="game-block">
                        <h3>4. Historia & dziennik</h3>
                        {trades.length === 0 ? (
                            <p className="hint">Brak wykonanych zleceń w tej grze.</p>
                        ) : (
                            <div className="admin-users-table-wrapper">
                                <table className="admin-users-table" style={{ fontSize: "0.78rem" }}>
                                    <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Dzień</th>
                                        <th>Spółka</th>
                                        <th>Strona</th>
                                        <th>Ilość</th>
                                        <th>Cena</th>
                                        <th>Wartość</th>
                                        <th>Gotówka po</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {trades.map((t) => (
                                        <tr
                                            key={t.id}
                                            className={t.side === "BUY" ? "trade-row trade-row-buy" : "trade-row trade-row-sell"}
                                        >
                                            <td>{t.id}</td>
                                            <td>{t.day}</td>
                                            <td>{t.symbol.toUpperCase()}</td>
                                            <td>{t.side === "BUY" ? "Kupno" : "Sprzedaż"}</td>
                                            <td>{t.qty}</td>
                                            <td>{formatMoney(t.price)}</td>
                                            <td>{formatMoney(t.value)}</td>
                                            <td>{formatMoney(t.cashAfter)}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <h4 style={{ marginTop: "0.7rem" }}>Losowe wydarzenia</h4>
                        {eventHistory.length === 0 ? (
                            <p className="hint">W tej sesji nie wystąpiły jeszcze istotne eventy rynkowe.</p>
                        ) : (
                            <div className="admin-users-table-wrapper" style={{ marginTop: "0.35rem", maxHeight: "140px" }}>
                                <table className="admin-users-table" style={{ fontSize: "0.78rem" }}>
                                    <thead>
                                    <tr>
                                        <th>Dzień</th>
                                        <th>Spółka</th>
                                        <th>Event</th>
                                        <th>Wpływ</th>
                                        <th>Cena przed → po</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {eventHistory.map((e, idx) => {
                                        const rowClass =
                                            e.impactPct === 0
                                                ? "event-row event-row-neutral"
                                                : e.impactPct > 0
                                                    ? "event-row event-row-positive"
                                                    : "event-row event-row-negative";
                                        return (
                                            <tr key={`${e.day}-${e.symbol}-${idx}`} className={rowClass}>
                                                <td>{e.day}</td>
                                                <td>{e.symbol.toUpperCase()}</td>
                                                <td>{e.label}</td>
                                                <td>
                                                    {e.impactPct > 0 ? "+" : ""}
                                                    {e.impactPct.toFixed(1)}%
                                                </td>
                                                <td>
                                                    {formatMoney(e.priceBefore)} → {formatMoney(e.priceAfter)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div className="game-row">
                    <div className="game-block">
                        <h3>5. Pozycje w portfelu</h3>
                        {holdings.length === 0 ? (
                            <p className="hint">Nie masz jeszcze żadnych aktywnych pozycji w portfelu.</p>
                        ) : (
                            <div className="portfolio" style={{ marginTop: "0.4rem" }}>
                                <table>
                                    <thead>
                                    <tr>
                                        <th>Spółka</th>
                                        <th>Ilość</th>
                                        <th>Śr. cena zakupu</th>
                                        <th>Cena rynkowa</th>
                                        <th>Wartość pozycji</th>
                                        <th>Niezreal. P/L</th>
                                        <th>Akcja</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {holdings.map(([sym, qty]) => {
                                        const p = prices[sym];
                                        const stats = symbolStatsMap[sym];
                                        const avg = stats && stats.avgBuyPrice ? stats.avgBuyPrice : null;
                                        const positionValue = Number.isFinite(p) && qty > 0 ? qty * p : null;
                                        const unrealized = avg != null && Number.isFinite(p) && qty > 0 ? qty * (p - avg) : null;
                                        const unrealizedPct =
                                            unrealized != null && avg > 0 && qty > 0 ? (unrealized / (qty * avg)) * 100 : null;

                                        return (
                                            <tr key={sym}>
                                                <td>{sym.toUpperCase()}</td>
                                                <td>{qty}</td>
                                                <td>{avg != null ? `${formatMoney(avg)} PLN` : "-"}</td>
                                                <td>{Number.isFinite(p) ? `${formatMoney(p)} PLN` : "-"}</td>
                                                <td>{positionValue != null ? `${formatMoney(positionValue)} PLN` : "-"}</td>
                                                <td
                                                    style={{
                                                        color:
                                                            unrealized == null ? "#e5e7eb" : unrealized >= 0 ? "#22c55e" : "#ef4444",
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
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="game-prefix-btn"
                                                        onClick={() => handleSellAllSelected(sym)}
                                                    >
                                                        Sprzedaj
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="error" style={{ marginTop: "0.4rem" }}>
                        {error}
                    </div>
                )}
            </div>

            {abandonConfirm && !endSummary && (
                <div className="event-popup-overlay" onClick={handleAbandonGameCancel}>
                    <div className="event-popup" onClick={(e) => e.stopPropagation()}>
                        <div className="event-popup-header">
                            <span className="event-popup-badge">Porzucić rozgrywkę?</span>
                            <button type="button" className="event-popup-close" onClick={handleAbandonGameCancel}>
                                ×
                            </button>
                        </div>
                        <h3 className="event-popup-title">Na pewno chcesz zacząć od nowa?</h3>
                        <p className="event-popup-desc">{abandonConfirm.text}</p>
                        <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
                            <button type="button" className="auth-submit-btn" onClick={handleAbandonGameConfirm}>
                                Tak, porzuć i zacznij od nowa
                            </button>
                            <button
                                type="button"
                                className="event-popup-close"
                                style={{ position: "static" }}
                                onClick={handleAbandonGameCancel}
                            >
                                Jednak nie
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {popupEvent && !endSummary && (
                <div className="event-popup-overlay" onClick={handleClosePopup}>
                    <div className={`event-popup event-popup-${popupEvent.sentiment}`} onClick={(e) => e.stopPropagation()}>
                        <div className="event-popup-header">
                            <span className="event-popup-badge">{sentimentLabel(popupEvent.sentiment)}</span>
                            <button type="button" className="event-popup-close" onClick={handleClosePopup}>
                                ×
                            </button>
                        </div>
                        <h3 className="event-popup-title">
                            {popupEvent.label} – {popupEvent.symbol.toUpperCase()}
                        </h3>
                        <p className="event-popup-impact">
                            Wpływ na kurs:{" "}
                            <strong>
                                {popupEvent.impactPct > 0 ? "+" : ""}
                                {popupEvent.impactPct.toFixed(1)}%
                            </strong>
                        </p>
                        <p className="event-popup-desc">{popupEvent.description}</p>
                        <p className="event-popup-footer">
                            Dzień gry: <strong>{popupEvent.day}</strong>
                        </p>
                    </div>
                </div>
            )}

            {endSummary && (
                <div className="event-popup-overlay" onClick={() => setEndSummary(null)}>
                    <div className="event-popup" onClick={(e) => e.stopPropagation()}>
                        <div className="event-popup-header">
                            <span className="event-popup-badge">
                                {endSummary.status === "won"
                                    ? "KONIEC GRY – WYGRANA"
                                    : endSummary.status === "lost"
                                        ? "KONIEC GRY - PRZEGRANA"
                                        : "KONIEC GRY - PRZERWANA"}
                            </span>
                            <button type="button" className="event-popup-close" onClick={() => setEndSummary(null)}>
                                ×
                            </button>
                        </div>
                        <h3 className="event-popup-title">
                            {endSummary.status === "won"
                                ? "Gratulacje! Osiągnąłeś cel portfela 🎉"
                                : endSummary.status === "lost"
                                    ? "Niestety, tym razem się nie udało 💀"
                                    : "Gra została przerwana – wynik zapisano w historii 📘"}
                        </h3>
                        <p className="event-popup-impact">
                            Dni gry: <strong>{endSummary.days}</strong>
                        </p>
                        <p className="event-popup-impact">
                            Końcowa wartość portfela: <strong>{formatMoney(endSummary.total)} PLN</strong>
                        </p>
                        <p className="event-popup-impact">
                            Wynik P/L:{" "}
                            <strong
                                style={{
                                    color: endSummary.pnl != null && endSummary.pnl < 0 ? "#fecaca" : "#bbf7d0",
                                }}
                            >
                                {endSummary.pnl != null
                                    ? `${formatMoney(endSummary.pnl)} PLN${
                                        endSummary.pnlPct != null
                                            ? ` (${endSummary.pnlPct >= 0 ? "+" : ""}${endSummary.pnlPct.toFixed(2)}%)`
                                            : ""
                                    }`
                                    : "-"}
                            </strong>
                        </p>
                        <p className="event-popup-desc">
                            Liczba transakcji: <strong>{endSummary.tradesCount}</strong>, panic sell użyto{" "}
                            <strong>{endSummary.panicSellCount}</strong> razy.
                        </p>
                        <p className="event-popup-footer">
                            Możesz zmienić poziom trudności lub parametry i zagrać od nowa.
                        </p>
                        <button
                            type="button"
                            className="auth-submit-btn"
                            style={{ marginTop: "0.5rem" }}
                            onClick={() => {
                                setEndSummary(null);
                                resetGame();
                                fetchInitialPrices();
                            }}
                        >
                            Zagraj jeszcze raz
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Game;
