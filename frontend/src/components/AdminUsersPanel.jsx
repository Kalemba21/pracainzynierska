import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "../AuthContext";

const API_BASE = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) || "http://localhost:4000";

function fmtDate(x) {
    try {
        return x ? new Date(x).toLocaleString("pl-PL") : "-";
    } catch {
        return "-";
    }
}

function Modal({ open, title, onClose, children }) {
    useEffect(() => {
        if (!open) return;

        const onKey = (e) => {
            if (e.key === "Escape") onClose?.();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose?.();
            }}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                padding: "1rem",
            }}
        >
            <div
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                    width: "min(520px, 100%)",
                    background: "#0b1220",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "14px",
                    boxShadow: "0 20px 70px rgba(0,0,0,0.45)",
                    overflow: "hidden",
                    color: "white",
                }}
            >
                <div
                    style={{
                        padding: "0.9rem 1rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom: "1px solid rgba(255,255,255,0.10)",
                    }}
                >
                    <div style={{ fontWeight: 700 }}>{title}</div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            border: "1px solid rgba(255,255,255,0.18)",
                            background: "transparent",
                            color: "white",
                            borderRadius: "10px",
                            padding: "0.25rem 0.55rem",
                            cursor: "pointer",
                        }}
                        aria-label="Zamknij"
                        title="Zamknij (Esc)"
                    >
                        ✕
                    </button>
                </div>

                <div style={{ padding: "1rem" }}>{children}</div>
            </div>
        </div>
    );
}

