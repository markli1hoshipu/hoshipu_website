'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion as _motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/hooks/useAuth';
import { User, LogOut, Menu, X, Settings, ChevronDown, Bot, MessageCircle, Zap, ZapOff } from 'lucide-react';
import logoImage from '../data/prelude logo transparent.png';
import { useUserRole } from '../hooks/useUserRole';

const Navigation = ({ isChatVisible, onToggleChatVisibility, isWsConnected, loadingEnabled, onToggleLoading, setCurrentView }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const { userRole } = useUserRole();
  const navigate = useNavigate();
  const userMenuRef = useRef(null);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleSettingsClick = () => {
    // If setCurrentView is provided, use it to switch views without unmounting
    // Otherwise, use navigation (for backwards compatibility)
    if (setCurrentView) {
      setCurrentView('settings');
    } else {
      navigate('/settings');
    }
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  };

  const handleProfilesClick = () => {
    console.log('Navigation: Profiles button clicked');
    console.log('Navigation: Current user:', user);

    // Switch to profiles view in dashboard
    if (setCurrentView) {
      console.log('Navigation: Switching to profiles view');
      setCurrentView('profiles');
    } else {
      // Fallback: navigate to dashboard then switch view
      console.log('Navigation: Navigating to dashboard');
      navigate('/dashboard');
    }
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  };

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  return (
    <nav className="navigation-bar w-full bg-white" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        <div className="flex justify-center items-center h-20">
          {/* Desktop Navigation - User Info and Controls */}
          <div className="hidden lg:flex items-center space-x-6">
            {isAuthenticated && (
              <>
                {/* Logo + AI Assistant Section */}
                <_motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.05 }}
                  className="flex items-center space-x-3 rounded-lg px-4 py-3 text-gray-800"
                >
                  <img
                    src={logoImage}
                    alt="Prelude Logo"
                    className="h-10 w-auto"
                  />
                  <Bot className="h-5 w-5 text-green-600" />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">AI Assistant</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-600">Online & Ready</span>
                    </div>
                  </div>
                </_motion.div>

                {/* Loading Toggle Section - Temporarily commented out */}
                {/* <_motion.button
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.05 }}
                  onClick={onToggleLoading}
                  className={`flex items-center space-x-3 rounded-lg px-4 py-3 text-gray-800 transition-all duration-300 ${
                    loadingEnabled 
                      ? 'bg-blue-200 hover:bg-blue-300' 
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  <div className="relative">
                    {loadingEnabled ? (
                      <Zap className="h-5 w-5 text-blue-600" />
                    ) : (
                      <ZapOff className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-semibold">
                      Loading Screen
                    </span>
                    <span className="text-xs text-gray-600">
                      {loadingEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </_motion.button> */}

                {/* Chat Toggle Section */}
                {/* <_motion.button
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  onClick={onToggleChatVisibility}
                  className={`flex items-center space-x-3 rounded-lg px-4 py-3 text-gray-800 transition-all duration-300 ${
                    isChatVisible
                      ? 'bg-cyan-200 hover:bg-cyan-300'
                      : 'hover:bg-cyan-200'
                  }`}
                >
                  <div className="relative">
                    <MessageCircle className="h-5 w-5" />
                    {isWsConnected && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    )}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-semibold">
                      {isChatVisible ? 'Hide Chat' : 'Show Chat'}
                    </span>
                    <span className="text-xs text-gray-600">
                      {isWsConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </_motion.button> */}

                {/* User Info Section */}
                <_motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.15 }}
                  className="flex items-center space-x-4 rounded-lg px-4 py-3 text-gray-800"
                >
                  <div className="flex flex-col text-right">
                    <span className="text-sm font-semibold">
                      {user?.email || 'user@example.com'}
                    </span>
                    <span className="text-xs text-gray-600">
                      {userRole || 'User'} • Level 1
                    </span>
                  </div>
                  {user?.picture ? (
                    <img 
                      src={user.picture} 
                      alt="Profile" 
                      className="h-10 w-10 rounded-full border-2 border-white/30"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                  )}
                </_motion.div>

                {/* User Menu Dropdown */}
                <div className="relative" ref={userMenuRef}>
                <_motion.button
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  onClick={toggleUserMenu}
                  className="flex items-center justify-center w-12 h-12 text-gray-800 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
                  title="User Menu"
                >
                  <ChevronDown className={`h-5 w-5 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </_motion.button>

                {/* User Dropdown Menu */}
                <AnimatePresence>
                  {userMenuOpen && (
                    <_motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-xl border py-2 z-50"
                    >
                      {/* Menu Items */}
                      <div className="py-1">
                        <button
                          onClick={handleProfilesClick}
                          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <User className="h-4 w-4 mr-3 text-gray-500" />
                          Profiles
                        </button>

                        <button
                          onClick={handleSettingsClick}
                          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <Settings className="h-4 w-4 mr-3 text-gray-500" />
                          Settings
                        </button>
                        
                        <div className="border-t border-gray-100 my-1"></div>
                        
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Sign Out
                        </button>
                      </div>
                    </_motion.div>
                  )}
                </AnimatePresence>
                </div>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="lg:hidden">
            {isAuthenticated && (
              <_motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                onClick={toggleMobileMenu}
                className="text-gray-800 hover:text-gray-900 transition-colors p-3 rounded-md hover:bg-gray-100"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileMenuOpen ? (
                  <X className="h-7 w-7" />
                ) : (
                  <Menu className="h-7 w-7" />
                )}
              </_motion.button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <_motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden border-t overflow-hidden bg-white"
            >
              <div className="px-6 pt-6 pb-8 space-y-4">
                {/* Mobile Logo + AI Assistant Info */}
                <div className="flex items-center space-x-4 pb-3 text-gray-800">
                  <img
                    src={logoImage}
                    alt="Prelude Logo"
                    className="h-8 w-8 object-contain"
                  />
                  <Bot className="h-6 w-6 text-green-600" />
                  <div>
                    <div className="font-semibold text-gray-800 font-inter text-base">AI Assistant</div>
                    <div className="text-sm text-green-600 font-inter">Online & Ready</div>
                  </div>
                </div>

                {/* Mobile Chat Toggle */}
                <button
                  onClick={onToggleChatVisibility}
                  className={`flex items-center space-x-4 w-full text-left px-4 py-4 rounded-lg transition-all duration-300 ${
                    isChatVisible
                      ? 'bg-gray-100 text-gray-800'
                      : 'text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <div className="relative">
                    <MessageCircle className="h-6 w-6" />
                    {isWsConnected && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-base">{isChatVisible ? 'Hide Chat' : 'Show Chat'}</div>
                    <div className="text-sm text-gray-600">{isWsConnected ? 'Connected' : 'Disconnected'}</div>
                  </div>
                </button>

                {/* Mobile User Info */}
                <div className="flex items-center space-x-4 pb-4 border-b border-gray-200 text-gray-800">
                  {user?.picture ? (
                    <img 
                      src={user.picture} 
                      alt="Profile" 
                      className="h-12 w-12 rounded-full border-2 border-white/30"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-600" />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-gray-800 font-inter text-base">
                      {user?.email || 'user@example.com'}
                    </div>
                    <div className="text-sm text-gray-600 font-inter">
                      {userRole || 'User'} • Level 1
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleProfilesClick}
                  className="flex items-center space-x-3 w-full text-left px-4 py-3 rounded-md text-gray-800 hover:text-gray-900 hover:bg-gray-100 transition-colors font-inter text-base"
                >
                  <User className="h-5 w-5" />
                  <span>Profiles</span>
                </button>

                <button
                  onClick={handleSettingsClick}
                  className="flex items-center space-x-3 w-full text-left px-4 py-3 rounded-md text-gray-800 hover:text-gray-900 hover:bg-gray-100 transition-colors font-inter text-base"
                >
                  <Settings className="h-5 w-5" />
                  <span>Settings</span>
                </button>
                
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-3 w-full text-left px-4 py-3 rounded-md text-red-600 hover:text-red-700 hover:bg-red-100 transition-colors font-inter text-base"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </_motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default Navigation;