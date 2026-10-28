-- ============================================================================
-- NNNC STONKS: INITIAL DATABASE SCHEMA & FINANCIAL vAMM ENGINE
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS & DOMAINS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'mod', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('pending', 'active', 'failed', 'banned');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE stonk_status AS ENUM ('active', 'suspended', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE position_type AS ENUM ('long', 'short');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE position_status AS ENUM ('open', 'closed', 'liquidated');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE trade_type AS ENUM ('buy', 'sell', 'short_open', 'short_close', 'liquidation', 'central_bank_crash');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. TABLES

-- USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    status user_status NOT NULL DEFAULT 'pending',
    temp_password TEXT NULL,
    must_change_password BOOLEAN NOT NULL DEFAULT true,
    edgecoin_balance NUMERIC(18, 2) NOT NULL DEFAULT 100000.00 CHECK (edgecoin_balance >= 0),
    last_checkin_at TIMESTAMPTZ NULL,
    checkin_streak INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT username_format CHECK (username ~* '^[a-zA-Z0-9_-]{3,30}$')
);

-- STONKS (Community Members tradable in the vAMM)
CREATE TABLE IF NOT EXISTS public.stonks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    ticker TEXT UNIQUE NOT NULL,
    status stonk_status NOT NULL DEFAULT 'active',
    reserve_x NUMERIC(18, 4) NOT NULL DEFAULT 250000.0000 CHECK (reserve_x > 0),
    reserve_y NUMERIC(18, 4) NOT NULL DEFAULT 2500.0000 CHECK (reserve_y > 0),
    k_constant NUMERIC(28, 4) NOT NULL DEFAULT 625000000.0000 CHECK (k_constant > 0),
    current_price NUMERIC(18, 4) NOT NULL DEFAULT 100.0000 CHECK (current_price > 0),
    high_24h NUMERIC(18, 4) NOT NULL DEFAULT 100.0000,
    low_24h NUMERIC(18, 4) NOT NULL DEFAULT 100.0000,
    volume_24h NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    total_volume NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- USER SESSIONS (Stateless Bearer Tokens)
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- POSITIONS (Long Holdings and Leveraged Short Positions)
CREATE TABLE IF NOT EXISTS public.positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    stonk_id UUID NOT NULL REFERENCES public.stonks(id) ON DELETE CASCADE,
    pos_type position_type NOT NULL,
    shares NUMERIC(18, 4) NOT NULL CHECK (shares > 0),
    leverage NUMERIC(4, 1) NOT NULL DEFAULT 1.0 CHECK (leverage IN (1.0, 2.0, 5.0)),
    collateral NUMERIC(18, 2) NOT NULL DEFAULT 0.00 CHECK (collateral >= 0),
    entry_price NUMERIC(18, 4) NOT NULL CHECK (entry_price > 0),
    liquidation_price NUMERIC(18, 4) NULL,
    status position_status NOT NULL DEFAULT 'open',
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ NULL
);

