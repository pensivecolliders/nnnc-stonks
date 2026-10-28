import { createClient } from '@supabase/supabase-js';

// Default project configuration from your setup
const DEFAULT_SUPABASE_URL = 'https://jcukeepvzndwxjzbecph.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = DEFAULT_SUPABASE_ANON_KEY;

export const supabase = supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Initial Mock Community Stonks (for instant preview & testing)
const INITIAL_DEMO_STONKS = [
  {
    id: 's-1',
    user_id: 'u-1',
    ticker: 'User1',
    status: 'active',
    current_price: 184.20,
    high_24h: 195.00,
    low_24h: 98.50,
    volume_24h: 342000,
    reserve_x: 340000,
    reserve_y: 1845.8,
    k_constant: 625000000,
    change_24h: 84.2,
    sparkline: [100, 105, 112, 130, 125, 150, 168, 184.2]
  },
  {
    id: 's-2',
    user_id: 'u-2',
    ticker: 'User2',
    status: 'active',
    current_price: 142.50,
    high_24h: 155.00,
    low_24h: 100.00,
    volume_24h: 198000,
    reserve_x: 298000,
    reserve_y: 2091.2,
    k_constant: 625000000,
    change_24h: 42.5,
    sparkline: [100, 102, 110, 118, 128, 135, 142.5]
  },
  {
    id: 's-3',
    user_id: 'u-3',
    ticker: 'User3',
    status: 'active',
    current_price: 95.80,
    high_24h: 110.00,
    low_24h: 88.00,
    volume_24h: 85000,
    reserve_x: 244700,
    reserve_y: 2554.2,
    k_constant: 625000000,
    change_24h: -4.2,
    sparkline: [100, 98, 105, 101, 92, 88, 95.8]
  },
  {
    id: 's-4',
    user_id: 'u-4',
    ticker: 'User4',
    status: 'failed', // Failed NNN!
    current_price: 8.50, // Crashed!
    high_24h: 130.00,
    low_24h: 8.50,
    volume_24h: 420000,
    reserve_x: 72900,
    reserve_y: 8576.4,
    k_constant: 625000000,
    change_24h: -91.5,
    sparkline: [100, 115, 128, 130, 20, 12, 8.5]
  }
];

// Local state for instant interactive demo when Supabase credentials are pending
let localStonks = [...INITIAL_DEMO_STONKS];
let localPositions = [
  {
    id: 'pos-1',
    user_id: 'current_user',
    stonk_id: 's-1',
    pos_type: 'long',
    shares: 50.0,
    leverage: 1.0,
    collateral: 0,
    entry_price: 110.0,
    liquidation_price: null,
    status: 'open'
  },
  {
    id: 'pos-2',
    user_id: 'current_user',
    stonk_id: 's-4',
    pos_type: 'short',
    shares: 150.0,
    leverage: 2.0,
    collateral: 8000,
    entry_price: 115.0,
    liquidation_price: 163.8,
    status: 'open'
  }
];

let localPendingUsers = [
  { id: 'p-1', username: 'User1', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'p-2', username: 'User2', created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 'p-3', username: 'User3', created_at: new Date(Date.now() - 10800000).toISOString() },
  { id: 'p-4', username: 'User4', created_at: new Date(Date.now() - 14400000).toISOString() },
];

