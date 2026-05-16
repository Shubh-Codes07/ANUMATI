import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, QrCode, ShieldCheck, AlertCircle, 
  Clock, MapPin, Search, ArrowLeft, CheckCircle2,
  XCircle, List, User as UserIcon, LogOut
} from 'lucide-react';

import { User, LeaveRequest } from '../types';
import { LeaveService } from '../lib/leaveService';

const API_URL = `${import.meta.env.VITE_API_URL}/api`;

interface GuardPortalProps {
  onBack: () => void;
  user: User;
}

export default function GuardPortal({ onBack, user }: GuardPortalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<'success' | 'invalid' | null>(null);
  const [scannedRequest, setScannedRequest] = useState<LeaveRequest | null>(null);
  const [searchId, setSearchId] = useState('');
  const [logs, setLogs] = useState([
    { id: '1', name: 'Alex Rivera', type: 'EXIT', time: '10:42 AM', status: 'verified' },
    { id: '2', name: 'Sarah Jenkins', type: 'ENTRY', time: '09:15 AM', status: 'verified' },
    { id: '3', name: 'Unknown User', type: 'ALERT', time: '08:30 AM', status: 'invalid' },
  ]);

  const handleScan = async (requestId: string) => {
    setIsScanning(true);
    setScanResult(null);
    setScannedRequest(null);

    // Simulate network delay
    await new Promise(r => setTimeout(r, 1500));

    try {
      const request = await LeaveService.getRequestById(requestId);
      if (request && (request.status === 'approved' || request.status === 'active')) {
        setScannedRequest(request);
        setScanResult('success');
        
        // Log the activity
        const logType = request.status === 'approved' ? 'exit' : 'entry';
        const nextStatus = request.status === 'approved' ? 'active' : 'completed';
        
        await LeaveService.updateRequestStatus(requestId, nextStatus);
        
        const logEntry = {
          studentId: request.studentId,
          studentName: request.studentName,
          type: logType,
          timestamp: new Date().toISOString(),
          gate: 'Main Gate',
          verifiedBy: user.name
        };
        
        await fetch(API_URL + '/security-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logEntry)
        });
        
        // Local feedback
        setLogs(prev => [{
           id: Date.now().toString(),
           name: request.studentName,
           type: logType.toUpperCase() as any,
           time: new Date().toLocaleTimeString(),
           status: 'verified'
        }, ...prev]);

      } else {
        setScanResult('invalid');
      }
    } catch (error) {
      console.error("Scan processing failed:", error);
      setScanResult('invalid');
    } finally {
      setIsScanning(false);
    }
  };

  const toggleScan = () => {
    if (isScanning) return;
    setIsScanning(true);
    // In a real app, this would trigger the camera. 
    // For this prototype, we'll wait 3 seconds and then simulate a scan if searchId is used, 
    // or just fail if it's empty.
    setTimeout(() => {
      if (searchId) {
        handleScan(searchId);
      } else {
        setIsScanning(false);
        setScanResult('invalid');
      }
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-dark text-white flex flex-col md:max-w-md md:mx-auto md:border-x md:border-dark-border">
      {/* Header */}
      <div className="p-6 flex justify-between items-center glass border-none rounded-b-[2.5rem]">
        <h1 className="text-xl font-black tracking-tighter uppercase italic">Unit-7 Scan</h1>
        <button 
          onClick={onBack} 
          className="px-4 py-2 rounded-xl glass border-red-500/20 text-red-500 flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)]"
        >
          <span className="text-[10px] font-black uppercase tracking-widest">Logout</span>
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto pb-24">
        {/* Status Card */}
        <div className="glass p-5 rounded-3xl flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Main Gate Active</span>
           </div>
           <span className="text-xs font-medium text-gray-500">10 May • 10:45 AM</span>
        </div>

        {/* Scanner Area */}
        <div className="relative aspect-square bg-zinc-900 border border-white/10 rounded-[3rem] overflow-hidden flex flex-col items-center justify-center p-8">
           <AnimatePresence mode="wait">
             {isScanning ? (
               <motion.div 
                 key="scanning"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="w-full h-full relative"
               >
                 <div className="absolute inset-4 border-2 border-brand/30 rounded-3xl" />
                 <motion.div 
                   animate={{ top: ['10%', '90%'] }}
                   transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                   className="absolute left-6 right-6 h-[2px] bg-brand neon-glow z-10"
                 />
                 <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                    <Camera className="w-12 h-12 text-brand/40 animate-pulse" />
                    <p className="text-brand font-black text-xs tracking-widest uppercase italic">Decrypting Flow...</p>
                 </div>
               </motion.div>
             ) : (
               <motion.div 
                 key="idle"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="flex flex-col items-center gap-8"
               >
                 <div className="w-32 h-32 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10">
                    <QrCode className="w-16 h-16 text-white/20" />
                 </div>
                 <button 
                   onClick={toggleScan}
                   className="bg-white text-black px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-transform"
                 >
                    Initialize Scan
                 </button>
               </motion.div>
             )}
           </AnimatePresence>
        </div>

        {/* Scan Result Overlay (Simulated) */}
        <AnimatePresence>
          {scanResult && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`glass p-6 rounded-3xl border-2 ${
                scanResult === 'success' ? 'border-green-500/50' : 'border-red-500/50'
              }`}
            >
              <div className="flex items-center gap-4 mb-4">
                 {scanResult === 'success' ? (
                   <div className="w-12 h-12 rounded-2xl bg-green-500/20 text-green-500 flex items-center justify-center">
                      <CheckCircle2 className="w-7 h-7" />
                   </div>
                 ) : (
                   <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-500 flex items-center justify-center">
                      <XCircle className="w-7 h-7" />
                   </div>
                 )}
                 <div>
                    <h3 className="text-lg font-bold">{scanResult === 'success' ? 'Verification Successful' : 'Invalid Gateway Pass'}</h3>
                    <p className="text-xs text-gray-500">{scanResult === 'success' ? 'Access Granted' : 'Access Denied • Contact Warden'}</p>
                 </div>
              </div>

              {scanResult === 'success' && scannedRequest && (
                <div className="glass bg-white/5 p-4 rounded-2xl flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                         <UserIcon className="w-4 h-4 text-gray-400" />
                      </div>
                      <span className="text-sm font-semibold">{scannedRequest.studentName}</span>
                   </div>
                   <span className="text-[10px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded uppercase">{scannedRequest.status === 'approved' ? 'EXIT' : 'ENTRY'}</span>
                </div>
              )}

              <button 
                onClick={() => setScanResult(null)}
                className="w-full mt-6 py-3 text-sm font-bold text-gray-500 uppercase tracking-widest"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Logs */}
        <div>
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-lg font-bold">Today's Logs</h3>
             <List className="w-5 h-5 text-gray-500" />
          </div>
          <div className="space-y-3">
             {logs.map(log => (
               <div key={log.id} className="glass p-4 rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                       log.status === 'verified' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                     }`}>
                        <Clock className="w-5 h-5" />
                     </div>
                     <div>
                        <p className="text-sm font-bold">{log.name}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{log.type} • {log.time}</p>
                     </div>
                  </div>
                  <CheckCircle2 className={`w-5 h-5 ${log.status === 'verified' ? 'text-green-500' : 'text-red-500'}`} />
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Manual Entry Search */}
      <form 
        onSubmit={(e) => { e.preventDefault(); handleScan(searchId); }}
        className="p-6 sticky bottom-0 z-20 glass border-none rounded-t-[2.5rem]"
      >
         <div className="glass p-3 rounded-2xl flex items-center gap-3">
            <Search className="w-5 h-5 text-gray-500" />
            <input 
              type="text" 
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Enter Request ID for scan simulation..." 
              className="bg-transparent border-none outline-none text-sm w-full" 
            />
            {searchId && (
              <button type="submit" className="text-brand font-black text-[10px] uppercase italic">Verify</button>
            )}
         </div>
      </form>
    </div>
  );
}
