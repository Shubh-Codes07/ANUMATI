import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, ShieldCheck, RotateCcw, ArrowLeft, Loader2 } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

interface OTPRegistrationProps {
  /** Pre-filled email from the signup form (can be empty) */
  initialEmail?: string;
  /** Called when OTP is verified successfully. Passes the verified email back. */
  onVerified: (email: string) => void;
  /** Called when the user wants to go back */
  onBack: () => void;
}

export default function OTPRegistration({ initialEmail = '', onVerified, onBack }: OTPRegistrationProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState(initialEmail);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // ── Send OTP ────────────────────────────────────────────────────────────────
  const sendOTP = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setStep(2);
        setDigits(['', '', '', '', '', '']);
        setCountdown(60);
        setSuccess(`Code sent to ${email.trim()}`);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        setError(data.message || 'Failed to send OTP.');
      }
    } catch {
      setError('Cannot reach the server. Is the backend running?');
    }
    setLoading(false);
  };

  // ── Digit input handling ────────────────────────────────────────────────────
  const handleDigit = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    setError('');
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  // ── Verify OTP ──────────────────────────────────────────────────────────────
  const verifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = digits.join('');
    if (otp.length < 6) { setError('Please enter the complete 6-digit code.'); return; }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess('✅ Email verified!');
        setTimeout(() => onVerified(email.trim()), 600);
      } else {
        setError(data.message || 'Invalid OTP.');
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError('Cannot reach the server. Is the backend running?');
    }
    setLoading(false);
  };

  // ── UI ──────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="w-full"
    >
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-1">
            {step === 1 ? 'Verify Identity' : 'Enter Code'}
          </h2>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest">
            {step === 1 ? 'Email Verification' : `Code sent to ${email}`}
          </p>
        </div>
        <button
          onClick={step === 1 ? onBack : () => { setStep(1); setError(''); setSuccess(''); }}
          className="text-white/30 hover:text-white transition-colors mt-1"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Status messages */}
      <AnimatePresence>
        {(error || success) && (
          <motion.div
            key={error || success}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mb-6 px-4 py-3 rounded-2xl text-xs font-bold border ${
              error
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-brand/10 border-brand/20 text-brand'
            }`}
          >
            {error || success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Step 1: Email Entry ─────────────────────────────────────────────── */}
      {step === 1 && (
        <form onSubmit={sendOTP} className="space-y-6">
          <p className="text-white/40 text-sm leading-relaxed">
            Enter your university email. We'll send a 6-digit code to verify it before creating your account.
          </p>

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
            <input
              type="email"
              required
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder="student@university.edu"
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-6 focus:border-brand outline-none transition-all placeholder:text-white/10 text-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase text-sm tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {loading ? 'Sending Code...' : 'Send Verification Code'}
          </button>
        </form>
      )}

      {/* ── Step 2: OTP Entry ──────────────────────────────────────────────── */}
      {step === 2 && (
        <form onSubmit={verifyOTP} className="space-y-6">
          <p className="text-white/40 text-sm leading-relaxed">
            Enter the 6-digit code we sent to{' '}
            <span className="text-white font-bold">{email}</span>.{' '}
            It expires in 5 minutes.
          </p>

          {/* 6 digit boxes */}
          <div className="flex gap-3 justify-center" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className={`w-12 h-14 text-center text-2xl font-black bg-white/5 border rounded-2xl outline-none transition-all text-white
                  ${d ? 'border-brand shadow-[0_0_12px_rgba(59,130,246,0.3)]' : 'border-white/10'}
                  focus:border-brand focus:shadow-[0_0_12px_rgba(59,130,246,0.4)]`}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || digits.join('').length < 6}
            className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase text-sm tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </button>

          {/* Resend */}
          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-white/20 text-xs font-bold uppercase tracking-widest">
                Resend available in {countdown}s
              </p>
            ) : (
              <button
                type="button"
                onClick={sendOTP}
                disabled={loading}
                className="text-white/30 hover:text-brand text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 mx-auto disabled:opacity-50"
              >
                <RotateCcw className="w-3 h-3" /> Resend Code
              </button>
            )}
          </div>
        </form>
      )}
    </motion.div>
  );
}