function AdminUsersPanel() {
    const { user, token: ctxToken } = useAuth();
    const token = ctxToken || user?.token || null;

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [changingId, setChangingId] = useState(null);

    const isAdmin = !!(user && (user.isAdmin || user.is_admin));
    const adminCount = useMemo(() => users.filter((u) => !!u.is_admin).length, [users]);

    const authHeaders = useMemo(
        () => ({
            headers: { Authorization: `Bearer ${token}` },
        }),
        [token]
    );

    const [modalOpen, setModalOpen] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [newPass, setNewPass] = useState("");
    const [newUsername, setNewUsername] = useState("");
    const [adding, setAdding] = useState(false);
    const [modalErr, setModalErr] = useState(null);

    const openModal = () => {
        setModalErr(null);
        setNewEmail("");
        setNewPass("");
        setNewUsername("");
        setModalOpen(true);
    };

    const closeModal = () => {
        if (adding) return;
        setModalOpen(false);
        setModalErr(null);
    };

    const [editOpen, setEditOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [editEmail, setEditEmail] = useState("");
    const [editUsername, setEditUsername] = useState("");
    const [editPass, setEditPass] = useState("");
    const [editSaving, setEditSaving] = useState(false);
    const [editErr, setEditErr] = useState(null);

    const openEditModal = (targetUser) => {
        setEditErr(null);
        setEditTarget(targetUser);
        setEditEmail(targetUser?.email || "");
        setEditUsername(targetUser?.username || "");
        setEditPass("");
        setEditOpen(true);
    };

    const closeEditModal = () => {
        if (editSaving) return;
        setEditOpen(false);
        setEditTarget(null);
        setEditErr(null);
    };

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await axios.get(`${API_BASE}/api/admin/users`, authHeaders);
            setUsers(res.data.users || []);
        } catch (err) {
            console.error("GET /api/admin/users error:", err);

            const status = err.response?.status;
            let errorMessage;

            if (status === 401) {
                errorMessage = "Sesja wygasła lub token jest nieprawidłowy. Zaloguj się ponownie.";
            } else if (status === 403) {
                errorMessage = "Brak uprawnień administratora.";
            } else {
                errorMessage =
                    err.response?.data?.error ||
                    err.response?.data?.details ||
                    `Błąd ${status || ""}: Nie udało się pobrać listy użytkowników`;
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user || !(user.isAdmin || user.is_admin)) {
            setUsers([]);
            setLoading(false);
            setError("Brak uprawnień administratora.");
            return;
        }

        if (!token) {
            setUsers([]);
            setLoading(false);
            setError("Brak tokenu uwierzytelniającego – zaloguj się ponownie.");
            return;
        }

        fetchUsers();

    }, [user, token]);

    if (!user || !isAdmin) {
        return <p>Brak dostępu (tylko administrator).</p>;
    }

    const handleToggleAdmin = async (targetUser) => {
        if (!token) {
            setError("Brak tokenu – zaloguj się ponownie.");
            return;
        }

        if (targetUser.is_admin && adminCount <= 1) {
            alert("Musi zostać przynajmniej jeden admin.");
            return;
        }

        if (!window.confirm(`Na pewno chcesz zmienić rolę admina dla ${targetUser.email}?`)) return;

        setError(null);
        setChangingId(targetUser.id);

        try {
            const nextIsAdmin = !targetUser.is_admin;

            const res = await axios.patch(
                `${API_BASE}/api/admin/users/${targetUser.id}/admin`,
                { isAdmin: nextIsAdmin },
                authHeaders
            );

            const updated = res.data.user;
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        } catch (err) {
            console.error("PATCH /api/admin/users/:id/admin error:", err);
            const status = err.response?.status;

            const errorMessage =
                err.response?.data?.error ||
                err.response?.data?.details ||
                `Błąd ${status || ""}: Nie udało się zmienić roli użytkownika`;

            setError(errorMessage);
        } finally {
            setChangingId(null);
        }
    };

    const handleDeleteUser = async (targetUser) => {
        if (!token) {
            setError("Brak tokenu – zaloguj się ponownie.");
            return;
        }

        if (targetUser.id === user.id) {
            alert("Nie możesz usunąć samego siebie.");
            return;
        }
        if (targetUser.is_admin && adminCount <= 1) {
            alert("Nie możesz usunąć ostatniego admina.");
            return;
        }

        if (!window.confirm(`Na pewno chcesz USUNĄĆ użytkownika ${targetUser.email}?`)) return;

        setError(null);
        setChangingId(targetUser.id);

        try {
            await axios.delete(`${API_BASE}/api/admin/users/${targetUser.id}`, authHeaders);
            setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
        } catch (err) {
            console.error("DELETE /api/admin/users/:id error:", err);
            const status = err.response?.status;

            const errorMessage =
                err.response?.data?.error ||
                err.response?.data?.details ||
                `Błąd ${status || ""}: Nie udało się usunąć użytkownika`;

            setError(errorMessage);
        } finally {
            setChangingId(null);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        if (!token) return setModalErr("Brak tokenu – zaloguj się ponownie.");

        const email = newEmail.trim();
        const password = newPass;

        if (!email.includes("@")) return setModalErr("Podaj poprawny email");
        if (password.length < 6) return setModalErr("Hasło musi mieć min. 6 znaków");

        setAdding(true);
        setModalErr(null);

        try {
            const res = await axios.post(
                `${API_BASE}/api/admin/users`,
                {
                    email,
                    password,
                    username: newUsername.trim() || undefined,
                },
                authHeaders
            );

            const created = res.data.user;
            setUsers((prev) => [created, ...prev]);
            setModalOpen(false);
        } catch (err) {
            console.error("POST /api/admin/users error:", err);
            const status = err.response?.status;

            const msg =
                err.response?.data?.error ||
                err.response?.data?.details ||
                `Błąd ${status || ""}: Nie udało się dodać użytkownika`;

            setModalErr(msg);
        } finally {
            setAdding(false);
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        if (!token) return setEditErr("Brak tokenu – zaloguj się ponownie.");
        if (!editTarget?.id) return setEditErr("Nie wybrano użytkownika do edycji.");

        const email = editEmail.trim();
        const username = editUsername.trim();
        const password = editPass;

        if (!email.includes("@")) return setEditErr("Podaj poprawny email");
        if (password && password.length > 0 && password.length < 6) {
            return setEditErr("Hasło musi mieć min. 6 znaków (albo zostaw puste, żeby nie zmieniać).");
        }

        setEditSaving(true);
        setEditErr(null);
        setChangingId(editTarget.id);

        try {
            const payload = {
                email,
                username: username || null, // możesz ustalić: null = usuń nazwę / backend może to zignorować
                ...(password && password.length ? { password } : {}),
            };

            const res = await axios.patch(
                `${API_BASE}/api/admin/users/${editTarget.id}`,
                payload,
                authHeaders
            );

            const updated = res.data.user;
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

            setEditOpen(false);
            setEditTarget(null);
        } catch (err) {
            console.error("PATCH /api/admin/users/:id error:", err);
            const status = err.response?.status;

            const msg =
                err.response?.data?.error ||
                err.response?.data?.details ||
                `Błąd ${status || ""}: Nie udało się zaktualizować użytkownika`;

            setEditErr(msg);
        } finally {
            setEditSaving(false);
            setChangingId(null);
        }
    };

    if (loading) return <p>Ładowanie listy użytkowników...</p>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="admin-users" style={{ color: "white" }}>
            <p className="hint">
                Lista wszystkich użytkowników zapisanych w bazie danych. Możesz edytować email / nazwę / hasło,
                nadawać i odbierać rolę admina oraz usuwać konta (musi zostać przynajmniej jeden admin).
            </p>

            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", alignItems: "center" }}>
                <button type="button" onClick={openModal}>
                    Dodaj użytkownika
                </button>
                <button type="button" onClick={fetchUsers}>
                    Odśwież
                </button>
                <span className="hint-inline">Adminów: {adminCount}</span>
            </div>

            {}
            <Modal open={modalOpen} title="Dodaj nowego użytkownika" onClose={closeModal}>
                <form onSubmit={handleAddUser}>
                    <div className="game-order-row">
                        <label>
                            Email
                            <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder="np. user@test.pl"
                                required
                            />
                        </label>
                    </div>

                    <div className="game-order-row" style={{ marginTop: "0.4rem" }}>
                        <label>
                            Hasło
                            <input
                                type="password"
                                value={newPass}
                                onChange={(e) => setNewPass(e.target.value)}
                                placeholder="min. 6 znaków"
                                required
                            />
                        </label>
                    </div>

                    <div className="game-order-row" style={{ marginTop: "0.4rem" }}>
                        <label>
                            Nazwa (opcjonalnie)
                            <input
                                type="text"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                placeholder="np. janek"
                            />
                        </label>
                    </div>

                    {modalErr && (
                        <div className="error" style={{ marginTop: "0.6rem" }}>
                            {modalErr}
                        </div>
                    )}

                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.9rem", justifyContent: "flex-end" }}>
                        <button type="button" onClick={closeModal} disabled={adding}>
                            Anuluj
                        </button>
                        <button type="submit" disabled={adding}>
                            {adding ? "Dodawanie..." : "Dodaj"}
                        </button>
                    </div>
                </form>
            </Modal>

            {}
            <Modal
                open={editOpen}
                title={editTarget ? `Edytuj użytkownika: ${editTarget.email}` : "Edytuj użytkownika"}
                onClose={closeEditModal}
            >
                <form onSubmit={handleUpdateUser}>
                    <div className="game-order-row">
                        <label>
                            Email
                            <input
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                placeholder="np. user@test.pl"
                                required
                            />
                        </label>
                    </div>

                    <div className="game-order-row" style={{ marginTop: "0.4rem" }}>
                        <label>
                            Nazwa (opcjonalnie)
                            <input
                                type="text"
                                value={editUsername}
                                onChange={(e) => setEditUsername(e.target.value)}
                                placeholder="np. janek (puste = brak)"
                            />
                        </label>
                    </div>

                    <div className="game-order-row" style={{ marginTop: "0.4rem" }}>
                        <label>
                            Nowe hasło (opcjonalnie)
                            <input
                                type="password"
                                value={editPass}
                                onChange={(e) => setEditPass(e.target.value)}
                                placeholder="zostaw puste, żeby nie zmieniać"
                            />
                        </label>
                    </div>

                    {editErr && (
                        <div className="error" style={{ marginTop: "0.6rem" }}>
                            {editErr}
                        </div>
                    )}

                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.9rem", justifyContent: "flex-end" }}>
                        <button type="button" onClick={closeEditModal} disabled={editSaving}>
                            Anuluj
                        </button>
                        <button type="submit" disabled={editSaving}>
                            {editSaving ? "Zapisywanie..." : "Zapisz"}
                        </button>
                    </div>
                </form>
            </Modal>

            {!users.length ? (
                <p>Brak użytkowników w bazie.</p>
            ) : (
                <div className="admin-users-table-wrapper" style={{ overflowX: "auto" }}>
                    <table className="admin-users-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                        <tr>
                            <th style={{ textAlign: "left", padding: "0.5rem" }}>Email</th>
                            <th style={{ textAlign: "left", padding: "0.5rem" }}>Nazwa</th>
                            <th style={{ textAlign: "left", padding: "0.5rem" }}>Admin</th>
                            <th style={{ textAlign: "left", padding: "0.5rem" }}>Utworzony</th>
                            <th style={{ textAlign: "left", padding: "0.5rem" }}>Akcje</th>
                        </tr>
                        </thead>
                        <tbody>
                        {users.map((u) => {
                            const isSelf = u.id === user.id;
                            const isRowAdmin = !!u.is_admin;

                            const disableToggle = isSelf || (isRowAdmin && adminCount <= 1);
                            const disableDelete = isSelf || (isRowAdmin && adminCount <= 1);

                            const rowBusy = changingId === u.id;

                            return (
                                <tr key={u.id} style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
                                    <td style={{ padding: "0.5rem" }}>{u.email}</td>
                                    <td style={{ padding: "0.5rem" }}>{u.username || "-"}</td>
                                    <td style={{ padding: "0.5rem" }}>{isRowAdmin ? "✔️" : ""}</td>
                                    <td style={{ padding: "0.5rem" }}>{fmtDate(u.created_at)}</td>
                                    <td style={{ padding: "0.5rem" }}>
                                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(u)}
                                                disabled={rowBusy}
                                                title="Edytuj dane użytkownika"
                                            >
                                                {rowBusy ? "..." : "Edytuj"}
                                            </button>

                                            {isSelf ? (
                                                <span style={{ alignSelf: "center", opacity: 0.8 }}>to Ty</span>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleAdmin(u)}
                                                        disabled={disableToggle || rowBusy}
                                                    >
                                                        {rowBusy
                                                            ? "Zapisywanie..."
                                                            : isRowAdmin
                                                                ? "Odbierz admina"
                                                                : "Nadaj admina"}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteUser(u)}
                                                        disabled={disableDelete || rowBusy}
                                                    >
                                                        {rowBusy ? "..." : "Usuń"}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default AdminUsersPanel;
