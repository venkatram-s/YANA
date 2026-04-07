/**
 * YANA Mobile/Web Configuration
 * 
 * Automatically selects the production Vercel origin for API calls
 * when running in a native Capacitor shell, but uses relative paths
 * during standard web/browser mode.
 */

const PRODUCTION_VERCEL_URL = 'https://yana-neon.vercel.app';

export const BASE_API_URL = PRODUCTION_VERCEL_URL;

// Utility to prep urls
export const getApiUrl = (path) => `${BASE_API_URL}${path}`;

