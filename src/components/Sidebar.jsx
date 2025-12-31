import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Home,
  Package,
  Calendar,
  DollarSign,
  Settings,
  LogOut,
  User,
  Users,
  Menu,
  X,
  FileText,
  Calculator
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

const NavItem = ({ to, icon: Icon, children, onClick }) => {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => `
        flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
        ${isActive
          ? 'bg-white/20 text-white font-medium'
          : 'text-white/70 hover:text-white hover:bg-white/10'
        }
      `}
    >
      <Icon className="w-5 h-5" />
      <span>{children}</span>
    </NavLink>
  );
};

export const Sidebar = ({ isOpen, onToggle }) => {
  const { companyInfo, customization } = useApp();
  const { user, logout } = useAuth();
  const location = useLocation();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (window.innerWidth < 1024) {
      onToggle?.(false);
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
  };

  const closeSidebar = () => {
    if (window.innerWidth < 1024) {
      onToggle?.(false);
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => onToggle?.(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed left-0 top-0 h-screen w-64 p-6 flex flex-col z-50
          transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          background: `linear-gradient(135deg, ${customization.primaryColor} 0%, ${customization.secondaryColor} 100%)`
        }}
      >
        {/* Close button for mobile */}
        <button
          onClick={() => onToggle?.(false)}
          className="absolute top-4 right-4 p-2 text-white/70 hover:text-white lg:hidden"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Logo */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{customization.logoIcon}</span>
            <div>
              <h1 className="text-white text-xl font-bold">{companyInfo.name}</h1>
              <p className="text-white/60 text-sm">Gestionale</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          <NavItem to="/" icon={LayoutDashboard} onClick={closeSidebar}>Dashboard</NavItem>
          <NavItem to="/bookings" icon={Calendar} onClick={closeSidebar}>Prenotazioni</NavItem>
          <NavItem to="/properties" icon={Home} onClick={closeSidebar}>Case</NavItem>
          <NavItem to="/guests" icon={Users} onClick={closeSidebar}>Ospiti</NavItem>
          <NavItem to="/products" icon={Package} onClick={closeSidebar}>Prodotti</NavItem>
          <NavItem to="/templates" icon={FileText} onClick={closeSidebar}>Template</NavItem>
          <NavItem to="/costs" icon={DollarSign} onClick={closeSidebar}>Costi Fissi</NavItem>
          <NavItem to="/tourist-tax" icon={Calculator} onClick={closeSidebar}>Tassa Soggiorno</NavItem>
        </nav>

        {/* Settings and user at bottom */}
        <div className="mt-auto space-y-2">
          <NavItem to="/settings" icon={Settings} onClick={closeSidebar}>Impostazioni</NavItem>

          {/* User info */}
          {user && (
            <div className="px-4 py-3 border-t border-white/20 mt-4">
              <div className="flex items-center gap-3 text-white/80 mb-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.firstName || user.email.split('@')[0]}
                  </p>
                  <p className="text-xs text-white/50 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-2 w-full rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Mobile Header with hamburger menu
export const MobileHeader = ({ onMenuClick }) => {
  const { companyInfo, customization } = useApp();

  return (
    <header
      className="fixed top-0 left-0 right-0 h-16 px-4 flex items-center justify-between z-30 lg:hidden"
      style={{
        background: `linear-gradient(135deg, ${customization.primaryColor} 0%, ${customization.secondaryColor} 100%)`
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{customization.logoIcon}</span>
        <h1 className="text-white text-lg font-bold">{companyInfo.name}</h1>
      </div>
      <button
        onClick={onMenuClick}
        className="p-2 text-white/80 hover:text-white"
      >
        <Menu className="w-6 h-6" />
      </button>
    </header>
  );
};
