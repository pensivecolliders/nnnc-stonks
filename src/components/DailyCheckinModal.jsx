import React, { useState } from 'react';
import { X, Flame, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function DailyCheckinModal({ user, onClose, onCheckin }) {
  const [loading, setLoading] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [payoutResult, setPayoutResult] = useState(null);
  const [error, setError] = useState('');

  const currentStreak = user?.checkin_streak || 0;
  const nextStreak = currentStreak + 1;
  const nextPayout = 2500 + (nextStreak - 1) * 250;

  const handleClaim = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await onCheckin();
      setPayoutResult(res);
      setClaimed(true);

      // Trigger celebratory confetti burst!
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err) {
      setError(err.message || 'Check-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} id="checkin-modal-backdrop">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ width: '64px', height: '64px', margin: '0 auto 1rem', background: 'var(--edge-gradient)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)' }}>
          <Flame size={36} color="#ffffff" />
        </div>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>NNN Daily Survival Check-In</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Prove you survived another 24 hours of No Nut November to claim your daily Edgecoin bounty.
        </p>

        {error && (
          <div style={{ background: 'var(--loss-bg)', color: 'var(--loss-red)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        {claimed ? (
          <div style={{ background: 'var(--gain-bg)', border: '1px solid var(--gain-green)', borderRadius: 'var(--radius-md)', padding: '1.5rem', marginBottom: '1.25rem' }}>
            <CheckCircle size={40} color="var(--gain-green)" style={{ margin: '0 auto 0.5rem' }} />
            <h3 style={{ color: 'var(--gain-green)', fontSize: '1.25rem', marginBottom: '0.25rem' }}>
              +{payoutResult?.payout?.toLocaleString()} Edgecoins Claimed!
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Survival Streak: <strong>Day {payoutResult?.new_streak}</strong>! Keep holding the line.
            </p>
          </div>
        ) : (
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Streak</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                  <Flame size={20} /> {currentStreak} Days
                </div>
              </div>
              <div style={{ width: '1px', height: '36px', background: 'var(--border-subtle)' }} />
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Today's Bounty</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--edge-purple)' }}>
                  +{nextPayout.toLocaleString()} EC
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'left', lineHeight: 1.5 }}>
              * Base reward: <strong>2,500 EC</strong> + <strong>250 EC</strong> for every consecutive day survived.
              Keep your streak active every 24 hours to maximize your trading capital!
            </div>
          </div>
        )}

        <button
          className="btn-checkin"
          onClick={claimed ? onClose : handleClaim}
          disabled={loading}
          style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', justifyContent: 'center' }}
        >
          {loading ? 'Verifying Survival...' : claimed ? 'Back to Market' : `Claim +${nextPayout.toLocaleString()} Edgecoins`}
        </button>
      </div>
    </div>
  );
}
