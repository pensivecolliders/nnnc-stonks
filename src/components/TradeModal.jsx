import React, { useState } from 'react';
import { X, AlertTriangle, ShieldCheck, Lock } from 'lucide-react';
import StonkChart from './StonkChart';

export default function TradeModal({
  stonk,
  user,
  positions = [],
  onClose,
  onExecuteTrade,
  onEliminateStonk
}) {
  const [tab, setTab] = useState('buy'); // 'buy' | 'sell' | 'short'
  const [amount, setAmount] = useState('');
  const [leverage, setLeverage] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!stonk) return null;

  // Strict Anti-Self-Trading check
  const isOwnStonk = user && (
    stonk.user_id === user.id ||
    stonk.ticker?.toLowerCase() === user.username?.toLowerCase()
  );

  // Check existing holdings
  const longPosition = positions.find(
    (p) => p.stonk_id === stonk.id && p.pos_type === 'long' && p.status === 'open'
  );
  const sharesOwned = longPosition ? longPosition.shares : 0;

  // Calculations for buy
  const inputNum = parseFloat(amount) || 0;
  const isGain = (stonk.change_24h || 0) >= 0;

  // vAMM Preview Math
  let estShares = 0;
  let estAvgPrice = stonk.current_price;
  let estLiqPrice = 0;

  if (tab === 'buy' && inputNum > 0) {
    const new_x = stonk.reserve_x + inputNum;
    const new_y = stonk.k_constant / new_x;
    estShares = Math.max(0, stonk.reserve_y - new_y);
    estAvgPrice = estShares > 0 ? inputNum / estShares : stonk.current_price;
  } else if (tab === 'sell' && inputNum > 0) {
    const new_y = stonk.reserve_y + inputNum;
    const new_x = stonk.k_constant / new_y;
    const edgecoins = stonk.reserve_x - new_x;
    estAvgPrice = edgecoins / inputNum;
  } else if (tab === 'short' && inputNum > 0) {
    const positionVal = inputNum * leverage;
    estShares = positionVal / stonk.current_price;
    // Liquidation: price rises past entry * (1 + (1 - MMR)/leverage)
    const mmr = 0.15;
    estLiqPrice = stonk.current_price * (1.0 + ((1.0 - mmr) / leverage));
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isOwnStonk) {
      setError('Anti-Manipulation Shield: You cannot trade or short your own community stonk.');
      return;
    }

    if (inputNum <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    if (tab === 'buy' && inputNum > (user?.edgecoin_balance || 0)) {
      setError('Insufficient Edgecoin balance.');
      return;
    }

    if (tab === 'sell' && inputNum > sharesOwned) {
      setError(`You only own ${sharesOwned.toFixed(2)} shares.`);
      return;
    }

    if (tab === 'short' && inputNum > (user?.edgecoin_balance || 0)) {
      setError('Insufficient collateral for this short.');
      return;
    }

    setLoading(true);
    try {
      await onExecuteTrade(tab, stonk.id, inputNum, leverage);
      setSuccess(`Order executed successfully!`);
      setAmount('');
    } catch (err) {
      setError(err.message || 'Trade execution failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} id="trade-modal-backdrop">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>u/{stonk.ticker}</span>
            <span className={`card-status-badge ${stonk.status === 'failed' ? 'badge-failed' : 'badge-active'}`}>
              {stonk.status === 'failed' ? 'Eliminated (Nutted)' : 'Surviving'}
            </span>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Interactive Chart */}
        <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
          <StonkChart stonk={stonk} isGain={isGain} />
        </div>

        {/* If this is the user's personal stonk: show Anti-Self-Dealing Shield */}
        {isOwnStonk ? (
          <div className="self-trading-shield">
            <Lock size={28} style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ display: 'block', fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                Self-Trading Restricted
              </strong>
              <span>
                To prevent market manipulation and moral hazard, you cannot buy, sell, or short your own community asset. You can view your valuation, holders, and clouts below.
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Tab selector */}
            <div className="tab-group">
              <button
                className={`tab-btn ${tab === 'buy' ? 'active' : ''}`}
                onClick={() => { setTab('buy'); setError(''); }}
              >
                Buy (Long)
              </button>
              <button
                className={`tab-btn ${tab === 'sell' ? 'active' : ''}`}
                onClick={() => { setTab('sell'); setError(''); }}
                disabled={sharesOwned <= 0}
              >
                Sell ({sharesOwned.toFixed(1)})
              </button>
              <button
                className={`tab-btn ${tab === 'short' ? 'active' : ''}`}
                onClick={() => { setTab('short'); setError(''); }}
                style={{ color: tab === 'short' ? 'var(--loss-red)' : '' }}
              >
                Short Sell (Bear)
              </button>
            </div>

            {error && (
              <div style={{ background: 'var(--loss-bg)', color: 'var(--loss-red)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div style={{ background: 'var(--gain-bg)', color: 'var(--gain-green)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={16} />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Leverage pills for shorting */}
              {tab === 'short' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Select Leverage Multiplier</label>
                  <div className="leverage-selector">
                    {[1.0, 2.0, 5.0].map((lev) => (
                      <button
                        type="button"
                        key={lev}
                        className={`leverage-pill ${leverage === lev ? 'active' : ''}`}
                        onClick={() => setLeverage(lev)}
                      >
                        {lev}x
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Higher leverage amplifies potential gains, but liquidates your collateral if the stonk pumps!
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{tab === 'sell' ? 'Shares to Sell' : 'Amount (Edgecoins)'}</span>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Available: {tab === 'sell' ? `${sharesOwned.toFixed(2)} shares` : `${user?.edgecoin_balance?.toLocaleString() || 0} EC`}
                  </span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    className="form-input"
                    placeholder={tab === 'sell' ? 'e.g. 10 shares' : 'e.g. 5000 Edgecoins'}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  {tab === 'sell' && (
                    <button
                      type="button"
                      onClick={() => setAmount(sharesOwned.toString())}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'var(--bg-card)', border: 'none', color: 'var(--text-primary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      MAX
                    </button>
                  )}
                </div>
              </div>

              {/* Order preview summary */}
              {inputNum > 0 && (
                <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Estimated Price:</span>
                    <span>{estAvgPrice.toFixed(2)} EC</span>
                  </div>
                  {tab === 'buy' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Shares Received:</span>
                      <span style={{ color: 'var(--gain-green)', fontWeight: 700 }}>+{estShares.toFixed(2)}</span>
                    </div>
                  )}
                  {tab === 'short' && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Effective Position:</span>
                        <span style={{ color: 'var(--loss-red)', fontWeight: 700 }}>{(inputNum * leverage).toLocaleString()} EC</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--loss-red)' }}>
                        <span>Margin Call / Liq Price:</span>
                        <span style={{ fontWeight: 700 }}>{estLiqPrice.toFixed(2)} EC</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !user}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: loading || !user ? 'not-allowed' : 'pointer',
                  opacity: loading || !user ? 0.6 : 1,
                  background: tab === 'short' ? 'var(--loss-red)' : tab === 'sell' ? 'var(--text-primary)' : 'var(--gain-green)',
                  color: tab === 'sell' ? 'var(--bg-primary)' : '#ffffff',
                  boxShadow: 'var(--shadow-md)'
                }}
              >
                {loading ? 'Executing Trade...' : !user ? 'Login to Trade' : `${tab.toUpperCase()} ${stonk.ticker}`}
              </button>
            </form>

            {/* Moderator Direct Shortcut (Enables quick elimination directly from market search) */}
            {user && (user.role === 'admin' || user.role === 'mod') && stonk.status === 'active' && onEliminateStonk && (
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={async () => {
                    const confirmMsg = `MODERATOR OVERRIDE:\nAre you sure u/${stonk.ticker} failed NNN?\n\nThis will crash their spot price by 90% and halt all trading!`;
                    if (window.confirm(confirmMsg)) {
                      try {
                        await onEliminateStonk(stonk.id);
                        alert(`u/${stonk.ticker} has been eliminated! Stonk crashed 90%.`);
                        onClose();
                      } catch (err) {
                        alert(err.message || 'Elimination failed');
                      }
                    }
                  }}
                  style={{
                    background: 'rgba(244, 63, 94, 0.08)',
                    border: '1px dashed var(--loss-red)',
                    color: 'var(--loss-red)',
                    padding: '0.55rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <AlertTriangle size={14} /> Moderator Action: Declare Failed (Trigger 90% Crash)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
