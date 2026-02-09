import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";

const AuthContext = createContext(null);

const API_BASE = "http://localhost:4000";

const FRONT_BOOT_ID =
    typeof __FRONT_BOOT_ID__ !== "undefined" ? __FRONT_BOOT_ID__ : "front-unknown";

const LS_USER = "authUser";
const LS_TOKEN = "authToken";

const LS_SESSION_FRONT = "sessionFrontBootId";
const LS_SESSION_BACK = "sessionBackBootId";

function isBackendDownError(err) {
    if (!err) return false;
    if (!err.response) return true;
    const s = err.response.status;
    return s === 502 || s === 503 || s === 504;
}

function devLog(...args) {
    if (typeof import.meta !== "undefined" && import.meta.env?.DEV) console.log(...args);
}

async function fetchBackendBootId() {

    const res = await axios.get(`${API_BASE}/api/boot-id`, {
        timeout: 2000,
        params: { _ts: Date.now() },
        headers: { "Cache-Control": "no-cache" },
    });
    return res?.data?.bootId || null;
}


function normalizeUser(u) {
    if (!u) return null;

    const isAdmin = !!(u.is_admin || u.isAdmin || u.role === "admin");
    return {
        ...u,
        isAdmin,
    };
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(false);

    const didInitRef = useRef(false);

    const logoutHard = () => {
        devLog("[AUTH] logoutHard()");
        localStorage.removeItem(LS_USER);
        localStorage.removeItem(LS_TOKEN);
        localStorage.removeItem(LS_SESSION_FRONT);
        localStorage.removeItem(LS_SESSION_BACK);
        delete axios.defaults.headers.common["Authorization"];
        setUser(null);
        setToken(null);
    };

    useEffect(() => {
        if (didInitRef.current) return;
        didInitRef.current = true;

        const savedUser = localStorage.getItem(LS_USER);
        const savedToken = localStorage.getItem(LS_TOKEN);
        const sessionFront = localStorage.getItem(LS_SESSION_FRONT);
        const sessionBack = localStorage.getItem(LS_SESSION_BACK);

        (async () => {
            let backNow = null;
            try {
                backNow = await fetchBackendBootId();
            } catch (e) {
                devLog("[AUTH BOOT] boot-id fetch failed:", e?.message || e);
            }

            devLog("[AUTH BOOT] sessionFront:", sessionFront);
            devLog("[AUTH BOOT] nowFront    :", FRONT_BOOT_ID);
            devLog("[AUTH BOOT] sessionBack :", sessionBack);
            devLog("[AUTH BOOT] nowBack     :", backNow);

            const frontChangedSinceLogin = !!sessionFront && sessionFront !== FRONT_BOOT_ID;
            const backChangedSinceLogin = !!sessionBack && !!backNow && sessionBack !== backNow;

            if (savedToken && (frontChangedSinceLogin || backChangedSinceLogin)) {
                devLog("[AUTH BOOT] ✅ LOGOUT (front OR backend restarted since login)");
                logoutHard();
                return;
            }

            if (savedUser) {
                try {
                    const parsed = JSON.parse(savedUser);
                    setUser(normalizeUser(parsed));
                } catch {
                    localStorage.removeItem(LS_USER);
                }
            }

            if (savedToken) {
                setToken(savedToken);
                axios.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;

                if (!sessionFront) localStorage.setItem(LS_SESSION_FRONT, FRONT_BOOT_ID);
                if (!sessionBack && backNow) localStorage.setItem(LS_SESSION_BACK, backNow);
            } else {
                delete axios.defaults.headers.common["Authorization"];
            }
        })();
    }, []);

    useEffect(() => {
        if (user) localStorage.setItem(LS_USER, JSON.stringify(user));
        else localStorage.removeItem(LS_USER);
    }, [user]);

    useEffect(() => {
        if (token) {
            localStorage.setItem(LS_TOKEN, token);
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        } else {
            localStorage.removeItem(LS_TOKEN);
            delete axios.defaults.headers.common["Authorization"];
        }
    }, [token]);

    useEffect(() => {
        const id = axios.interceptors.response.use(
            (res) => res,
            (err) => {
                const status = err?.response?.status;
                const url = err?.config?.url || "";

                if (url.includes("/api/boot-id") || url.includes("/api/db-health")) {
                    return Promise.reject(err);
                }

                if (token && (status === 401 || status === 403)) {
                    devLog("[AUTH] 401/403 -> logoutHard, url:", url);
                    logoutHard();
                }

                if (token && isBackendDownError(err)) {
                    devLog("[AUTH] backend down (no logout), url:", url);
                }

                return Promise.reject(err);
            }
        );

        return () => axios.interceptors.response.eject(id);
    }, [token]);

    const logout = () => logoutHard();

    const login = async (email, password) => {
        setLoading(true);
        try {
            const res = await axios.post(`${API_BASE}/api/auth/login`, { email, password });

            setUser(normalizeUser(res.data.user));
            setToken(res.data.token);

            localStorage.setItem(LS_SESSION_FRONT, FRONT_BOOT_ID);
            try {
                const backNow = await fetchBackendBootId();
                if (backNow) localStorage.setItem(LS_SESSION_BACK, backNow);
            } catch {}

            return { ok: true };
        } catch (err) {
            console.error(err);
            if (isBackendDownError(err)) return { ok: false, error: "Backend nie dziala (brak polaczenia)." };
            const msg = err.response?.data?.error || "Błąd logowania";
            return { ok: false, error: msg };
        } finally {
            setLoading(false);
        }
    };

    const register = async (email, password, username) => {
        setLoading(true);
        try {
            const res = await axios.post(`${API_BASE}/api/auth/register`, { email, password, username });

            setUser(normalizeUser(res.data.user));
            setToken(res.data.token);

            localStorage.setItem(LS_SESSION_FRONT, FRONT_BOOT_ID);
            try {
                const backNow = await fetchBackendBootId();
                if (backNow) localStorage.setItem(LS_SESSION_BACK, backNow);
            } catch {}

            return { ok: true };
        } catch (err) {
            console.error(err);
            if (isBackendDownError(err)) return { ok: false, error: "Backend nie dziala (brak polaczenia)." };
            const msg = err.response?.data?.error || "Błąd rejestracji";
            return { ok: false, error: msg };
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, authLoading: loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
