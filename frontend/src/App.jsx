import React, { useEffect, useState } from "react";
import QuoteCard from "./components/QuoteCard";
import SymbolSearch from "./components/SymbolSearch";
import StooqSearch from "./components/StooqSearch";
import AuthPanel from "./components/AuthPanel";
import AdminUsersPanel from "./components/AdminUsersPanel";
import GameWip from "./components/Game";
import Portfolio from "./components/Portfolio";
import GameHistorySummary from "./components/GameHistorySummary";
import { useAuth } from "./AuthContext";

function App() {
    const [selectedSymbol, setSelectedSymbol] = useState("AAPL");

    const { user, token, logout } = useAuth();

    const [viewMode, setViewMode] = useState("login");

    const isAuthed = !!token;
    const isAdmin = !!(user && user.isAdmin);

    useEffect(() => {
        setViewMode("login");
    }, []);

    useEffect(() => {
        if (isAuthed && viewMode === "login") {
            setViewMode("sim");
        }
    }, [isAuthed, viewMode]);

    useEffect(() => {
        if (!isAuthed && viewMode !== "login") {
            setViewMode("login");
        }
    }, [isAuthed, viewMode]);

    useEffect(() => {
        if (isAuthed && !isAdmin && viewMode === "admin") {
            setViewMode("sim");
        }
    }, [isAuthed, isAdmin, viewMode]);

    const handleLogout = () => {
        logout();
        setViewMode("login");
    };

    return (
        <div className="app">
            <header className="app-header">
                <h1>SimOfStock</h1>
                <p>
                    
                </p>

                {isAuthed && viewMode !== "login" && (
                    <div
                        className="top-nav"
                        style={{
                            display: "flex",
                            gap: "0.5rem",
                            alignItems: "center",
                            flexWrap: "wrap",
                        }}
                    >
                        <button
                            type="button"
                            className={viewMode === "sim" ? "top-nav-btn top-nav-btn-active" : "top-nav-btn"}
                            onClick={() => setViewMode("sim")}
                        >
                            Sprawdzanie cen akcji
                        </button>

                        <button
                            type="button"
                            className={viewMode === "game" ? "top-nav-btn top-nav-btn-active" : "top-nav-btn"}
                            onClick={() => setViewMode("game")}
                        >
                            Symulator gry na giełdzie
                        </button>

                        <button
                            type="button"
                            className={viewMode === "history" ? "top-nav-btn top-nav-btn-active" : "top-nav-btn"}
                            onClick={() => setViewMode("history")}
                        >
                            Historia gier
                        </button>

                        <button
                            type="button"
                            className={viewMode === "portfolio" ? "top-nav-btn top-nav-btn-active" : "top-nav-btn"}
                            onClick={() => setViewMode("portfolio")}
                        >
                            Portfel
                        </button>

                        {isAdmin && (
                            <button
                                type="button"
                                className={viewMode === "admin" ? "top-nav-btn top-nav-btn-active" : "top-nav-btn"}
                                onClick={() => setViewMode("admin")}
                            >
                                Panel administratora
                            </button>
                        )}

                        <div style={{ flex: 1 }} />
                        <button
                            type="button"
                            className="top-nav-btn"
                            onClick={handleLogout}
                            title="Wyloguj"
                            style={{ border: "1px solid rgba(255,255,255,0.25)" }}
                        >
                            Wyloguj
                        </button>
                    </div>
                )}
            </header>

            <main
                className={
                    isAuthed && (viewMode === "game" || viewMode === "history")
                        ? "layout layout-game"
                        : "layout"
                }
            >
                {viewMode === "login" && (
                    <section className="panel" style={{ maxWidth: 720 }}>
                        <h2>Zaloguj się</h2>
                        <p className="hint">
                            Po uruchomieniu aplikacji zawsze startujesz od logowania. Po poprawnym logowaniu
                            przejdziesz do symulatora.
                        </p>
                        <AuthPanel />
                    </section>
                )}

                {isAuthed && viewMode !== "login" && (
                    <>
                        {viewMode === "admin" && isAdmin && (
                            <section className="panel">
                                <h2>Panel administratora – użytkownicy</h2>
                                <AdminUsersPanel />
                            </section>
                        )}

                        {viewMode === "game" && (
                            <section className="panel">
                                <GameWip />
                            </section>
                        )}

                        {viewMode === "history" && (
                            <section className="panel">
                                <GameHistorySummary />
                            </section>
                        )}

                        {viewMode === "portfolio" && (
                            <section className="panel">
                                <Portfolio />
                            </section>
                        )}

                        {viewMode === "sim" && (
                            <>
                                <section className="panel">
                                    <h2>Wyszukiwarka spółek (Finnhub)</h2>
                                    <SymbolSearch onSelectSymbol={setSelectedSymbol} />
                                </section>

                                <section className="panel">
                                    <h2>Aktualny kurs (Finnhub + fallback Stooq)</h2>
                                    <QuoteCard symbol={selectedSymbol} />
                                </section>

                                <section className="panel">
                                    <StooqSearch />
                                </section>
                            </>
                        )}
                    </>
                )}

                {}
                {!isAuthed && viewMode !== "login" && (
                    <section className="panel">
                        <h2>Wymagane logowanie</h2>
                        <p className="hint">Zaloguj się, aby korzystać z aplikacji.</p>
                        <button type="button" onClick={() => setViewMode("login")}>
                            Przejdź do logowania
                        </button>
                    </section>
                )}
            </main>
        </div>
    );
}

export default App;
