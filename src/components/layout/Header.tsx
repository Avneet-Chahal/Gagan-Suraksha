import React, { useState, useEffect } from 'react';
import { Globe, Bell, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const [utcTime, setUtcTime] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState<number>(3);
  const navigate = useNavigate();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = String(now.getUTCMonth() + 1).padStart(2, '0');
      const day = String(now.getUTCDate()).padStart(2, '0');
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      const seconds = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`UTC ${year}-${month}-${day} ${hours}:${minutes}:${seconds}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateCount = () => {
      try {
        const saved = localStorage.getItem('gagan_alerts_state');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const count = parsed.filter((a: { read?: boolean }) => !a.read).length;
            setUnreadCount(count);
            return;
          }
        }
      } catch {
        // fallback
      }
      setUnreadCount(3);
    };

    updateCount();
    window.addEventListener('storage', updateCount);
    const interval = setInterval(updateCount, 1500);
    return () => {
      window.removeEventListener('storage', updateCount);
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="mission-control-pill">
          <Radio size={16} className="text-cyan-400" style={{ color: 'var(--accent-cyan)' }} />
          <span>Mission Control</span>
          <span className="badge badge-operational">
            <span className="status-dot status-dot-green"></span>
            ONLINE
          </span>
        </div>

        <div className="utc-clock-badge">
          <span>{utcTime || 'UTC 2025-04-27 08:24:36'}</span>
        </div>

        <button
          className="view-mode-button"
          title="Switch to Global 3D Tracking Workspace"
          onClick={() => navigate('/tracking')}
        >
          <Globe size={14} style={{ color: 'var(--accent-cyan)' }} />
          <span>Global View</span>
        </button>
      </div>

      <div className="header-right">
        <button
          className="icon-button"
          aria-label="Alerts"
          title={`${unreadCount} Unread Alerts`}
          onClick={() => navigate('/alerts')}
        >
          <Bell size={17} />
          {unreadCount > 0 && <span className="icon-badge">{unreadCount}</span>}
        </button>

        <div
          className="user-profile"
          onClick={() => navigate('/settings')}
          style={{ cursor: 'pointer' }}
          title="Open Operator Preferences"
        >
          <div className="user-avatar" title="Alex Carter - Operator">
            AC
          </div>
          <div className="user-meta">
            <span className="user-name">Alex Carter</span>
            <span className="user-role">Operator</span>
          </div>
        </div>
      </div>
    </header>
  );
};
