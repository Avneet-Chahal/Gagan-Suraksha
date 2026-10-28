import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Satellite,
  Orbit,
  ArrowLeftRight,
  ShieldAlert,
  Rocket,
  BarChart3,
  Bell,
  Settings,
  Radio,
} from 'lucide-react';

interface NavItemConfig {
  path: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export const Sidebar: React.FC = () => {
  const [unreadCount, setUnreadCount] = useState<number>(3);

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

  const navItems: NavItemConfig[] = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/satellites', label: 'Satellites', icon: Satellite },
    { path: '/tracking', label: 'Tracking', icon: Orbit },
    { path: '/close-approaches', label: 'Close Approaches', icon: ArrowLeftRight },
    { path: '/collision-risk', label: 'Collision Risk', icon: ShieldAlert },
    { path: '/maneuver-planner', label: 'Maneuver Planner', icon: Rocket },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/alerts', label: 'Alerts', icon: Bell, badge: unreadCount > 0 ? unreadCount : undefined },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="app-sidebar">
      <div>
        {/* Brand Section */}
        <div className="brand-section">
          <div className="brand-logo-icon">
            <Orbit size={18} />
          </div>
          <div className="brand-info">
            <span className="brand-title">GAGAN SURAKSHA</span>
            <span className="brand-subtitle">SATELLITE OPERATIONS</span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'active' : ''}`
                }
                end={item.path === '/'}
              >
                <Icon className="nav-icon" />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="nav-badge">{item.badge}</span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Network Status Footer Matching Reference */}
      <div className="sidebar-footer">
        <div className="network-status-box">
          <div className="network-header">
            <span className="status-dot status-dot-green"></span>
            <span className="network-label">Network</span>
            <span className="network-connected">Connected</span>
          </div>
          <div className="ground-station-info">
            <Radio size={14} style={{ color: 'var(--accent-cyan)', marginTop: '2px', flexShrink: 0 }} />
            <div className="station-details">
              <div className="station-name">Ground Station</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.68rem' }}>Hartebeesthoek (HBK)</div>
              <div className="station-coords">Lat 25.881° S Lon 27.660° E</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
