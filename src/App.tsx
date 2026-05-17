/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import StudentPortal from './components/StudentPortal';
import WardenDashboard from './components/WardenDashboard';
import GuardPortal from './components/GuardPortal';
import SecurityDashboard from './components/SecurityDashboard';
import AdminPanel from './components/AdminPanel';
import ParentPortal from './components/ParentPortal';
import { UserRole, User } from './types';
import { AuthService } from './lib/authService';

export default function App() {
  const [currentView, setCurrentView] = useState<UserRole | 'landing'>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = AuthService.onAuthUpdate((updatedUser) => {
      setUser(updatedUser);
      if (updatedUser) {
        // If we have a user, set view to their role unless we are already in a specific view
        if (currentView === 'landing') {
          setCurrentView(updatedUser.role);
        }
      } else {
        setCurrentView('landing');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (preferredRole?: UserRole, credentials?: { name: string, email: string, password?: string, phone?: string }): Promise<void> => {
    try {
      let loggedUser;
      if (credentials) {
        loggedUser = await AuthService.manualLoginOrSignup(preferredRole || 'student', credentials);
      } else {
        loggedUser = await AuthService.signInWithGoogle(preferredRole);
      }

      // Role guard: if trying to access warden/guard/admin portal with a student account
      if ((preferredRole === 'warden' || preferredRole === 'guard' || preferredRole === 'admin') && loggedUser.role === 'student') {
        throw new Error('Authentication denied — Students are not authorized for this portal.');
      }

      setUser(loggedUser);
      setCurrentView(loggedUser.role);
    } catch (error: any) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setUser(null);
    setCurrentView('landing');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.jpeg" alt="Logo" className="w-12 h-12 rounded-full" />
          <p className="text-white/40 font-black uppercase tracking-widest text-xs">Initializing ANUMATI</p>
        </div>
      </div>
    );
  }

  const renderView = () => {
    // If not logged in and trying to access a portal, show landing
    if (!user && currentView !== 'landing') {
      return <LandingPage onStart={handleLogin} />;
    }

    switch (currentView) {
      case 'student':
        return <StudentPortal onBack={handleLogout} user={user!} />;
      case 'warden':
        return <WardenDashboard onBack={handleLogout} user={user!} />;
      case 'guard':
        return <SecurityDashboard onBack={handleLogout} user={user!} />;
      case 'admin':
        return <AdminPanel onBack={handleLogout} user={user!} />;
      case 'parent':
        return <ParentPortal onBack={handleLogout} user={user!} />;
      case 'landing':
      default:
        return (
          <>
            <LandingPage onStart={handleLogin} />
            {/* Prototype Role Switcher Floating Menu - only for demo purposes to switch roles quickly if logged in */}
            {user && (
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-black/80 backdrop-blur-2xl px-8 py-4 rounded-full flex gap-6 text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 shadow-2xl overflow-x-auto max-w-[95vw]">
                {['student', 'warden', 'guard', 'admin', 'parent'].map((role) => (
                  <button 
                    key={role}
                    onClick={() => setCurrentView(role as any)}
                    className={`hover:text-brand transition-colors whitespace-nowrap italic ${currentView === role ? 'text-brand' : ''}`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            )}
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-dark w-full overflow-x-hidden selection:bg-brand selection:text-dark">
      {renderView()}
    </div>
  );
}