export const api = {
  // 1. Fetch Stonks
  async getStonks() {
    if (supabase) {
      const { data, error } = await supabase.from('stonks').select('*').order('volume_24h', { ascending: false });
      if (!error && data) {
        return data.map(s => {
          const basePrice = 100.00;
          const change = s.current_price ? ((s.current_price - basePrice) / basePrice) * 100 : 0;
          return {
            ...s,
            change_24h: s.change_24h ?? change,
            sparkline: s.sparkline && s.sparkline.length > 1 ? s.sparkline : [basePrice, s.current_price || basePrice]
          };
        });
      }
      if (error) {
        console.error('Error fetching stonks from Supabase:', error);
      }
      return []; // In production with Supabase connected, NEVER fall back to demo stonks!
    }
    return localStonks;
  },

  // 2. Sign Up
  async signup(username) {
    if (supabase) {
      const { data, error } = await supabase.rpc('rpc_signup_request', { p_username: username });
      if (error) throw new Error(error.message);
      return data;
    }
    localPendingUsers.push({ id: 'p-' + Date.now(), username, created_at: new Date().toISOString() });
    return { success: true, message: 'Request submitted to Moderator Queue for Reddit verification!' };
  },

  // 3. Login
  async login(username, password) {
    if (supabase) {
      const { data, error } = await supabase.rpc('rpc_login', { p_username: username, p_password: password });
      if (error) throw new Error(error.message);
      return data;
    }
    // Demo login
    const isMod = username.toLowerCase().includes('admin') || username.toLowerCase().includes('mod');
    return {
      session_token: 'demo-session-' + Date.now(),
      user: {
        id: 'user-demo-' + username,
        username: username,
        role: isMod ? 'admin' : 'user',
        status: 'active',
        edgecoin_balance: 100000.00,
        must_change_password: false,
        checkin_streak: 3
      }
    };
  },

  // 3b. Change Password
  async changePassword(token, oldPassword, newPassword) {
    if (supabase) {
      const { data, error } = await supabase.rpc('rpc_change_password', {
        p_session_token: token,
        p_old_password: oldPassword,
        p_new_password: newPassword
      });
      if (error) throw new Error(error.message);
      return data;
    }
    return { success: true, message: 'Password updated successfully.' };
  },

  // 4. Daily Checkin
  async dailyCheckin(token) {
    if (supabase) {
      const { data, error } = await supabase.rpc('rpc_daily_checkin', { p_session_token: token });
      if (error) throw new Error(error.message);
      return data;
    }
    return {
      success: true,
      payout: 3250.00,
      new_streak: 4,
      new_balance: 103250.00
    };
  },

  // 5. Buy Stonk
  async buyStonk(token, stonkId, edgecoins, currentUser) {
    const stonk = localStonks.find(s => s.id === stonkId);
    if (!stonk) throw new Error('Stonk not found');

    // Self-trading check
    if (currentUser && stonk.user_id === currentUser.id) {
      throw new Error('Self-trading prohibited: You cannot trade your own community stonk (Anti-Manipulation Rule).');
    }

    if (supabase) {
      const { data, error } = await supabase.rpc('rpc_execute_buy', {
        p_session_token: token,
        p_stonk_id: stonkId,
        p_edgecoins: edgecoins
      });
      if (error) throw new Error(error.message);
      return data;
    }

    // Local AMM Math
    const dx = parseFloat(edgecoins);
    const new_x = stonk.reserve_x + dx;
    const new_y = stonk.k_constant / new_x;
    const shares_minted = stonk.reserve_y - new_y;
    const new_price = new_x / new_y;
    const avg_price = dx / shares_minted;

    stonk.reserve_x = new_x;
    stonk.reserve_y = new_y;
    stonk.current_price = parseFloat(new_price.toFixed(2));
    stonk.volume_24h += dx;
    stonk.sparkline.push(stonk.current_price);

    // Update positions
    const existing = localPositions.find(p => p.stonk_id === stonkId && p.pos_type === 'long');
    if (existing) {
      existing.entry_price = ((existing.shares * existing.entry_price) + (shares_minted * avg_price)) / (existing.shares + shares_minted);
      existing.shares += shares_minted;
    } else {
      localPositions.push({
        id: 'pos-' + Date.now(),
        user_id: currentUser?.id || 'demo_user',
        stonk_id: stonkId,
        pos_type: 'long',
        shares: shares_minted,
        leverage: 1.0,
        collateral: 0,
        entry_price: avg_price,
        liquidation_price: null,
        status: 'open'
      });
    }

    return {
      success: true,
      shares_received: shares_minted,
      avg_price: avg_price,
      new_spot_price: new_price
    };
  },

  // 6. Sell Stonk
  async sellStonk(token, stonkId, shares, currentUser) {
    const stonk = localStonks.find(s => s.id === stonkId);
    if (!stonk) throw new Error('Stonk not found');

    if (currentUser && stonk.user_id === currentUser.id) {
      throw new Error('Self-trading prohibited.');
    }

    if (supabase) {
      const { data, error } = await supabase.rpc('rpc_execute_sell', {
        p_session_token: token,
        p_stonk_id: stonkId,
        p_shares: shares
      });
      if (error) throw new Error(error.message);
      return data;
    }

    const dy = parseFloat(shares);
    const new_y = stonk.reserve_y + dy;
    const new_x = stonk.k_constant / new_y;
    const edgecoins_returned = stonk.reserve_x - new_x;
    const new_price = new_x / new_y;
    const avg_price = edgecoins_returned / dy;

    stonk.reserve_x = new_x;
    stonk.reserve_y = new_y;
    stonk.current_price = parseFloat(new_price.toFixed(2));
    stonk.sparkline.push(stonk.current_price);

    const pos = localPositions.find(p => p.stonk_id === stonkId && p.pos_type === 'long');
    if (pos) {
      pos.shares -= dy;
      if (pos.shares <= 0.001) {
        localPositions = localPositions.filter(p => p.id !== pos.id);
      }
    }

    return {
      success: true,
      edgecoins_returned: edgecoins_returned,
      avg_price: avg_price,
      new_spot_price: new_price
    };
  },

  // 7. Open Short Position
  async openShort(token, stonkId, collateral, leverage, currentUser) {
    const stonk = localStonks.find(s => s.id === stonkId);
    if (!stonk) throw new Error('Stonk not found');

    if (currentUser && stonk.user_id === currentUser.id) {
      throw new Error('Self-trading prohibited: You cannot short your own community stonk (Anti-Sabotage Shield).');
    }

    if (supabase) {
      const { data, error } = await supabase.rpc('rpc_open_short', {
        p_session_token: token,
        p_stonk_id: stonkId,
        p_collateral: collateral,
        p_leverage: leverage
      });
      if (error) throw new Error(error.message);
      return data;
    }

    const c = parseFloat(collateral);
    const lev = parseFloat(leverage);
    const positionValue = c * lev;
    const shares = positionValue / stonk.current_price;
    const liqPrice = stonk.current_price * (1 + ((1 - 0.15) / lev));

    const newPos = {
      id: 'pos-' + Date.now(),
      user_id: currentUser?.id || 'demo_user',
      stonk_id: stonkId,
      pos_type: 'short',
      shares: shares,
      leverage: lev,
      collateral: c,
      entry_price: stonk.current_price,
      liquidation_price: liqPrice,
      status: 'open'
    };
    localPositions.push(newPos);

    return {
      success: true,
      position: newPos,
      liquidation_price: liqPrice
    };
  },

  // 8. Close Short Position
  async closeShort(token, positionId) {
    if (supabase) {
      const { data, error } = await supabase.rpc('rpc_close_short', {
        p_session_token: token,
        p_position_id: positionId
      });
      if (error) throw new Error(error.message);
      return data;
    }

    const pos = localPositions.find(p => p.id === positionId);
    if (!pos) throw new Error('Position not found');

    const stonk = localStonks.find(s => s.id === pos.stonk_id);
    const pnl = pos.shares * (pos.entry_price - (stonk ? stonk.current_price : pos.entry_price));
    const payout = Math.max(0, pos.collateral + pnl);

    localPositions = localPositions.filter(p => p.id !== positionId);

    return {
      success: true,
      pnl: pnl,
      payout: payout
    };
  },

  // 9. Mod NNN Elimination (90% Crash)
  async modEliminateStonk(token, stonkId) {
    if (supabase) {
      const { data, error } = await supabase.rpc('rpc_mod_eliminate_stonk', {
        p_session_token: token,
        p_target_stonk_id: stonkId
      });
      if (error) throw new Error(error.message);
      return data;
    }

    const stonk = localStonks.find(s => s.id === stonkId);
    if (stonk) {
      stonk.status = 'failed';
      stonk.current_price = parseFloat((stonk.current_price * 0.10).toFixed(2));
      stonk.sparkline.push(stonk.current_price);
    }
    return { success: true, message: 'User eliminated! Stonk crashed 90% and halted.' };
  },

  // 10. Mod Approve User
  async modApproveUser(token, username, tempPassword) {
    if (supabase) {
      const { data, error } = await supabase.rpc('rpc_mod_approve_user', {
        p_session_token: token,
        p_target_username: username,
        p_temp_password: tempPassword
      });
      if (error) throw new Error(error.message);
      return data;
    }

    localPendingUsers = localPendingUsers.filter(u => u.username.toLowerCase() !== username.toLowerCase());
    const newStonk = {
      id: 's-' + Date.now(),
      user_id: 'u-' + username,
      ticker: username.toUpperCase(),
      status: 'active',
      current_price: 100.00,
      high_24h: 100.00,
      low_24h: 100.00,
      volume_24h: 0,
      reserve_x: 250000,
      reserve_y: 2500,
      k_constant: 625000000,
      change_24h: 0,
      sparkline: [100, 100]
    };
    localStonks.push(newStonk);
    return { success: true, ticker: newStonk.ticker };
  },

  // 11. Mod Deny / Reject User
  async modDenyUser(token, username, reason = 'Denied by moderator') {
    if (supabase) {
      const { data, error } = await supabase.rpc('rpc_mod_deny_user', {
        p_session_token: token,
        p_target_username: username,
        p_reason: reason
      });
      if (error) throw new Error(error.message);
      return data;
    }

    localPendingUsers = localPendingUsers.filter(u => u.username.toLowerCase() !== username.toLowerCase());
    return { success: true, message: `Rejected u/${username} and removed from queue.` };
  },

  // 12. Mod Bulk Approve
  async modBulkApprove(token, usernames) {
    const results = [];
    for (const u of usernames) {
      const tempPass = 'NNN-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      try {
        await this.modApproveUser(token, u, tempPass);
        results.push(u);
      } catch (e) {
        console.error(e);
      }
    }
    return { success: true, count: results.length };
  },

  // 13. Mod Bulk Deny
  async modBulkDeny(token, usernames) {
    if (supabase) {
      const { data, error } = await supabase.rpc('rpc_mod_bulk_deny', {
        p_session_token: token,
        p_usernames: usernames
      });
      if (error) throw new Error(error.message);
      return data;
    }

    const set = new Set(usernames.map(u => u.toLowerCase()));
    localPendingUsers = localPendingUsers.filter(u => !set.has(u.username.toLowerCase()));
    return { success: true, count: usernames.length };
  },

  // 14. Get Pending Users (Queries real database when Supabase is active)
  async getPendingUsers(token) {
    if (supabase) {
      if (token) {
        const { data, error } = await supabase.rpc('rpc_get_pending_users', { p_session_token: token });
        if (!error && data) return data;
        if (error) {
          console.warn('RPC rpc_get_pending_users notice:', error.message);
        }
      }
      // Fallback direct table query if RPC is not yet created
      const { data, error } = await supabase
        .from('users')
        .select('id, username, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (!error && data) return data;
      if (error) {
        console.warn('Direct table query users notice:', error.message);
      }
      return []; // Return empty queue in production if no pending users exist
    }
    return localPendingUsers;
  },

  // 15. Get User Positions
  async getPositions(userId) {
    if (supabase && userId) {
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'open');
      if (!error && data) return data;
      return [];
    }
    return localPositions;
  },

  // 16. GDPR Right to Erasure
  async deleteAccount(token) {
    if (supabase) {
      const { data, error } = await supabase.rpc('rpc_delete_my_account', { p_session_token: token });
      if (error) throw new Error(error.message);
      return data;
    }
    return { success: true, message: 'Account and associated records deleted.' };
  }
};
