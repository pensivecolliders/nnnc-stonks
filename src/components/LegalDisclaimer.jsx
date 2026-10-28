import React, { useState } from 'react';
import { Shield, Trash2 } from 'lucide-react';
import { api } from '../lib/supabase';

export default function LegalDisclaimer({ token, onAccountDeleted }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteAccount(token);
      alert('Your account and personal stonk have been completely erased.');
      if (onAccountDeleted) onAccountDeleted();
    } catch (err) {
      alert(err.message || 'Failed to delete account');
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <footer className="app-footer">
      <div className="container">
        <div className="footer-disclaimer">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>
            <Shield size={16} /> Satirical Gaming & Educational Disclaimer
          </div>
          <p>
            NNNC Stonks is a free, satirical simulation game created purely for community entertainment during No Nut November.
            <strong> Edgecoins are fictional virtual points with zero real-world cash or monetary value.</strong> There are no fiat on-ramps,
            crypto redemptions, or cash prizes. Nothing on this website constitutes financial, securities, or investment advice.
          </p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <strong>GDPR & Privacy:</strong> We store zero emails, zero real names, and do not track IP addresses. Only public Reddit usernames and in-game scores are kept.
          </p>
        </div>

        {token && (
          <div style={{ marginTop: '1rem' }}>
            {showConfirm ? (
              <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--loss-red)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', maxWidth: '420px', margin: '0 auto', textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--loss-red)', display: 'block', marginBottom: '0.5rem' }}>
                  Are you sure? This will delete your account, stonk, and all balances permanently.
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    style={{ background: 'var(--loss-red)', color: '#fff', border: 'none', padding: '0.3rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    {deleting ? 'Erasing...' : 'Confirm Erase'}
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '0.3rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirm(true)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'underline' }}
              >
                <Trash2 size={12} /> GDPR Right to Erasure: Delete My Account & Stonk
              </button>
            )}
          </div>
        )}

        <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Built with ❤️ for No Nut November • Deployable to GitHub Pages & Supabase Free Tier
        </div>
      </div>
    </footer>
  );
}
