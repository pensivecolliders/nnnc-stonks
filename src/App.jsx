import React, { useState, useEffect } from 'react';
import { api } from './lib/supabase';
import Header from './components/Header';
import TickerTape from './components/TickerTape';
import MarketExplorer from './components/MarketExplorer';
import TradeModal from './components/TradeModal';
import DailyCheckinModal from './components/DailyCheckinModal';
import ModQueueModal from './components/ModQueueModal';
import PortfolioModal from './components/PortfolioModal';
import AuthModal from './components/AuthModal';
import LegalDisclaimer from './components/LegalDisclaimer';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('nnnc_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('nnnc_token') || '');

  const [stonks, setStonks] = useState([]);
  const [positions, setPositions] = useState([]);
  const [selectedStonk, setSelectedStonk] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'checkin' | 'portfolio' | 'mod' | 'auth' | null

  // Fetch initial stonks and positions
  const refreshData = async () => {
    try {
      const stonksData = await api.getStonks();
      setStonks(stonksData || []);

      if (user) {
        const posData = await api.getPositions(user.id);
        setPositions(posData || []);
      }
    } catch (err) {
      console.error('Failed to load market data:', err);
    }
  };

  useEffect(() => {
    refreshData();
  }, [user]);

  // Handle Login
  const handleLogin = async (username, password) => {
    const res = await api.login(username, password);
    setUser(res.user);
    setToken(res.session_token);
    localStorage.setItem('nnnc_user', JSON.stringify(res.user));
    localStorage.setItem('nnnc_token', res.session_token);
    refreshData();
  };

  // Handle Signup
  const handleSignup = async (username) => {
    return await api.signup(username);
  };

  // Handle Logout
  const handleLogout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('nnnc_user');
    localStorage.removeItem('nnnc_token');
    setActiveModal(null);
  };

  // Handle Daily Checkin
  const handleDailyCheckin = async () => {
    const res = await api.dailyCheckin(token);
    if (res && res.new_balance) {
      const updatedUser = {
        ...user,
        edgecoin_balance: res.new_balance,
        checkin_streak: res.new_streak
      };
      setUser(updatedUser);
      localStorage.setItem('nnnc_user', JSON.stringify(updatedUser));
    }
    return res;
  };

  // Handle Trade Execution (Buy, Sell, Short)
  const handleExecuteTrade = async (type, stonkId, amount, leverage) => {
    let res;
    if (type === 'buy') {
      res = await api.buyStonk(token, stonkId, amount, user);
      if (res) {
        const newBal = (user.edgecoin_balance || 0) - amount;
        const updated = { ...user, edgecoin_balance: newBal };
        setUser(updated);
        localStorage.setItem('nnnc_user', JSON.stringify(updated));
      }
    } else if (type === 'sell') {
      res = await api.sellStonk(token, stonkId, amount, user);
      if (res && res.edgecoins_returned) {
        const newBal = (user.edgecoin_balance || 0) + res.edgecoins_returned;
        const updated = { ...user, edgecoin_balance: newBal };
        setUser(updated);
        localStorage.setItem('nnnc_user', JSON.stringify(updated));
      }
    } else if (type === 'short') {
      res = await api.openShort(token, stonkId, amount, leverage, user);
      if (res) {
        const newBal = (user.edgecoin_balance || 0) - amount;
        const updated = { ...user, edgecoin_balance: newBal };
        setUser(updated);
        localStorage.setItem('nnnc_user', JSON.stringify(updated));
      }
    }
    refreshData();
    return res;
  };

  // Handle Close Short
  const handleCloseShort = async (positionId) => {
    try {
      const res = await api.closeShort(token, positionId);
      if (res && res.payout) {
        const newBal = (user.edgecoin_balance || 0) + res.payout;
        const updated = { ...user, edgecoin_balance: newBal };
        setUser(updated);
        localStorage.setItem('nnnc_user', JSON.stringify(updated));
        alert(`Short closed! Payout: +${res.payout.toFixed(2)} EC (PnL: ${res.pnl >= 0 ? '+' : ''}${res.pnl.toFixed(2)} EC)`);
      }
      refreshData();
    } catch (err) {
      alert(err.message || 'Failed to close short');
    }
  };

  // Handle Moderator Elimination
  const handleEliminateStonk = async (stonkId) => {
    const res = await api.modEliminateStonk(token, stonkId);
    refreshData();
    return res;
  };

  return (
    <div className="app-root">
      <Header
        user={user}
        onOpenCheckin={() => setActiveModal('checkin')}
        onOpenPortfolio={() => setActiveModal('portfolio')}
        onOpenModQueue={() => setActiveModal('mod')}
        onOpenAuth={() => setActiveModal('auth')}
        onLogout={handleLogout}
      />

      <TickerTape
        stonks={stonks}
        onSelectStonk={(s) => setSelectedStonk(s)}
      />

      <main className="container">
        <MarketExplorer
          stonks={stonks}
          currentUser={user}
          onSelectStonk={(s) => setSelectedStonk(s)}
        />
      </main>

      {/* Trade Modal */}
      {selectedStonk && (
        <TradeModal
          stonk={selectedStonk}
          user={user}
          positions={positions}
          onClose={() => setSelectedStonk(null)}
          onExecuteTrade={handleExecuteTrade}
          onEliminateStonk={handleEliminateStonk}
        />
      )}

      {/* Daily Checkin Streak Modal */}
      {activeModal === 'checkin' && (
        <DailyCheckinModal
          user={user}
          onClose={() => setActiveModal(null)}
          onCheckin={handleDailyCheckin}
        />
      )}

      {/* Portfolio Modal */}
      {activeModal === 'portfolio' && (
        <PortfolioModal
          user={user}
          positions={positions}
          stonks={stonks}
          onClose={() => setActiveModal(null)}
          onSellLong={(stonk) => {
            setActiveModal(null);
            setSelectedStonk(stonk);
          }}
          onCloseShort={handleCloseShort}
        />
      )}

      {/* Moderator Command Center Modal */}
      {activeModal === 'mod' && (
        <ModQueueModal
          token={token}
          stonks={stonks}
          onClose={() => setActiveModal(null)}
          onRefresh={refreshData}
        />
      )}

      {/* Authentication Modal */}
      {activeModal === 'auth' && (
        <AuthModal
          onClose={() => setActiveModal(null)}
          onLogin={handleLogin}
          onSignup={handleSignup}
        />
      )}

      <LegalDisclaimer
        token={token}
        onAccountDeleted={handleLogout}
      />
    </div>
  );
}
