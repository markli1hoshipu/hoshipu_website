import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../contexts/NotificationContext';
import NotificationCenter from './NotificationCenter';

/**
 * NotificationBell - Bell icon button in sidebar with badge counter
 *
 * Visual states:
 * - Faded when no notifications (opacity-40, gray)
 * - Active when notifications exist (opacity-100, pink)
 * - Shows badge with unread count
 * - Pulses when new notification arrives
 *
 * @param {boolean} isCollapsed - Whether sidebar is collapsed
 */
function NotificationBell({ isCollapsed = false }) {
  const { unreadCount, togglePopup, isOpen } = useNotifications();
  const [shouldPulse, setShouldPulse] = useState(false);
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);

  const hasNotifications = unreadCount > 0;

  // Trigger pulse animation when new notification arrives
  useEffect(() => {
    if (unreadCount > prevUnreadCount && unreadCount > 0) {
      setShouldPulse(true);
      const timeout = setTimeout(() => setShouldPulse(false), 600);
      return () => clearTimeout(timeout);
    }
    setPrevUnreadCount(unreadCount);
  }, [unreadCount, prevUnreadCount]);

  const handleClick = () => {
    togglePopup();
  };

  // Collapsed sidebar layout (icon only)
  if (isCollapsed) {
    return (
      <>
        <button
          onClick={handleClick}
          aria-label="Notifications"
          aria-expanded={isOpen}
          className={`
            relative p-2 rounded-lg transition-all duration-200
            ${hasNotifications
              ? 'text-pink-600 opacity-100 hover:bg-pink-50'
              : 'text-gray-400 opacity-40 hover:bg-gray-100'
            }
            ${isOpen ? 'bg-pink-50' : ''}
          `}
        >
          <motion.div
            animate={shouldPulse ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.3, repeat: shouldPulse ? 2 : 0 }}
          >
            <Bell className="w-5 h-5" />
          </motion.div>

          {/* Badge for collapsed sidebar */}
          <AnimatePresence>
            {hasNotifications && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-pink-600 rounded-full flex items-center justify-center"
                aria-label={`${unreadCount} unread notifications`}
              >
                <span className="text-white text-[10px] font-bold leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* Notification popup */}
        {isOpen && <NotificationCenter isCollapsed={isCollapsed} />}
      </>
    );
  }

  // Expanded sidebar layout (full width button with label)
  return (
    <>
      <button
        onClick={handleClick}
        aria-label="Notifications"
        aria-expanded={isOpen}
        className={`
          flex items-center justify-between w-full px-4 py-3 rounded-lg
          transition-all duration-200
          ${hasNotifications
            ? 'text-pink-600 opacity-100 hover:bg-pink-50'
            : 'text-gray-400 opacity-40 hover:bg-gray-100'
          }
          ${isOpen ? 'bg-pink-50' : ''}
        `}
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={shouldPulse ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.3, repeat: shouldPulse ? 2 : 0 }}
          >
            <Bell className="w-5 h-5" />
          </motion.div>
          <span className="text-sm font-medium">Notifications</span>
        </div>

        {/* Badge for expanded sidebar */}
        <AnimatePresence>
          {hasNotifications && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="px-2 py-0.5 min-w-[24px] bg-pink-600 rounded-full flex items-center justify-center"
              aria-label={`${unreadCount} unread notifications`}
            >
              <span className="text-white text-xs font-bold leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Notification popup */}
      {isOpen && <NotificationCenter isCollapsed={isCollapsed} />}
    </>
  );
}

export default NotificationBell;
