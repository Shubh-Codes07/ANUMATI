import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, QrCode, ClipboardList, User as UserIcon, Bell, 
  Search, MapPin, Calendar, Clock, ChevronRight,
  ArrowLeft, Upload, CheckCircle2, AlertCircle, X, LogOut,
  UserCheck, Shield, Camera
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { User, LeaveRequest } from '../types';
import { LeaveService } from '../lib/leaveService';

interface StudentPortalProps {
  onBack: () => void;
  user: User;
}

export default function StudentPortal({ onBack, user }: StudentPortalProps) {
  const [activeTab, setActiveTab] = useState('home');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [showIDQR, setShowIDQR] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [emergencyQR, setEmergencyQR] = useState<string | null>(null);
  const [isEmergencyLoading, setIsEmergencyLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileData, setProfileData] = useState({
    usn: user.usn || '',
    uid: user.uid || 'GF-' + user.id.slice(0, 8).toUpperCase(),
    department: user.department || '',
    roomNumber: user.roomNumber || '',
    phone: user.phone || '',
    parentPhone: user.parentPhone || '',
    address: user.address || '',
    avatar: user.avatar || ''
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileData(prev => ({ ...prev, avatar: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = LeaveService.subscribeToMyRequests(user.id, (requests) => {
      setHistory(requests);
    });
    return () => unsubscribe();
  }, [user.id]);

  const activePass = history.find(req => req.status === 'approved' || req.status === 'active');

  const studentStats = {
    total: history.length,
    approved: history.filter(r => r.status === 'approved' || r.status === 'active' || r.status === 'completed').length,
    rejected: history.filter(r => r.status === 'rejected').length
  };

  const handleMedicalEmergency = async () => {
    if (!confirm('⚠️ Trigger MEDICAL EMERGENCY EXIT?\n\nThis will immediately generate an approved gate pass. Only use in a real emergency.')) return;
    setIsEmergencyLoading(true);
    try {
      const result = await LeaveService.triggerMedicalEmergency(
        user.id,
        user.name,
        user.roomNumber || 'N/A'
      );
      setEmergencyQR(result.qrCode || result.id);
    } catch (err: any) {
      alert('Emergency request failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsEmergencyLoading(false);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    const request: Omit<LeaveRequest, 'id'> = {
      studentId: user.id,
      studentName: user.name,
      studentRoom: user.roomNumber || 'N/A',
      type: formData.get('type') as any,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      reason: formData.get('reason') as string,
      status: 'pending',
      appliedAt: new Date().toISOString(),
      appliedBy: 'student',
    };

    try {
      await LeaveService.applyLeave(request);
      setShowApplyModal(false);
    } catch (error) {
      console.error("Apply leave failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const Dashboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <p className="text-[10px] font-black text-brand uppercase tracking-[0.3em] mb-1 italic">
            {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </h2>
        </div>
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-dark-surface border border-dark-border flex items-center justify-center overflow-hidden">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <UserIcon className="w-6 h-6 text-gray-400" />
            )}
            <div className="absolute top-0 right-0 w-3 h-3 bg-brand rounded-full border-2 border-dark" />
          </div>
        </div>
      </div>

      {/* Leave Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass p-4 rounded-3xl border-white/5 text-center">
          <p className="text-[7px] font-black text-white/20 uppercase tracking-widest mb-1 italic">Forms Sent</p>
          <p className="text-xl font-black italic tracking-tighter text-white/80">{studentStats.total}</p>
        </div>
        <div className="glass p-4 rounded-3xl border-brand/20 text-center">
          <p className="text-[7px] font-black text-brand/40 uppercase tracking-widest mb-1 italic">Approved</p>
          <p className="text-xl font-black italic tracking-tighter text-brand">{studentStats.approved}</p>
        </div>
        <div className="glass p-4 rounded-3xl border-red-500/20 text-center">
          <p className="text-[7px] font-black text-red-500/40 uppercase tracking-widest mb-1 italic">Rejected</p>
          <p className="text-xl font-black italic tracking-tighter text-red-500/80">{studentStats.rejected}</p>
        </div>
      </div>

      {/* Active Pass Card */}
      <AnimatePresence>
        {activePass ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-brand/20 to-transparent pointer-events-none" />
            <div className="glass p-6 rounded-[2.5rem] border-brand/20 relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center">
                    <CheckCircle2 className="text-brand w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#00E5FF] font-black italic">Active Authority</p>
                    <p className="text-xl font-black tracking-tighter uppercase">{activePass.status} Pass</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-white/40 uppercase italic">Ends {activePass.endDate}</span>
              </div>

              <div className="flex gap-4 mb-6 text-center">
                <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/5">
                  <p className="text-[9px] text-white/20 uppercase font-black tracking-widest mb-1">Departure</p>
                  <p className="text-xs font-black italic uppercase">{activePass.startDate}</p>
                </div>
                <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/5">
                  <p className="text-[9px] text-white/20 uppercase font-black tracking-widest mb-1">Return</p>
                  <p className="text-xs font-black italic uppercase">{activePass.endDate}</p>
                </div>
              </div>

              <button 
                onClick={() => setShowQR(activePass.qrCode || activePass.id)}
                className="w-full bg-white text-black font-black uppercase py-5 rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform tracking-widest text-sm"
              >
                <QrCode className="w-5 h-5" /> Scan at Gate
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="glass p-8 rounded-[2.5rem] text-center border-dashed border-2 border-white/10 opacity-60">
            <p className="text-sm font-medium text-white/40">No active gate-pass found.</p>
            <button 
              onClick={() => setShowApplyModal(true)}
              className="mt-4 text-brand font-black uppercase text-[10px] tracking-widest"
            >
              + Apply New Request
            </button>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setShowApplyModal(true)}
            className="glass p-5 rounded-3xl flex flex-col items-center gap-3 hover:border-brand/40 transition-colors"
          >
            <div className="w-12 h-12 rounded-2xl bg-brand-muted flex items-center justify-center text-brand">
              <ClipboardList className="w-6 h-6" />
            </div>
            <span className="text-sm font-semibold">Apply Leave</span>
          </button>
          <button 
            onClick={() => setShowIDQR(true)}
            className="glass p-5 rounded-3xl flex flex-col items-center gap-3 hover:border-brand/40 transition-colors"
          >
            <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
              <QrCode className="w-6 h-6" />
            </div>
            <span className="text-sm font-semibold">ID QR Code</span>
          </button>
        </div>

        {/* Medical Emergency Button */}
        <button
          onClick={handleMedicalEmergency}
          disabled={isEmergencyLoading}
          className="mt-4 w-full relative overflow-hidden group bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-black uppercase py-5 rounded-3xl flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:shadow-[0_0_50px_rgba(239,68,68,0.6)] transition-all tracking-widest text-sm border border-red-500/50"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-red-700/0 via-red-400/20 to-red-700/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          {isEmergencyLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Activating Emergency...</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 animate-pulse" />
              <span>Medical Emergency</span>
              <AlertCircle className="w-5 h-5 animate-pulse" />
            </>
          )}
        </button>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Recent History</h3>
          <button className="text-brand text-sm font-bold" onClick={() => setActiveTab('requests')}>View All</button>
        </div>
        <div className="space-y-3">
          {history.slice(0, 3).map((leave) => (
            <div key={leave.id} className="glass p-4 rounded-3xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  leave.status === 'approved' ? 'bg-green-500/10 text-green-500' : 
                  leave.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                  'bg-gray-500/10 text-gray-400'
                }`}>
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm capitalize">{leave.type} Leave</h4>
                  <p className="text-[10px] text-gray-500">{new Date(leave.appliedAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider ${
                  leave.status === 'approved' ? 'bg-green-500/20 text-green-500' : 
                  leave.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {leave.status}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-dark flex flex-col md:max-w-md md:mx-auto md:border-x md:border-dark-border">
      {/* Mobile Top Bar */}
      <div className="p-6 sticky top-0 z-20 bg-dark/80 backdrop-blur-md flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img src="/logo.jpeg" alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
          <h1 className="text-xl font-display font-bold italic tracking-tight">ANU<span className="text-brand">MATI</span></h1>
        </div>
        <button 
          onClick={onBack} 
          className="px-4 py-2 rounded-xl glass border-red-500/20 text-red-500 flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)]"
        >
          <span className="text-[10px] font-black uppercase tracking-widest">Logout</span>
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 px-6 pb-24 overflow-y-auto">
        {activeTab === 'home' && <Dashboard />}
        {activeTab === 'attendance' && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="text-center">
              <p className="text-brand font-black uppercase tracking-[0.3em] text-[10px] mb-2 italic">Official ANUMATI Identity</p>
              <h2 className="text-4xl font-black italic uppercase tracking-tighter">Attendance QR</h2>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-2 max-w-[200px] mx-auto">Scan for Hostel, Mess & Library Access Verification</p>
            </div>
            
            <div className="bg-dark-surface p-4 rounded-[3.5rem] border-2 border-[#3B82F6] animate-pulse shadow-[0_0_50px_rgba(59,130,246,0.3)] flex justify-center">
               <div className="bg-white p-8 rounded-[3rem] inline-block">
                 <QRCode value={`GF-ID-${user.id}`} size={240} fgColor="#000" />
               </div>
            </div>

            <div className="glass p-6 rounded-3xl w-full flex flex-col items-center gap-2 border-brand/20">
               <p className="text-white font-black uppercase tracking-tighter text-lg italic">{user.name}</p>
               <p className="text-white/40 font-mono text-[10px] font-bold uppercase tracking-tighter">UID: {user.usn || user.id.slice(0, 12).toUpperCase()}</p>
               <div className="mt-4 flex items-center gap-2 bg-brand/10 px-4 py-1.5 rounded-full border border-brand/20">
                  <div className="w-2 h-2 bg-brand rounded-full animate-pulse" />
                  <span className="text-[8px] text-brand font-black uppercase tracking-widest">Temporal Signature Verified</span>
               </div>
            </div>
          </div>
        )}
        {activeTab === 'requests' && (
          <div className="space-y-4 pt-4">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-6">Leave History</h2>
            {history.length > 0 ? (
              history.map(leave => (
                <div key={leave.id} className="bg-zinc-900 border border-white/5 p-5 rounded-3xl group hover:border-white/10 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-brand italic tracking-[0.2em]">{leave.type} REQUEST</span>
                      <span className="text-[8px] text-white/30 font-bold uppercase mt-1 italic">
                        {new Date(leave.appliedAt).toLocaleDateString()} at {new Date(leave.appliedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                      leave.status === 'approved' ? 'bg-green-500/10 text-green-500 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]' :
                      leave.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                      leave.status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                      'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    }`}>
                      {leave.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4 bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                    <div>
                      <p className="text-[8px] text-white/20 uppercase font-black">Departure Date</p>
                      <p className="text-xs font-bold text-white/80">{leave.startDate}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-white/20 uppercase font-black">Expected Return</p>
                      <p className="text-xs font-bold text-white/80">{leave.endDate}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                    <p className="text-[10px] text-white/40 italic leading-snug flex-1">"{leave.reason}"</p>
                    {leave.status === 'approved' && (
                      <button onClick={() => setShowQR(leave.qrCode || leave.id)} className="ml-4 w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand border border-brand/20">
                         <QrCode className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                <ClipboardList className="w-16 h-16 mb-4" />
                <p className="font-bold uppercase tracking-widest text-xs">No active requests</p>
              </div>
            )}
          </div>
        )}
        {activeTab === 'profile' && (
           <div className="space-y-6 pt-4 animate-in slide-in-from-bottom duration-500">
              <div className="flex flex-col items-center py-6">
                <div className="w-24 h-24 rounded-[2rem] bg-brand/10 border border-brand/20 mb-4 flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                   {user.avatar ? (
                     <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                   ) : (
                     <UserIcon className="w-12 h-12 text-brand" />
                   )}
                </div>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">{user.name}</h2>
                <p className="text-brand font-black uppercase text-[10px] tracking-[0.3em] mt-3">Resident • Identity Finalized</p>
              </div>

              <div className="bg-zinc-950/80 border border-white/5 rounded-[3.5rem] p-10 space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
                   <Shield className="w-48 h-48" />
                </div>

                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center">
                    <UserCheck className="w-4 h-4 text-brand" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-widest italic text-white/60">Official Records</h3>
                </div>
                
                <div className="space-y-6">
                   <div className="group relative">
                      <label className="text-[8px] font-black text-white/20 uppercase tracking-widest block mb-1 px-1">Login Name (Read Only)</label>
                      <div className="w-full bg-white/[0.01] border border-white/5 rounded-2xl p-4 text-sm font-bold text-white/30 italic">
                        {user.name}
                      </div>
                   </div>
                   <div className="group relative">
                      <label className="text-[8px] font-black text-white/20 uppercase tracking-widest block mb-1 px-1">Login Email (Read Only)</label>
                      <div className="w-full bg-white/[0.01] border border-white/5 rounded-2xl p-4 text-sm font-bold text-white/30 italic">
                        {user.email}
                      </div>
                   </div>
                   <button 
                    onClick={() => setShowProfileEdit(true)}
                    className="w-full glass p-5 rounded-3xl flex items-center justify-between group hover:border-brand/40 transition-all mt-4"
                   >
                      <span className="text-xs font-black uppercase tracking-widest italic">Edit Personal Details</span>
                      <ChevronRight className="w-5 h-5 text-brand" />
                   </button>
                </div>

                <div className="pt-8 border-t border-white/5 mt-8 text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-brand/40 italic">System Registry Secured by Warden</p>
                </div>
              </div>
           </div>
        )}
      </div>

      {/* Profile Edit Modal */}
      <AnimatePresence>
        {showProfileEdit && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-dark/95 backdrop-blur-xl flex flex-col p-6 overflow-y-auto"
          >
            <div className="max-w-md mx-auto w-full pt-10 pb-20">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none">Profile Registry</h2>
                  <p className="text-brand font-black uppercase text-[10px] tracking-[0.3em] mt-3">Identity Enrollment Form</p>
                </div>
                <button 
                  onClick={() => setShowProfileEdit(false)}
                  className="w-12 h-12 glass rounded-2xl flex items-center justify-center"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] p-8 space-y-6">
                {/* Profile Picture Upload */}
                <div className="flex flex-col items-center gap-4 pb-6 border-b border-white/5">
                  <div
                    className="relative w-28 h-28 rounded-[2rem] bg-brand/10 border-2 border-dashed border-brand/30 flex items-center justify-center overflow-hidden cursor-pointer group hover:border-brand/60 transition-all"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {profileData.avatar ? (
                      <img src={profileData.avatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-10 h-10 text-brand/40" />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[2rem]">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <div className="text-center">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Profile Picture</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-brand text-[10px] font-black uppercase tracking-widest mt-1 hover:underline"
                    >
                      {profileData.avatar ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    {profileData.avatar && (
                      <button
                        type="button"
                        onClick={() => setProfileData(prev => ({ ...prev, avatar: '' }))}
                        className="block mx-auto text-red-500/60 text-[9px] font-black uppercase tracking-widest mt-1 hover:text-red-400"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {[
                  { label: 'USN', key: 'usn', placeholder: 'Enter University Reg No' },
                  { label: 'UID', key: 'uid', placeholder: 'Enter Identity ID' },
                  { label: 'DEPARTMENT', key: 'department', placeholder: 'Enter Branch/Dept' },
                  { label: 'HOSTEL ROOM NO', key: 'roomNumber', placeholder: 'Enter Block & Room' },
                  { label: 'CONTACT NO', key: 'phone', placeholder: 'Enter Phone' },
                  { label: "PARENT'S CONTACT NO", key: 'parentPhone', placeholder: "Enter Parent's Phone" },
                  { label: 'ADDRESS', key: 'address', placeholder: 'Enter Permanent Address', multi: true },
                ].map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label className="text-[8px] font-black text-white/40 uppercase tracking-widest block ml-2">{field.label}</label>
                    {field.multi ? (
                      <textarea 
                        value={(profileData as any)[field.key]}
                        onChange={(e) => setProfileData({...profileData, [field.key]: e.target.value})}
                        className="w-full glass bg-transparent rounded-2xl p-4 text-sm font-bold focus:border-brand outline-none min-h-[100px]"
                        placeholder={field.placeholder}
                      />
                    ) : (
                      <input 
                        type="text"
                        value={(profileData as any)[field.key]}
                        onChange={(e) => setProfileData({...profileData, [field.key]: e.target.value})}
                        className="w-full glass bg-transparent rounded-2xl p-4 text-sm font-bold focus:border-brand outline-none"
                        placeholder={field.placeholder}
                      />
                    )}
                  </div>
                ))}

                <button 
                  onClick={async () => {
                    setIsSubmitting(true);
                    const { UserService } = await import('../lib/userService');
                    const updatedUser = await UserService.updateUser(user.id, profileData);
                    if (updatedUser) {
                      const { AuthService } = await import('../lib/authService');
                      AuthService.updateCurrentUser(updatedUser);
                    }
                    setIsSubmitting(false);
                    setShowProfileEdit(false);
                  }}
                  className="w-full bg-brand text-dark font-black uppercase py-6 rounded-3xl tracking-[0.2em] text-sm mt-4 shadow-[0_10px_30px_rgba(59,130,246,0.2)]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Syncing...' : 'Update Records'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 md:max-w-md md:mx-auto glass border-t-0 rounded-t-[3rem] px-10 py-5 flex justify-between items-center z-50">
        {[
          { id: 'home', icon: Home, label: 'Feed' },
          { id: 'attendance', icon: QrCode, label: 'QR' },
          { id: 'requests', icon: ClipboardList, label: 'Logs' },
          { id: 'profile', icon: UserIcon, label: 'Record' }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1.5 transition-all ${
              activeTab === tab.id ? 'text-brand scale-110' : 'text-white/20'
            }`}
          >
            <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'stroke-[3px]' : 'stroke-[2px]'}`} />
            <span className="text-[8px] font-black uppercase tracking-[0.2em]">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showApplyModal && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed inset-0 z-[60] bg-dark px-6 pt-12 pb-6 md:max-w-md md:mx-auto"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-display font-bold uppercase italic tracking-tighter">Apply Leave</h2>
              <button onClick={() => setShowApplyModal(false)} className="w-10 h-10 rounded-xl glass flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-white/30 uppercase mb-2 block tracking-widest italic">Leave Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {['home', 'local', 'vacation'].map((type) => (
                    <label key={type} className="relative cursor-pointer">
                      <input type="radio" name="type" value={type} defaultChecked={type === 'home'} className="peer absolute opacity-0" />
                      <div className="glass p-3 rounded-2xl text-[10px] font-black uppercase text-center border border-white/5 peer-checked:border-brand peer-checked:text-brand transition-all">
                        {type}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-white/30 uppercase mb-2 block tracking-widest italic">Start Date</label>
                  <input 
                    type="date" 
                    name="startDate" 
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full glass bg-transparent rounded-xl p-4 text-xs font-bold focus:border-brand/40 outline-none"
                    placeholder="Today"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-white/30 uppercase mb-2 block tracking-widest italic">End Date</label>
                  <input 
                    type="date" 
                    name="endDate" 
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full glass bg-transparent rounded-xl p-4 text-xs font-bold focus:border-brand/40 outline-none"
                    placeholder="12 May"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-white/30 uppercase mb-2 block tracking-widest italic">Reason</label>
                <textarea 
                  name="reason"
                  required
                  className="w-full glass bg-transparent rounded-2xl p-4 text-sm focus:outline-none focus:border-brand/40 min-h-[100px] font-medium" 
                  placeholder="Describe your reason for leave..."
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-white text-black font-black uppercase py-5 rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform tracking-widest text-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Encrypting Data...' : 'Transmit Request'}
              </button>
            </form>
          </motion.div>
        )}

        {showQR && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-dark/95 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setShowQR(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-8 rounded-[3rem] w-full max-w-sm text-center relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-brand rounded-full flex items-center justify-center neon-glow shadow-2xl">
                <CheckCircle2 className="w-12 h-12 text-black" />
              </div>

              <div className="mt-8 mb-6">
                <h3 className="text-dark text-xl font-bold mb-1 uppercase tracking-tighter">Approved Gate Pass</h3>
                <p className="text-black/40 text-[10px] uppercase tracking-widest font-black italic">Authority Encrypted: GF-{showQR?.slice(0, 6).toUpperCase()}</p>
              </div>

              <div className="bg-gray-100 p-8 rounded-3xl mb-6 flex flex-col items-center">
                 <QRCode value={`GF-PASS-${showQR}`} size={200} />
                 <div className="w-full bg-dark/5 h-2 rounded-full mt-8 overflow-hidden">
                    <motion.div 
                      animate={{ width: ['100%', '0%'] }}
                      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                      className="h-full bg-brand shadow-[0_0_10px_brand]"
                    />
                 </div>
                 <p className="text-[8px] text-black/20 mt-2 font-black uppercase tracking-widest italic">Temporal Refresh Sequence Active</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-left border-t border-gray-100 pt-6">
                <div>
                  <p className="text-[8px] text-black/20 uppercase font-black">Student</p>
                  <p className="text-dark font-black tracking-tighter uppercase text-sm italic">{user.name}</p>
                </div>
                <div>
                  <p className="text-[8px] text-black/20 uppercase font-black">Authority</p>
                  <p className="text-dark font-black tracking-tighter uppercase text-sm italic">UN-7 VERIFIED</p>
                </div>
              </div>
              
              <button 
                onClick={() => setShowQR(null)}
                className="mt-8 text-gray-400 font-bold text-sm"
              >
                Close Pass
              </button>
            </motion.div>
          </motion.div>
        )}

        {showIDQR && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-dark/95 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setShowIDQR(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-8 rounded-[3.5rem] w-full max-w-sm text-center relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-dark rounded-full flex items-center justify-center border-4 border-brand">
                <UserIcon className="w-10 h-10 text-brand" />
              </div>

              <div className="mt-8 mb-6">
                <h3 className="text-dark text-2xl font-black uppercase italic tracking-tighter">Student Identity</h3>
                <p className="text-black/40 text-[10px] uppercase tracking-widest font-black italic">Valid for attendance, mess & library</p>
              </div>

              <div className="bg-gray-100 p-8 rounded-[2.5rem] mb-6 flex flex-col items-center">
                 <QRCode value={`GF-ID-${user.id}`} size={220} />
              </div>

              <div className="space-y-2 mb-6">
                <p className="text-dark font-black tracking-tighter uppercase text-lg">{user.name}</p>
                <p className="text-black/40 text-[10px] uppercase tracking-widest font-bold font-mono">ID: {user.usn || user.id.toUpperCase()}</p>
              </div>
              
              <button 
                onClick={() => setShowIDQR(false)}
                className="w-full bg-dark text-white font-black uppercase py-4 rounded-2xl tracking-widest text-xs"
              >
                Close ID
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Medical Emergency QR Modal ───────────────────────────────────── */}
      <AnimatePresence>
        {emergencyQR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-red-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6"
          >
            {/* Pulsing ring */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[500px] h-[500px] rounded-full border-2 border-red-500/20 animate-ping" />
            </div>

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 20 }}
              className="relative z-10 w-full max-w-sm text-center"
            >
              {/* Emergency badge */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <AlertCircle className="w-8 h-8 text-red-400 animate-pulse" />
                <div>
                  <p className="text-red-400 font-black uppercase tracking-[0.3em] text-[10px]">System Override Active</p>
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white leading-none">Medical Emergency</h2>
                </div>
                <AlertCircle className="w-8 h-8 text-red-400 animate-pulse" />
              </div>

              <p className="text-red-300/70 text-xs font-bold uppercase tracking-widest mb-6">
                Show this QR to the security guard immediately
              </p>

              {/* QR Code */}
              <div className="bg-white p-6 rounded-[2.5rem] mb-6 shadow-[0_0_60px_rgba(239,68,68,0.5)] border-4 border-red-500">
                <QRCode value={`GF-PASS-${emergencyQR}`} size={230} fgColor="#991b1b" />
                <div className="mt-4 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <p className="text-[9px] text-red-900 font-black uppercase tracking-widest">Emergency Pass Active</p>
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                </div>
              </div>

              {/* Student info */}
              <div className="glass border border-red-500/30 rounded-3xl p-5 mb-6 text-left space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-red-400/60 uppercase tracking-widest">Student</span>
                  <span className="text-sm font-black text-white uppercase italic">{user.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-red-400/60 uppercase tracking-widest">Room</span>
                  <span className="text-sm font-black text-white uppercase italic">{user.roomNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-red-400/60 uppercase tracking-widest">Type</span>
                  <span className="text-sm font-black text-red-400 uppercase italic">Medical Emergency</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-red-400/60 uppercase tracking-widest">Auth</span>
                  <span className="text-[10px] font-black text-green-400 uppercase">✓ Auto-Approved</span>
                </div>
              </div>

              <button
                onClick={() => setEmergencyQR(null)}
                className="w-full bg-white/10 border border-white/20 text-white/60 font-black uppercase py-4 rounded-2xl tracking-widest text-xs hover:bg-white/20 transition-all"
              >
                Close Emergency Pass
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
