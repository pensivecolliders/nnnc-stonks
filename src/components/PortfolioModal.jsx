import React from 'react';
import { X, Flame } from 'lucide-react';

export default function PortfolioModal({
  user,
  positions = [],
  stonks = [],
  onClose,
  onSellLong,
  onCloseShort
}) {
  if (!user) return null;

  // Calculate Net Worth
  let totalHoldingsVal = 0;
  let totalShortEquity = 0;

  const enrichedPositions = positions.map((pos) => {
    const stonk = stonks.find((s) => s.id === pos.stonk_id);
    const currPrice = stonk ? stonk.current_price : pos.entry_price;

    let pnl = 0;
    let equity = 0;

    if (pos.pos_type === 'long') {
      const val = pos.shares * currPrice;
      const cost = pos.shares * pos.entry_price;
      pnl = val - cost;
      equity = val;
      totalHoldingsVal += val;
    } else {
      // Short: PnL = shares * (entry - curr)
      pnl = pos.shares * (pos.entry_price - currPrice);
      equity = Math.max(0, pos.collateral + pnl);
      totalShortEquity += equity;
    }

    return {
      ...pos,
      stonk,
      currPrice,
      pnl,
      equity
    };
  });

  const netWorth = (user.edgecoin_balance || 0) + totalHoldingsVal + totalShortEquity;

  return (
    <div className="modal-overlay" onClick={onClose} id="portfolio-modal-backdrop">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.25rem' }}>Portfolio Overview</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Trader: u/{user.username}</span>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Net Worth Card */}
        <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Net Worth</span>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
              {netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: '1rem', color: 'var(--edge-purple)' }}>EC</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Cash: {user.edgecoin_balance?.toLocaleString()} EC • Positions: {(totalHoldingsVal + totalShortEquity).toLocaleString()} EC
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--gold)', fontWeight: 700, fontSize: '0.9rem' }}>
              <Flame size={18} /> Day {user.checkin_streak || 0}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NNN Streak</span>
          </div>
        </div>

        {/* Positions List */}
        <div>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Active Positions ({enrichedPositions.length})</h3>

          {enrichedPositions.length === 0 ? (
            <div style={{ background: 'var(--bg-card)', padding: '2rem', textAlign: 'center', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No open positions. Explore the market and place a long or short bet!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {enrichedPositions.map((pos) => {
                const isProfit = pos.pnl >= 0;
                return (
                  <div
                    key={pos.id}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 800 }}>u/{pos.stonk?.ticker || 'UNKNOWN'}</span>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '0.15rem 0.45rem',
                            borderRadius: 'var(--radius-full)',
                            background: pos.pos_type === 'short' ? 'var(--loss-bg)' : 'var(--gain-bg)',
                            color: pos.pos_type === 'short' ? 'var(--loss-red)' : 'var(--gain-green)'
                          }}
                        >
                          {pos.pos_type === 'short' ? `${pos.leverage}x SHORT` : 'LONG'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {pos.pos_type === 'long' ? `${pos.shares.toFixed(2)} shares @ ${pos.entry_price.toFixed(2)} EC` : `Collateral: ${pos.collateral?.toLocaleString()} EC • Liq: ${pos.liquidation_price?.toFixed(2)} EC`}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: isProfit ? 'var(--gain-green)' : 'var(--loss-red)', fontSize: '0.95rem' }}>
                          {isProfit ? '+' : ''}{pos.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EC
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Now: {pos.currPrice.toFixed(2)} EC
                        </div>
                      </div>

                      <button
                        className="btn-secondary"
                        onClick={() => pos.pos_type === 'long' ? onSellLong(pos.stonk) : onCloseShort(pos.id)}
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                      >
                        {pos.pos_type === 'long' ? 'Sell' : 'Close'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
