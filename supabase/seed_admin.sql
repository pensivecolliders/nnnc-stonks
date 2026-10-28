-- ============================================================================
-- NNNC STONKS: INITIAL ADMIN BOOTSTRAP SCRIPT
-- ============================================================================
-- Run this in your private Supabase SQL Editor to create your master admin account.
-- REPLACE 'YOUR_REDDIT_USERNAME' and 'YOUR_SECURE_PASSWORD' before running!

DO $$
DECLARE
    v_admin_username TEXT := 'YOUR_REDDIT_USERNAME'; -- Replace with your actual Reddit username
    v_admin_password TEXT := 'YOUR_SECURE_PASSWORD'; -- Replace with your secret admin password
    v_admin_id UUID;
    v_stonk_id UUID;
BEGIN
    v_admin_username := lower(trim(v_admin_username));

    -- Check if admin already exists
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE lower(username) = v_admin_username) THEN
        INSERT INTO public.users (
            username,
            password_hash,
            role,
            status,
            must_change_password,
            edgecoin_balance
        ) VALUES (
            v_admin_username,
            crypt(v_admin_password, gen_salt('bf', 10)),
            'admin',
            'active',
            false,
            100000.00
        ) RETURNING id INTO v_admin_id;

        -- Create Admin Stonk
        INSERT INTO public.stonks (
            user_id,
            ticker,
            status,
            reserve_x,
            reserve_y,
            k_constant,
            current_price
        ) VALUES (
            v_admin_id,
            upper(v_admin_username),
            'active',
            250000.0000,
            2500.0000,
            625000000.0000,
            100.0000
        ) RETURNING id INTO v_stonk_id;

        INSERT INTO public.price_history (stonk_id, price, volume)
        VALUES (v_stonk_id, 100.0000, 0);

        RAISE NOTICE 'Admin user % created successfully!', v_admin_username;
    ELSE
        -- Promote existing user to admin if already present
        UPDATE public.users SET
            role = 'admin',
            status = 'active',
            password_hash = crypt(v_admin_password, gen_salt('bf', 10)),
            must_change_password = false
        WHERE lower(username) = v_admin_username
        RETURNING id INTO v_admin_id;

        -- Ensure Admin Stonk is created if missing
        IF NOT EXISTS (SELECT 1 FROM public.stonks WHERE user_id = v_admin_id) THEN
            INSERT INTO public.stonks (
                user_id,
                ticker,
                status,
                reserve_x,
                reserve_y,
                k_constant,
                current_price
            ) VALUES (
                v_admin_id,
                upper(v_admin_username),
                'active',
                250000.0000,
                2500.0000,
                625000000.0000,
                100.0000
            ) RETURNING id INTO v_stonk_id;

            INSERT INTO public.price_history (stonk_id, price, volume)
            VALUES (v_stonk_id, 100.0000, 0);
        END IF;

        RAISE NOTICE 'Existing user % promoted to Admin and stonk verified!', v_admin_username;
    END IF;
END $$;
