import React from 'react';
import { Sun, Moon, User, LogOut } from 'lucide-react';

const TopHeader = ({ user, theme, toggleTheme, onLogout }) => {
  // Extract user info with safe fallbacks
  const userName = user?.username || 'Guest...';
  const userRole = user?.role || 'User';
  
  // Create a clean display name (capitalize first letter)
  const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);
  const initial = (userName && userName !== 'Guest...') ? userName.charAt(0).toUpperCase() : 'U';

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white lg:hidden">
            MSF Automation
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-800">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{displayName}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{userRole}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-bold">
              {initial}
            </div>
          </div>

          {/* Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              title="Sign Out"
            >
              <LogOut size={20} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
