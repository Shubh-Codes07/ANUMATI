import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, Home, ShieldCheck, MapPin, 
  Phone, AlertTriangle, ArrowLeft, CheckCircle2,
  Clock, ArrowUpRight, LogOut, Plus, X, ClipboardList
} from 'lucide-react';

import { User, LeaveRequest } from '../types';
import { LeaveService } from '../lib/leaveService';

interface ParentPortalProps {
  onBack: () => void;
  user: User;
}

export default function ParentPortal({ onBack, user }: ParentPortalProps) {
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApplyLeave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    const request: Omit<LeaveRequest, 'id'> = {
      studentId: "STUDENT-ALEX-RIVERA", // Mocking the ward id for now
      studentName: "Alex Rivera",
      studentRoom: "B-204",
      type: formData.get('type') as any,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      reason: formData.get('reason') as string,
      status: 'pending',
      appliedAt: new Date().toISOString(),
      appliedBy: 'parent',
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

  const notifications = [
    { title: 'Leave Approved', time: '2 hours ago', desc: 'Home leave for Alex Rivera from May 10-12 has been approved.', type: 'approval' },
    { title: 'Gate Exit Logged', time: '1 hour ago', desc: 'Alex Rivera exited Gate B at 10:42 AM.', type: 'tracking' },
    { title: 'Emergency Alert', time: 'Last Week', desc: 'Hostel block maintenance scheduled.', type: 'alert' },
  ];

  return (
    <div className="min-h-screen bg-dark flex flex-col md:max-w-md md:mx-auto md:border-x md:border-dark-border">
      <header className="p-6 flex justify-between items-center glass border-none rounded-b-[2.5rem]">
        <h1 className="text-xl font-black tracking-tighter uppercase italic">Parent Panel</h1>
        <button 
          onClick={onBack} 
          className="px-4 py-2 rounded-xl glass border-red-500/20 text-red-500 flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all"
        >
          <span className="text-[10px] font-black uppercase tracking-widest">Logout</span>
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 p-6 space-y-8 overflow-y-auto pb-24">
        {/* Student Status Card */}
        <div className="bg-zinc-900 border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden">
           <div className="flex justify-between items-start mb-8">
              <div>
                 <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1 italic">Active Transit</p>
                 <h2 className="text-4xl font-black tracking-tighter uppercase italic">Alex Rivera</h2>
              </div>
              <span className="text-[10px] font-black px-3 py-1 rounded-full bg-[#00E5FF] text-black uppercase italic">External</span>
           </div>
           
           <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                 <MapPin className="w-5 h-5 text-brand" />
                 <span className="text-gray-300">Currently off-campus</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                 <Clock className="w-5 h-5 text-brand" />
                 <span className="text-gray-300">Expected return: 12 May, 08:00 PM</span>
              </div>
           </div>

           <button 
             onClick={() => setShowApplyModal(true)}
             className="w-full mt-8 bg-brand text-dark py-5 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:scale-[1.02] transition-transform"
           >
              <Plus className="w-5 h-5" /> Request Ward Out-pass
           </button>
        </div>

        {/* Notifications */}
        <div>
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Live Activity</h3>
              <button className="text-brand text-xs font-bold uppercase tracking-widest">Mark All Read</button>
           </div>
           <div className="space-y-4">
              {notifications.map((note, i) => (
                <div key={i} className="glass p-6 rounded-3xl group cursor-pointer hover:border-brand/40 transition-colors">
                   <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                           note.type === 'approval' ? 'bg-green-500/10 text-green-500' : 
                           note.type === 'tracking' ? 'bg-brand/10 text-brand' : 'bg-red-500/10 text-red-500'
                         }`}>
                            {note.type === 'approval' ? <CheckCircle2 className="w-6 h-6" /> : 
                             note.type === 'tracking' ? <MapPin className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                         </div>
                         <h4 className="font-bold">{note.title}</h4>
                      </div>
                      <span className="text-[10px] text-gray-500 uppercase font-bold">{note.time}</span>
                   </div>
                   <p className="text-sm text-gray-400 mb-4 leading-relaxed">{note.desc}</p>
                   {note.type === 'tracking' && (
                     <button className="text-brand text-xs font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                        View Log Details <ArrowUpRight className="w-4 h-4" />
                     </button>
                   )}
                </div>
              ))}
           </div>
        </div>

        {/* Emergency Card */}
        <button className="w-full bg-red-500/10 border border-red-500/30 p-8 rounded-[2.5rem] flex items-center justify-between text-left group">
           <div>
              <h4 className="text-red-500 font-black uppercase italic text-xl tracking-tighter">Emergency SOS</h4>
              <p className="text-[10px] text-red-500/70 font-black uppercase italic">Alerting Command Center</p>
           </div>
           <div className="w-14 h-14 bg-red-500 rounded-3xl flex items-center justify-center neon-glow group-hover:scale-110 transition-transform">
              <AlertTriangle className="text-black w-8 h-8" />
           </div>
        </button>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 md:max-w-md md:mx-auto glass border-t-0 rounded-t-[2.5rem] px-10 py-6 flex justify-around items-center">
         <Home className="w-6 h-6 text-brand" />
         <Bell className="w-6 h-6 text-gray-600" />
         <div className="w-12 h-12 rounded-full border-2 border-dark-border p-1">
            <div className="w-full h-full bg-brand-muted rounded-full" />
         </div>
      </nav>

      <AnimatePresence>
        {showApplyModal && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            className="fixed inset-0 z-[60] bg-dark px-6 pt-12 pb-6 md:max-w-md md:mx-auto"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter">Request Out-pass</h2>
              <button onClick={() => setShowApplyModal(false)} className="w-10 h-10 rounded-xl glass flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-white/30 uppercase mb-2 block tracking-widest italic">Pass Type</label>
                <select name="type" className="w-full glass bg-transparent rounded-xl p-4 text-xs font-bold focus:border-brand/40 outline-none">
                  <option value="home">Home Leave</option>
                  <option value="local">Local Out-pass</option>
                  <option value="vacation">Vacation</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-white/30 uppercase mb-2 block tracking-widest italic">Start Date</label>
                  <input type="date" name="startDate" required className="w-full glass bg-transparent rounded-xl p-4 text-xs font-bold focus:border-brand/40 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-white/30 uppercase mb-2 block tracking-widest italic">End Date</label>
                  <input type="date" name="endDate" required className="w-full glass bg-transparent rounded-xl p-4 text-xs font-bold focus:border-brand/40 outline-none" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-white/30 uppercase mb-2 block tracking-widest italic">Parent Reason</label>
                <textarea name="reason" required className="w-full glass bg-transparent rounded-2xl p-4 text-sm focus:outline-none min-h-[120px]" placeholder="Reason for ward's travel..." />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-white text-black font-black uppercase py-5 rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform text-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Transmitting...' : 'Authorize Request'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
