import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useOrg } from '../context/OrgContext';
import { NotificationBell } from './notifications';
import { ThemeToggle } from './security';
import {
  User,
  Home,
  AlertCircle,
  ClipboardList,
  CheckCircle2,
  FileBadge2,
  FlaskConical,
  Activity,
  BarChart3,
  FileText,
  GraduationCap,
  Shield,
  LifeBuoy,
  Users,
  Inbox,
  Building2,
  MapPin,
  Plug,
  ShieldCheck,
  Settings,
  Sun,
  Scale,
  HardHat,
  ChevronDown,
  Circle,
  Menu,
  X
} from 'lucide-react';

const NAV_GROUPS_STORAGE_KEY = 'ehs_nav_groups_v1';

const iconMap = {
  home: Home,
  'alert-circle': AlertCircle,
  'clipboard-list': ClipboardList,
  'check-circle': CheckCircle2,
  'file-badge': FileBadge2,
  flask: FlaskConical,
  activity: Activity,
  'bar-chart-2': BarChart3,
  'file-text': FileText,
  'graduation-cap': GraduationCap,
  shield: Shield,
  'life-buoy': LifeBuoy,
  users: Users,
  inbox: Inbox,
  building: Building2,
  'map-pin': MapPin,
  plug: Plug,
  'shield-check': ShieldCheck,
  settings: Settings,
  sun: Sun,
  scale: Scale,
  'hard-hat': HardHat
};

const navGroups = [
  {
    id: 'operations',
    label: 'Operations',
    defaultOpen: true,
    items: [
      { to: '/', label: 'Dashboard', icon: 'home' },
      { to: '/incidents', label: 'Incidents', icon: 'alert-circle' },
      { to: '/inspections', label: 'Inspections', icon: 'clipboard-list' },
      { to: '/actions', label: 'My Actions', icon: 'check-circle' },
      { to: '/permits', label: 'Permits', icon: 'file-badge' },
      { to: '/chemicals', label: 'Chemicals', icon: 'flask' }
    ]
  },
  {
    id: 'risk',
    label: 'Risk & Compliance',
    defaultOpen: true,
    items: [
      { to: '/risks', label: 'Risk Register', icon: 'activity' },
      { to: '/analytics', label: 'Analytics', icon: 'bar-chart-2' },
      { to: '/reports', label: 'Reports', icon: 'file-text' }
    ]
  },
  {
    id: 'learning',
    label: 'Learning & Safety',
    defaultOpen: false,
    items: [
      { to: '/training', label: 'Training', icon: 'graduation-cap', disabled: true },
      { to: '/safety', label: 'Safety Advisor', icon: 'shield', disabled: true },
      { to: '/help', label: 'Help', icon: 'life-buoy' }
    ]
  },
  {
    id: 'admin',
    label: 'Admin',
    defaultOpen: true,
    requiresRole: [ 'admin', 'manager' ],
    items: [
      { to: '/admin/users', label: 'Users', icon: 'users' },
      { to: '/admin/access-requests', label: 'Access Requests', icon: 'inbox' },
      { to: '/admin/organisation', label: 'Organisation', icon: 'building' },
      { to: '/admin/sites', label: 'Sites', icon: 'map-pin' },
      { to: '/admin/integrations', label: 'Integrations', icon: 'plug' },
      { to: '/admin/security', label: 'Security Centre', icon: 'shield-check', disabled: true },
      { to: '/admin/training', label: 'Training Admin', icon: 'settings', disabled: true },
      { to: '/admin/safety-moments', label: 'Safety Moments', icon: 'sun' },
      { to: '/admin/site-legislation', label: 'Site Legislation', icon: 'scale' },
      { to: '/admin/ppe-rules', label: 'PPE Rules', icon: 'hard-hat' },
      { to: '/admin/incident-types', label: 'Incident Types', icon: 'alert-circle' },
      { to: '/admin/templates', label: 'Templates', icon: 'clipboard-list' },
      { to: '/admin/permit-types', label: 'Permit Types', icon: 'file-badge' }
    ]
  }
];

const pageTitles = {
  '/': 'Dashboard',
  '/incidents': 'Incidents',
  '/incidents/new': 'New Incident',
  '/inspections': 'Inspections',
  '/inspections/new': 'New Inspection',
  '/actions': 'My Actions',
  '/chemicals': 'Chemical Register',
  '/chemicals/new': 'New Chemical',
  '/permits': 'Permits',
  '/permits/board': 'Permit Board',
  '/permits/new': 'New Permit',
  '/risks': 'Risk Register',
  '/risks/new': 'New Risk',
  '/risks/heatmap': 'Risk Heatmap',
  '/analytics': 'Analytics & Insights',
  '/notifications': 'Notifications',
  '/settings/notifications': 'Notification Settings',
  '/security': 'Security',
  '/reports': 'Reports & Exports',
  '/help': 'Help',
  '/admin/users': 'User Management',
  '/admin/access-requests': 'Access Requests',
  '/admin/organisation': 'Organisation Settings',
  '/admin/sites': 'Admin - Sites',
  '/admin/incident-types': 'Admin - Incident Types',
  '/admin/templates': 'Admin - Templates',
  '/admin/permit-types': 'Admin - Permit Types',
  '/admin/integrations': 'Integrations'
};

