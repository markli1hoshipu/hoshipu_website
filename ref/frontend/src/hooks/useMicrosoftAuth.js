import { useState, useEffect } from 'react';

// Updated to use MSAL Browser 2.x
const SCRIPT_URL = 'https://alcdn.msauth.net/browser/2.32.2/js/msal-browser.min.js';

let msalLoaded = false;

export function useMicrosoftAuth() {
  const [isMsalLoaded, setIsMsalLoaded] = useState(msalLoaded);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadScript = () => {
      return new Promise((resolve, reject) => {
        if (msalLoaded) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = SCRIPT_URL;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          console.log('MSAL script loaded, window.msal available:', !!window.msal);
          msalLoaded = true;
          setIsMsalLoaded(true);
          resolve();
        };
        script.onerror = () => {
          setError('Failed to load Microsoft authentication library.');
          reject(new Error('Failed to load MSAL script.'));
        };
        document.body.appendChild(script);
      });
    };

    if (!msalLoaded) {
      loadScript().catch(err => {
        console.error(err);
      });
    }
  }, []);

  return { isMsalLoaded, error };
}