import React from "react";

function StooqCard({ symbol, row }) {
    if (!row) {
        return (
            <div>
                Wybierz dzień z listy, aby zobaczyć szczegóły {symbol.toUpperCase()}.
            </div>
        );
    }

    const { Date: date, Open, High, Low, Close, Volume } = row;

    return (
        <div className="quote-card">
            <h3>
                {symbol.toUpperCase()} – {date}
            </h3>
            <p>
                <strong>Otwarcie:</strong> {Open}
            </p>
            <p>
                <strong>Najwyższa:</strong> {High}
            </p>
            <p>
                <strong>Najniższa:</strong> {Low}
            </p>
            <p>
                <strong>Zamknięcie:</strong> {Close}
            </p>
            <p>
                <strong>Wolumen:</strong> {Volume}
            </p>
        </div>
    );
}

export default StooqCard;