const matchTitle = (pathname) => {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith('/incidents/')) return 'Incident Detail';
  if (pathname.startsWith('/inspections/')) return 'Inspection Detail';
  if (pathname.startsWith('/actions/')) return 'Action Detail';
  if (pathname.startsWith('/chemicals/')) return 'Chemical Detail';
  if (pathname.startsWith('/permits/')) return 'Permit Detail';
  if (pathname.match(/\/risks\/\d+\/edit/)) return 'Edit Risk';
  if (pathname.startsWith('/risks/')) return 'Risk Detail';
  if (pathname.startsWith('/admin/templates/')) return 'Template Detail';
  return 'EHS Portal';
};

const OrgLogo = () => {
  const { organisation } = useOrg();

  if (!organisation) return null;

  const logoPath = organisation.logoUrl;

  // Build full URL for logo if it's a relative path
  let logoSrc = null;
  if (logoPath) {
    if (logoPath.startsWith('http')) {
      // Already an absolute URL, use as-is
      logoSrc = logoPath;
    } else {
      // Relative path - prepend backend base URL
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const backendBase = apiBase.replace(/\/api\/?$/, '');
      logoSrc = `${backendBase}${logoPath}`;
    }
  }

  if (logoSrc) {
    return (
      <img
        src={logoSrc}
        alt={organisation.name}
        className="org-logo"
      />
    );
  }

  return (
    <span className="org-name-display">
      {organisation.name || 'EHS Portal'}
    </span>
  );
};

const Layout = () => {
  const { user, logout } = useAuth();
  const { organisation } = useOrg();
  const location = useLocation();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const userMenuRef = useRef(null);
  const [groupState, setGroupState] = useState(() => {
    const defaults = navGroups.reduce((acc, group) => {
      acc[group.id] = group.defaultOpen !== false;
      return acc;
    }, {});

    if (typeof window === 'undefined') return defaults;

    try {
      const stored = localStorage.getItem(NAV_GROUPS_STORAGE_KEY);
      if (!stored) return defaults;
      const parsed = JSON.parse(stored);
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  });

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    navigate('/login');
  };

  const handleNavigateToSettings = () => {
    setUserMenuOpen(false);
    navigate('/settings/notifications');
  };

  const handleNavigateToSecurity = () => {
    setUserMenuOpen(false);
    navigate('/security');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(NAV_GROUPS_STORAGE_KEY, JSON.stringify(groupState));
  }, [groupState]);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  // Dynamic page title for WCAG 2.4.2 Page Titled
  useEffect(() => {
    const title = matchTitle(location.pathname);
    document.title = `${title} | EHS Portal`;
  }, [location.pathname]);

  const canAccess = (roles) => {
    if (!roles || roles.length === 0) return true;
    return roles.includes(user?.role);
  };

  const toggleGroup = (groupId) => {
    setGroupState((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand sidebar-header">
          <div className="brand-content">
            <span className="brand-mark">EHS</span>
            <div className="brand-meta">
              <div className="brand-title">Portal</div>
              <span className="brand-tag">Phase 5</span>
            </div>
          </div>
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-expanded={mobileNavOpen}
            aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileNavOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <nav className={`nav-group sidebar-nav ${mobileNavOpen ? 'open' : ''}`} aria-label="Primary">
          {navGroups
            .filter((group) => canAccess(group.requiresRole))
            .map((group) => {
              const isOpen = !!groupState[group.id];
              const groupId = `nav-group-${group.id}`;

              return (
                <div key={group.id} className="nav-group-section">
                  <button
                    type="button"
                    className="nav-group-header"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={isOpen}
                    aria-controls={groupId}
                  >
                    <span className="nav-group-label">{group.label}</span>
                    <ChevronDown className={`nav-group-chevron ${isOpen ? 'open' : ''}`} size={16} />
                  </button>
                  <div id={groupId} className={`nav-group-items ${isOpen ? 'open' : 'collapsed'}`}>
                    {group.items
                      .filter((item) => canAccess(item.requiresRole))
                      .map((item) => {
                        const Icon = iconMap[item.icon] || Circle;
                        if (item.disabled) {
                          return (
                            <span key={item.to} className="nav-link disabled" aria-disabled="true">
                              <Icon size={16} aria-hidden="true" />
                              <span>{item.label}</span>
                            </span>
                          );
                        }

                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                          >
                            <Icon size={16} aria-hidden="true" />
                            <span>{item.label}</span>
                          </NavLink>
                        );
                      })}
                  </div>
                </div>
              );
            })}
        </nav>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <OrgLogo />
            <div className="topbar-title">
              <h1>{matchTitle(location.pathname)}</h1>
            </div>
          </div>
          <div className="header-right">
            <NotificationBell />
            <ThemeToggle />
            <div className="user-menu-container" ref={userMenuRef}>
              <button
                className="user-menu-trigger icon-only"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                title="User menu"
              >
                <User size={20} />
              </button>
              {userMenuOpen && (
                <div className="user-menu-dropdown" role="menu">
                  <div className="user-meta user-menu-meta">
                    <div className="user-name">{user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()}</div>
                    <div className="user-role">{user?.role}</div>
                  </div>
                  <button
                    className="user-menu-item"
                    onClick={handleNavigateToSecurity}
                    role="menuitem"
                  >
                    Security
                  </button>
                  <button
                    className="user-menu-item"
                    onClick={handleNavigateToSettings}
                    role="menuitem"
                  >
                    Notification Settings
                  </button>
                  <button
                    className="user-menu-item logout"
                    onClick={handleLogout}
                    role="menuitem"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main id="main-content" className="content" role="main">
          <Outlet />
        </main>
      </div>
      
      {/* Live region for screen reader announcements */}
      <div 
        id="aria-live-announcer" 
        className="aria-live-region" 
        aria-live="polite" 
        aria-atomic="true"
      />
    </div>
  );
};

export default Layout;
