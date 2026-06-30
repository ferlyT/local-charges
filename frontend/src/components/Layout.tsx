import React, { useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LogOut, LayoutDashboard, FileText, ChevronLeft, ChevronRight, Users, UserCircle, Shield, Trash2, ClipboardList } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import { useTranslation } from '../hooks/useTranslation';
import { hasPermission } from '../lib/permissions';
import { resolveAvatarUrl } from '../lib/constants';

export default function Layout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: t('nav_dashboard'), path: '/', icon: LayoutDashboard },
    ...((hasPermission(user, 'local_charges:create')) ? [
      { name: t('nav_local_charges'), path: '/local-charges', icon: FileText },
    ] : []),
    ...((hasPermission(user, 'inspection_reports:read')) ? [
      { name: t('nav_inspection_reports'), path: '/inspection-reports', icon: ClipboardList },
    ] : []),
    ...((hasPermission(user, 'local_charges:delete')) ? [
      { name: t('nav_recycle_bin'), path: '/recycle-bin', icon: Trash2 },
    ] : []),
    { name: t('nav_my_profile'), path: '/profile', icon: UserCircle },
    ...((hasPermission(user, 'users:manage')) ? [
      { name: t('nav_manage_users'), path: '/users', icon: Users }
    ] : []),
    ...((hasPermission(user, 'roles:manage')) ? [
      { name: t('nav_manage_roles'), path: '/roles', icon: Shield }
    ] : []),
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-neutral overflow-hidden font-sans">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-5 py-3 bg-surface border-b border-secondary/20 w-full z-20 shadow-sm">
        <h1 className="font-display text-primary tracking-[-0.015em] text-[1.8rem]">
          WorkHub
        </h1>
        <div className="flex items-center gap-4">
          <LanguageToggle />
          <ThemeToggle />
          <button 
            onClick={handleLogout}
            className="text-secondary hover:text-tertiary transition-colors p-1.5 rounded-md hover:bg-secondary/10"
            title={t('nav_logout')}
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div 
        className={`hidden md:flex bg-surface border-r border-secondary/20 transition-all duration-300 flex-col relative ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-7 bg-surface border border-secondary/20 rounded-full p-1.5 shadow-sm hover:bg-neutral transition-colors z-20 text-secondary"
        >
          {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        <div className={`p-6 border-b border-secondary/20 flex items-center ${isSidebarOpen ? 'justify-start' : 'justify-center'}`}>
          <h1 className={`font-display text-primary tracking-[-0.015em] transition-all duration-300 ${isSidebarOpen ? 'text-[2.2rem]' : 'text-[1.5rem]'}`}>
            {isSidebarOpen ? 'WorkHub' : 'WH'}
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150 relative group ${
                  isActive
                    ? 'bg-tertiary/10 text-tertiary font-semibold shadow-sm'
                    : 'text-secondary hover:bg-neutral hover:text-primary'
                } ${!isSidebarOpen && 'justify-center'}`}
                title={!isSidebarOpen ? item.name : undefined}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-tertiary rounded-r-md" />
                )}
                <item.icon size={20} className={isActive ? 'text-tertiary' : 'text-secondary group-hover:text-primary transition-colors'} />
                {isSidebarOpen && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={`p-4 border-t border-secondary/20 bg-neutral/30 transition-all ${!isSidebarOpen && 'flex flex-col items-center'}`}>
          {isSidebarOpen && (
            <div className="mb-4 flex justify-center w-full gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          )}
          <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'} w-full gap-2`}>
            {isSidebarOpen && (
              <div className="flex items-center gap-3 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/profile')}>
                {user?.avatar ? (
                  <img src={resolveAvatarUrl(user.avatar) ?? user.avatar} alt="Avatar" className="w-9 h-9 rounded-full object-cover shadow-inner flex-shrink-0" onError={(e) => { (e.target as any).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name || 'U') + '&background=random' }} />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center font-bold flex-shrink-0 shadow-inner" title={user?.name}>
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[0.9rem] font-semibold text-primary truncate">{user?.name}</span>
                  <span className="text-[0.68rem] tracking-[0.04em] text-secondary uppercase font-mono truncate">{user?.role}</span>
                </div>
              </div>
            )}
            
            {!isSidebarOpen && (
              <div className="mb-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/profile')} title={user?.name}>
                {user?.avatar ? (
                  <img src={resolveAvatarUrl(user.avatar) ?? user.avatar} alt="Avatar" className="w-9 h-9 rounded-full object-cover shadow-inner flex-shrink-0" onError={(e) => { (e.target as any).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name || 'U') + '&background=random' }} />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center font-bold flex-shrink-0 shadow-inner">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            )}
            
            <button 
              onClick={handleLogout}
              className={`text-secondary hover:text-tertiary transition-colors p-2 rounded-md hover:bg-secondary/10 ${!isSidebarOpen && 'w-full flex justify-center mb-1'}`}
              title={t('nav_logout')}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto pb-16 md:pb-0">
        <Outlet />
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-secondary/20 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] overflow-x-auto no-scrollbar">
        <div className="flex items-center min-w-max px-2 py-2 gap-1 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex flex-col items-center justify-center min-w-[72px] max-w-[84px] gap-1 py-1.5 px-1 rounded-lg transition-all flex-shrink-0 ${
                  isActive
                    ? 'text-tertiary bg-tertiary/10 font-semibold'
                    : 'text-secondary hover:text-primary hover:bg-neutral'
                }`}
              >
                <item.icon size={20} className={isActive ? 'text-tertiary' : 'text-secondary'} />
                <span className="text-[0.65rem] truncate w-full text-center tracking-tight leading-tight">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

