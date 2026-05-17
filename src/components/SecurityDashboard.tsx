import React, { useEffect, useState } from 'react';
import ScanModal from './ScanModal';
import { LeaveService } from '../lib/leaveService';
import { SecurityLog, LeaveRequest, User } from '../types';

interface SecurityDashboardProps {
  onBack: () => void;
  user: User;
}

export default function SecurityDashboard({ onBack, user }: SecurityDashboardProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [lastScanned, setLastScanned] = useState<LeaveRequest | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    let unsub: any;
    try {
      unsub = LeaveService.subscribeToSecurityLogs((l: any) => {
        setLogs(prev => [l, ...prev].slice(0, 200));
        setToast(`${l.studentName} • ${l.type.toUpperCase()}`);
        setTimeout(() => setToast(null), 3500);
      });
    } catch (e) {}
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const s = await LeaveService.getSecurityLogs();
    setLogs(s || []);
  };

  const handleFound = async (code: string) => {
    // Debounce: prevent processing if already processing
    if (isProcessing) {
      console.log('⏳ Scan in progress, ignoring duplicate...');
      return;
    }

    // Set processing flag
    setIsProcessing(true);

    try {
      // try to find leave by QR or id
      // Handle the GF-PASS- prefix from student portal
      let searchCode = code;
      if (code.startsWith('GF-PASS-')) {
        searchCode = code.replace('GF-PASS-', '');
      }

      const req = await LeaveService.getRequestByQr(code) || 
                  await LeaveService.getRequestByQr(searchCode) || 
                  await LeaveService.getRequestById(searchCode);
                  
      if (!req) {
        alert('No leave request matched this code');
      } else {
        setLastScanned(req);
      }
    } catch (error) {
      console.error('Scan error:', error);
      alert('Error processing scan');
    } finally {
      // Reset processing flag after 4 seconds (4000ms)
      setTimeout(() => {
        setIsProcessing(false);
      }, 4000);
    }
  };

  const recordLog = async (req: LeaveRequest, type: 'entry' | 'exit') => {
    try {
      // Determine log type based on pass type
      // Entry passes are logged as 'IN', others as 'OUT'
      const logType = req.type === 'Entry' ? 'IN' : 'OUT';

      // update leave status
      const nextStatus = type === 'exit' ? 'active' : 'approved';
      await LeaveService.updateRequestStatus(req.id, nextStatus);

      // create security log
      const logEntry = {
        studentId: req.studentId,
        studentName: req.studentName,
        type: logType,
        timestamp: new Date().toISOString(),
        gate: 'Main Gate',
        verifiedBy: user.name
      };

      await fetch(`${import.meta.env.VITE_API_URL}/api/security-logs`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logEntry)
      });

      setLastScanned(null);
      await loadLogs();
    } catch (error) {
      console.error('Record log failed', error);
    }
  };

  return (
    <div className="min-h-screen bg-dark text-white flex flex-col md:max-w-2xl md:mx-auto">
      <div className="p-6 flex justify-between items-center glass rounded-b-[2.5rem]">
        <div className="flex items-center gap-2">
          <img src="/logo.jpeg" alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
          <h1 className="text-xl font-black">Security Console</h1>
        </div>
        <button onClick={onBack} className="px-4 py-2 rounded-xl glass text-red-400">Logout</button>
      </div>

      <div className="p-6 space-y-6">
        <div className="glass p-6 rounded-2xl flex items-center justify-between">
          <div>
            <h3 className="font-black">Main Gate Scanner</h3>
            <p className="text-white/40 text-xs">Use camera to scan QR or enter code manually</p>
          </div>
          <div>
            <button onClick={() => setShowScanner(true)} className="bg-white text-black px-6 py-3 rounded-2xl font-black">Open Scanner</button>
          </div>
        </div>

        {lastScanned && (
          <div className="glass p-4 rounded-2xl">
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="font-bold">{lastScanned.studentName}</p>
                <p className="text-xs text-white/40">{lastScanned.studentRoom} • {lastScanned.type}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => recordLog(lastScanned, 'entry')} className="px-4 py-2 rounded-2xl bg-white/5">IN</button>
                <button onClick={() => recordLog(lastScanned, 'exit')} className="px-4 py-2 rounded-2xl bg-red-500 text-white">OUT</button>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-white/40">Reason</p>
              <p className="font-medium">{lastScanned.reason}</p>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-lg font-bold mb-4">Recent Security Logs</h3>
          <div className="space-y-3">
            {logs.slice(0,10).map(l => (
              <div key={l.id} className="bg-zinc-900 p-3 rounded-xl flex justify-between">
                <div>
                  <p className="font-bold">{l.studentName}</p>
                  <p className="text-xs text-white/40">{new Date(l.timestamp).toLocaleString()} • {l.gate}</p>
                </div>
                <div className="text-red-400 font-black uppercase text-sm">{l.type}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-8 right-8 bg-black/80 text-white px-4 py-2 rounded-full shadow-lg">
          <div className="font-bold text-sm">{toast}</div>
        </div>
      )}

      {showScanner && (
        <ScanModal onClose={() => setShowScanner(false)} onFound={(code) => { setShowScanner(false); handleFound(code); }} />
      )}
    </div>
  );
}
