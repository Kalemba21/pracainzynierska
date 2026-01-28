import React, { useMemo, useState } from "react";
import { useAuth } from "../AuthContext";

function isValidEmail(email) {
    const s = String(email || "").trim();
    return s.includes("@") && s.includes(".");
}

export default function AuthPanel() {
    const { login, register, authLoading } = useAuth();

    const [mode, setMode] = useState("login");
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [formError, setFormError] = useState(null);

    const title = useMemo(() => (mode === "login" ? "Logowanie" : "Rejestracja"), [mode]);

    function switchMode(next) {
        setMode(next);
        setFormError(null);

        setPassword("");
        if (next === "login") setUsername("");
    }

    async function onSubmit(e) {
        e.preventDefault();
        setFormError(null);

        const eMail = email.trim();
        const pass = password;

        if (!eMail) return setFormError("Podaj email.");
        if (!isValidEmail(eMail)) return setFormError("Podaj poprawny adres email.");
        if (!pass || pass.length < 6) return setFormError("Haslo musi miec min. 6 znakow.");

        if (mode === "register") {
            const uname = username.trim();
            if (!uname) return setFormError("Podaj nazwe uzytkownika.");
            const r = await register(eMail, pass, uname);
            if (!r.ok) return setFormError(r.error || "Nie udalo sie zarejestrowac.");
            return;
        }

        const r = await login(eMail, pass);
        if (!r.ok) return setFormError(r.error || "Nie udalo sie zalogowac.");
    }

    return (
        <div className="authPanel">
            <div className="authPanel__tabs" role="tablist" aria-label="Tryb logowania">
                <button
                    type="button"
                    className={`authPanel__tab ${mode === "login" ? "authPanel__tab--active" : ""}`}
                    onClick={() => switchMode("login")}
                    role="tab"
                    aria-selected={mode === "login"}
                >
                    Logowanie
                </button>
                <button
                    type="button"
                    className={`authPanel__tab ${mode === "register" ? "authPanel__tab--active" : ""}`}
                    onClick={() => switchMode("register")}
                    role="tab"
                    aria-selected={mode === "register"}
                >
                    Rejestracja
                </button>
            </div>

            <div className="authPanel__row">
                <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "rgba(248,250,252,0.95)" }}>
                        {title}
                    </div>
                    <div className="authPanel__hint">
                        {mode === "login"
                            ? "Wpisz dane konta, aby przejsc do aplikacji."
                            : "Utworz konto — potem automatycznie przejdziesz do aplikacji."}
                    </div>
                </div>
            </div>

            {formError && <div className="authPanel__error">{formError}</div>}

            <form className="authPanel__form" onSubmit={onSubmit}>
                <div className="authPanel__field">
                    <label className="authPanel__label" htmlFor="auth-email">
                        Email
                    </label>
                    <input
                        id="auth-email"
                        className="authPanel__input"
                        type="email"
                        placeholder="np. user@test.pl"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={authLoading}
                        autoComplete="email"
                    />
                </div>

                {mode === "register" && (
                    <div className="authPanel__field">
                        <label className="authPanel__label" htmlFor="auth-username">
                            Nazwa uzytkownika
                        </label>
                        <input
                            id="auth-username"
                            className="authPanel__input"
                            type="text"
                            placeholder="np. janek"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={authLoading}
                            autoComplete="username"
                        />
                    </div>
                )}

                <div className="authPanel__field">
                    <label className="authPanel__label" htmlFor="auth-password">
                        Haslo
                    </label>
                    <input
                        id="auth-password"
                        className="authPanel__input"
                        type="password"
                        placeholder="min. 6 znakow"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={authLoading}
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                    />
                </div>

                <div className="authPanel__row">
                    <button className="authPanel__primaryBtn" type="submit" disabled={authLoading}>
                        {authLoading ? (mode === "login" ? "Logowanie..." : "Rejestrowanie...") : mode === "login" ? "Zaloguj" : "Zarejestruj"}
                    </button>

                    <button
                        type="button"
                        className="authPanel__secondaryBtn"
                        disabled={authLoading}
                        onClick={() => switchMode(mode === "login" ? "register" : "login")}
                        title="Przelacz tryb"
                    >
                        {mode === "login" ? "Nie mam konta" : "Mam juz konto"}
                    </button>
                </div>

                <div className="authPanel__hint">
                </div>
            </form>
        </div>
    );
}
