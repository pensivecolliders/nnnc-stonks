import React from 'react';
import { Flame, Coins, ShieldAlert, Briefcase, LogOut, LogIn } from 'lucide-react';

export default function Header({
  user,
  onOpenCheckin,
  onOpenPortfolio,
  onOpenModQueue,
  onOpenAuth,
  onLogout
}) {
  const isMod = user && (user.role === 'admin' || user.role === 'mod');

  return (
    <header className="app-header">
      <div className="header-content">
        {/* Brand */}
        <div className="brand-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className="brand-icon">🥜</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>NNNC STONKS</span>
              <span className="brand-badge">NNN '26</span>
            </div>
          </div>
        </div>

        {/* User Stats & Navigation */}
        <div className="header-actions">
          {user ? (
            <>
              {/* Edgecoin Balance */}
              <div className="balance-pill" title="Your Edgecoin Balance">
                <Coins size={16} className="coin-icon" />
                <span>{user.edgecoin_balance?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 0}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>EC</span>
              </div>

              {/* Daily Survival Bounty Button */}
              <button
                className="btn-checkin"
                onClick={onOpenCheckin}
                title="Claim daily survival bounty"
              >
                <Flame size={16} />
                <span>Day {user.checkin_streak || 0} Bounty</span>
              </button>

              {/* Portfolio */}
              <button
                className="btn-secondary"
                onClick={onOpenPortfolio}
                title="View active positions"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Briefcase size={16} />
                <span>Portfolio</span>
              </button>

              {/* Mod Portal */}
              {isMod && (
                <button
                  className="btn-secondary"
                  onClick={onOpenModQueue}
                  title="Moderator queue & controls"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: 'var(--edge-purple)', color: 'var(--edge-purple)' }}
                >
                  <ShieldAlert size={16} />
                  <span>Mod Portal</span>
                </button>
              )}

              {/* Logout */}
              <button
                className="btn-secondary"
                onClick={onLogout}
                title="Log Out"
                style={{ padding: '0.45rem' }}
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <button className="btn-primary" onClick={onOpenAuth} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <LogIn size={16} />
              <span>Log In / Sign Up</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
