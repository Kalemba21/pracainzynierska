import React, { useEffect, useState } from "react";
import axios from "axios";

function QuoteCard({ symbol }) {
    const [quote, setQuote] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!symbol) return;
        setLoading(true);
        setError(null);

        axios
            .get("http://localhost:4000/api/quote", { params: { symbol } })
            .then((res) => {
                setQuote(res.data);
            })
            .catch((err) => {
                console.error(err);

                const backendMsg = err.response?.data?.error;
                if (backendMsg) {
                    setError(backendMsg);
                } else {
                    setError(
                        "Nie udało się pobrać danych z Finnhub. Możliwe ograniczenia darmowego API."
                    );
                }
            })
            .finally(() => setLoading(false));
    }, [symbol]);

    if (loading) return <div>Ładowanie kursu...</div>;
    if (error) return <div className="error">{error}</div>;
    if (!quote) return <div>Brak danych</div>;

    const isStooq = quote.source === "stooq";
    const isFinnhub = quote.source === "finnhub";

    return (
        <div className="quote-card">
            <h3>{symbol}</h3>

            {isFinnhub && (
                <p className="hint">
                    Dane z Finnhub (realtime / quasi-realtime, zależnie od planu).
                </p>
            )}
            {isStooq && (
                <p className="hint">
                    Dane z Stooq (ostatnie dzienne notowanie). Wyświetlane jako fallback,
                    bo Finnhub nie udostępnia tych danych w Twoim planie.
                    {quote.date && <> (data notowania: {quote.date})</>}
                </p>
            )}

            <p>
                <strong>Aktualna cena:</strong>{" "}
                {quote.c !== null && quote.c !== undefined ? quote.c : "—"}
            </p>
            <p>
                <strong>Otwarcie:</strong>{" "}
                {quote.o !== null && quote.o !== undefined ? quote.o : "—"}
            </p>
            <p>
                <strong>Najwyższa:</strong>{" "}
                {quote.h !== null && quote.h !== undefined ? quote.h : "—"}
            </p>
            <p>
                <strong>Najniższa:</strong>{" "}
                {quote.l !== null && quote.l !== undefined ? quote.l : "—"}
            </p>
            <p>
                <strong>Poprzednie zamknięcie:</strong>{" "}
                {quote.pc !== null && quote.pc !== undefined ? quote.pc : "—"}
            </p>
        </div>
    );
}

export default QuoteCard;
