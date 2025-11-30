// src/auth/hooks/useAuthenticatedSocketIO.js
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';

// Import your authentication hook
import { useAuth } from './useAuth';

/**
 * Custom React hook to manage a Socket.IO connection authenticated with an ID token.
 * Includes the token in the 'auth' payload during the handshake.
 * Allows registering custom event handlers from the consuming component via props.
 * Provides a function to send messages where the last argument can be a built-in ACK callback.
 * Note: Specific incoming messages are now handled by the provided eventHandlers.
 *
 * @param {string} socketUrl The base URL of the backend Socket.IO server.
 * @param {object} [eventHandlers={}] An object mapping event names (string) to handler functions (function) for asynchronously emitted events from the server.
 * @returns {{isConnected: boolean, error: Error | null, send: (eventName: string, ...args: any[]) => void}}
 * An object containing connection status, error state, and a message sending function.
 */
export default function useAuthenticatedSocketIO(socketUrl, eventHandlers = {}) { // Accept eventHandlers parameter
  // Get authentication state from your AuthProvider
  const { idToken, isAuthenticated, isLoading } = useAuth();

  // Ref to hold the Socket.IO client instance.
  const socketRef = useRef(null);

  // State to expose connection status and errors
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  // Use a ref to track the message queue if messages are sent before connection is open
  const messageQueueRef = useRef([]);
  
  // Use a ref to store event handlers to prevent constant reconnections
  const eventHandlersRef = useRef(eventHandlers);
  
  // Update the ref when eventHandlers change
  useEffect(() => {
      eventHandlersRef.current = eventHandlers;
  }, [eventHandlers]);


  // --- Function to send messages ---
  // This version is intended to support the built-in ACK callback as the last argument
  const send = useCallback((eventName, ...args) => {
    console.log(`Socket.IO Send Called: ${eventName}`, { args: args });

    // Identify if the last argument is the built-in ACK callback
    const callback = args.length > 0 && typeof args[args.length - 1] === 'function' ? args[args.length - 1] : undefined;
    // The actual data arguments are all args except the last one if it's the callback
    const dataArgs = callback ? args.slice(0, -1) : args;


    console.log(`Socket.IO Send: Preparing to emit event: "${eventName}"`);
    console.log(`Socket.IO Send: Data arguments:`, dataArgs);
    console.log(`Socket.IO Send: Callback provided (for built-in ACK):`, typeof callback === 'function' ? 'Yes' : 'No', callback);
    console.log(`Socket.IO Send: Current socketRef.current:`, socketRef.current);
    console.log(`Socket.IO Send: Is socketRef.current truthy?:`, !!socketRef.current);
    console.log(`Socket.IO Send: socketRef.current?.connected:`, socketRef.current?.connected);


    if (socketRef.current && socketRef.current.connected) {
      console.log(`Socket.IO Send: Connection check passed. Proceeding to emit.`);
      try {
        console.log(`Socket.IO Send: Calling socketRef.current.emit...`);
        // *** This call is intended to trigger the built-in ACK mechanism ***
        // Pass data arguments followed by the callback if it exists
        if (callback) {
             socketRef.current.emit(eventName, ...dataArgs, callback);
             console.log(`Socket.IO Send: Emitted event "${eventName}" with built-in ACK.`);
        } else {
             socketRef.current.emit(eventName, ...dataArgs);
             console.log(`Socket.IO Send: Emitted event "${eventName}" without built-in ACK.`);
        }
        console.log(`Socket.IO Send: Emit call executed.`);

      } catch (e) {
         console.error(`Socket.IO Send: Error emitting event "${eventName}":`, e);
         // If emit fails, attempt to call the provided callback with an error
         if (typeof callback === 'function') {
             try { callback({ error: `Client send failed: ${e.message}` }); } catch (cbError) { console.error(`Socket.IO Send: Error calling provided callback after emit failure:`, cbError); }
         }
      }
    } else {
      console.warn(`Socket.IO: Attempted to send event '${eventName}' while disconnected. Queuing.`);
      // Store eventName and all original args including the callback
      messageQueueRef.current.push({eventName, args: args});
    }
  }, []); // No dependencies needed for send logic itself


  // --- Define Built-in Handlers OUTSIDE useEffect, using useCallback ---
  // These handlers will be recreated when their dependencies change.
  // They need access to state setters and refs.
  const handleConnect = useCallback(() => {
      console.log('Socket.IO Hook: Connected!');
      setIsConnected(true);
      setError(null);
      // Send any queued messages upon successful connection
      if (socketRef.current && socketRef.current.connected) {
          while (messageQueueRef.current.length > 0) {
              const queued = messageQueueRef.current.shift();
              // Emit directly on the socket instead of using send to avoid circular dependency
              try {
                  if (queued.args.length > 0 && typeof queued.args[queued.args.length - 1] === 'function') {
                      // Has callback
                      const callback = queued.args[queued.args.length - 1];
                      const dataArgs = queued.args.slice(0, -1);
                      socketRef.current.emit(queued.eventName, ...dataArgs, callback);
                  } else {
                      // No callback
                      socketRef.current.emit(queued.eventName, ...queued.args);
                  }
              } catch (e) {
                  console.error('Socket.IO Hook: Error sending queued message:', e);
              }
          }
      }
  }, [setIsConnected, setError]); // Remove send dependency

  const handleDisconnect = useCallback((reason) => {
    // --- ADD THIS AS THE VERY FIRST LINE ---
    console.log(`Socket.IO Hook: ENTERING handleDisconnect. Reason: ${reason}.`);

    console.log(`Socket.IO Hook: Event: disconnect. Reason: ${reason}. socketRef.current before nulling:`, socketRef.current);
    setIsConnected(false);
    console.log('Socket.IO Hook: isConnected state set to false.');
    socketRef.current = null;
    console.log('Socket.IO Hook: socketRef.current set to null on disconnect.');
    messageQueueRef.current = [];

    console.log(`Socket.IO Hook: Disconnected. Reason: ${reason}`);
    setIsConnected(false);
    // setError state is handled by connect_error
    // Update the ref and clear queue on disconnect
    socketRef.current = null;
    messageQueueRef.current = [];
  }, [setIsConnected, socketRef, messageQueueRef]); // Dependencies: state setter, refs

  const handleConnectError = useCallback((err) => {
      console.error('Socket.IO Hook: Connection Error:', err.message);

      // Check if this is a token verification error
      if (err.message && err.message.includes('Token verification failed')) {
        console.log('Socket.IO: Token verification failed - clearing auth state');
        // Clear tokens and redirect to login
        localStorage.removeItem('id_token');
        localStorage.removeItem('refresh_token');
        setError(new Error(`Authentication failed: ${err.message}. Please log in again.`));
      } else {
        setError(new Error(`Socket.IO connection failed: ${err.message}`));
      }

      setIsConnected(false);
      // Update the ref and clear queue on error
      socketRef.current = null;
      messageQueueRef.current = [];
  }, [setError, setIsConnected, socketRef, messageQueueRef]); // Dependencies: state setters, refs


  // --- Effect to manage the Socket.IO connection lifecycle and built-in/prop handlers ---
  // Dependencies will now include the memoized handlers defined above.
  useEffect(() => {
      console.log('useAuthenticatedSocketIO useEffect: Running connection logic.');

      // --- 1. Check Authentication Status ---
      if (!isAuthenticated || !idToken || isLoading) {
        console.log('useAuthenticatedSocketIO useEffect: Not authenticated, missing token, or loading. Disconnecting if connected.');
        if (socketRef.current) {
          socketRef.current.disconnect();
           // Let handleDisconnect set socketRef.current = null
        }
        setIsConnected(false);
        setError(null);
        messageQueueRef.current = [];
        return;
      }


      // --- 2. Prevent Duplicate Connections & Cleanup Existing ---
       if (socketRef.current) {
          console.log('useAuthenticatedSocketIO useEffect: Existing socket found. Disconnecting.');
          // No need to explicitly remove built-in handlers from OLD socket here
          // when using externally defined memoized handlers; the cleanup for the
          // PREVIOUS effect run would have removed its handlers.
          socketRef.current.disconnect();
          // Let handleDisconnect set socketRef.current = null
        }


      // Clear ref and reset state proactively before creating a new socket
      socketRef.current = null; // Ensure null before new io() call
      setIsConnected(false);
      setError(null);
      messageQueueRef.current = [];


      console.log(`useAuthenticatedSocketIO useEffect: Authenticated. Attempting to connect to ${socketUrl}.`);


      // --- 3. Create Socket.IO Client Instance ---
      let client = null; // Define client here for cleanup scope
      try {
          client = io(socketUrl, {
              auth: { token: idToken },
              transports: ['websocket', 'polling'], // Allow both websocket and polling
              
              // --- Connection timeouts ---
              timeout: 60000,             // 60 second timeout
              
              // --- Explicitly enable and configure reconnection ---
              reconnection: true,          // Ensure reconnection is true
              reconnectionAttempts: 10,    // Limit attempts to prevent resource exhaustion
              reconnectionDelay: 1000,     // Wait 1 second before the first attempt
              reconnectionDelayMax: 30000, // Max delay between attempts (30 seconds)
              randomizationFactor: 0.5     // Randomize delay
          });

          socketRef.current = client; // Update the ref with the new client instance


          // --- 4. Attach Event Handlers (Built-in and Prop-based) ---

          // *** ATTACH BUILT-IN HANDLERS DEFINED OUTSIDE useEffect ***
          // Use the memoized handlers defined using useCallback above.
          client.on('connect', handleConnect); // handleConnect is defined outside
          client.on('disconnect', handleDisconnect); // handleDisconnect is defined outside
          client.on('connect_error', handleConnectError); // handleConnectError is defined outside

          // Attach Custom Handlers provided via props
          for (const eventName in eventHandlersRef.current) {
               if (Object.hasOwnProperty.call(eventHandlersRef.current, eventName)) {
                   const handler = eventHandlersRef.current[eventName]; // Get handler from ref
                   if (typeof handler === 'function') {
                       client.on(eventName, handler);
                       console.log(`Socket.IO Hook: Attached prop handler for event: ${eventName}`);
                   } else {
                       console.warn(`Socket.IO Hook: Prop handler for event '${eventName}' is not a function.`, handler);
                   }
               }
            }

      } catch (e) {
          console.error('Socket.IO: Error instantiating client:', e);
          setError(new Error(`Socket.IO client instantiation error: ${e.message}`));
          setIsConnected(false);
          socketRef.current = null; // Ensure ref is null if instantiation fails
          messageQueueRef.current = [];
      }


      // --- 5. Cleanup Function ---
      // This function runs when dependencies change or component unmounts.
      // It removes the handlers attached to the 'client' instance created in *this* specific effect run.
      return () => {
          console.log('useAuthenticatedSocketIO useEffect cleanup: Disconnecting socket and removing handlers.');
          if (client) { // Check if the 'client' instance from *this* effect run exists
              // Explicitly remove the built-in handlers attached IN THIS EFFECT RUN
              // Use the specific handler references (handleConnect etc.) from the outer scope
              // which were used with client.on in this run.
              // These calls *should* resolve handleConnect etc. from the outer scope.
              client.off('connect', handleConnect);
              client.off('disconnect', handleDisconnect);
              client.off('connect_error', handleConnectError);

              // Prop-based handlers attached via eventHandlers prop in this effect run
              // Remove the specific instances obtained from the ref
              for (const eventName in eventHandlersRef.current) {
                  if (Object.hasOwnProperty.call(eventHandlersRef.current, eventName)) {
                      const handler = eventHandlersRef.current[eventName]; // Get handler from ref
                      if (typeof handler === 'function') {
                          client.off(eventName, handler);
                          console.log(`Socket.IO Hook: Removed prop handler for event: ${eventName}`);
                      }
                  }
              }

              // Disconnect the socket instance created in THIS effect run
              if (client.connected || client.connecting) {
                  client.disconnect();
              }
              // The handleDisconnect handler (defined outside) will set socketRef.current = null
          }
      };

  }, [
      socketUrl,
      idToken,
      isAuthenticated,
      isLoading,
      // Remove 'send' to break circular dependency
      // Remove 'eventHandlers' and use a ref instead to prevent constant reconnections
      handleConnect,
      handleDisconnect,
      handleConnectError,
  ]);


  // Return isConnected, error, send. This version does NOT return on/off.
  return useMemo(() => ({ isConnected, error, send }), [isConnected, error, send]);
}