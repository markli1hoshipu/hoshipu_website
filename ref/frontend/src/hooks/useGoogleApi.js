import { useState, useEffect } from 'react';

const SCRIPT_URLS = {
  gapi: 'https://apis.google.com/js/api.js',
  gsi: 'https://accounts.google.com/gsi/client',
};

let gapiLoaded = false;
let gsiLoaded = false;

export function useGoogleApi() {
  const [isGapiLoaded, setIsGapiLoaded] = useState(gapiLoaded);
  const [isGsiLoaded, setIsGsiLoaded] = useState(gsiLoaded);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadScript = (key, src) => {
      return new Promise((resolve, reject) => {
        if ((key === 'gapi' && gapiLoaded) || (key === 'gsi' && gsiLoaded)) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if (key === 'gapi') {
            gapiLoaded = true;
            setIsGapiLoaded(true);
          } else if (key === 'gsi') {
            gsiLoaded = true;
            setIsGsiLoaded(true);
          }
          resolve();
        };
        script.onerror = () => {
          setError(`Failed to load ${key} script.`);
          reject(new Error(`Failed to load ${key} script.`));
        };
        document.body.appendChild(script);
      });
    };

    const loadAllScripts = async () => {
      try {
        await Promise.all([
          loadScript('gapi', SCRIPT_URLS.gapi),
          loadScript('gsi', SCRIPT_URLS.gsi),
        ]);
      } catch (err) {
        console.error(err);
      }
    };

    if (!gapiLoaded || !gsiLoaded) {
      loadAllScripts();
    }
  }, []);

  return { isGapiLoaded, isGsiLoaded, error, areScriptsLoaded: isGapiLoaded && isGsiLoaded };
} 