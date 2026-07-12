import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

const navItems = [
  { id: 'nav-dashboard', label: 'لوحة التحكم', path: '/', icon: LayoutDashboard },
  { id: 'nav-competitors', label: 'تحليل المنافسين', path: '/competitors', icon: Users },
  { id: 'nav-ai-reports', label: 'تقارير AI', path: '/ai-reports', icon: BrainCircuit },
];

// Logo Component with fallback strategy
function Logo({ className = "w-8 h-8", full = false }) {
  const { isDark } = useTheme();
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary via-primary-container to-primary-light flex items-center justify-center shadow-lg shadow-primary/25 shrink-0">
        <Sparkles size={16} className="text-white" />
      </div>
    );
  }

  // Load theme-specific full logo or the vector logo.svg
  const logoSrc = full 
    ? (isDark ? "/logo-dark.png" : "/logo-light.png")
    : "/logo.svg";

  return (
    <div className={`${className} overflow-hidden flex items-center justify-center shrink-0`}>
      <img
        src={logoSrc}
        alt="AM"
        className="w-full h-full object-contain"
        referrerPolicy="no-referrer"
        onError={() => {
          setError(true);
        }}
      />
    </div>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          id="sidebar-overlay"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        id="main-sidebar"
        className={`
          hidden lg:flex
          fixed top-0 z-50 h-screen
          bg-surface-light dark:bg-sidebar-bg
          border-e border-border-light dark:border-border-dark/50
          flex flex-col
          transition-all duration-300 ease-in-out
          ${collapsed ? 'lg:w-[72px]' : 'lg:w-60'}
          w-60
          ${isOpen ? 'start-0' : '-start-60'}
          lg:start-0 lg:static
        `}
      >
        {/* Logo */}
        <div className={`h-20 ${collapsed ? 'px-2' : 'px-3'} flex items-center justify-center border-b border-border-light dark:border-border-dark/50`}>
          <Logo 
            full={!collapsed} 
            className={collapsed ? "w-12 h-12" : "w-full h-18"} 
          />
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2.5 space-y-1 overflow-y-auto">
          {!collapsed && (
            <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-widest text-text-secondary-light/40 dark:text-text-secondary-dark/40">
              القائمة
            </p>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                id={item.id}
                to={item.path}
                onClick={onClose}
                end={item.path === '/'}
                className={({ isActive }) => `
                  group flex items-center gap-3
                  ${collapsed ? 'justify-center px-2' : 'px-3'}
                  py-2.5 rounded-xl text-[13px] font-semibold
                  transition-all duration-200
                  ${isActive
                    ? 'bg-gradient-to-l from-primary to-primary-container text-white shadow-lg shadow-primary/20'
                    : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-primary-50 dark:hover:bg-surface-dark-hover hover:text-primary dark:hover:text-primary-light'
                  }
                `}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={19} className="shrink-0 transition-transform duration-200 group-hover:scale-110" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="hidden lg:block p-2.5 border-t border-border-light dark:border-border-dark/50">
          <button
            id="sidebar-collapse-toggle"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center py-2 rounded-xl text-text-secondary-light dark:text-text-secondary-dark hover:bg-primary-50 dark:hover:bg-surface-dark-hover hover:text-primary transition-all"
            aria-label={collapsed ? 'توسيع' : 'تصغير'}
          >
            {collapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </aside>
    </>
  );
}