-- TRADES (Audit Log & Feed)
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    stonk_id UUID NOT NULL REFERENCES public.stonks(id) ON DELETE CASCADE,
    trade_type trade_type NOT NULL,
    shares NUMERIC(18, 4) NOT NULL,
    price NUMERIC(18, 4) NOT NULL,
    total_edgecoins NUMERIC(18, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PRICE HISTORY (For Candlestick / Line Charts)
CREATE TABLE IF NOT EXISTS public.price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stonk_id UUID NOT NULL REFERENCES public.stonks(id) ON DELETE CASCADE,
    price NUMERIC(18, 4) NOT NULL,
    volume NUMERIC(18, 4) NOT NULL DEFAULT 0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES FOR HIGH-CONCURRENCY LOOKUPS
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_stonks_ticker ON public.stonks(ticker);
CREATE INDEX IF NOT EXISTS idx_stonks_current_price ON public.stonks(current_price DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_positions_user ON public.positions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_positions_stonk ON public.positions(stonk_id, status);
CREATE INDEX IF NOT EXISTS idx_trades_stonk ON public.trades(stonk_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_stonk ON public.price_history(stonk_id, recorded_at DESC);

-- 4. ROW-LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stonks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Public can view active stonks, price history, and trade feed
CREATE POLICY "Public read stonks" ON public.stonks FOR SELECT USING (true);
CREATE POLICY "Public read price history" ON public.price_history FOR SELECT USING (true);
CREATE POLICY "Public read trades" ON public.trades FOR SELECT USING (true);

-- Users can only view public safe profile fields
CREATE POLICY "Public read safe user profiles" ON public.users FOR SELECT USING (true);

-- Disallow direct table modifications from anonymous web client
CREATE POLICY "No direct client inserts on users" ON public.users FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct client updates on users" ON public.users FOR UPDATE USING (false);
CREATE POLICY "No direct client modifications on stonks" ON public.stonks FOR ALL USING (false);
CREATE POLICY "No direct client modifications on positions" ON public.positions FOR ALL USING (false);
CREATE POLICY "No direct client modifications on trades" ON public.trades FOR ALL USING (false);

-- ============================================================================
-- 5. RPC PROCEDURES (ALL MUTATIONS ENFORCED SERVER-SIDE)
-- ============================================================================

-- HELPER: Validate Session and Return User Record
CREATE OR REPLACE FUNCTION public.auth_get_user(p_token TEXT)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user public.users;
BEGIN
    SELECT u.* INTO v_user
    FROM public.user_sessions s
    JOIN public.users u ON s.user_id = u.id
    WHERE s.token = p_token AND s.expires_at > now();

    IF v_user.id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Invalid or expired session token.';
    END IF;

    IF v_user.status = 'banned' THEN
        RAISE EXCEPTION 'Account suspended: You are banned from NNNC Stonks.';
    END IF;

    RETURN v_user;
END;
$$;

-- RPC: Sign-Up Request (User submits Reddit username)
CREATE OR REPLACE FUNCTION public.rpc_signup_request(p_username TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clean_username TEXT;
    v_user_id UUID;
BEGIN
    v_clean_username := lower(trim(p_username));
    IF v_clean_username LIKE 'u/%' THEN
        v_clean_username := substring(v_clean_username from 3);
    END IF;

    IF length(v_clean_username) < 3 OR length(v_clean_username) > 30 THEN
        RAISE EXCEPTION 'Username must be between 3 and 30 characters.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.users WHERE lower(username) = v_clean_username) THEN
        RAISE EXCEPTION 'A trader with username "%" already exists.', v_clean_username;
    END IF;

    INSERT INTO public.users (
        username,
        password_hash,
        role,
        status,
        temp_password,
        must_change_password,
        edgecoin_balance
    ) VALUES (
        v_clean_username,
        crypt(gen_random_uuid()::text, gen_salt('bf', 10)),
        'user',
        'pending',
        NULL,
        true,
        100000.00
    ) RETURNING id INTO v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Sign-up submitted! A moderator will reach out via Reddit DM with your temporary password.',
        'username', v_clean_username
    );
END;
$$;

-- RPC: Moderator Approves User, Sets Temp Password, & Mints Tradeable Stonk
CREATE OR REPLACE FUNCTION public.rpc_mod_approve_user(
    p_session_token TEXT,
    p_target_username TEXT,
    p_temp_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_mod public.users;
    v_target public.users;
    v_stonk_id UUID;
    v_ticker TEXT;
BEGIN
    v_mod := public.auth_get_user(p_session_token);
    IF v_mod.role NOT IN ('mod', 'admin') THEN
        RAISE EXCEPTION 'Forbidden: Only community moderators can approve accounts.';
    END IF;

    SELECT * INTO v_target FROM public.users WHERE lower(username) = lower(trim(p_target_username));
    IF v_target.id IS NULL THEN
        RAISE EXCEPTION 'User not found.';
    END IF;

    IF v_target.status != 'pending' THEN
        RAISE EXCEPTION 'User is already active or processed.';
    END IF;

    -- Update User
    UPDATE public.users SET
        status = 'active',
        password_hash = crypt(p_temp_password, gen_salt('bf', 10)),
        temp_password = p_temp_password,
        must_change_password = true,
        updated_at = now()
    WHERE id = v_target.id;

    -- Mint Personal Stonk
    v_ticker := upper(v_target.username);
    INSERT INTO public.stonks (
        user_id,
        ticker,
        status,
        reserve_x,
        reserve_y,
        k_constant,
        current_price
    ) VALUES (
        v_target.id,
        v_ticker,
        'active',
        250000.0000,
        2500.0000,
        625000000.0000,
        100.0000
    ) RETURNING id INTO v_stonk_id;

    -- Record Initial Price History
    INSERT INTO public.price_history (stonk_id, price, volume)
    VALUES (v_stonk_id, 100.0000, 0);

    RETURN jsonb_build_object(
        'success', true,
        'username', v_target.username,
        'ticker', v_ticker,
        'temp_password', p_temp_password
    );
END;
$$;

-- RPC: Moderator Denies / Rejects Pending User
CREATE OR REPLACE FUNCTION public.rpc_mod_deny_user(
    p_session_token TEXT,
    p_target_username TEXT,
    p_reason TEXT DEFAULT 'Denied by moderator'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_mod public.users;
    v_target public.users;
BEGIN
    v_mod := public.auth_get_user(p_session_token);
    IF v_mod.role NOT IN ('mod', 'admin') THEN
        RAISE EXCEPTION 'Forbidden: Only community moderators can deny accounts.';
    END IF;

    SELECT * INTO v_target FROM public.users WHERE lower(username) = lower(trim(p_target_username));
    IF v_target.id IS NULL THEN
        RAISE EXCEPTION 'User not found.';
    END IF;

    -- Remove user from queue
    DELETE FROM public.users WHERE id = v_target.id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'User rejected and purged from queue.',
        'username', v_target.username
    );
END;
$$;

-- RPC: Moderator Bulk Deny
CREATE OR REPLACE FUNCTION public.rpc_mod_bulk_deny(
    p_session_token TEXT,
    p_usernames TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_mod public.users;
    v_count INT := 0;
    v_u TEXT;
BEGIN
    v_mod := public.auth_get_user(p_session_token);
    IF v_mod.role NOT IN ('mod', 'admin') THEN
        RAISE EXCEPTION 'Forbidden: Only moderators can bulk deny.';
    END IF;

    FOREACH v_u IN ARRAY p_usernames LOOP
        DELETE FROM public.users WHERE lower(username) = lower(trim(v_u)) AND status = 'pending';
        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'denied_count', v_count
    );
END;
$$;

-- RPC: Moderator Retrieves Pending Users
CREATE OR REPLACE FUNCTION public.rpc_get_pending_users(p_session_token TEXT)
RETURNS TABLE (id UUID, username TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_mod public.users;
BEGIN
    v_mod := public.auth_get_user(p_session_token);
    IF v_mod.role NOT IN ('mod', 'admin') THEN
        RAISE EXCEPTION 'Forbidden: Only moderators can view pending verification queue.';
    END IF;

    RETURN QUERY
    SELECT u.id, u.username, u.created_at
    FROM public.users u
    WHERE u.status = 'pending'
    ORDER BY u.created_at ASC;
END;
$$;

-- RPC: User Login (Username + Password)
CREATE OR REPLACE FUNCTION public.rpc_login(
    p_username TEXT,
    p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clean_username TEXT;
    v_user public.users;
    v_token TEXT;
BEGIN
    v_clean_username := lower(trim(p_username));
    IF v_clean_username LIKE 'u/%' THEN
        v_clean_username := substring(v_clean_username from 3);
    END IF;

    SELECT * INTO v_user FROM public.users WHERE lower(username) = v_clean_username;

    IF v_user.id IS NULL OR v_user.password_hash != crypt(p_password, v_user.password_hash) THEN
        RAISE EXCEPTION 'Invalid username or password.';
    END IF;

    IF v_user.status = 'pending' THEN
        RAISE EXCEPTION 'Account pending: A moderator has not approved your account yet.';
    END IF;

    IF v_user.status = 'banned' THEN
        RAISE EXCEPTION 'Account suspended: You have been banned.';
    END IF;

    -- Generate cryptographically secure session token
    v_token := encode(gen_random_bytes(32), 'hex');

    INSERT INTO public.user_sessions (user_id, token, expires_at)
    VALUES (v_user.id, v_token, now() + INTERVAL '30 days');

    RETURN jsonb_build_object(
        'success', true,
        'session_token', v_token,
        'user', jsonb_build_object(
            'id', v_user.id,
            'username', v_user.username,
            'role', v_user.role,
            'status', v_user.status,
            'edgecoin_balance', v_user.edgecoin_balance,
            'must_change_password', v_user.must_change_password,
            'checkin_streak', v_user.checkin_streak
        )
    );
END;
$$;

-- RPC: Change Password
CREATE OR REPLACE FUNCTION public.rpc_change_password(
    p_session_token TEXT,
    p_old_password TEXT,
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user public.users;
BEGIN
    v_user := public.auth_get_user(p_session_token);

    IF v_user.password_hash != crypt(p_old_password, v_user.password_hash) THEN
        RAISE EXCEPTION 'Current password is incorrect.';
    END IF;

    IF length(p_new_password) < 6 THEN
        RAISE EXCEPTION 'New password must be at least 6 characters long.';
    END IF;

    UPDATE public.users SET
        password_hash = crypt(p_new_password, gen_salt('bf', 10)),
        temp_password = NULL,
        must_change_password = false,
        updated_at = now()
    WHERE id = v_user.id;

    RETURN jsonb_build_object('success', true, 'message', 'Password updated successfully.');
END;
$$;

-- RPC: Daily Check-in (Option A: High Stakes & Survival Streak)
CREATE OR REPLACE FUNCTION public.rpc_daily_checkin(p_session_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user public.users;
    v_new_streak INT;
    v_payout NUMERIC(18, 2);
    v_hours_since NUMERIC;
BEGIN
    v_user := public.auth_get_user(p_session_token);

    IF v_user.last_checkin_at IS NOT NULL THEN
        -- Check if already checked in today (UTC calendar day)
        IF date_trunc('day', v_user.last_checkin_at AT TIME ZONE 'UTC') = date_trunc('day', now() AT TIME ZONE 'UTC') THEN
            RAISE EXCEPTION 'Already checked in today! Come back tomorrow for your next survival bounty.';
        END IF;

        v_hours_since := EXTRACT(EPOCH FROM (now() - v_user.last_checkin_at)) / 3600.0;
        IF v_hours_since > 48.0 THEN
            v_new_streak := 1; -- Streak broken after 48h
        ELSE
            v_new_streak := v_user.checkin_streak + 1;
        END IF;
    ELSE
        v_new_streak := 1;
    END IF;

    -- Formula: 2500 base + (streak - 1) * 250
    v_payout := 2500.00 + ((v_new_streak - 1) * 250.00);

    UPDATE public.users SET
        edgecoin_balance = edgecoin_balance + v_payout,
        last_checkin_at = now(),
        checkin_streak = v_new_streak,
        updated_at = now()
    WHERE id = v_user.id;

    RETURN jsonb_build_object(
        'success', true,
        'payout', v_payout,
        'new_streak', v_new_streak,
        'new_balance', v_user.edgecoin_balance + v_payout
    );
END;
$$;

-- RPC: Execute Buy (Long via vAMM x * y = k) with Anti-Self-Trading Guard
CREATE OR REPLACE FUNCTION public.rpc_execute_buy(
    p_session_token TEXT,
    p_stonk_id UUID,
    p_edgecoins NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user public.users;
    v_stonk public.stonks;
    v_pos public.positions;
    v_delta_x NUMERIC(18, 4);
    v_new_x NUMERIC(18, 4);
    v_new_y NUMERIC(18, 4);
    v_shares_minted NUMERIC(18, 4);
    v_new_price NUMERIC(18, 4);
    v_avg_price NUMERIC(18, 4);
BEGIN
    v_user := public.auth_get_user(p_session_token);
    v_delta_x := p_edgecoins;

    IF v_delta_x <= 0 THEN
        RAISE EXCEPTION 'Order amount must be greater than 0 Edgecoins.';
    END IF;

    IF v_delta_x > 25000.00 THEN
        RAISE EXCEPTION 'Single trade exceeds maximum anti-griefing limit (25,000 Edgecoins).';
    END IF;

    IF v_user.edgecoin_balance < v_delta_x THEN
        RAISE EXCEPTION 'Insufficient Edgecoin balance.';
    END IF;

    SELECT * INTO v_stonk FROM public.stonks WHERE id = p_stonk_id FOR UPDATE;
    IF v_stonk.id IS NULL THEN
        RAISE EXCEPTION 'Stonk not found.';
    END IF;

    IF v_stonk.status != 'active' THEN
        RAISE EXCEPTION 'Trading is suspended on this stonk.';
    END IF;

    -- STRICT ANTI-SELF-TRADING GUARD
    IF v_stonk.user_id = v_user.id THEN
        RAISE EXCEPTION 'Self-trading prohibited: You cannot trade or hold shares of your own community stonk.';
    END IF;

    -- Constant Product Math: (x + dx) * (y - dy) = k
    v_new_x := v_stonk.reserve_x + v_delta_x;
    v_new_y := v_stonk.k_constant / v_new_x;
    v_shares_minted := v_stonk.reserve_y - v_new_y;
    v_new_price := v_new_x / v_new_y;
    v_avg_price := v_delta_x / v_shares_minted;

    -- Deduct Balance
    UPDATE public.users SET
        edgecoin_balance = edgecoin_balance - v_delta_x,
        updated_at = now()
    WHERE id = v_user.id;

    -- Update Stonk Reserves
    UPDATE public.stonks SET
        reserve_x = v_new_x,
        reserve_y = v_new_y,
        current_price = v_new_price,
        high_24h = GREATEST(high_24h, v_new_price),
        low_24h = LEAST(low_24h, v_new_price),
        volume_24h = volume_24h + v_delta_x,
        total_volume = total_volume + v_delta_x,
        updated_at = now()
    WHERE id = v_stonk.id;

    -- Upsert Long Position
    SELECT * INTO v_pos FROM public.positions
    WHERE user_id = v_user.id AND stonk_id = v_stonk.id AND pos_type = 'long' AND status = 'open'
    FOR UPDATE;

    IF v_pos.id IS NOT NULL THEN
        UPDATE public.positions SET
            entry_price = ((v_pos.shares * v_pos.entry_price) + (v_shares_minted * v_avg_price)) / (v_pos.shares + v_shares_minted),
            shares = shares + v_shares_minted
        WHERE id = v_pos.id;
    ELSE
        INSERT INTO public.positions (
            user_id, stonk_id, pos_type, shares, leverage, collateral, entry_price, status
        ) VALUES (
            v_user.id, v_stonk.id, 'long', v_shares_minted, 1.0, 0.0, v_avg_price, 'open'
        );
    END IF;

    -- Record Trade & Chart Price Point
    INSERT INTO public.trades (user_id, stonk_id, trade_type, shares, price, total_edgecoins)
    VALUES (v_user.id, v_stonk.id, 'buy', v_shares_minted, v_avg_price, v_delta_x);

    INSERT INTO public.price_history (stonk_id, price, volume)
    VALUES (v_stonk.id, v_new_price, v_delta_x);

    -- Check and trigger liquidations on any shorts that got rekt by this buy
    PERFORM public.internal_check_liquidations(v_stonk.id, v_new_price);

    RETURN jsonb_build_object(
        'success', true,
        'shares_received', v_shares_minted,
        'avg_price', v_avg_price,
        'new_spot_price', v_new_price,
        'remaining_balance', v_user.edgecoin_balance - v_delta_x
    );
END;
$$;

-- RPC: Execute Sell (Long via vAMM) with Anti-Self-Trading Guard
CREATE OR REPLACE FUNCTION public.rpc_execute_sell(
    p_session_token TEXT,
    p_stonk_id UUID,
    p_shares NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user public.users;
    v_stonk public.stonks;
    v_pos public.positions;
    v_shares_sold NUMERIC(18, 4);
    v_new_x NUMERIC(18, 4);
    v_new_y NUMERIC(18, 4);
    v_edgecoins_returned NUMERIC(18, 4);
    v_new_price NUMERIC(18, 4);
    v_avg_price NUMERIC(18, 4);
BEGIN
    v_user := public.auth_get_user(p_session_token);
    v_shares_sold := p_shares;

    IF v_shares_sold <= 0 THEN
        RAISE EXCEPTION 'Share amount must be greater than 0.';
    END IF;

    SELECT * INTO v_stonk FROM public.stonks WHERE id = p_stonk_id FOR UPDATE;
    IF v_stonk.id IS NULL THEN
        RAISE EXCEPTION 'Stonk not found.';
    END IF;

    -- STRICT ANTI-SELF-TRADING GUARD
    IF v_stonk.user_id = v_user.id THEN
        RAISE EXCEPTION 'Self-trading prohibited.';
    END IF;

    SELECT * INTO v_pos FROM public.positions
    WHERE user_id = v_user.id AND stonk_id = v_stonk.id AND pos_type = 'long' AND status = 'open'
    FOR UPDATE;

    IF v_pos.id IS NULL OR v_pos.shares < v_shares_sold THEN
        RAISE EXCEPTION 'Insufficient shares to sell.';
    END IF;

    -- Constant Product Math: (y + dy) * (x - dx) = k
    v_new_y := v_stonk.reserve_y + v_shares_sold;
    v_new_x := v_stonk.k_constant / v_new_y;
    v_edgecoins_returned := v_stonk.reserve_x - v_new_x;
    v_new_price := v_new_x / v_new_y;
    v_avg_price := v_edgecoins_returned / v_shares_sold;

    -- Credit User Balance
    UPDATE public.users SET
        edgecoin_balance = edgecoin_balance + v_edgecoins_returned,
        updated_at = now()
    WHERE id = v_user.id;

    -- Update Stonk Reserves
    UPDATE public.stonks SET
        reserve_x = v_new_x,
        reserve_y = v_new_y,
        current_price = v_new_price,
        high_24h = GREATEST(high_24h, v_new_price),
        low_24h = LEAST(low_24h, v_new_price),
        volume_24h = volume_24h + v_edgecoins_returned,
        total_volume = total_volume + v_edgecoins_returned,
        updated_at = now()
    WHERE id = v_stonk.id;

    -- Update Position
    IF (v_pos.shares - v_shares_sold) <= 0.0001 THEN
        UPDATE public.positions SET shares = 0, status = 'closed', closed_at = now() WHERE id = v_pos.id;
    ELSE
        UPDATE public.positions SET shares = shares - v_shares_sold WHERE id = v_pos.id;
    END IF;

    -- Record Trade & Chart Price Point
    INSERT INTO public.trades (user_id, stonk_id, trade_type, shares, price, total_edgecoins)
    VALUES (v_user.id, v_stonk.id, 'sell', v_shares_sold, v_avg_price, v_edgecoins_returned);

    INSERT INTO public.price_history (stonk_id, price, volume)
    VALUES (v_stonk.id, v_new_price, v_edgecoins_returned);

    RETURN jsonb_build_object(
        'success', true,
        'edgecoins_returned', v_edgecoins_returned,
        'avg_price', v_avg_price,
        'new_spot_price', v_new_price,
        'remaining_shares', GREATEST(0, v_pos.shares - v_shares_sold)
    );
END;
$$;

-- RPC: Open Leveraged Short Position (1x, 2x, 5x)
CREATE OR REPLACE FUNCTION public.rpc_open_short(
    p_session_token TEXT,
    p_stonk_id UUID,
    p_collateral NUMERIC,
    p_leverage NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user public.users;
    v_stonk public.stonks;
    v_position_value NUMERIC(18, 4);
    v_shares NUMERIC(18, 4);
    v_liq_price NUMERIC(18, 4);
    v_mmr NUMERIC := 0.15; -- 15% Maintenance Margin Ratio
    v_pos_id UUID;
BEGIN
    v_user := public.auth_get_user(p_session_token);

    IF p_leverage NOT IN (1.0, 2.0, 5.0) THEN
        RAISE EXCEPTION 'Invalid leverage. Choose 1x, 2x, or 5x.';
    END IF;

    IF p_collateral <= 0 OR p_collateral > v_user.edgecoin_balance THEN
        RAISE EXCEPTION 'Insufficient collateral balance.';
    END IF;

    SELECT * INTO v_stonk FROM public.stonks WHERE id = p_stonk_id;
    IF v_stonk.id IS NULL OR v_stonk.status != 'active' THEN
        RAISE EXCEPTION 'Stonk is not active for shorting.';
    END IF;

    -- STRICT ANTI-SELF-TRADING / ANTI-SABOTAGE GUARD
    IF v_stonk.user_id = v_user.id THEN
        RAISE EXCEPTION 'Self-trading prohibited: You cannot short your own community stonk.';
    END IF;

    v_position_value := p_collateral * p_leverage;
    v_shares := v_position_value / v_stonk.current_price;
    v_liq_price := v_stonk.current_price * (1.0 + ((1.0 - v_mmr) / p_leverage));

    -- Lock Collateral
    UPDATE public.users SET
        edgecoin_balance = edgecoin_balance - p_collateral,
        updated_at = now()
    WHERE id = v_user.id;

    -- Create Short Position
    INSERT INTO public.positions (
        user_id, stonk_id, pos_type, shares, leverage, collateral, entry_price, liquidation_price, status
    ) VALUES (
        v_user.id, v_stonk.id, 'short', v_shares, p_leverage, p_collateral, v_stonk.current_price, v_liq_price, 'open'
    ) RETURNING id INTO v_pos_id;

    INSERT INTO public.trades (user_id, stonk_id, trade_type, shares, price, total_edgecoins)
    VALUES (v_user.id, v_stonk.id, 'short_open', v_shares, v_stonk.current_price, p_collateral);

    RETURN jsonb_build_object(
        'success', true,
        'position_id', v_pos_id,
        'entry_price', v_stonk.current_price,
        'liquidation_price', v_liq_price,
        'shares_shorted', v_shares
    );
END;
$$;

-- RPC: Close Short Position
CREATE OR REPLACE FUNCTION public.rpc_close_short(
    p_session_token TEXT,
    p_position_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user public.users;
    v_pos public.positions;
    v_stonk public.stonks;
    v_pnl NUMERIC(18, 2);
    v_payout NUMERIC(18, 2);
BEGIN
    v_user := public.auth_get_user(p_session_token);

    SELECT * INTO v_pos FROM public.positions WHERE id = p_position_id FOR UPDATE;
    IF v_pos.id IS NULL OR v_pos.user_id != v_user.id OR v_pos.pos_type != 'short' OR v_pos.status != 'open' THEN
        RAISE EXCEPTION 'Active short position not found.';
    END IF;

    SELECT * INTO v_stonk FROM public.stonks WHERE id = v_pos.stonk_id;

    -- Short PnL = Shares * (Entry Price - Current Price)
    v_pnl := v_pos.shares * (v_pos.entry_price - v_stonk.current_price);
    v_payout := GREATEST(0.00, v_pos.collateral + v_pnl);

    -- Credit User
    UPDATE public.users SET
        edgecoin_balance = edgecoin_balance + v_payout,
        updated_at = now()
    WHERE id = v_user.id;

    -- Mark Position Closed
    UPDATE public.positions SET
        status = 'closed',
        closed_at = now()
    WHERE id = v_pos.id;

    INSERT INTO public.trades (user_id, stonk_id, trade_type, shares, price, total_edgecoins)
    VALUES (v_user.id, v_stonk.id, 'short_close', v_pos.shares, v_stonk.current_price, v_payout);

    RETURN jsonb_build_object(
        'success', true,
        'pnl', v_pnl,
        'payout', v_payout,
        'new_balance', v_user.edgecoin_balance + v_payout
    );
END;
$$;

-- HELPER: Liquidation Check Engine
CREATE OR REPLACE FUNCTION public.internal_check_liquidations(p_stonk_id UUID, p_new_price NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT * FROM public.positions
        WHERE stonk_id = p_stonk_id AND pos_type = 'short' AND status = 'open' AND liquidation_price <= p_new_price
    LOOP
        UPDATE public.positions SET status = 'liquidated', closed_at = now() WHERE id = r.id;

        INSERT INTO public.trades (user_id, stonk_id, trade_type, shares, price, total_edgecoins)
        VALUES (r.user_id, p_stonk_id, 'liquidation', r.shares, p_new_price, r.collateral);
    END LOOP;
END;
$$;

-- RPC: Moderator NNN Elimination (The Nutted Hammer: 90% Collapse & Freeze)
CREATE OR REPLACE FUNCTION public.rpc_mod_eliminate_stonk(
    p_session_token TEXT,
    p_target_stonk_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_mod public.users;
    v_stonk public.stonks;
    v_new_price NUMERIC(18, 4);
    v_new_x NUMERIC(18, 4);
BEGIN
    v_mod := public.auth_get_user(p_session_token);
    IF v_mod.role NOT IN ('mod', 'admin') THEN
        RAISE EXCEPTION 'Forbidden: Only moderators can execute NNN elimination.';
    END IF;

    SELECT * INTO v_stonk FROM public.stonks WHERE id = p_target_stonk_id FOR UPDATE;
    IF v_stonk.id IS NULL THEN
        RAISE EXCEPTION 'Stonk not found.';
    END IF;

    -- Crash price by 90%: P' = 0.10 * P. Since P = x^2 / k, x' = sqrt(0.10) * x ≈ 0.3162277 * x
    v_new_x := v_stonk.reserve_x * 0.316227766;
    v_new_price := (v_new_x * v_new_x) / v_stonk.k_constant;

    UPDATE public.stonks SET
        status = 'failed',
        reserve_x = v_new_x,
        current_price = v_new_price,
        low_24h = LEAST(low_24h, v_new_price),
        updated_at = now()
    WHERE id = v_stonk.id;

    UPDATE public.users SET
        status = 'failed',
        updated_at = now()
    WHERE id = v_stonk.user_id;

    -- Record crash point
    INSERT INTO public.trades (user_id, stonk_id, trade_type, shares, price, total_edgecoins)
    VALUES (v_mod.id, v_stonk.id, 'central_bank_crash', 0, v_new_price, 0);

    INSERT INTO public.price_history (stonk_id, price, volume)
    VALUES (v_stonk.id, v_new_price, 0);

    RETURN jsonb_build_object(
        'success', true,
        'ticker', v_stonk.ticker,
        'crashed_price', v_new_price,
        'status', 'failed'
    );
END;
$$;

-- RPC: GDPR Right to Erasure / Account Deletion
CREATE OR REPLACE FUNCTION public.rpc_delete_my_account(p_session_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user public.users;
BEGIN
    v_user := public.auth_get_user(p_session_token);

    -- Delete user (Cascades to sessions, positions, personal stonk)
    DELETE FROM public.users WHERE id = v_user.id;

    RETURN jsonb_build_object('success', true, 'message', 'Your account has been deleted in accordance with GDPR.');
END;
$$;
