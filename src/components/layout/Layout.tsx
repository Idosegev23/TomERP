import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Building, 
  Home, 
  Users, 
  CheckSquare,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  FileText,
  Search,
  Target
} from 'lucide-react';
import { Button } from '../ui';
import { useAuth } from '../auth/AuthContext';

interface SidebarItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ to, icon: Icon, label, isActive }) => (
  <Link 
    to={to}
    className={`sidebar-item ${isActive ? 'active' : ''}`}
  >
    <Icon className="h-5 w-5" />
    <span>{label}</span>
  </Link>
);

export const Layout: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { user, signOut, hasAccess } = useAuth();

  const navigationItems = [
    { to: '/', icon: BarChart3, label: t('navigation.dashboard') },
    { to: '/developers', icon: Building, label: t('navigation.developers'), requiresAccess: 'developers' },
    { to: '/projects', icon: Building, label: t('navigation.projects'), requiresAccess: 'projects' },
    { to: '/units', icon: Home, label: t('navigation.units') },
    { to: '/tasks', icon: CheckSquare, label: t('navigation.tasks') },
    { to: '/tasks/stages', icon: Target, label: '🎯 ניהול שלבים' },
    { to: '/files', icon: FileText, label: 'קבצים', requiresAccess: 'files' },
    { to: '/users', icon: Users, label: t('navigation.users'), requiresAccess: 'users' },
    { to: '/settings', icon: Settings, label: t('navigation.settings') },
  ].filter(item => !item.requiresAccess || hasAccess(item.requiresAccess));

  return (
    <div className="min-h-screen bg-gray-50 flex safe-area-top safe-area-bottom" dir="rtl">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 right-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">
            נדל"ן Pro
          </h1>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="mt-6 px-3 nav-mobile">
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <SidebarItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                isActive={location.pathname === item.to}
              />
            ))}
          </div>
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.full_name || 'משתמש'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-gray-400 hover:text-red-600"
              title="התנתק"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky-mobile">
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden tap-area"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="lg:hidden">
                <h1 className="text-lg font-semibold text-gray-900">נדל"ן Pro</h1>
                <div className="text-xs text-gray-500 hidden sm:block">
                  {user?.full_name || user?.email}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/search')}
                className="text-gray-600 hover:text-blue-600 tap-area"
                title="חיפוש גלובלי"
              >
                <Search className="h-5 w-5" />
              </Button>
              <span className="text-gray-500 text-sm hidden md:block">
                {new Date().toLocaleDateString('he-IL', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
              <span className="text-gray-500 text-xs md:hidden">
                {new Date().toLocaleDateString('he-IL', {
                  day: 'numeric',
                  month: 'short'
                })}
              </span>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}; 