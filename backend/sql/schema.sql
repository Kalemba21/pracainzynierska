CREATE EXTENSION IF NOT EXISTS "pgcrypto";


CREATE TABLE IF NOT EXISTS app_user (
                                        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT NOT NULL UNIQUE,
    username      TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin      BOOLEAN NOT NULL DEFAULT false,
    wallet_balance DECIMAL(15,2) DEFAULT 10000.00,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );


CREATE TABLE IF NOT EXISTS portfolio (
                                         id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    name       TEXT DEFAULT 'Główny Portfel',
    currency   TEXT DEFAULT 'PLN',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),


    symbol     TEXT,
    quantity   DECIMAL(20,4) DEFAULT 0,
    avg_price  DECIMAL(18,2) DEFAULT 0,



    CONSTRAINT uq_portfolio_user_symbol UNIQUE (user_id, symbol)
    );


CREATE TABLE IF NOT EXISTS position (
                                        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolio(id) ON DELETE CASCADE,
    symbol       TEXT NOT NULL,
    source       TEXT DEFAULT 'finnhub',
    quantity     DECIMAL(20,4) NOT NULL DEFAULT 0,
    avg_price    DECIMAL(18,2) NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT now(),
    updated_at   TIMESTAMPTZ DEFAULT now(),
    UNIQUE(portfolio_id, symbol)
    );


CREATE TABLE IF NOT EXISTS trade (
                                     id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID REFERENCES portfolio(id),
    user_id      UUID REFERENCES app_user(id),
    symbol       TEXT,
    source       TEXT,
    side         TEXT,
    quantity     DECIMAL,
    price        DECIMAL,
    executed_at  TIMESTAMPTZ DEFAULT now()
    );


CREATE TABLE IF NOT EXISTS game_history (
                                            id              BIGSERIAL PRIMARY KEY,
                                            app_user_id     UUID REFERENCES app_user(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    status          TEXT,
    days_played     INT,
    final_value     DECIMAL,
    pnl             DECIMAL,
    pnl_pct         DECIMAL,
    trades_count    INT,
    difficulty_id   TEXT,
    initial_capital DECIMAL,
    trades          JSONB,

    panic_sell_count INT,
    sim_mode        TEXT,
    target_capital  DECIMAL,
    events          JSONB,
    day_log         JSONB,
    payload         JSONB
    );

CREATE TABLE IF NOT EXISTS browse_event (
                                            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES app_user(id),
    symbol      TEXT,
    event_type  TEXT,
    metadata    JSONB,
    created_at  TIMESTAMPTZ DEFAULT now()
    );




INSERT INTO app_user (email, username, password_hash, is_admin, wallet_balance)
VALUES ('admin@admin.pl', 'Admin', crypt('adminadmin', gen_salt('bf')), true, 50000.00)
    ON CONFLICT (email) DO NOTHING;

