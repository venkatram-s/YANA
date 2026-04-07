/**
 * YANA Mobile/Web Configuration
 * 
 * Automatically selects the production Vercel origin for API calls
 * when running in a native Capacitor shell, but uses relative paths
 * during standard web/browser mode.
 */

// INSTRUCTIONS FOR MOBILE:
// If running in a native Capacitor shell (Android/iOS), the browser origin is 'http://localhost'.
// Since your serverless API is on Vercel, you must provide your Vercel URL below for the Android app.
// Example: 'https://yana-app.vercel.app'
const PRODUCTION_VERCEL_URL = 'https://yana-neon.vercel.app'; // <--- UPDATE THIS AFTER DEPLOYING

const isNative = typeof window !== 'undefined' && 
  (window.location.protocol === 'capacitor:' || 
   window.location.hostname === 'localhost' && !!window.Capacitor);

export const BASE_API_URL = isNative
  ? (PRODUCTION_VERCEL_URL || '') // Absolute URL for Native
  : ''; // Relative for Browser/Dev

if (isNative && !PRODUCTION_VERCEL_URL) {
  console.error('CRITICAL: PRODUCTION_VERCEL_URL is missing in src/utils/config.js. Native app will not fetch news.');
}

// Utility to prep urls
export const getApiUrl = (path) => `${BASE_API_URL}${path}`;
