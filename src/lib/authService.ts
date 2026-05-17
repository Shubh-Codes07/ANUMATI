import { User, UserRole } from '../types';

const API_URL = `${import.meta.env.VITE_API_URL}/api`;

// Simple mock observer list to replace Firebase onAuthStateChanged
type AuthCallback = (user: User | null) => void;
const authObservers: AuthCallback[] = [];

function notifyAuthObservers(user: User | null) {
  authObservers.forEach(cb => cb(user));
}

export const AuthService = {
  validateWardenCredentials(email: string, password: string): boolean {
    return email === 'admin@gmail.com' && password === 'TechTorque';
  },

  async signInWithGoogle(preferredRole?: UserRole) {
    // Since we don't have real Google Auth without Firebase on the frontend easily,
    // we'll redirect to manual login or simulate it for now.
    // In a real app you'd use @react-oauth/google or redirect to backend OAuth endpoint.
    console.warn("Google Sign In is simulated in MySQL backend migration");
    return this.manualLoginOrSignup(preferredRole || 'student', {
      name: 'Google User',
      email: 'google@example.com'
    });
  },

  async mockWardenLogin(name: string, email: string) {
    return this.manualLoginOrSignup('warden', { name, email, password: 'TechTorque' });
  },

  async manualLoginOrSignup(role: UserRole, data: { name: string, email: string, password?: string, phone?: string }) {
    try {
      const response = await fetch(API_URL + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, preferredRole: role })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Login failed");
      }

      const user = await response.json();
      localStorage.setItem('codegate_user', JSON.stringify(user));
      notifyAuthObservers(user);
      return user;
    } catch (error) {
      console.error("Manual login operation failed:", error);
      throw error;
    }
  },

  async logout() {
    localStorage.removeItem('codegate_user');
    notifyAuthObservers(null);
  },

  updateCurrentUser(user: User) {
    localStorage.setItem('codegate_user', JSON.stringify(user));
    notifyAuthObservers(user);
  },

  onAuthUpdate(callback: AuthCallback) {
    authObservers.push(callback);

    // Initial check from localStorage
    const savedUser = localStorage.getItem('codegate_user');
    if (savedUser) {
      try {
        callback(JSON.parse(savedUser));
      } catch (e) {
        callback(null);
      }
    } else {
      callback(null);
    }

    // Return unsubscribe function
    return () => {
      const index = authObservers.indexOf(callback);
      if (index > -1) {
        authObservers.splice(index, 1);
      }
    };
  }
};
