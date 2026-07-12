import { Outlet, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { LayoutDashboard, Users, BrainCircuit } from 'lucide-react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div id="app-layout" className="flex min-h-screen bg-surface dark:bg-bg-dark transition-colors duration-300">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Header */}
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <div className="page-container">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* Mobile Bottom Navigation Bar (Stitch design) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-container-lowest/90 backdrop-blur-md shadow-[0_-1px_10px_rgba(0,0,0,0.05)] border-t border-outline-variant/30 dark:border-border-dark/50 px-6 py-2 flex items-center justify-between">
        <NavLink to="/" end className={({ isActive }) => `flex flex-col items-center gap-1 group w-20`}>
          {({ isActive }) => (
            <>
              <div className={`px-5 py-1.5 rounded-full mb-0.5 transition-all ${isActive ? 'bg-primary-container/20 text-primary' : 'text-on-surface-variant group-hover:bg-surface-container'}`}>
                <LayoutDashboard size={20} />
              </div>
              <span className={`text-[11px] font-bold ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>الرئيسية</span>
            </>
          )}
        </NavLink>
        <NavLink to="/competitors" className={({ isActive }) => `flex flex-col items-center gap-1 group w-20`}>
          {({ isActive }) => (
            <>
              <div className={`px-5 py-1.5 rounded-full mb-0.5 transition-all ${isActive ? 'bg-primary-container/20 text-primary' : 'text-on-surface-variant group-hover:bg-surface-container'}`}>
                <Users size={20} />
              </div>
              <span className={`text-[11px] font-bold ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>المنافسون</span>
            </>
          )}
        </NavLink>
        <NavLink to="/ai-reports" className={({ isActive }) => `flex flex-col items-center gap-1 group w-20`}>
          {({ isActive }) => (
            <>
              <div className={`px-5 py-1.5 rounded-full mb-0.5 transition-all ${isActive ? 'bg-primary-container/20 text-primary' : 'text-on-surface-variant group-hover:bg-surface-container'}`}>
                <BrainCircuit size={20} />
              </div>
              <span className={`text-[11px] font-bold ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>تقارير AI</span>
            </>
          )}
        </NavLink>
      </nav>
    </div>
  );
}
