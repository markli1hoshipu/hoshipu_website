import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const NotificationContext = createContext(null);

const STORAGE_KEY = 'prelude_notifications';
const MAX_NOTIFICATIONS = 50;
const MAX_AGE_DAYS = 7;

/**
 * NotificationProvider - Manages application-wide notification state
 *
 * Notification Object Structure:
 * {
 *   id: string,           // unique identifier
 *   type: string,         // notification category (e.g., 'lead-reply')
 *   message: string,      // display message
 *   timestamp: Date,      // when notification was created
 *   read: boolean,        // whether user has seen it
 *   metadata: object      // additional data specific to notification type
 * }
 */
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const loadNotifications = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Convert timestamp strings back to Date objects
          const notifications = parsed.map(n => ({
            ...n,
            timestamp: new Date(n.timestamp)
          }));

          // Remove notifications older than MAX_AGE_DAYS
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - MAX_AGE_DAYS);

          const validNotifications = notifications.filter(n =>
            n.timestamp > cutoffDate
          );

          setNotifications(validNotifications);
        }
      } catch (error) {
        console.error('Error loading notifications from localStorage:', error);
      }
    };

    loadNotifications();
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving notifications to localStorage:', error);
    }
  }, [notifications]);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  /**
   * Add a new notification
   * @param {string} type - Notification category
   * @param {string} message - Display message
   * @param {object} metadata - Additional data
   */
  const addNotification = useCallback((type, message, metadata = {}) => {
    const now = new Date();

    setNotifications(prev => {
      // Check for duplicate notifications within last 5 seconds (grouping)
      const recentDuplicate = prev.find(n =>
        n.type === type &&
        n.message === message &&
        (now - n.timestamp) < 5000 // 5 seconds
      );

      if (recentDuplicate) {
        // Update existing notification instead of creating duplicate
        return prev.map(n =>
          n.id === recentDuplicate.id
            ? { ...n, timestamp: now, read: false, metadata }
            : n
        );
      }

      // Create new notification
      const newNotification = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        message,
        timestamp: now,
        read: false,
        metadata
      };

      // Add to beginning of array (newest first)
      let updated = [newNotification, ...prev];

      // Enforce max notifications limit
      if (updated.length > MAX_NOTIFICATIONS) {
        updated = updated.slice(0, MAX_NOTIFICATIONS);
      }

      return updated;
    });
  }, []);

  /**
   * Mark a specific notification as read
   * @param {string} id - Notification ID
   */
  const markAsRead = useCallback((id) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  }, []);

  /**
   * Remove a specific notification
   * @param {string} id - Notification ID
   */
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  /**
   * Clear all notifications
   */
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Toggle notification popup visibility
   */
  const togglePopup = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  /**
   * Close notification popup
   */
  const closePopup = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = {
    notifications,
    unreadCount,
    isOpen,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    togglePopup,
    closePopup
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to access notification context
 * @returns {object} Notification context value
 */
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
