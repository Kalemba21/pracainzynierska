
import React, { useState } from "react";
import axios from "axios";

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
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await axios.get("http://localhost:4000/api/search", {
        params: { query },
      });
      setResults(res.data.result || []);
    } catch (err) {
      console.error(err);
      const backendMsg = err.response?.data?.error;
      if (backendMsg) {
        setError(backendMsg);
      } else {
        setError(
            "Nie udało się wyszukać spółek w Finnhub. Możliwe ograniczenia planu/linitów API."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePick = (symbol) => {
    if (!symbol) return;
    onSelectSymbol && onSelectSymbol(symbol);
    setQuery(symbol);
    setResults([]);
    setError(null);
  };

  return (
      <div className="symbol-search">
        <form onSubmit={handleSearch} className="search-form">
          <input
              type="text"
              placeholder="Szukaj spółki (np. Tesla)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Szukam..." : "Szukaj"}
          </button>
        </form>

        {error && <div className="error">{error}</div>}

        {results.length > 0 && (
            <ul className="results">
              {results.map((item) => (
                  <li
                      key={`${item.symbol}-${item.description}`}
                      onClick={() => handlePick(item.symbol)}
                  >
                    <strong>{item.symbol}</strong> - {item.description}
                  </li>
              ))}
            </ul>
        )}


        <div className="quick-picks">
          <div className="quick-picks-title">
            Popularne spółki (USA / świat)
          </div>
          <p className="hint" style={{ marginTop: "0.15rem" }}>
            Kliknij, żeby od razu przełączyć kurs w panelu po prawej. <p>przykładowe spółki do wyboru</p>

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
