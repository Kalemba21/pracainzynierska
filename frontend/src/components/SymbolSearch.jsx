import React from "react";

const POPULAR_FINNHUB = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corp." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "GOOGL", name: "Alphabet Class A" },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "NVDA", name: "NVIDIA Corp." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "BRK.B", name: "Berkshire Hathaway B" },
  { symbol: "JPM", name: "JPMorgan Chase & Co." },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "XOM", name: "Exxon Mobil Corp." },
  { symbol: "PG", name: "Procter & Gamble Co." },
  { symbol: "NFLX", name: "Netflix Inc." },
  { symbol: "AMD", name: "Advanced Micro Devices" },
  { symbol: "BABA", name: "Alibaba Group" },
];

function SymbolSearch({ onSelectSymbol }) {
  const handlePick = (symbol) => {
    if (!symbol) return;
    onSelectSymbol && onSelectSymbol(symbol);
  };

  return (
    <div className="symbol-search">
      <div className="quick-picks">
        <div className="quick-picks-title">
          Popularne spółki (USA / świat)
        </div>
        <p className="hint" style={{ marginTop: "0.15rem" }}>
          Kliknij, żeby od razu przełączyć kurs w panelu po prawej.
        </p>
        <div className="quick-picks-grid">
          {POPULAR_FINNHUB.map((s) => (
            <button
              key={s.symbol}
              type="button"
              className="quick-pick-btn"
              onClick={() => handlePick(s.symbol)}
            >
              <span className="quick-pick-symbol">{s.symbol}</span>
              <span className="quick-pick-name">{s.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SymbolSearch;
