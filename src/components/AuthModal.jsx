import React, { useState } from 'react';
import { X, Lock, User, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function AuthModal({ onClose, onLogin, onSignup }) {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim()) {
      setError('Please enter your Reddit username.');
      return;
    }

    if (!isSignup && !password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        const res = await onSignup(username.trim());
        setSuccess(res?.message || 'Sign-up request sent to Moderator Queue!');
        setUsername('');
      } else {
        await onLogin(username.trim(), password);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (role) => {
    setLoading(true);
    try {
      if (role === 'admin') {
        await onLogin('Mod_NNN_Lead', 'password123');
      } else {
        await onLogin('DiamondHands420', 'password123');
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} id="auth-modal-backdrop">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: '1.25rem' }}>{isSignup ? 'Claim Your Reddit Stonk' : 'Welcome Back'}</h2>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="tab-group" style={{ marginBottom: '1.5rem' }}>
          <button
            className={`tab-btn ${!isSignup ? 'active' : ''}`}
            onClick={() => { setIsSignup(false); setError(''); setSuccess(''); }}
          >
            Log In
          </button>
          <button
            className={`tab-btn ${isSignup ? 'active' : ''}`}
            onClick={() => { setIsSignup(true); setError(''); setSuccess(''); }}
          >
            Sign Up (Mod Queue)
          </button>
        </div>

        {error && (
          <div style={{ background: 'var(--loss-bg)', color: 'var(--loss-red)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ background: 'var(--gain-bg)', color: 'var(--gain-green)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={16} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Reddit Username</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. MyRedditUsername (no u/ needed)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            {isSignup && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                * Must be a valid Reddit account. A community moderator will verify your account and send your temporary password via Reddit DM.
              </span>
            )}
          </div>

          {!isSignup && (
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '0.8rem', fontSize: '0.95rem', marginBottom: '1.25rem' }}
          >
            {loading ? 'Processing...' : isSignup ? 'Submit to Mod Approval Queue' : 'Log In'}
          </button>
        </form>

        {/* Quick Demo Logins: ONLY visible in local development (localhost), completely stripped in production builds */}
        {import.meta.env.DEV && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.65rem' }}>
              ⚡ Local Dev Only (Instant Testing):
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleQuickDemoLogin('trader')}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
              >
                Demo Trader (100k EC)
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleQuickDemoLogin('admin')}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', borderColor: 'var(--edge-purple)' }}
              >
                Demo Moderator Portal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
