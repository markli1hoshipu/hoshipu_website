import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const USER_SETTINGS_API = `${import.meta.env.VITE_USER_SETTINGS_API_URL || 'http://localhost:8005'}/api/activity`;

/**
 * Hook to track page views and duration
 * Automatically logs page views when the route changes
 */
export const usePageTracking = (userEmail, sessionId) => {
  const location = useLocation();
  const pageStartTime = useRef(null);
  const currentPage = useRef(null);
  const previousPage = useRef(null);

  useEffect(() => {
    // When component mounts or route changes
    const handlePageChange = async () => {
      const now = Date.now();

      // If there was a previous page, log its duration
      if (currentPage.current && pageStartTime.current) {
        const duration = now - pageStartTime.current;

        try {
          await fetch(`${USER_SETTINGS_API}/page-view`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_email: userEmail,
              page_url: currentPage.current,
              session_id: sessionId,
              duration_ms: duration,
              referrer: previousPage.current,
            }),
          });

          console.log(`Logged page view: ${currentPage.current} (${duration}ms)`);
        } catch (error) {
          console.error('Failed to log page view:', error);
        }
      }

      // Update refs for next page
      previousPage.current = currentPage.current;
      currentPage.current = location.pathname;
      pageStartTime.current = now;
    };

    handlePageChange();

    // Cleanup function to log the final page duration
    return () => {
      if (currentPage.current && pageStartTime.current) {
        const duration = Date.now() - pageStartTime.current;

        // Use sendBeacon for reliability during page unload
        const data = JSON.stringify({
          user_email: userEmail,
          page_url: currentPage.current,
          session_id: sessionId,
          duration_ms: duration,
          referrer: previousPage.current,
        });

        if (navigator.sendBeacon) {
          const blob = new Blob([data], { type: 'application/json' });
          navigator.sendBeacon(`${USER_SETTINGS_API}/page-view`, blob);
        } else {
          // Fallback to synchronous request
          fetch(`${USER_SETTINGS_API}/page-view`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: data,
            keepalive: true,
          }).catch(console.error);
        }
      }
    };
  }, [location.pathname, userEmail, sessionId]);

  return {
    currentPage: currentPage.current,
    previousPage: previousPage.current,
  };
};

export default usePageTracking;
