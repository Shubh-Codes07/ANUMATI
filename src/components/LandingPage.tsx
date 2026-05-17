import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, QrCode, ClipboardList, Zap, Users, 
  ArrowRight, ShieldCheck, Clock, MapPin, X, Lock, 
  User as UserIcon, Mail, Key, Phone 
} from 'lucide-react';
import { AuthService } from '../lib/authService';
import OTPRegistration from './OTPRegistration';
import TeamSection from './TeamSection';

interface LandingPageProps {
  onStart: (role: any, credentials?: { name: string, email: string, password?: string, phone?: string }, mode?: 'login' | 'signup') => Promise<void>;
}

const VideoIntro = ({ onFinish }: { onFinish: () => void }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [duration, setDuration] = useState('0:00');

  const handleVideoEnd = () => {
    sessionStorage.setItem('videoPlayed', 'true');
    onFinish();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p);
      setCurrentTime(formatTime(videoRef.current.currentTime));
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(formatTime(videoRef.current.duration));
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const seekTime = (Number(e.target.value) / 100) * videoRef.current.duration;
      videoRef.current.currentTime = seekTime;
      setProgress(Number(e.target.value));
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black flex items-center justify-center p-4"
    >
      <button onClick={onFinish} className="skip-btn">Skip Video</button>
      
      <div className="anumati-player shadow-[0_0_50px_rgba(59,130,246,0.3)]">
        <video 
          ref={videoRef}
          src="/Entrance.mp4" 
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleVideoEnd}
          autoPlay
          playsInline
          className="w-full h-full"
        />
        
        <div className="player-controls">
          <button onClick={togglePlay} className="control-btn">
            {isPlaying ? '⏸' : '▶'}
          </button>
          
          <input 
            type="range" 
            className="progress-bar" 
            value={progress} 
            min="0" 
            max="100"
            step="0.1"
            onChange={handleProgressChange}
          />
          
          <div className="time-display">
            <span>{currentTime}</span> / <span>{duration}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ClockDisplay = () => {
  const [time, setTime] = useState(new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="flex flex-col items-center">
      <span className="text-4xl md:text-6xl font-mono font-black text-brand tracking-tighter shadow-brand/20 drop-shadow-lg">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
      </span>
    </div>
  );
};

