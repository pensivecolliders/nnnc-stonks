import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Search, Flame } from 'lucide-react';

export default function MarketExplorer({ stonks, onSelectStonk, currentUser }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'gainers' | 'losers' | 'failed'
  const [search, setSearch] = useState('');

  const filteredStonks = stonks.filter((s) => {
    const matchesSearch = s.ticker.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (filter === 'gainers') return (s.change_24h || 0) > 0 && s.status !== 'failed';
    if (filter === 'losers') return (s.change_24h || 0) < 0 && s.status !== 'failed';
    if (filter === 'failed') return s.status === 'failed';
    return true;
  });

  return (
    <div style={{ marginTop: '2rem' }}>
      {/* Hero Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem 1.75rem',
          marginBottom: '2.5rem',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ maxWidth: '640px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'var(--loss-bg)', color: 'var(--loss-red)', padding: '0.2rem 0.65rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.85rem' }}>
            <Flame size={14} /> 30 DAYS OF MAXIMUM WILLPOWER
          </div>
          <h1 style={{ fontSize: '2.25rem', lineHeight: 1.15, marginBottom: '0.75rem', fontWeight: 800 }}>
            Trade Your Edgecoins.<br />
            <span style={{ background: 'var(--edge-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            </span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Every member is a tradeable stonk. Speculate with 1x to 5x leverage. When someone nuts, their stonk crashes 90%.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="tab-group" style={{ marginBottom: 0 }}>
          <button className={`tab-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            All Stonks ({stonks.length})
          </button>
          <button className={`tab-btn ${filter === 'gainers' ? 'active' : ''}`} onClick={() => setFilter('gainers')}>
            🚀 Top Gainers
          </button>
          <button className={`tab-btn ${filter === 'losers' ? 'active' : ''}`} onClick={() => setFilter('losers')}>
            🔻 Dipping
          </button>
          <button className={`tab-btn ${filter === 'failed' ? 'active' : ''}`} onClick={() => setFilter('failed')}>
            💀 Eliminated
          </button>
        </div>

        <div style={{ position: 'relative', width: '260px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search Reddit user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.25rem', paddingRight: '0.75rem', paddingTop: '0.55rem', paddingBottom: '0.55rem', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* Stonks Grid or Empty State */}
      {filteredStonks.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3.5rem 2rem',
            background: 'var(--card-bg)',
            border: '1px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--text-secondary)',
            marginBottom: '2rem'
          }}
        >
          <Flame size={36} style={{ color: 'var(--edge-purple)', marginBottom: '0.75rem', opacity: 0.7 }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            No Stonks Found
          </h3>
          <p style={{ fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {search
              ? `No community member found matching "${search}".`
              : 'Community stonks are minted automatically as traders get approved in the Moderator Queue.'}
          </p>
        </div>
      ) : (
        <div className="market-grid">
          {filteredStonks.map((stonk) => {
            const isPositive = (stonk.change_24h || 0) >= 0;
            const isOwnStonk = currentUser && (
              stonk.user_id === currentUser.id ||
              stonk.ticker?.toLowerCase() === currentUser.username?.toLowerCase()
            );

            return (
              <div
                key={stonk.id}
                className="stonk-card"
                onClick={() => onSelectStonk(stonk)}
                id={`stonk-card-${stonk.ticker.toLowerCase()}`}
              >
                <div>
                  <div className="card-top">
                    <div className="card-title">
                      <span className="card-ticker">u/{stonk.ticker}</span>
                      {isOwnStonk && (
                        <span style={{ fontSize: '0.65rem', background: 'var(--gold-bg)', color: 'var(--gold)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                          YOU
                        </span>
                      )}
                    </div>
                    <span className={`card-status-badge ${stonk.status === 'failed' ? 'badge-failed' : 'badge-active'}`}>
                      {stonk.status === 'failed' ? 'Eliminated' : 'Surviving'}
                    </span>
                  </div>

                  <div className="card-price-block">
                    <div className="card-price">
                      {stonk.current_price?.toFixed(2)} <span style={{ fontSize: '0.85rem', color: 'var(--edge-purple)' }}>EC</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', fontWeight: 600, color: isPositive ? 'var(--gain-green)' : 'var(--loss-red)', marginTop: '0.2rem' }}>
                      {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      <span>{isPositive ? '+' : ''}{(stonk.change_24h || 0).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Sparkline Visual */}
                <div style={{ height: '36px', margin: '0.75rem 0', opacity: 0.85 }}>
                  <svg viewBox="0 0 100 25" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    <path
                      d={generateSparklinePath(stonk.sparkline || [100, 102, 105])}
                      fill="none"
                      stroke={isPositive ? '#10b981' : '#f43f5e'}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div className="card-stats">
                  <span>24h Vol: {(stonk.volume_24h || 0).toLocaleString()} EC</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Trade &rarr;</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function generateSparklinePath(prices) {
  if (!prices || prices.length < 2) return 'M 0 12 L 100 12';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  return prices
    .map((p, i) => {
      const x = (i / (prices.length - 1)) * 100;
      const y = 25 - ((p - min) / range) * 22;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}
