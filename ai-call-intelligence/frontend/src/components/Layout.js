import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { 
  Home, 
  Upload, 
  Phone, 
  Settings, 
  Sun, 
  Moon, 
  Menu, 
  X,
  Brain,
  MessageCircle,
  LogOut,
  User,
  CheckSquare
} from 'lucide-react';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Upload Audio', href: '/upload', icon: Upload },
    { name: 'Past Calls', href: '/calls', icon: Phone },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Speaking Coach', href: '/speaking-coach', icon: MessageCircle },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Error logging out');
    }
  };

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden backdrop-blur-sm bg-slate-900/20"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-64 
          bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl
          border-r border-white/20 dark:border-white/5
          transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
          shadow-2xl lg:shadow-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between h-20 px-6 border-b border-white/20 dark:border-white/5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-indigo-600 dark:from-white dark:to-indigo-200">
              Call Intel
            </span>
          </div>
          
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(item.href);
            
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  sidebar-item group
                  ${active ? 'sidebar-item-active shadow-lg shadow-primary-500/10' : ''}
                `}
              >
                <Icon className={`w-5 h-5 mr-3 transition-colors ${active ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 group-hover:text-primary-500'}`} />
                <span className="font-medium">{item.name}</span>
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Theme toggle and user info */}
        <div className="p-4 border-t border-white/20 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50 lg:mx-4 lg:mb-4 lg:rounded-2xl">
          <button
            onClick={toggleTheme}
            className="flex items-center w-full px-4 py-3 text-sm text-slate-600 dark:text-slate-300 rounded-xl hover:bg-white/50 dark:hover:bg-white/5 transition-all duration-200 mb-2 border border-transparent hover:border-slate-200 dark:hover:border-white/5"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-5 h-5 mr-3 text-amber-400" />
                <span className="font-medium">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-5 h-5 mr-3 text-indigo-500" />
                <span className="font-medium">Dark Mode</span>
              </>
            )}
          </button>
          
          <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-white/5">
            <div className="flex items-center space-x-3 p-2 rounded-xl hover:bg-white/50 dark:hover:bg-white/5 transition-colors cursor-pointer group">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 rounded-full flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30">
                <User className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {user ? `${user.firstName} ${user.lastName}` : 'User'}
                </p>
                <div 
                  onClick={handleLogout}
                  className="flex items-center text-xs text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors mt-0.5"
                >
                  <LogOut className="w-3 h-3 mr-1" />
                  <span>Sign out</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 lg:pl-0 h-full overflow-hidden relative z-0">
        
        {/* Top navigation bar (Mobile) */}
        <div className="lg:hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-white/20 dark:border-white/5 absolute top-0 left-0 right-0 z-30">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-slate-900 dark:text-white">
                Call Intel
              </span>
            </div>
            
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-indigo-500" />
              )}
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pt-16 lg:pt-0 scroll-smooth">
          <div className="py-8">
            <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
              {children}
            </div>
          </div>
          
          {/* Background decoration elements */}
          <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary-500/20 blur-[100px] animate-float"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/20 blur-[100px] animate-float opacity-70" style={{animationDelay: '2s'}}></div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;