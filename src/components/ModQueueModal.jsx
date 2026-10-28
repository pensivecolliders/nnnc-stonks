import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  ShieldAlert,
  Check,
  Copy,
  AlertOctagon,
  Search,
  UserX,
  ArrowRight,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square
} from 'lucide-react';
import { api } from '../lib/supabase';

export default function ModQueueModal({ token, stonks, onClose, onRefresh }) {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tempPasswords, setTempPasswords] = useState({});
  const [copiedUser, setCopiedUser] = useState(null);
  const [actionMsg, setActionMsg] = useState('');

  // Queue Search & Pagination
  const [queueSearch, setQueueSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Batch Multi-Select
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Scalable Member Search & Elimination Autocomplete (Designed for 20k+ users)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [eliminating, setEliminating] = useState(false);

  const generatePass = () => {
    return 'NNN-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const loadQueue = async () => {
    setLoading(true);
    try {
      const data = await api.getPendingUsers(token);
      setPendingUsers(data || []);

      const initialPasses = {};
      (data || []).forEach((u) => {
        initialPasses[u.username] = generatePass();
      });
      setTempPasswords(initialPasses);
      setSelectedUsers(new Set());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  // Single Approve
  const handleApprove = async (username) => {
    const tempPass = tempPasswords[username] || generatePass();
    try {
      await api.modApproveUser(token, username, tempPass);
      setActionMsg(`Approved u/${username}! Personal stonk $${username.toUpperCase()} minted.`);
      await loadQueue();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Approval failed');
    }
  };

  // Single Deny
  const handleDeny = async (username) => {
    if (!window.confirm(`Reject and purge u/${username} from the verification queue?`)) {
      return;
    }
    try {
      await api.modDenyUser(token, username);
      setActionMsg(`Denied u/${username} and purged from queue.`);
      await loadQueue();
    } catch (err) {
      alert(err.message || 'Denial failed');
    }
  };

  // Bulk Approve
  const handleBulkApprove = async () => {
    if (selectedUsers.size === 0) return;
    if (!window.confirm(`Bulk approve ${selectedUsers.size} selected accounts?`)) return;

    setBulkProcessing(true);
    try {
      await api.modBulkApprove(token, Array.from(selectedUsers));
      setActionMsg(`Bulk approved ${selectedUsers.size} users!`);
      await loadQueue();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Bulk approval failed');
    } finally {
      setBulkProcessing(false);
    }
  };

  // Bulk Deny
  const handleBulkDeny = async () => {
    if (selectedUsers.size === 0) return;
    if (!window.confirm(`Deny and purge ${selectedUsers.size} selected accounts from queue?`)) return;

    setBulkProcessing(true);
    try {
      await api.modBulkDeny(token, Array.from(selectedUsers));
      setActionMsg(`Bulk denied and purged ${selectedUsers.size} users.`);
      await loadQueue();
    } catch (err) {
      alert(err.message || 'Bulk denial failed');
    } finally {
      setBulkProcessing(false);
    }
  };

  // Toggle Selection
  const toggleSelectUser = (username) => {
    const next = new Set(selectedUsers);
    if (next.has(username)) {
      next.delete(username);
    } else {
      next.add(username);
    }
    setSelectedUsers(next);
  };

  const copyToClipboard = (text, username) => {
    navigator.clipboard.writeText(text);
    setCopiedUser(username);
    setTimeout(() => setCopiedUser(null), 2000);
  };

  // Filtered Queue
  const filteredQueue = pendingUsers.filter((u) =>
    u.username.toLowerCase().includes(queueSearch.toLowerCase())
  );

  const totalPages = Math.ceil(filteredQueue.length / pageSize) || 1;
  const paginatedQueue = filteredQueue.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSelectAllCurrentPage = () => {
    const allSelected = paginatedQueue.every((u) => selectedUsers.has(u.username));
    const next = new Set(selectedUsers);
    paginatedQueue.forEach((u) => {
      if (allSelected) {
        next.delete(u.username);
      } else {
        next.add(u.username);
      }
    });
    setSelectedUsers(next);
  };

  // Elimination Autocomplete Logic
  const activeStonks = stonks.filter((s) => s.status === 'active');
  const matchingStonks = searchQuery.trim()
    ? activeStonks
        .filter((s) => s.ticker.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 8)
    : [];

  const handleExecuteElimination = async () => {
    if (!selectedTarget) return;

    const confirmText = `CONFIRM NNN ELIMINATION:\n\nAre you sure u/${selectedTarget.ticker} failed No Nut November?\n\nThis will immediately crash their price from ${selectedTarget.current_price?.toFixed(2)} EC to ${(selectedTarget.current_price * 0.10).toFixed(2)} EC (-90%) and permanently freeze all new buy orders!`;
    if (!window.confirm(confirmText)) {
      return;
    }

    setEliminating(true);
    try {
      await api.modEliminateStonk(token, selectedTarget.id);
      setActionMsg(`🔨 u/${selectedTarget.ticker} was eliminated! 90% crash executed.`);
      setSelectedTarget(null);
      setSearchQuery('');
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Elimination failed');
    } finally {
      setEliminating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} id="mod-modal-backdrop">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={24} color="var(--loss-red)" />
            <div>
              <h2 style={{ fontSize: '1.25rem' }}>Moderator Command Center</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>High-volume verification triage & NNN crash enforcement</span>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {actionMsg && (
          <div style={{ background: 'var(--gain-bg)', color: 'var(--gain-green)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            {actionMsg}
          </div>
        )}

        {/* SECTION 1: SCALABLE BATCH-ENABLED VERIFICATION QUEUE */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              Pending Verification Queue
              <span style={{ fontSize: '0.75rem', background: 'var(--bg-tertiary)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', color: 'var(--text-secondary)' }}>
                {pendingUsers.length} total waiting
              </span>
            </h3>

            {/* Instant Filter */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search username in queue..."
                className="form-input"
                value={queueSearch}
                onChange={(e) => {
                  setQueueSearch(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ padding: '0.35rem 0.65rem 0.35rem 1.85rem', fontSize: '0.75rem' }}
              />
            </div>
          </div>

          {/* Bulk Action Toolbar */}
          {pendingUsers.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: selectedUsers.size > 0 ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-tertiary)',
                border: '1px solid ' + (selectedUsers.size > 0 ? 'rgba(99, 102, 241, 0.4)' : 'var(--border-subtle)'),
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '0.75rem',
                fontSize: '0.8rem'
              }}
            >
              <button
                type="button"
                onClick={toggleSelectAllCurrentPage}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
              >
                {paginatedQueue.length > 0 && paginatedQueue.every((u) => selectedUsers.has(u.username)) ? (
                  <CheckSquare size={16} color="var(--edge-purple)" />
                ) : (
                  <Square size={16} />
                )}
                <span>Select Page ({paginatedQueue.length})</span>
              </button>

              {selectedUsers.size > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--edge-purple)' }}>{selectedUsers.size} selected</span>
                  <button
                    onClick={handleBulkApprove}
                    disabled={bulkProcessing}
                    style={{ background: 'var(--gain-green)', color: '#fff', border: 'none', padding: '0.25rem 0.65rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    ✓ Bulk Approve
                  </button>
                  <button
                    onClick={handleBulkDeny}
                    disabled={bulkProcessing}
                    style={{ background: 'var(--loss-red)', color: '#fff', border: 'none', padding: '0.25rem 0.65rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    ✕ Bulk Deny
                  </button>
                </div>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  Select multiple users to approve or deny in bulk
                </span>
              )}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>Loading queue...</div>
          ) : filteredQueue.length === 0 ? (
            <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: 'var(--radius-sm)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {pendingUsers.length === 0 ? 'No pending sign-ups in queue! All caught up.' : 'No users match your search query.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {paginatedQueue.map((item) => {
                const pass = tempPasswords[item.username] || '';
                const isSelected = selectedUsers.has(item.username);

                // ⚡ Pre-filled Reddit PM Compose URL for instant 1-click delivery
                const redditPmUrl = `https://www.reddit.com/message/compose/?to=${encodeURIComponent(
                  item.username
                )}&subject=NNNC%20Stonks%20Verification&message=Welcome%20to%20NNNC%20Stonks!%0A%0AYour%20temporary%20password%20is:%20${encodeURIComponent(
                  pass
                )}%0A%0ALog%20in%20to%20claim%20your%20100k%20Edgecoins%20and%20tradeable%20community%20stonk!`;

                return (
                  <div
                    key={item.id}
                    style={{
                      background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-tertiary)',
                      border: '1px solid ' + (isSelected ? 'rgba(99, 102, 241, 0.4)' : 'var(--border-subtle)'),
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleSelectUser(item.username)}
                        style={{ background: 'transparent', border: 'none', color: isSelected ? 'var(--edge-purple)' : 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                      >
                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                          <span style={{ fontWeight: 800 }}>u/{item.username}</span>

                          {/* 1-Click Pre-filled Reddit DM Link */}
                          <a
                            href={redditPmUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.7rem',
                              background: 'rgba(99, 102, 241, 0.15)',
                              color: 'var(--edge-purple)',
                              padding: '0.15rem 0.5rem',
                              borderRadius: 'var(--radius-full)',
                              textDecoration: 'none',
                              fontWeight: 600
                            }}
                            title="Open Reddit with pre-filled DM containing temp password"
                          >
                            <MessageSquare size={11} /> Send Reddit DM ↗
                          </a>

                          <a
                            href={`https://www.reddit.com/user/${item.username}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', textDecoration: 'none' }}
                          >
                            Profile <ExternalLink size={10} />
                          </a>
                        </div>

                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span>Temp Pass: <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{pass}</code></span>
                          <button
                            onClick={() => copyToClipboard(pass, item.username)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            title="Copy temporary password"
                          >
                            {copiedUser === item.username ? <Check size={12} color="var(--gain-green)" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons: Deny & Approve */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                      <button
                        onClick={() => handleDeny(item.username)}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--loss-red)',
                          color: 'var(--loss-red)',
                          padding: '0.35rem 0.65rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                        title="Reject and purge from queue"
                      >
                        Deny
                      </button>

                      <button
                        className="btn-primary"
                        onClick={() => handleApprove(item.username)}
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.8rem' }}
                      >
                        Approve & Mint
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span>Page {currentPage} of {totalPages} ({filteredQueue.length} applicants)</span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', opacity: currentPage <= 1 ? 0.5 : 1 }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', opacity: currentPage >= totalPages ? 0.5 : 1 }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: SEARCHABLE NNN ELIMINATION HAMMER */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--loss-red)', marginBottom: '0.35rem' }}>
            <AlertOctagon size={18} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>NNN Elimination ("Nutted" Hammer)</h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
            When a community member is verified to have failed NNN, search their Reddit username below to trigger an immediate <strong>90% liquidity collapse</strong> and halt trading.
          </p>

          {/* Search Autocomplete Input */}
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search Reddit username to eliminate (e.g. u/DFV_CHAD)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                  if (selectedTarget && e.target.value !== selectedTarget.ticker) {
                    setSelectedTarget(null);
                  }
                }}
                onFocus={() => setIsDropdownOpen(true)}
                style={{ paddingLeft: '2.25rem' }}
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setSelectedTarget(null); }}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Live Autocomplete Results Dropdown */}
            {isDropdownOpen && searchQuery.trim() && !selectedTarget && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 50,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  marginTop: '4px',
                  boxShadow: 'var(--shadow-lg)',
                  maxHeight: '220px',
                  overflowY: 'auto'
                }}
              >
                {matchingStonks.length === 0 ? (
                  <div style={{ padding: '0.85rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    No active members found matching "{searchQuery}"
                  </div>
                ) : (
                  matchingStonks.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedTarget(s);
                        setSearchQuery(s.ticker);
                        setIsDropdownOpen(false);
                      }}
                      style={{
                        padding: '0.65rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700 }}>u/{s.ticker}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--gain-green)', background: 'var(--gain-bg)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                          Surviving
                        </span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {s.current_price?.toFixed(2)} EC
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Staged Elimination Preview Card */}
          {selectedTarget && (
            <div
              style={{
                background: 'rgba(244, 63, 94, 0.08)',
                border: '1px solid var(--loss-red)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                marginTop: '0.75rem',
                animation: 'slideUp 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UserX size={20} color="var(--loss-red)" />
                  <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>Target: u/{selectedTarget.ticker}</span>
                </div>
                <button
                  onClick={() => { setSelectedTarget(null); setSearchQuery(''); }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  Cancel
                </button>
              </div>

              {/* Price Collapse Projection */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontFamily: 'var(--font-mono)' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Current Price</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{selectedTarget.current_price?.toFixed(2)} EC</span>
                </div>
                <ArrowRight size={18} color="var(--loss-red)" />
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--loss-red)', display: 'block' }}>Post-Crash (-90%)</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--loss-red)' }}>
                    {(selectedTarget.current_price * 0.10).toFixed(2)} EC
                  </span>
                </div>
              </div>

              <button
                onClick={handleExecuteElimination}
                disabled={eliminating}
                style={{
                  width: '100%',
                  background: 'var(--loss-red)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: eliminating ? 'not-allowed' : 'pointer',
                  opacity: eliminating ? 0.6 : 1,
                  boxShadow: '0 4px 16px rgba(244, 63, 94, 0.4)'
                }}
              >
                {eliminating ? 'Executing Liquidity Drain...' : '⚡ Execute 90% Collapse & Freeze Trading'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
