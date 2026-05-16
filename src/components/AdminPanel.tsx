import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, ShieldCheck, TrendingUp, AlertTriangle, 
  Settings, Users, Lock, FileBarChart, ArrowLeft,
  Bell, Search, MoreHorizontal, CheckCircle2, XCircle, Plus, X, LogOut
} from 'lucide-react';

import { User, LeaveRequest } from '../types';
import { LeaveService } from '../lib/leaveService';

interface AdminPanelProps {
  onBack: () => void;
  user: User;
}

export default function AdminPanel({ onBack, user }: AdminPanelProps) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAllRequests();
  }, []);

  const loadAllRequests = async () => {
    setLoading(true);
    try {
      const data = await LeaveService.getAllRequests();
      setRequests(data || []);
    } catch (error) {
      console.error("Load failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId: string, status: LeaveRequest['status']) => {
    try {
      const qrCode = status === 'approved' ? `ANUMATI-ADM-${requestId}-${Date.now()}` : undefined;
      await LeaveService.updateRequestStatus(requestId, status, user.id, qrCode);
      loadAllRequests();
    } catch (error) {
      console.error("Status update failed:", error);
    }
  };

  const handleAdminCreateRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    const request: Omit<LeaveRequest, 'id'> = {
      studentId: formData.get('studentId') as string,
      studentName: formData.get('studentName') as string,
      studentRoom: formData.get('studentRoom') as string,
      type: formData.get('type') as any,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      reason: formData.get('reason') as string,
      status: 'approved', // Admin applications can be auto-approved
      appliedAt: new Date().toISOString(),
      approvedBy: user.name,
      qrCode: `ANUMATI-ADM-DIRECT-${Date.now()}`
    };

    try {
      await LeaveService.applyLeave(request);
      setShowCreateModal(false);
      loadAllRequests();
    } catch (error) {
      console.error("Create failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = [
    { label: 'Total Students', value: '2,840', trend: '+12%', icon: Users },
    { label: 'Active Requests', value: requests.length.toString(), icon: ShieldCheck },
    { label: 'Security Alerts', value: '00', trend: 'STABLE', icon: AlertTriangle, color: 'text-green-500' },
    { label: 'Avg. Flow / Day', value: '420', icon: TrendingUp },
  ];

  // Restricted Access check
  if (user.email !== 'swayam2005raje@gmail.com') {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center p-12 text-center">
        <Lock className="w-16 h-16 text-red-500 mb-6 animate-pulse" />
        <h1 className="text-4xl font-black uppercase italic tracking-tighter mb-4">Access Restricted</h1>
        <p className="text-white/40 max-w-md">This console is only accessible by the authorized system administrator.</p>
        <button onClick={onBack} className="mt-8 bg-white text-black px-8 py-3 rounded-full font-black uppercase text-xs">Back to Security</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark text-white p-8 lg:p-16">
      <header className="flex justify-between items-center mb-16">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-5xl font-black tracking-tighter uppercase italic">Control Unit</h1>
            <p className="text-white/40 text-sm font-medium">Enterprise Security Management • ANUMATI Network</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-brand text-dark px-6 py-3 rounded-2xl font-black uppercase text-xs flex items-center gap-3 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
           >
              <Plus className="w-5 h-5" /> Issue Pass
           </button>
           <button 
            onClick={onBack}
            className="px-6 py-3 rounded-2xl glass border-red-500/20 text-red-500 font-extrabold uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all"
           >
              Logout <LogOut className="w-4 h-4" />
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-zinc-900 border border-white/10 p-8 rounded-3xl relative group overflow-hidden"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="text-white/40 text-[11px] uppercase tracking-widest font-black italic">{stat.label}</div>
              <div className={`p-2 rounded-xl bg-white/5 ${stat.color || 'text-brand'}`}>
                 <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <div>
               <h3 className="text-5xl font-black tracking-tighter">{stat.value}</h3>
               {stat.trend && (
                 <div className={`text-[10px] font-black mt-2 italic ${stat.trend === 'High' ? 'text-red-500' : 'text-green-500'}`}>
                   {stat.trend} {stat.trend === 'High' ? 'ALERT' : 'GROWTH'}
                 </div>
               )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-zinc-900 border border-white/10 rounded-[3rem] p-10 flex flex-col">
              <div className="flex justify-between items-center mb-10">
                 <h3 className="text-2xl font-black tracking-tighter italic uppercase">Security Audit Feed</h3>
                 <div className="flex gap-4">
                    <button 
                      onClick={loadAllRequests}
                      className="bg-white text-black px-6 py-1.5 rounded-full text-xs font-black uppercase"
                    >
                       {loading ? 'Decrypting...' : 'Refresh Feed'}
                    </button>
                 </div>
              </div>
              
              <div className="space-y-4">
                 {requests.length > 0 ? (
                   requests.map(req => (
                    <div key={req.id} className="flex items-center justify-between p-6 rounded-3xl border border-white/5 hover:bg-white/5 transition-all group">
                       <div className="flex items-center gap-6">
                          <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center font-black text-brand uppercase text-xs">
                             {req.studentName.charAt(0)}
                          </div>
                          <div>
                             <p className="font-bold">{req.studentName} <span className="text-white/20 font-medium text-xs ml-2 italic">#{req.studentId.slice(-4).toUpperCase()}</span></p>
                             <p className="text-xs text-gray-500 uppercase font-black tracking-widest">{req.type} • {req.status}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                          <div className="text-right mr-4">
                             <p className="text-sm font-bold">{req.startDate}</p>
                             <p className="text-[10px] uppercase font-bold text-white/20">{new Date(req.appliedAt).toLocaleDateString()}</p>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             {req.status === 'pending' && (
                               <>
                                 <button onClick={() => handleStatusUpdate(req.id, 'approved')} className="p-2 rounded-full border border-green-500/50 text-green-500 hover:bg-green-500 hover:text-black transition-all">
                                    <CheckCircle2 className="w-4 h-4" />
                                 </button>
                                 <button onClick={() => handleStatusUpdate(req.id, 'rejected')} className="p-2 rounded-full border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-black transition-all">
                                    <XCircle className="w-4 h-4" />
                                 </button>
                               </>
                             )}
                          </div>
                       </div>
                    </div>
                   ))
                 ) : (
                    <div className="py-20 text-center opacity-20 italic">No activity detected in local vicinity</div>
                 )}
              </div>
           </div>
        </div>

        {/* Create Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-zinc-900 border border-white/10 p-10 rounded-[3rem] w-full max-w-2xl relative"
              >
                <button onClick={() => setShowCreateModal(false)} className="absolute top-8 right-8 text-white/40 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-8">Issue Direct Pass</h2>
                <form onSubmit={handleAdminCreateRequest} className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="text-[10px] font-black uppercase text-white/40 mb-2 block tracking-widest italic">Student Full Name</label>
                    <input name="studentName" required className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-brand outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-white/40 mb-2 block tracking-widest italic">Student ID / Roll</label>
                    <input name="studentId" required className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-brand outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-white/40 mb-2 block tracking-widest italic">Room Number</label>
                    <input name="studentRoom" required className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-brand outline-none" />
                  </div>
                  <div>
                     <label className="text-[10px] font-black uppercase text-white/40 mb-2 block tracking-widest italic">Pass Type</label>
                     <select name="type" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-brand outline-none appearance-none">
                       <option value="home">Home Leave</option>
                       <option value="local">Local Out-pass</option>
                       <option value="vacation">Vacation</option>
                     </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-white/40 mb-2 block tracking-widest italic">Start</label>
                      <input type="date" name="startDate" required className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-brand outline-none text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-white/40 mb-2 block tracking-widest italic">End</label>
                      <input type="date" name="endDate" required className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-brand outline-none text-xs" />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-black uppercase text-white/40 mb-2 block tracking-widest italic">Management Note / Reason</label>
                    <textarea name="reason" required className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-brand outline-none h-32" />
                  </div>
                  <div className="col-span-2 flex gap-4 pt-4">
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="flex-1 bg-white text-black py-5 rounded-full font-black uppercase tracking-widest text-sm hover:scale-[1.02] transition-transform disabled:opacity-50"
                    >
                      {isSubmitting ? 'Processing...' : 'Authorize and Issue'}
                    </button>
                    <button type="button" onClick={() => setShowCreateModal(false)} className="px-10 bg-white/5 border border-white/10 rounded-full font-black uppercase tracking-widest text-[10px]">Cancel</button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-8">
           <div className="glass rounded-[3rem] p-10">
              <h3 className="text-xl font-bold mb-8">Admin Quick Links</h3>
              <div className="grid gap-4">
                 {[
                    { label: 'Hostel Blocks', icon: Building2 },
                    { label: 'Warden Assignments', icon: Users },
                    { label: 'System Health', icon: ShieldCheck },
                    { label: 'Global Notifications', icon: Bell }
                 ].map((link, i) => (
                    <button key={i} className="w-full text-left p-6 glass rounded-2xl flex justify-between items-center group hover:border-brand/40 transition-colors">
                       <div className="flex items-center gap-4">
                          <link.icon className="w-5 h-5 text-gray-400 group-hover:text-brand transition-colors" />
                          <span className="font-bold">{link.label}</span>
                       </div>
                       <MoreHorizontal className="w-5 h-5 text-gray-600" />
                    </button>
                 ))}
              </div>
           </div>

           <div className="glass rounded-[3rem] p-10 bg-brand/5 border-brand/20 relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-brand/20 rounded-full blur-3xl" />
              <h3 className="text-lg font-bold mb-4">Export Reports</h3>
              <p className="text-sm text-gray-400 mb-8">Generate comprehensive monthly analytics and security audit reports.</p>
              <button className="w-full bg-brand text-dark font-bold py-4 rounded-2xl neon-glow">
                 Download PDF Audit
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