export default function LandingPage({ onStart }: LandingPageProps) {
  const [showIntro, setShowIntro] = useState(() => {
    // Check if video has already been played in this session
    return sessionStorage.getItem('videoPlayed') !== 'true';
  });
  const [authModal, setAuthModal] = useState<{ 
    role: string; 
    step: 1 | 2; 
    mode: 'login' | 'signup' 
  } | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  // OTP state: null = not in OTP flow, 'pending' = showing OTP widget
  const [otpStep, setOtpStep] = useState<'pending' | null>(null);
  const [pendingSignupRole, setPendingSignupRole] = useState('student');
  const [showTeam, setShowTeam] = useState(false);

  const handleRoleSelect = (role: string) => {
    if (role === 'warden' || role === 'admin' || role === 'guard') {
      // Warden/Admin/Guard goes direct to login form
      setAuthModal({ role, step: 2, mode: 'login' });
    } else {
      // Others choose between login and signup
      setAuthModal({ role, step: 1, mode: 'login' });
    }
    setError('');
    setFormData({ name: '', email: '', password: '', phone: '' });
  };

  const handleModeSelect = (mode: 'login' | 'signup') => {
    if (mode === 'signup') {
      // Student signup → show OTP verification first
      setPendingSignupRole(authModal?.role || 'student');
      setAuthModal(null);
      setOtpStep('pending');
    } else {
      setAuthModal(prev => prev ? { ...prev, mode, step: 2 } : null);
    }
  };

  /** Called by OTPRegistration once the email is confirmed */
  const handleOTPVerified = (verifiedEmail: string) => {
    setOtpStep(null);
    setFormData(prev => ({ ...prev, email: verifiedEmail }));
    setAuthModal({ role: pendingSignupRole, step: 2, mode: 'signup' });
  };

  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const emailInput = form.querySelector('input[placeholder="Email Address"]') as HTMLInputElement;
    const passwordInput = form.querySelector('input[placeholder="Master Password"]') as HTMLInputElement;
    const nameInput = form.querySelector('input[placeholder="Full Name"]') as HTMLInputElement;
    const phoneInput = form.querySelector('input[placeholder="Phone Number"]') as HTMLInputElement;

    const normalizedEmail = emailInput?.value.trim() || '';
    const normalizedPassword = passwordInput?.value.trim() || '';
    const name = nameInput?.value.trim() || formData.name;
    const phone = phoneInput?.value.trim() || formData.phone;

    if (authModal?.mode === 'signup') {
      if (!name || !normalizedEmail || !normalizedPassword || !phone) {
        setError('Please fill all required fields including phone number.');
        return;
      }
    } else {
      if (!normalizedEmail || !normalizedPassword) {
        setError('Email and password are required.');
        return;
      }
    }

    setError('');
    setIsLoggingIn(true);
    try {
      await onStart(
        authModal?.role || 'student',
        { name: name || formData.name, email: normalizedEmail, password: normalizedPassword, phone },
        authModal?.mode || 'login'
      );
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('already exists')) {
        setError('⚠️ An account with this email already exists. Please log in instead.');
      } else if (msg.includes('not registered') || msg.includes('Account not registered')) {
        setError('⛔ No account found for this email. Please sign up first.');
      } else if (msg.includes('Invalid email or password') || msg.includes('password')) {
        setError('🔒 Invalid email or password. Please try again.');
      } else if (msg.includes('Authentication Denied') || msg.includes('not authorized')) {
        setError('🚫 Authentication Denied — You are not authorized for this portal.');
      } else {
        setError(msg || '❌ Login failed. Please check your credentials.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark">
      <AnimatePresence>
        {showIntro && <VideoIntro onFinish={() => setShowIntro(false)} />}
      </AnimatePresence>

      {/* Team Section Modal */}
      <AnimatePresence>
        {showTeam && <TeamSection onClose={() => setShowTeam(false)} />}
      </AnimatePresence>

      {/* OTP Verification Modal */}
      <AnimatePresence>
        {otpStep === 'pending' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-white/10 p-10 rounded-[3rem] w-full max-w-lg relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-brand" />
              <OTPRegistration
                initialEmail={formData.email}
                onVerified={handleOTPVerified}
                onBack={() => {
                  setOtpStep(null);
                  setAuthModal({ role: pendingSignupRole, step: 1, mode: 'login' });
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AnimatePresence>
        {authModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-white/10 p-10 rounded-[3rem] w-full max-w-lg relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-brand" />
              <button 
                onClick={() => setAuthModal(null)}
                className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="mb-10">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">
                  {authModal.step === 1 ? 'Select Protocol' : authModal.mode === 'signup' ? 'Create Account' : 'Verify Access'}
                </h2>
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest">
                  {authModal.role} Gateway • {authModal.step === 1 ? 'Identity Type' : 'Authorization'}
                </p>
              </div>

              {authModal.step === 1 ? (
                <div className="space-y-4">
                  <button 
                    onClick={() => handleModeSelect('signup')}
                    className="w-full bg-white/5 border border-white/10 p-8 rounded-[2rem] group hover:border-brand transition-all flex items-center justify-between"
                  >
                    <div className="text-left">
                      <p className="text-xl font-black uppercase italic tracking-tighter mb-1">Create New Account</p>
                      <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Sign-up for first time</p>
                    </div>
                    <ArrowRight className="w-6 h-6 text-white/20 group-hover:text-brand group-hover:translate-x-2 transition-all" />
                  </button>
                  <button 
                    onClick={() => handleModeSelect('login')}
                    className="w-full bg-white/5 border border-white/10 p-8 rounded-[2rem] group hover:border-white transition-all flex items-center justify-between"
                  >
                    <div className="text-left">
                      <p className="text-xl font-black uppercase italic tracking-tighter mb-1">Already have an account</p>
                      <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Login to existing profile</p>
                    </div>
                    <ArrowRight className="w-6 h-6 text-white/20 group-hover:text-white group-hover:translate-x-2 transition-all" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    {authModal.mode === 'signup' && (
                      <>
                        <div className="relative">
                          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                          <input 
                            type="text" 
                            placeholder="Full Name" 
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-6 focus:border-brand outline-none transition-all placeholder:text-white/10"
                          />
                        </div>
                      </>
                    )}
                    
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                      <input 
                        type="email" 
                        placeholder="Email Address" 
                        required
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        readOnly={authModal.mode === 'signup' && !!formData.email}
                        className={`w-full bg-white/5 border rounded-2xl py-5 pl-14 pr-6 focus:border-brand outline-none transition-all placeholder:text-white/10
                          ${authModal.mode === 'signup' && formData.email
                            ? 'border-brand/50 text-brand cursor-not-allowed'
                            : 'border-white/10 focus:border-brand'
                          }`}
                      />
                      {authModal.mode === 'signup' && formData.email && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-brand bg-brand/10 px-2 py-1 rounded-full">
                          ✓ Verified
                        </span>
                      )}
                    </div>

                    {authModal.mode === 'signup' && (
                      <div className="relative">
                         <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                         <input 
                           type="tel" 
                           placeholder="Phone Number" 
                           required
                           value={formData.phone}
                           onChange={e => setFormData({ ...formData, phone: e.target.value })}
                           className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-6 focus:border-brand outline-none transition-all placeholder:text-white/10"
                         />
                      </div>
                    )}

                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                      <input 
                        type="password" 
                        placeholder="Master Password" 
                        required
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-6 focus:border-brand outline-none transition-all placeholder:text-white/10"
                      />
                    </div>
                  </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-500 text-xs font-bold space-y-2 flex flex-col"
                >
                  <div className="flex items-center gap-3">
                    <Lock className="w-4 h-4 shrink-0" /> 
                    <span>{error}</span>
                  </div>
                  {error.includes('access') && (
                    <p className="text-[10px] text-red-400/60 font-medium leading-tight pt-1 border-t border-red-500/10">
                      Pro-Tip: Ensure "Anonymous" & "Email/Password" Auth are enabled in Firebase Console.
                    </p>
                  )}
                </motion.div>
              )}

                  <button 
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase text-sm tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed"
                  >
                    {isLoggingIn ? 'Verifying...' : authModal.mode === 'signup' ? 'Create Account' : 'Verify Credentials & Login'}
                  </button>
                  
                  {authModal.role !== 'warden' && authModal.role !== 'admin' && authModal.role !== 'guard' && (
                    <button 
                      type="button"
                      onClick={() => setAuthModal({ ...authModal, step: 1 })}
                      className="w-full text-white/20 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
                    >
                      Back to Protocol Selection
                    </button>
                  )}
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 glass py-4 px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center neon-glow overflow-hidden">
            <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-2xl font-display font-bold tracking-tight">ANU<span className="text-brand">MATI</span></span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
          <a href="#features" className="hover:text-brand transition-colors">Features</a>
          <a href="#workflow" className="hover:text-brand transition-colors">Workflow</a>
          <a href="#about" className="hover:text-brand transition-colors">About</a>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => handleRoleSelect('warden')}
            className="text-white/40 hover:text-brand text-xs font-black uppercase tracking-[0.2em] transition-all cursor-pointer"
          >
            Admin
          </button>
          <button 
            onClick={() => document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-brand text-dark px-6 py-2 rounded-full font-bold hover:scale-105 transition-transform cursor-pointer"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-brand/5 rounded-full blur-[120px] -z-10" />
        
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 mb-4 rounded-full border border-brand/30 bg-brand/5 text-brand text-[10px] font-black tracking-[0.3em] uppercase italic">
              Terminal Active • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <div className="mb-4">
              <ClockDisplay />
            </div>
            <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-none mb-8 italic uppercase text-white">
              Smart Leave. <br />
              <span className="neon-text not-italic">Secure Entry.</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-16">
              The next-generation digital gate-pass system for elite campuses. 
              Zero paper. Maximum security. Seamless workflow.
            </p>
            
            {/* Login Tabs/Grid */}
            <div id="login-section" className="flex gap-6 justify-center max-w-6xl mx-auto text-left scroll-mt-32 flex-wrap">
              {[
                { 
                  role: 'student', 
                  title: 'Student Portal', 
                  desc: 'Apply for leave & track status',
                  btn: 'Login as Student',
                  icon: Zap,
                  color: 'border-brand/20 hover:border-brand'
                },
                { 
                  role: 'guard', 
                  title: 'Security Portal', 
                  desc: 'Scan & log student entries',
                  btn: 'Login as Guard',
                  icon: Shield,
                  color: 'border-purple-500/20 hover:border-purple-500'
                }
              ].map((item) => (
                <motion.div
                  key={item.role}
                  whileHover={{ y: -8 }}
                  className={`glass p-8 rounded-[2.5rem] border ${item.color} transition-all flex flex-col items-center text-center max-w-md w-full`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                    <item.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2">{item.title}</h3>
                  <p className="text-white/40 text-sm mb-8 leading-tight">{item.desc}</p>
                  <button 
                    onClick={() => handleRoleSelect(item.role)}
                    className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-transform"
                  >
                    {item.btn}
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Dashboard Preview */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-6xl mx-auto mt-24 relative px-4"
        >
          <div className="relative group p-1 bg-gradient-to-br from-brand/50 via-dark to-purple-500/50 rounded-[3.5rem] shadow-[0_0_100px_rgba(59,130,246,0.15)] overflow-hidden">
            <div className="glass rounded-[3rem] p-2 md:p-3 overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426" 
                alt="Anumati Intelligence Dashboard" 
                className="rounded-[2.5rem] w-full h-[500px] object-cover opacity-90 group-hover:scale-105 transition-transform duration-[2s]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/40 to-transparent flex flex-col justify-end p-12 items-start text-left">
                 <div className="glass p-6 rounded-3xl border-brand/20 backdrop-blur-md mb-4 max-w-md">
                    <p className="text-brand font-black uppercase tracking-[0.3em] text-[10px] mb-2 italic">System Live</p>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-2">Central Management Infrastructure</h3>
                    <p className="text-white/40 text-xs font-bold leading-tight">Zero-Paper Digital Gate-Pass & Hostel Leave Management Terminal active for all residential blocks.</p>
                 </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Feature Grids */}
      <section id="features" className="py-24 px-6 bg-dark-surface">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black tracking-tighter uppercase italic mb-4">Enterprise Grade</h2>
            <p className="text-white/40 font-medium">Everything you need to secure your campus infrastructure.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: QrCode, title: "Dynamic QR Passes", desc: "Secure 256-bit encrypted QR codes that refresh every 20 seconds to prevent fraud." },
              { icon: ShieldCheck, title: "AI Monitoring", desc: "Automated anomaly detection for late entries and suspicious leave patterns." },
              { icon: Zap, title: "Instant Notification", desc: "Real-time alerts for parents and wardens via SMS, App, and Email." }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -5 }}
                className="glass p-8 rounded-[2rem] group"
              >
                <div className="w-14 h-14 bg-brand/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-brand transition-colors">
                  <feature.icon className="text-brand group-hover:text-dark w-7 h-7 transition-colors" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-5xl font-black tracking-tighter uppercase italic mb-8">Seamless <br /><span className="text-brand not-italic">Digital Journey.</span></h2>
              <div className="space-y-8">
                {[
                  { step: "01", title: "Apply", desc: "Students submit leave requests in under 30 seconds via the mobile app." },
                  { step: "02", title: "Verify", desc: "Wardens approve requests instantly from their centralized dashboard." },
                  { step: "03", title: "Exit", desc: "Guards scan the secure QR code at the gate for automatic logging." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6">
                    <span className="text-5xl font-black tracking-tighter text-white/10 italic leading-none">{item.step}</span>
                    <div>
                      <h4 className="text-xl font-bold mb-2 uppercase">{item.title}</h4>
                      <p className="text-gray-400 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square glass rounded-[3rem] p-12 flex items-center justify-center">
                <QrCode className="w-full h-full text-brand opacity-20" />
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="bg-brand p-8 rounded-[2rem] neon-glow">
                    <QrCode className="w-24 h-24 text-dark" />
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 px-6 border-t border-white/5 bg-zinc-950/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-20 items-center">
            <div className="space-y-12">
              <div>
                <h2 className="text-5xl font-black italic uppercase tracking-tighter mb-8 leading-none">About</h2>
                <p className="text-white/40 leading-relaxed text-xl mb-6">
                  A smart digital gate-pass and hostel leave management platform designed to eliminate paperwork, 
                  streamline approvals, and strengthen campus security through a seamless, technology-driven system.
                </p>
                <div className="space-y-8">
                  <div>
                    <h4 className="text-brand font-black uppercase tracking-[0.2em] text-[10px] italic mb-2">Our Mission</h4>
                    <p className="text-white/80 text-lg leading-snug font-medium italic">
                      "To create safer, smarter, and paperless campuses through digital innovation."
                    </p>
                  </div>
                  <div>
                    <h4 className="text-brand font-black uppercase tracking-[0.2em] text-[10px] italic mb-2">Our Vision</h4>
                    <p className="text-white/80 text-lg leading-snug font-medium italic">
                      "To become the trusted digital access management platform for educational institutions worldwide."
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass p-12 rounded-[4rem] border-brand/5 relative group overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                <ShieldCheck className="w-48 h-48" />
              </div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-10 flex items-center gap-3">
                <Zap className="w-6 h-6 text-brand" /> System Intelligence
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                {[
                  "100% Paperless Workflow",
                  "Real-Time Approval System",
                  "Secure Dynamic QR Verification",
                  "Automated Entry/Exit Logging",
                  "Parent Notification Support",
                  "Analytics & Security Dashboard",
                  "AI-Based Alert Monitoring",
                  "Scalable for Any Campus"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 group/item">
                    <div className="w-8 h-8 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand text-[10px] group-hover/item:scale-110 transition-transform">
                      ✔
                    </div>
                    <span className="text-white/50 text-xs font-black uppercase tracking-widest group-hover/item:text-white transition-colors">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-dark-border px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center overflow-hidden">
              <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-display font-bold tracking-tight">ANU<span className="text-brand">MATI</span></span>
          </div>
          <p className="text-gray-500 text-sm">© 2026 Tech Torque. All rights reserved.</p>
          <div className="flex gap-6 items-center">
            <button 
              onClick={() => setShowTeam(true)}
              className="text-xl font-bold px-8 py-4 bg-blue-600 hover:bg-blue-700 transform hover:scale-105 transition-all rounded-lg text-white"
            >
              The Team
            </button>
            <ClipboardList className="w-5 h-5 cursor-pointer hover:text-brand transition-colors text-gray-400" />
          </div>
        </div>
      </footer>
    </div>
  );
}
