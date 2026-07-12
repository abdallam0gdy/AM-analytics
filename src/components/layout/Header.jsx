import { Sun, Moon, Bell, Search, Wifi, WifiOff } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useSupabaseStatus } from '../../hooks/useSupabase';
import { isGeminiConfigured } from '../../lib/gemini';
import { useState } from 'react';

export default function Header({ onToggleSidebar }) {
  const { isDark, toggleTheme } = useTheme();
  const { isConfigured: supabaseOk } = useSupabaseStatus();
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header
      id="main-header"
      className="
        sticky top-0 z-30 h-16
        bg-surface-light/80 dark:bg-surface-dark/80
        backdrop-blur-xl
        border-b border-border-light dark:border-border-dark
        flex items-center justify-between
        px-4 lg:px-6
      "
    >
      <div className="flex items-center gap-3">
        {/* Mobile menu - removed since sidebar is disabled on mobile */}
        <div className="flex lg:hidden items-center shrink-0">
          <img 
            src={isDark ? "/logo-dark.png" : "/logo-light.png"} 
            alt="AM Analytics" 
            className="h-14 sm:h-16 w-auto object-contain"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/logo.svg";
            }}
          />
        </div>

        {/* Search */}
        <div className={`relative hidden sm:flex items-center transition-all duration-300 ${searchFocused ? 'w-80' : 'w-64'}`}>
          <Search size={16} className="absolute start-3 text-text-secondary-light/50 dark:text-text-secondary-dark/50 pointer-events-none" />
          <input
            id="global-search"
            type="text"
            placeholder="ابحث عن منافس أو فيديو..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="
              w-full ps-9 pe-4 py-2 text-sm rounded-xl
              bg-bg-light dark:bg-surface-dark-2
              border border-border-light dark:border-border-dark
              text-text-primary-light dark:text-text-primary-dark
              placeholder:text-text-secondary-light/40 dark:placeholder:text-text-secondary-dark/40
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50
              transition-all duration-300
            "
          />
        </div>
      </div>

      {/* Left side */}
      <div className="flex items-center gap-1.5">
        {/* Connection Status */}
        <div className="hidden md:flex items-center gap-1.5 me-2 px-2.5 py-1.5 rounded-lg text-xs font-medium">
          {supabaseOk ? (
            <><Wifi size={13} className="text-emerald-500" /><span className="text-emerald-600 dark:text-emerald-400">Supabase</span></>
          ) : (
            <><WifiOff size={13} className="text-amber-500" /><span className="text-amber-600 dark:text-amber-400">محلي</span></>
          )}
          <span className="mx-1 text-border-light dark:text-border-dark">|</span>
          <span className={isGeminiConfigured ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
            {isGeminiConfigured ? '🤖 AI' : '🤖 بدون AI'}
          </span>
        </div>

        {/* Notifications */}
        <button
          id="notifications-btn"
          className="relative p-2 rounded-xl text-text-secondary-light dark:text-text-secondary-dark hover:bg-primary-50 dark:hover:bg-surface-dark-hover transition-colors"
          aria-label="الإشعارات"
        >
          <Bell size={19} />
          <span className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full bg-accent-container ring-2 ring-surface-light dark:ring-surface-dark" />
        </button>

        {/* Theme Toggle */}
        <button
          id="theme-toggle"
          onClick={toggleTheme}
          className="p-2 rounded-xl text-text-secondary-light dark:text-text-secondary-dark hover:bg-primary-50 dark:hover:bg-surface-dark-hover transition-all duration-300 hover:text-accent-container"
          aria-label={isDark ? 'وضع فاتح' : 'وضع داكن'}
        >
          <div className="relative w-5 h-5">
            <Sun size={20} className={`absolute inset-0 transition-all duration-500 ${isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}`} />
            <Moon size={20} className={`absolute inset-0 transition-all duration-500 ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}`} />
          </div>
        </button>

        {/* Avatar */}
        <button id="user-avatar" className="ms-1 flex items-center gap-2 p-1 pe-3 rounded-xl hover:bg-primary-50 dark:hover:bg-surface-dark-hover transition-colors">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white text-xs font-bold shadow-sm">
            AM
          </div>
          <span className="hidden md:block text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
            عبدالله
          </span>
        </button>
      </div>
    </header>
  );
}
