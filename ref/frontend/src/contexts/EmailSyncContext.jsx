import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import leadsApiService from '../services/leadsApi';
import { toast } from 'react-hot-toast';
import { useNotifications } from './NotificationContext';

const EmailSyncContext = createContext();

export function useEmailSync() {
  const context = useContext(EmailSyncContext);
  if (!context) {
    throw new Error('useEmailSync must be used within EmailSyncProvider');
  }
  return context;
}

export function EmailSyncProvider({ children }) {
  const { addNotification } = useNotifications();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [crmSyncEnabled, setCrmSyncEnabled] = useState(true); // New: CRM sync toggle
  const intervalRef = useRef(null);
  const crmIntervalRef = useRef(null); // New: CRM sync interval
  const syncCallbacksRef = useRef([]);
  const crmSyncCallbacksRef = useRef([]); // NEW: CRM sync callbacks
  const isSyncingRef = useRef(false); // Use ref to avoid dependency issues
  const isCrmSyncingRef = useRef(false); // New: CRM sync status ref
  const performSyncRef = useRef(null); // Store performSync function
  const performCrmSyncRef = useRef(null); // New: Store CRM sync function

  // Register a callback to be called when sync completes
  const registerSyncCallback = useCallback((callback) => {
    if (!syncCallbacksRef.current.includes(callback)) {
      syncCallbacksRef.current.push(callback);
    }
    // Return unregister function
    return () => {
      syncCallbacksRef.current = syncCallbacksRef.current.filter(cb => cb !== callback);
    };
  }, []);

  // NEW: Register a callback to be called when CRM sync completes
  const registerCrmSyncCallback = useCallback((callback) => {
    if (!crmSyncCallbacksRef.current.includes(callback)) {
      crmSyncCallbacksRef.current.push(callback);
    }
    // Return unregister function
    return () => {
      crmSyncCallbacksRef.current = crmSyncCallbacksRef.current.filter(cb => cb !== callback);
    };
  }, []);

  // Notify all registered callbacks
  const notifyCallbacks = useCallback((result) => {
    syncCallbacksRef.current.forEach(callback => {
      try {
        callback(result);
      } catch (error) {
        console.error('Error in sync callback:', error);
      }
    });
  }, []);

  // NEW: Notify all registered CRM sync callbacks
  const notifyCrmCallbacks = useCallback((result) => {
    crmSyncCallbacksRef.current.forEach(callback => {
      try {
        callback(result);
      } catch (error) {
        console.error('Error in CRM sync callback:', error);
      }
    });
  }, []);

  const performSync = useCallback(async () => {
    // Don't sync if already syncing (use ref to check)
    if (isSyncingRef.current) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    // Check if user is authenticated
    const authProvider = localStorage.getItem('auth_provider');
    if (!authProvider || (authProvider !== 'google' && authProvider !== 'microsoft')) {
      console.log('No valid auth provider, skipping sync');
      return;
    }

    isSyncingRef.current = true;
    setIsSyncing(true);
    console.log(`[Background Sync] Starting automatic email reply check at ${new Date().toLocaleTimeString()}`);

    try {
      const provider = authProvider === 'google' ? 'gmail' : 'outlook';
      const providerName = authProvider === 'google' ? 'Gmail' : 'Outlook';

      const result = await leadsApiService.checkAllReplies({
        provider: provider,
        days_back: 7,
        max_leads: 100
      });

      const newReplies = result.new_replies_processed || 0;
      const leadsQualified = result.leads_status_updated || 0;
      const qualifiedCompanies = result.qualified_companies || [];

      // Extract new fields
      const positiveNewlyQualified = result.positive_newly_qualified_companies || [];
      const positiveAlreadyQualified = result.positive_already_qualified_companies || [];
      const notPositive = result.not_positive_companies || [];
      const subjects = result.reply_subjects || {};
      const reply_lead_mapping = result.reply_lead_mapping || {};

      setLastSyncTime(new Date());

      // Notify registered callbacks (e.g., LeadManagement component to refresh)
      notifyCallbacks(result);

      // Add notification only if there are new replies
      if (newReplies > 0) {
        // Build multi-line message
        const allPositive = [...positiveNewlyQualified, ...positiveAlreadyQualified];

        let message = `${providerName}: ${newReplies} new ${newReplies === 1 ? 'reply' : 'replies'} from leads`;

        // Add positive replies with subjects
        if (allPositive.length > 0) {
          const positiveWithSubjects = allPositive.map(company => {
            const subject = subjects[company];
            return subject ? `${company} '${subject}'` : company;
          }).join(', ');
          message += `\n• ${allPositive.length} positive: ${positiveWithSubjects}`;
        }

        // Add not interested replies
        if (notPositive.length > 0) {
          message += `\n• ${notPositive.length} not interested: ${notPositive.join(', ')}`;
        }

        // Add qualified leads at the end with celebration emoji
        if (leadsQualified > 0) {
          message += `\n🎉 ${leadsQualified} ${leadsQualified === 1 ? 'lead' : 'leads'} qualified: ${positiveNewlyQualified.join(', ')} (contacted → qualified)`;
        }

        // Build structured lead objects array for expandable notification
        const leadsWithReplies = [];

        // Add positive leads (both newly qualified and already qualified)
        allPositive.forEach(company => {
          leadsWithReplies.push({
            leadId: reply_lead_mapping[company],
            companyName: company,
            replySubject: subjects[company],
            sentiment: 'positive',
            statusChanged: positiveNewlyQualified.includes(company),
            newStatus: positiveNewlyQualified.includes(company) ? 'qualified' : null
          });
        });

        // Add not positive leads
        notPositive.forEach(company => {
          leadsWithReplies.push({
            leadId: reply_lead_mapping[company],
            companyName: company,
            replySubject: subjects[company],
            sentiment: 'negative',
            statusChanged: false,
            newStatus: null
          });
        });

        // Add to notification center instead of toast
        addNotification('lead-reply', message, {
          newReplies,
          leadsQualified,
          qualifiedCompanies,
          positiveAlreadyQualified,
          notPositive,
          provider: providerName,
          leadsWithReplies,
          expandable: true
        });
      } else {
        console.log(`[Background Sync] No new replies found`);
      }

    } catch (error) {
      console.error('[Background Sync] Error checking replies:', error);

      // Only show error toast for meaningful errors (not auth issues)
      if (error.message && !error.message.includes('log in')) {
        toast.error(`Background sync failed: ${error.message}`, { duration: 4000 });
      }
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [notifyCallbacks, addNotification]);

  // CRM Email Sync function - syncs customer/employee emails
  const performCrmSync = useCallback(async () => {
    // Don't sync if already syncing (use ref to check)
    if (isCrmSyncingRef.current) {
      console.log('[CRM Sync] Already in progress, skipping...');
      return;
    }

    // Check if user is authenticated
    const authProvider = localStorage.getItem('auth_provider');
    if (!authProvider || (authProvider !== 'google' && authProvider !== 'microsoft')) {
      console.log('[CRM Sync] No valid auth provider, skipping sync');
      return;
    }

    // Check if we have access token for the provider
    const providerKey = authProvider;
    const accessToken = localStorage.getItem(`${providerKey}_access_token`);
    if (!accessToken || accessToken === 'undefined' || accessToken === 'null') {
      console.log('[CRM Sync] No valid access token, skipping sync');
      return;
    }

    isCrmSyncingRef.current = true;
    console.log(`[CRM Sync] Starting automatic CRM email sync at ${new Date().toLocaleTimeString()}`);

    try {
      const idToken = localStorage.getItem('id_token');
      if (!idToken) {
        console.log('[CRM Sync] No auth token available');
        return;
      }

      // Determine which endpoint to call based on provider
      // Use foreground endpoint to get full sync results for notifications
      const provider = authProvider === 'google' ? 'gmail' : 'outlook';
      const endpoint = provider === 'gmail' ? '/api/crm/gmail/sync' : '/api/crm/outlook/sync';
      const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';

      console.log(`[CRM Sync] Calling ${endpoint} for ${provider} (waiting for results)`);

      const response = await fetch(`${CRM_API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          include_body: true,
          include_sent: true,
          include_received: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `CRM sync failed with status ${response.status}`);
      }

      const result = await response.json();

      // Background endpoint returns different response format
      if (result.status === 'started') {
        // Background sync started
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📧 CRM EMAIL SYNC STARTED (BACKGROUND)');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`👤 User: ${result.user_email}`);
        console.log(`🔄 Provider: ${provider === 'gmail' ? 'Gmail' : 'Outlook'}`);
        console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
        console.log(`💡 Note: Sync is running in background, UI is not blocked`);
        console.log('═══════════════════════════════════════════════════════════');

        // Don't show toast for background sync to avoid notification spam
      } else {
        // Foreground sync completed (fallback)
        const emailsSynced = result.emails_synced || 0;
        const totalEmailsSynced = result.total_emails_synced || 0;

        console.log('═══════════════════════════════════════════════════════════');
        console.log('📧 CRM EMAIL SYNC COMPLETE');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`📊 Emails synced this run: ${emailsSynced}`);
        console.log(`📈 Total emails synced (all time): ${totalEmailsSynced}`);
        console.log(`🔄 Provider: ${provider === 'gmail' ? 'Gmail' : 'Outlook'}`);
        console.log(`⏰ Sync time: ${new Date().toLocaleString()}`);
        console.log('═══════════════════════════════════════════════════════════');

        // Only show toast if new emails were synced
        if (emailsSynced > 0) {
          const providerName = provider === 'gmail' ? 'Gmail' : 'Outlook';
          const customerEmails = result.customer_emails || [];

          toast.success(
            `Synced ${emailsSynced} new customer ${emailsSynced === 1 ? 'email' : 'emails'} from ${providerName}`,
            { duration: 5000 }
          );

          // Build enriched notification message (matching lead_gen format)
          let message = `${providerName}: ${emailsSynced} new ${emailsSynced === 1 ? 'email' : 'emails'} from customers`;

          // Add customer emails with subjects (like positive emails in lead_gen)
          if (customerEmails.length > 0) {
            const emailsWithSubjects = customerEmails.map(email =>
              `${email.customer_name} '${email.subject}'`
            ).join(', ');
            message += `\n• ${emailsWithSubjects}`;
          }

          // Build structured customer objects array for expandable notification
          const customersWithEmails = customerEmails.map(email => ({
            customerId: email.customer_id,
            customerName: email.customer_name,
            emailSubject: email.subject
          }));

          // Add to notification center
          addNotification('crm-sync', message, {
            emailsSynced,
            totalEmails: totalEmailsSynced,
            provider: providerName,
            customerEmails,
            customersWithEmails,
            expandable: true
          });
        }
      }

      // NEW: Notify registered callbacks about CRM sync completion
      notifyCrmCallbacks(result);

    } catch (error) {
      console.error('[CRM Sync] Error syncing emails:', error);

      // Only show error toast for meaningful errors (not auth issues)
      if (error.message && !error.message.includes('log in') && !error.message.includes('token')) {
        toast.error(`CRM sync failed: ${error.message}`, { duration: 4000 });
      }
    } finally {
      isCrmSyncingRef.current = false;
    }
  }, [notifyCrmCallbacks]);

  // Store performSync in ref so interval can access latest version
  performSyncRef.current = performSync;
  performCrmSyncRef.current = performCrmSync;

  // Start the background sync interval
  useEffect(() => {
    if (!syncEnabled) {
      console.log('[Background Sync] Sync disabled, clearing interval');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    console.log('[Background Sync] Initializing app-level email sync service');

    // Perform initial sync when app starts
    const authProvider = localStorage.getItem('auth_provider');
    if (authProvider === 'google' || authProvider === 'microsoft') {
      console.log('[Background Sync] Performing initial sync on app start');
      // Delay initial sync by 3 seconds to ensure auth token is fully initialized
      setTimeout(() => {
        performSyncRef.current?.();
      }, 3000);
    }

    // Set up interval for periodic sync (every 2 minutes = 120000ms)
    intervalRef.current = setInterval(() => {
      console.log('[Background Sync] Triggered by 2-minute interval');
      performSyncRef.current?.();
    }, 120000); // 2 minutes

    // Cleanup on unmount
    return () => {
      console.log('[Background Sync] Cleaning up interval');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [syncEnabled]); // Only re-run if syncEnabled changes

  // Start the CRM background sync interval
  useEffect(() => {
    if (!crmSyncEnabled) {
      console.log('[CRM Sync] CRM sync disabled, clearing interval');
      if (crmIntervalRef.current) {
        clearInterval(crmIntervalRef.current);
        crmIntervalRef.current = null;
      }
      return;
    }

    console.log('[CRM Sync] Initializing CRM email sync service (every 2 minutes)');

    // Perform initial CRM sync when app starts
    const authProvider = localStorage.getItem('auth_provider');
    if (authProvider === 'google' || authProvider === 'microsoft') {
      console.log('[CRM Sync] Performing initial CRM sync on app start');
      // Delay initial CRM sync by 5 seconds to avoid conflicts with lead sync
      setTimeout(() => {
        performCrmSyncRef.current?.();
      }, 5000);
    }

    // Set up interval for periodic CRM sync (every 2 minutes = 120000ms)
    crmIntervalRef.current = setInterval(() => {
      console.log('[CRM Sync] Triggered by 2-minute interval');
      performCrmSyncRef.current?.();
    }, 120000); // 2 minutes

    // Cleanup on unmount
    return () => {
      console.log('[CRM Sync] Cleaning up CRM sync interval');
      if (crmIntervalRef.current) {
        clearInterval(crmIntervalRef.current);
        crmIntervalRef.current = null;
      }
    };
  }, [crmSyncEnabled]); // Only re-run if crmSyncEnabled changes

  const value = {
    isSyncing,
    lastSyncTime,
    syncEnabled,
    setSyncEnabled,
    crmSyncEnabled,
    setCrmSyncEnabled,
    performSync,
    performCrmSync,
    registerSyncCallback,
    registerCrmSyncCallback  // NEW: Export CRM sync callback registration
  };

  return (
    <EmailSyncContext.Provider value={value}>
      {children}
    </EmailSyncContext.Provider>
  );
}
