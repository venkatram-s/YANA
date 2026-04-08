/**
 * YANA Mobile/Web Configuration
 * 
 * Automatically selects the production Vercel origin for API calls
 * when running in a native Capacitor shell, but uses relative paths
 * during standard web/browser mode.
 */

const PRODUCTION_VERCEL_URL = 'https://yana-neon.vercel.app';

// Detect if we are in a native Capacitor environment
const isNative = typeof window !== 'undefined' && window.Capacitor?.isNative;

export const BASE_API_URL = isNative ? PRODUCTION_VERCEL_URL : '';

// Utility to prep urls
export const getApiUrl = (path) => `${BASE_API_URL}${path}`;
