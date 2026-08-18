import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// All Gmail, Google Sheets & Drive OAuth Scopes requested by user
export const GOOGLE_WORKSPACE_SCOPES = [
  // Gmail Scopes
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
  'https://www.googleapis.com/auth/gmail.addons.current.message.action',
  'https://www.googleapis.com/auth/gmail.addons.current.message.metadata',
  'https://www.googleapis.com/auth/gmail.addons.current.message.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.insert',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.metadata',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/gmail.settings.sharing',
  // Google Sheets & Drive Scopes for user signup synchronization
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
];

export const GMAIL_SCOPES = GOOGLE_WORKSPACE_SCOPES;

const provider = new GoogleAuthProvider();
GOOGLE_WORKSPACE_SCOPES.forEach(scope => provider.addScope(scope));
provider.setCustomParameters({ prompt: 'consent' });

// In-memory access token cache (NEVER in localStorage/sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // User is logged in to Firebase but needs fresh OAuth token popup
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google access token');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-in failed:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Retrieves the signed Firebase ID Token (JWT)
 */
export const getIdToken = async (forceRefresh: boolean = false): Promise<string | null> => {
  if (!auth.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken(forceRefresh);
  } catch (err) {
    console.error('Failed to retrieve ID token:', err);
    return null;
  }
};

/**
 * Retrieves decoded custom claims (tenant_id, role, tier) from the ID token
 */
export const getTenantClaims = async (): Promise<{
  tenantId?: string;
  role?: string;
  tier?: string;
  firstLogin?: boolean;
} | null> => {
  if (!auth.currentUser) return null;
  try {
    const tokenResult = await auth.currentUser.getIdTokenResult();
    const claims = tokenResult.claims;
    return {
      tenantId: (claims.firebase as any)?.tenant || (claims.tenant_id as string) || undefined,
      role: (claims.role as string) || 'pastor',
      tier: (claims.tier as string) || 'Growth',
      firstLogin: Boolean(claims.first_login)
    };
  } catch (err) {
    console.error('Failed to get user claims:', err);
    return null;
  }
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('sermoniq-auth-change'));
  }
};

/**
 * Checks if the user has created a profile / registered on this device
 */
export const hasCreatedProfile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('sermoniq_has_profile') === 'true';
};

/**
 * Marks that a profile has been created / registered
 */
export const setCreatedProfile = (hasProfile: boolean = true) => {
  if (typeof window === 'undefined') return;
  if (hasProfile) {
    localStorage.setItem('sermoniq_has_profile', 'true');
  } else {
    localStorage.removeItem('sermoniq_has_profile');
  }
  window.dispatchEvent(new Event('sermoniq-auth-change'));
};
