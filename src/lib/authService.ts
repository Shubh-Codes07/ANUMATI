import { User, UserRole } from '../types';

const API_URL = `${import.meta.env.VITE_API_URL}/api`;

// Simple observer list for auth state changes
type AuthCallback = (user: User | null) => void;
const authObservers: AuthCallback[] = [];

function notifyAuthObservers(user: User | null) {
  authObservers.forEach(cb => cb(user));
}

export const AuthService = {

  // ─── Login an existing user ───────────────────────────────────────────────
  async login(credentials: { email: string; password?: string }) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: credentials.email, password: credentials.password })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed. Please check your credentials.');
    }

    const user = await response.json();
    localStorage.setItem('codegate_user', JSON.stringify(user));
    notifyAuthObservers(user);
    return user;
  },

  // ─── Register a new student and auto-login ────────────────────────────────
  async signup(data: { name: string; email: string; password?: string; phone?: string }) {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Registration failed. Please try again.');
    }

    const user = await response.json();
    localStorage.setItem('codegate_user', JSON.stringify(user));
    notifyAuthObservers(user);
    return user;
  },

  // ─── Simulated Google sign-in (no real OAuth) ─────────────────────────────
  async signInWithGoogle(_preferredRole?: UserRole) {
    console.warn('Google Sign In is not configured. Use email/password.');
    throw new Error('Google Sign In is not available. Please use email and password.');
  },

  // ─── Logout ───────────────────────────────────────────────────────────────
  async logout() {
    localStorage.removeItem('codegate_user');
    notifyAuthObservers(null);
  },

  // ─── Update user in local storage + notify all observers ─────────────────
  updateCurrentUser(user: User) {
    localStorage.setItem('codegate_user', JSON.stringify(user));
    notifyAuthObservers(user);
  },

  // ─── Subscribe to auth state changes ─────────────────────────────────────
  onAuthUpdate(callback: AuthCallback) {
    authObservers.push(callback);

    // Fire immediately with current state from localStorage
    const savedUser = localStorage.getItem('codegate_user');
    if (savedUser) {
      try {
        callback(JSON.parse(savedUser));
      } catch {
        callback(null);
      }
    } else {
      callback(null);
    }

    // Return unsubscribe function
    return () => {
      const index = authObservers.indexOf(callback);
      if (index > -1) authObservers.splice(index, 1);
    };
  }
};
