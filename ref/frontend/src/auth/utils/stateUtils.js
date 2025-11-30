// src/auth/utils/stateUtils.js
// Utility functions for handling the 'state' parameter in the OAuth callback URL.

/**
 * Extracts the service name from the state parameter.
 * Assumes the state is in the format "serviceName_randomString".
 *
 * @param {string | null | undefined} state The state parameter string from the callback URL.
 * @returns {string | null} The extracted service name string, or null if the state is invalid.
 */
export function extractServiceFromState(state) {
  // Check if state is a non-empty string
  if (typeof state !== 'string' || state.length === 0) {
    console.error('extractServiceFromState: Invalid or empty state parameter.');
    return null;
  }

  // Split the state string by the underscore character
  const parts = state.split('_');

  // We expect at least two parts: the service name and the random string
  if (parts.length < 2) {
    console.error(`extractServiceFromState: State parameter "${state}" is not in the expected "serviceName_randomString" format.`);
    return null;
  }

  // The first part is the service name
  const serviceName = parts[0];

  // Basic validation: ensure the service name part is not empty
  if (serviceName.length === 0) {
     console.error(`extractServiceFromState: Extracted service name is empty from state "${state}".`);
     return null;
  }

  // In a more robust implementation, you might also want to validate the
  // random string part or use it for additional CSRF checks if the frontend
  // stored a corresponding value. However, in the backend-generates-verifier
  // flow, the backend handles the verifier storage keyed by the full state,
  // providing the primary CSRF protection.

  console.log(`extractServiceFromState: Successfully extracted service name "${serviceName}" from state "${state}".`);
  return serviceName;
}

// You could add other state-related utilities here if needed in the future.
// For example, a function to validate the random part of the state if you
// implemented frontend-side state storage for CSRF.
// export function validateStateRandomPart(state, storedRandomPart) { ... }