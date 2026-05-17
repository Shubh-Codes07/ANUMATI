import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, ClipboardList, AlertCircle, Search, Filter, 
  CheckCircle2, XCircle, MoreVertical, LayoutDashboard,
  LogOut, Settings, PieChart as PieChartIcon, Database, MapPin, 
  ShieldCheck, Plus, UserCircle, Phone, Home, Building
} from 'lucide-react';
import { 
  BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, Legend 
} from 'recharts';
import { User, LeaveRequest, SecurityLog } from '../types';
import ScanModal from './ScanModal';
import { LeaveService } from '../lib/leaveService';
import { UserService } from '../lib/userService';

interface WardenDashboardProps {
  onBack: () => void;
  user: User;
}

export default function WardenDashboard({ onBack, user }: WardenDashboardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedReq, setSelectedReq] = useState<LeaveRequest | null>(null);
  const [pendingStatusAction, setPendingStatusAction] = useState<LeaveRequest['status'] | null>(null);

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'students' | 'analytics'>('pending');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    loadStudents();
    loadRequests();
    loadSecurityLogs();
  }, [activeTab]);

  // Load data on initial component mount
  React.useEffect(() => {
    loadStudents();
    loadRequests();
    loadSecurityLogs();
  }, []);

  const loadSecurityLogs = async () => {
    try {
      const logs = await LeaveService.getSecurityLogs();
      setSecurityLogs(logs || []);
    } catch (error) {
      console.error('Load security logs failed:', error);
    }
  };

  React.useEffect(() => {
    // subscribe to live security logs via SSE/fallback
    const unsub = LeaveService.subscribeToSecurityLogs((l: any) => {
      setSecurityLogs(prev => [l, ...prev]);
      setToast(`${l.studentName} • ${l.type.toUpperCase()}`);
      setTimeout(() => setToast(null), 3000);
    });
    return () => unsub && unsub();
  }, []);

  const handleScanFound = async (code: string) => {
    try {
      // Handle the GF-PASS- prefix from student portal
      let searchCode = code;
      if (code.startsWith('GF-PASS-')) {
        searchCode = code.replace('GF-PASS-', '');
      }

      const req = await LeaveService.getRequestByQr(code) || 
                  await LeaveService.getRequestByQr(searchCode) || 
                  await LeaveService.getRequestById(searchCode);
                  
      if (req) {
        setSelectedReq(req);
      } else {
        alert('No request matched the scanned code.');
      }
    } catch (error) {
      console.error('Scan handling failed', error);
    } finally {
      setShowScanner(false);
    }
  };

  const loadRequests = async () => {
    setLoading(true);
    try {
      let data;
      if (activeTab === 'pending') {
        data = await LeaveService.getAllPendingRequests();
      } else {
        data = await LeaveService.getAllRequests();
      }
      setRequests(data || []);
      // refresh security logs alongside requests
      loadSecurityLogs();
    } catch (error) {
      console.error("Load requests failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await UserService.getAllStudents();
      setStudents(data);
    } catch (error) {
      console.error("Load students failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const isStudentOnLeave = useCallback((studentId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return requests.some(r => {
      if (r.studentId !== studentId || (r.status !== 'approved' && r.status !== 'active')) return false;
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return today >= start && today <= end;
    });
  }, [requests]);

  const getStudentStats = (studentId: string) => {
    const studentRequests = requests.filter(r => r.studentId === studentId);
    return {
      total: studentRequests.length,
      approved: studentRequests.filter(r => r.status === 'approved' || r.status === 'active' || r.status === 'completed').length,
      rejected: studentRequests.filter(r => r.status === 'rejected').length
    };
  };

  const hasLeftCampus = useCallback((studentId: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return securityLogs.some(l => {
      if (l.studentId !== studentId) return false;
      if (l.type !== 'OUT') return false;
      const t = new Date(l.timestamp);
      t.setHours(0,0,0,0);
      return t.getTime() === today.getTime();
    });
  }, [securityLogs]);

  const analyticsData = useMemo(() => {
    const totalApplications = requests.length;
    const approved = requests.filter(r => r.status === 'approved' || r.status === 'active' || r.status === 'completed').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    
    const onLeaveCount = students.filter(s => isStudentOnLeave(s.id)).length;
    const totalStudentsCount = students.length || 0;
    const inHostel = totalStudentsCount > 0 ? totalStudentsCount - onLeaveCount : 0;

    // Count IN and OUT from security logs
    const inCount = securityLogs.filter(l => l.type === 'IN').length;
    const outCount = securityLogs.filter(l => l.type === 'OUT').length;

    return [
      { name: 'Total Applications Received', value: totalApplications, color: '#00E5FF' },
      { name: 'Approved', value: approved, color: '#00E676' },
      { name: 'Rejected', value: rejected, color: '#FF1744' },
      { name: 'Campus Entries (IN)', value: inCount, color: '#0066FF' },
      { name: 'Campus Exits (OUT)', value: outCount, color: '#FF6600' },
      { name: 'Students in Hostel', value: Math.max(0, inHostel), color: '#8884d8' },
    ];
  }, [requests, students, isStudentOnLeave, securityLogs]);

  const pieChartData = useMemo(() => {
    const onLeaveCount = students.filter(s => isStudentOnLeave(s.id)).length;
    const totalStudentsCount = students.length || 0;
    const inHostel = totalStudentsCount > 0 ? totalStudentsCount - onLeaveCount : 0;

    return [
      { name: 'Total Students', value: totalStudentsCount, color: '#00E5FF' },
      { name: 'Students Out', value: onLeaveCount, color: '#FF1744' },
      { name: 'Students In Hostel', value: inHostel, color: '#00E676' },
    ];
  }, [students, isStudentOnLeave]);

  const handleAddStudent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const newStudent = {
      name: fd.get('name') as string,
      email: fd.get('email') as string,
      department: fd.get('department') as string,
      roomNumber: fd.get('roomNumber') as string,
      phone: fd.get('phone') as string,
      usn: fd.get('usn') as string,
    };
    try {
      await UserService.createStudent(newStudent);
      (e.target as HTMLFormElement).reset();
      loadStudents();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Remove this student from the registry?')) return;
    await UserService.deleteUser(studentId);
    loadStudents();
  };

  const handleWipeAll = async () => {
    setIsSubmitting(true);
    try {
      await UserService.wipeAllStudents();
      // Reset state variables
      setStudents([]);
      setRequests([]);
      setSecurityLogs([]);
      setConfirmWipe(false);
    } catch (error) {
      console.error('Wipe failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWardenApplyLeave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    // Find selected student data
    const studentId = formData.get('studentId') as string;
    const student = students.find(s => s.id === studentId);

    if (!student) {
      alert("Please select a valid student from the record.");
      setIsSubmitting(false);
      return;
    }
    
    const request: Omit<LeaveRequest, 'id'> = {
      studentId: student.id,
      studentName: student.name,
      studentRoom: student.roomNumber || 'N/A',
      type: formData.get('type') as any,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      reason: formData.get('reason') as string,
      status: 'approved', // Warden applications auto-approved
      appliedAt: new Date().toISOString(),
      appliedBy: 'warden',
      approvedBy: user.id,
      qrCode: `ANUMATI-W-${student.id}-${Date.now()}`
    };

    try {
      await LeaveService.applyLeave(request);
      setShowApplyModal(false);
      loadRequests();
    } catch (error) {
      console.error("Warden apply leave failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (requestId: string, status: LeaveRequest['status']) => {
    try {
      const request = requests.find(r => r.id === requestId);
      const student = students.find(s => s.id === request?.studentId);
      
      const qrCode = status === 'approved' ? `ANUMATI-${requestId}-${Date.now()}` : undefined;
      await LeaveService.updateRequestStatus(requestId, status, user.id, qrCode);
      
      // Simulate Parent Notification
      if (student?.parentPhone) {
        console.log(`[SMS GATEWAY] Notifying parent at ${student.parentPhone}: Leave request for ${student.name} has been ${status.toUpperCase()} by Warden.`);
      }

      setSelectedReq(null);
      setPendingStatusAction(null);
      loadRequests();
    } catch (error) {
      console.error("Status update failed:", error);
    }
  };

  const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
    <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl">
      <div className="flex justify-between items-start mb-4">
        <div className={`text-white/40 text-[11px] uppercase tracking-wider font-bold`}>{title}</div>
        <div className="p-2 rounded-xl bg-white/5 text-white/40">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <div className={`text-4xl font-black tracking-tighter ${color || 'text-white'}`}>{value}</div>
        {trend && (
           <div className={`text-[10px] font-bold mt-2 ${trend.includes('+') ? 'text-green-400' : 'text-red-400 italic'}`}>
             {trend} {trend.includes('+') ? 'vs Yesterday' : ''}
           </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-dark flex">
      {/* Sidebar */}
      <aside className="w-72 border-r border-dark-border hidden lg:flex flex-col p-8 space-y-8 glass rounded-r-[3rem]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center overflow-hidden">
              <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-2xl font-display font-bold">ANU<span className="text-brand">MATI</span></span>
          </div>
          <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] italic mb-1">
            {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
          <p className="text-lg font-black text-brand italic tracking-tighter uppercase leading-none">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
        
        <div className="mb-12">
          <h3 className="text-xl font-bold italic uppercase tracking-tighter mb-4">Recent Departures</h3>
          <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl">
            {securityLogs && securityLogs.filter(l => l.type === 'OUT').slice(0,5).length === 0 ? (
              <p className="text-white/40 text-sm">No departures recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {securityLogs.filter(l => l.type === 'OUT').slice(0,5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg">
                    <div>
                      <p className="font-bold">{log.studentName}</p>
                      <p className="text-[10px] text-white/40">{new Date(log.timestamp).toLocaleString()} • {log.gate}</p>
                    </div>
                    <div className="text-sm font-black text-red-400 uppercase">Left</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { icon: LayoutDashboard, label: 'Overview', id: 'pending', active: activeTab === 'pending' },
            { icon: ClipboardList, label: 'Control Center', id: 'all', active: activeTab === 'all' },
            { icon: Users, label: 'Student Records', id: 'students', active: activeTab === 'students' },
            { icon: PieChartIcon, label: 'Analytics', id: 'analytics', active: activeTab === 'analytics' },
          ].map((item, i) => (
            <button 
              key={i} 
              onClick={() => item.id && setActiveTab(item.id as any)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                item.active ? 'bg-brand text-dark font-bold' : 'text-gray-400 hover:bg-dark-surface'
              }`}
            >
              <div className="flex items-center gap-4">
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </div>
            </button>
          ))}
        </nav>

        <div className="space-y-4 pt-8 border-t border-dark-border">
          <button onClick={() => setShowSettings(true)} className="w-full flex items-center gap-4 p-4 text-gray-400 hover:text-white transition-colors rounded-2xl hover:bg-dark-surface">
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
          <button onClick={onBack} className="w-full flex items-center gap-4 p-4 text-red-400 hover:bg-red-500/10 rounded-2xl transition-all">
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-12 bg-dark">
        {/* Top Header */}
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-black tracking-tighter italic uppercase">Warden Console</h1>
            <p className="text-white/40 text-sm font-medium">Block B Management • Good Morning, {user.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative glass rounded-2xl p-3 flex items-center gap-3 w-64 hidden sm:flex">
              <Search className="w-5 h-5 text-gray-500" />
              <input type="text" placeholder="Search student ID..." className="bg-transparent border-none outline-none text-sm w-full" />
            </div>
            <button onClick={() => setShowScanner(true)} className="bg-white text-black px-4 py-2 rounded-2xl font-black">Scan</button>
            <button onClick={onBack} className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-all hover:text-red-500">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard title="Hostel Occupancy" value="84%" icon={Users} trend="+2%" />
          <StatCard title="Active Passes" value={requests.filter(r => r.status === 'approved' || r.status === 'active').length.toString()} icon={CheckCircle2} trend="+12%" />
          <StatCard title="Security Status" value="SAFE" icon={ShieldCheck} trend="STABLE" color="text-green-500" />
          <div className="bg-brand rounded-2xl p-6 flex flex-col justify-between shadow-[0_10px_30px_rgba(59,130,246,0.3)] group hover:scale-[1.02] transition-transform cursor-pointer" onClick={() => setShowApplyModal(true)}>
            <div className="flex justify-between items-start">
              <span className="text-dark font-black uppercase text-[10px] tracking-widest italic">Action Required</span>
              <Plus className="w-5 h-5 text-dark" />
            </div>
            <div>
              <p className="text-dark font-black text-2xl uppercase italic leading-none">Apply Student Leave</p>
              <p className="text-dark/60 text-[10px] font-bold uppercase mt-2">Warden Overwrite Active</p>
            </div>
          </div>
        </div>

        {/* Dynamic Tab Content */}
        {activeTab === 'analytics' ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-zinc-900 border border-white/10 p-10 rounded-[3rem]">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-8">Student Distribution</h3>
                <div className="h-[400px] w-full">
                  {pieChartData.reduce((sum, d) => sum + d.value, 0) === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-white/40 text-sm">No student data available</p>
                        <p className="text-white/20 text-xs mt-2">Add students to see the distribution chart</p>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '16px' }}
                          itemStyle={{ fontWeight: 'bold' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="bg-zinc-900 border border-white/10 p-10 rounded-[3rem]">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-8">System Health</h3>
                <div className="space-y-6">
                  {analyticsData.map((data, i) => (
                    <div key={i} className="flex justify-between items-center p-6 bg-white/[0.02] rounded-3xl border border-white/5">
                      <div className="flex items-center gap-4">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: data.color }} />
                        <span className="text-white/60 font-bold uppercase tracking-widest text-xs">{data.name}</span>
                      </div>
                      <span className="text-2xl font-black">{data.value}</span>
                    </div>
                  ))}
                  <div className="pt-6 border-t border-white/10">
                    <p className="text-[10px] text-white/30 font-black uppercase tracking-widest text-center">Data refreshed in real-time from central registry</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'students' ? (
          <div className="bg-zinc-900 border border-white/10 rounded-[3rem] overflow-hidden">
            <div className="p-10 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter">Student Registry</h3>
                <p className="text-white/40 text-xs mt-1">Total Verified Residents: {students.length}</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={loadStudents}
                  className="bg-white/5 border border-white/10 text-white/60 px-6 py-2 rounded-full text-xs font-bold uppercase hover:text-white"
                >
                  Sync Database
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-10">
              {students.map(student => (
                <div key={student.id} onClick={async () => {
                  const fullData = await UserService.getUserById(student.id);
                  setSelectedStudent(fullData || student);
                }} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] hover:border-brand/40 transition-all cursor-pointer group">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center overflow-hidden">
                      {student.avatar ? (
                        <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <UserCircle className="w-8 h-8 text-brand" />
                      )}
                    </div>
                    {hasLeftCampus(student.id) ? (
                        <span className="bg-red-500 text-white text-[8px] font-black uppercase px-2 py-1 rounded-full animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]">Left Campus</span>
                      ) : isStudentOnLeave(student.id) ? (
                        <span className="bg-red-500 text-white text-[8px] font-black uppercase px-2 py-1 rounded-full animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]">On Leave</span>
                      ) : (
                        <span className="bg-green-500/10 text-green-500 text-[8px] font-black uppercase px-2 py-1 rounded-full border border-green-500/20">In Hostel</span>
                      )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-lg font-black italic uppercase leading-none">{student.name}</h4>
                      <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Room: {student.roomNumber || 'N/A'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                       <div className="bg-white/[0.03] p-2 rounded-xl border border-white/5">
                          <p className="text-[7px] text-white/20 font-black uppercase">Dept</p>
                          <p className="text-[10px] font-bold truncate">{student.department || 'N/A'}</p>
                       </div>
                       <div className="bg-white/[0.03] p-2 rounded-xl border border-white/5">
                          <p className="text-[7px] text-white/20 font-black uppercase">USN</p>
                          <p className="text-[10px] font-bold truncate">{student.usn || 'PENDING'}</p>
                       </div>
                    </div>
                    <div className="pt-4 border-t border-white/5 grid grid-cols-3 gap-2">
                       {(() => {
                         const stats = getStudentStats(student.id);
                         return (
                           <>
                             <div className="text-center">
                               <p className="text-[7px] text-white/20 font-black uppercase">Total</p>
                               <p className="text-xs font-black text-white/60 tracking-tighter">{stats.total}</p>
                             </div>
                             <div className="text-center">
                               <p className="text-[7px] text-green-500/40 font-black uppercase">Appr</p>
                               <p className="text-xs font-black text-green-500/60 tracking-tighter">{stats.approved}</p>
                             </div>
                             <div className="text-center">
                               <p className="text-[7px] text-red-500/40 font-black uppercase">Rejt</p>
                               <p className="text-xs font-black text-red-500/60 tracking-tighter">{stats.rejected}</p>
                             </div>
                           </>
                         );
                       })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden">
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
               <h3 className="text-xl font-bold italic uppercase tracking-tighter">
                 {activeTab === 'pending' ? 'Pending Approval Queue' : 'Central Management Console'}
               </h3>
               <div className="flex gap-3">
                  <button className="bg-white/5 border border-white/10 px-4 py-2 rounded-full text-xs font-bold text-white/60 hover:text-white transition-colors">
                     Filter Feed
                  </button>
                  <button 
                    onClick={loadRequests}
                    className="bg-white text-black px-6 py-2 rounded-full text-xs font-black uppercase"
                  >
                     {loading ? 'Refreshing...' : 'Refresh Queue'}
                  </button>
               </div>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-white/30 uppercase text-[10px] font-black tracking-widest">
                  <th className="px-8 py-4">Student Profile</th>
                  <th className="px-8 py-4">Type</th>
                  <th className="px-8 py-4">Duration</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {requests.map((req) => {
                   const student = students.find(s => s.id === req.studentId);
                   return (
                   <tr key={req.id} className="hover:bg-white/5 transition-colors cursor-pointer group">
                     <td className="px-8 py-6">
                       <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center font-black text-brand uppercase text-xs overflow-hidden">
                           {student?.avatar ? (
                             <img src={student.avatar} alt={req.studentName} className="w-full h-full object-cover" />
                           ) : (
                             req.studentName.charAt(0)
                           )}
                         </div>
                        <div>
                          <p className="font-bold">{req.studentName}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-white/40 font-bold tracking-tighter">ROLL: #{req.studentId.slice(-6).toUpperCase()}</p>
                            <span className={`text-[8px] font-black uppercase px-1 rounded-sm border ${
                              req.appliedBy === 'parent' ? 'border-purple-500/30 text-purple-500 bg-purple-500/5' : 'border-brand/30 text-brand bg-brand/5'
                            }`}>
                              {req.appliedBy || 'STUDENT'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm text-white/70 italic uppercase">{req.type}</td>
                    <td className="px-8 py-6">
                      {(() => {
                        const start = new Date(req.startDate);
                        const end = new Date(req.endDate);
                        const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                        return (
                          <>
                            <p className="text-sm font-bold">{days} {days === 1 ? 'Day' : 'Days'}</p>
                            <p className="text-[10px] text-white/40 font-bold uppercase">{req.startDate} → {req.endDate}</p>
                          </>
                        );
                      })()}
                    </td>
                    <td className="px-8 py-6">
                      <span className={`text-[10px] font-black italic px-2 py-1 rounded uppercase border ${
                        req.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                        req.status === 'approved' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                        req.status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                        'bg-blue-500/10 text-blue-500 border-blue-500/20'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-3 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setSelectedReq(req)} 
                          className="w-full h-8 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all gap-2 px-4"
                        >
                           <Search className="w-3 h-3" />
                           <span className="text-[10px] font-black uppercase tracking-widest">Review</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                   );
                 })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Student Record Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <div
            className="fixed inset-0 z-[60] bg-dark/80 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setSelectedStudent(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-[4rem] border-brand/10 w-full max-w-xl p-10 relative overflow-y-auto max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                <Users className="w-48 h-48" />
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                className="absolute top-6 right-6 z-10 w-12 h-12 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-all"
              >
                <XCircle className="w-6 h-6" />
              </button>

              <div className="flex flex-col items-center mb-8 text-center">
                <div className="w-28 h-28 rounded-[2.5rem] bg-brand/10 border border-brand/20 p-2 mb-4">
                  <div className="w-full h-full rounded-[2rem] bg-brand/20 flex items-center justify-center overflow-hidden">
                    {selectedStudent.avatar ? <img src={selectedStudent.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <Users className="w-10 h-10 text-brand" />}
                  </div>
                </div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-1">{selectedStudent.name}</h2>
                <p className="text-brand font-bold uppercase tracking-[0.3em] text-xs">Resident ID: {selectedStudent.usn || selectedStudent.id.slice(0, 10).toUpperCase()}</p>
                <div className="flex gap-6 mt-6">
                  {(() => {
                    const stats = getStudentStats(selectedStudent.id);
                    return (
                      <>
                        <div className="text-center"><p className="text-[10px] text-white/20 font-black uppercase tracking-widest mb-1">Total</p><p className="text-2xl font-black text-white tracking-tighter">{stats.total}</p></div>
                        <div className="text-center"><p className="text-[10px] text-green-500/40 font-black uppercase tracking-widest mb-1">Approved</p><p className="text-2xl font-black text-green-500 tracking-tighter">{stats.approved}</p></div>
                        <div className="text-center"><p className="text-[10px] text-red-500/40 font-black uppercase tracking-widest mb-1">Rejected</p><p className="text-2xl font-black text-red-500 tracking-tighter">{stats.rejected}</p></div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { icon: Building, label: 'Department', value: selectedStudent.department || 'N/A' },
                  { icon: Home, label: 'Room Number', value: selectedStudent.roomNumber || 'Not Assigned' },
                  { icon: Phone, label: 'Contact No', value: selectedStudent.phone || 'N/A' },
                  { icon: MapPin, label: 'Address', value: selectedStudent.address || 'N/A', full: true },
                ].map((detail, i) => (
                  <div key={i} className={`p-5 bg-white/[0.03] border border-white/5 rounded-3xl ${detail.full ? 'col-span-2' : ''}`}>
                    <div className="flex items-center gap-2 mb-2 opacity-50">
                      <detail.icon className="w-3 h-3 text-brand" />
                      <span className="text-[9px] font-black uppercase tracking-widest">{detail.label}</span>
                    </div>
                    <p className="text-sm font-bold text-white/80">{detail.value}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/5 pt-6">
                <h4 className="text-sm font-black uppercase text-white/40 mb-3">Audit Trail</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {securityLogs.filter(l => l.studentId === selectedStudent.id).slice(0, 6).map((l) => (
                    <div key={l.id} className="p-3 bg-white/[0.02] rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm">{l.type.toUpperCase()}</div>
                        <div className="text-xs text-white/40">{new Date(l.timestamp).toLocaleString()} • {l.gate}</div>
                      </div>
                      <div className="text-[10px] font-black text-white/60">By: {l.verifiedBy || '—'}</div>
                    </div>
                  ))}
                  {securityLogs.filter(l => l.studentId === selectedStudent.id).length === 0 && (
                    <div className="text-xs text-white/40 py-4 text-center">No recent audit entries for this student.</div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                className="mt-6 w-full bg-white/5 border border-white/10 text-white/40 py-4 rounded-3xl font-black uppercase tracking-[0.3em] text-xs hover:bg-white/10 transition-all"
              >
                Close Record
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Apply Leave Modal */}
      <AnimatePresence>
        {showApplyModal && (
          <div className="fixed inset-0 z-[60] bg-dark/80 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass rounded-[4rem] w-full max-w-2xl p-12 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter">Warden Overwrite Portal</h2>
                <button onClick={() => setShowApplyModal(false)} className="w-12 h-12 rounded-2xl glass flex items-center justify-center">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleWardenApplyLeave} className="space-y-8">
                <div>
                  <label className="text-[10px] font-black text-white/30 uppercase mb-3 block tracking-widest italic">Select Registered Student</label>
                  <select 
                    name="studentId" 
                    required 
                    className="w-full glass bg-transparent rounded-2xl p-5 text-sm font-bold focus:border-brand/40 outline-none appearance-none"
                  >
                    <option value="" className="bg-dark text-white/40 italic">-- Choose Resident --</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id} className="bg-dark text-white">{s.name} - ({s.roomNumber || 'X'})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {['home', 'local', 'vacation'].map((type) => (
                    <label key={type} className="relative cursor-pointer">
                      <input type="radio" name="type" value={type} defaultChecked={type === 'home'} className="peer absolute opacity-0" />
                      <div className="glass p-4 rounded-2xl text-[10px] font-black uppercase text-center border border-white/5 peer-checked:border-brand peer-checked:text-brand transition-all">
                        {type}
                      </div>
                    </label>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-white/30 uppercase mb-3 block tracking-widest italic">Departure</label>
                    <input 
                      type="date" 
                      name="startDate" 
                      required 
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full glass bg-transparent rounded-2xl p-5 text-sm font-bold focus:border-brand/40" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-white/30 uppercase mb-3 block tracking-widest italic">Expected Return</label>
                    <input 
                      type="date" 
                      name="endDate" 
                      required 
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full glass bg-transparent rounded-2xl p-5 text-sm font-bold focus:border-brand/40" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-white/30 uppercase mb-3 block tracking-widest italic">Warden Override Note</label>
                  <textarea 
                    name="reason" 
                    required 
                    className="w-full glass bg-transparent rounded-[2rem] p-6 text-sm focus:outline-none focus:border-brand/40 min-h-[120px] font-medium" 
                    placeholder="Enter details of leave approval..."
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-brand text-dark font-black uppercase py-6 rounded-3xl shadow-xl hover:scale-[1.02] transition-transform tracking-[0.2em] text-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Syncing Authority...' : 'Finalize & Approve Leave'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Approval Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 bg-dark/80 backdrop-blur-md flex items-center justify-center p-6">
           <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="glass rounded-[4rem] w-full max-w-3xl p-12 overflow-hidden relative"
           >
              <div className="absolute top-0 left-0 w-full h-2 bg-brand" />
              <div className="flex justify-between items-start mb-12">
                 <div>
                    <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-2 leading-none">Review Registry Entry</h2>
                    <p className="text-white/30 text-xs font-bold tracking-widest uppercase">TX-ID: {selectedReq.id}</p>
                 </div>
                 <button onClick={() => setSelectedReq(null)} className="w-14 h-14 glass rounded-2xl flex items-center justify-center hover:bg-white/10 transition-colors">
                    <XCircle className="w-6 h-6 text-white/40" />
                 </button>
              </div>               <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
                 <div className="space-y-8">
                    <div className="bg-white/[0.03] border border-white/5 p-8 rounded-[3rem]">
                       <p className="text-[9px] font-black text-brand uppercase tracking-[0.3em] mb-4">Resident Information</p>
                       <div className="flex items-center gap-4 mb-6">
                          <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center text-brand font-black text-xl">
                            {selectedReq.studentName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-2xl font-black uppercase italic leading-none">{selectedReq.studentName}</p>
                            <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest mt-1">Room: {selectedReq.studentRoom}</p>
                          </div>
                       </div>
                       <div className="space-y-3">
                          {(() => {
                            const student = students.find(s => s.id === selectedReq.studentId);
                            return (
                              <>
                                <div className="flex justify-between items-center text-xs">
                                   <span className="text-white/20 uppercase font-black tracking-widest">ID Reference</span>
                                   <span className="font-mono text-white/60">#{student?.uid || selectedReq.studentId.slice(-8).toUpperCase()}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                   <span className="text-white/20 uppercase font-black tracking-widest">USN</span>
                                   <span className="font-bold text-white/60">{student?.usn || 'PENDING'}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                   <span className="text-white/20 uppercase font-black tracking-widest">Department</span>
                                   <span className="font-bold text-white/60">{student?.department || 'CSE-CORE'}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs border-t border-white/5 pt-3 mt-3">
                                   <span className="text-white/20 uppercase font-black tracking-widest">Parent Contact</span>
                                   <span className="font-bold text-yellow-500/60">{student?.parentPhone || 'NOT PROVIDED'}</span>
                                </div>
                              </>
                            );
                          })()}
                       </div>
                    </div>

                    <div className="flex items-center gap-4 p-6 glass rounded-3xl border-brand/10">
                       <ShieldCheck className="w-8 h-8 text-brand" />
                       <div>
                          <p className="text-[9px] font-black uppercase text-brand tracking-widest">Warden Verification</p>
                          <p className="text-xs text-white/60 font-medium">Verify credentials before authority transmission</p>
                       </div>
                    </div>
                 </div>
                 
                 <div className="space-y-6">
                    <div>
                       <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-3">Leave Interval</p>
                       <div className="flex items-center gap-3">
                          <div className="text-center p-5 bg-white/[0.03] border border-white/5 rounded-[2rem] flex-1">
                             <p className="text-[8px] text-white/20 font-black uppercase mb-1">Departure</p>
                             <p className="font-black italic text-lg uppercase">{selectedReq.startDate}</p>
                          </div>
                          <div className="text-center p-5 bg-white/[0.03] border border-white/5 rounded-[2rem] flex-1">
                             <p className="text-[8px] text-white/20 font-black uppercase mb-1">Return</p>
                             <p className="font-black italic text-lg uppercase">{selectedReq.endDate}</p>
                          </div>
                       </div>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-3">Stated Intent</p>
                       <div className="bg-zinc-950 p-8 rounded-[2.5rem] min-h-[160px] text-sm text-white/60 leading-relaxed italic border border-white/5">
                          "{selectedReq.reason}"
                       </div>
                    </div>
                 </div>
              </div>

              <div className="flex gap-4">
                 {selectedReq.status === 'pending' ? (
                   <>
                     {pendingStatusAction === null ? (
                       <>
                         <button 
                           onClick={() => setPendingStatusAction('approved')}
                           className="flex-1 bg-brand text-dark font-black uppercase py-6 rounded-3xl shadow-[0_10px_40px_rgba(59,130,246,0.2)] hover:scale-[1.02] transition-transform tracking-widest text-sm"
                         >
                            Approve Request
                         </button>
                         <button 
                           onClick={() => setPendingStatusAction('rejected')}
                           className="px-10 glass rounded-3xl text-red-500 font-black uppercase text-xs tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-xl"
                         >
                            Reject
                         </button>
                       </>
                     ) : (
                       <div className="w-full flex flex-col gap-4">
                         <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-white/40 animate-pulse">
                           Decision Recorded: {pendingStatusAction}
                         </p>
                         <button 
                           onClick={() => handleStatusUpdate(selectedReq.id, pendingStatusAction)}
                           className="w-full bg-brand text-dark font-black uppercase py-6 rounded-3xl shadow-[0_10px_40px_rgba(255,255,255,0.1)] hover:scale-[1.02] transition-transform tracking-[0.5em] text-sm italic"
                         >
                            Notify to their Parents
                         </button>
                         <button 
                           onClick={() => setPendingStatusAction(null)}
                           className="text-[10px] text-white/20 font-black uppercase tracking-widest hover:text-white"
                         >
                           Cancel Action
                         </button>
                       </div>
                     )}
                   </>
                 ) : (
                    <button 
                      onClick={() => setSelectedReq(null)}
                      className="w-full bg-white/5 border border-white/10 text-white/40 py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-xs"
                    >
                       Close Audit Interface
                    </button>
                 )}
              </div>
           </motion.div>
        </div>
      )}

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div
            className="fixed inset-0 z-[70] bg-dark/90 backdrop-blur-xl flex items-start justify-center p-6 overflow-y-auto"
            onClick={() => { setShowSettings(false); setConfirmWipe(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass rounded-[4rem] w-full max-w-3xl p-12 my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter">System Settings</h2>
                  <p className="text-white/30 text-xs font-bold tracking-widest uppercase mt-1">Warden Administrative Controls</p>
                </div>
                <button onClick={() => { setShowSettings(false); setConfirmWipe(false); }} className="w-12 h-12 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-all">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Add Student */}
              <div className="mb-10">
                <h3 className="text-lg font-black italic uppercase tracking-tighter mb-6 flex items-center gap-3">
                  <Plus className="w-5 h-5 text-brand" /> Add New Student
                </h3>
                <form onSubmit={handleAddStudent} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[8px] font-black text-white/30 uppercase tracking-widest block mb-2">Full Name *</label>
                    <input name="name" required className="w-full glass bg-transparent rounded-2xl p-4 text-sm font-bold outline-none" placeholder="Student full name" />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-white/30 uppercase tracking-widest block mb-2">Email *</label>
                    <input name="email" type="email" required className="w-full glass bg-transparent rounded-2xl p-4 text-sm font-bold outline-none" placeholder="student@email.com" />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-white/30 uppercase tracking-widest block mb-2">Department</label>
                    <input name="department" className="w-full glass bg-transparent rounded-2xl p-4 text-sm font-bold outline-none" placeholder="e.g. ECE, CSE, MECH" />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-white/30 uppercase tracking-widest block mb-2">Room Number</label>
                    <input name="roomNumber" className="w-full glass bg-transparent rounded-2xl p-4 text-sm font-bold outline-none" placeholder="e.g. B-204" />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-white/30 uppercase tracking-widest block mb-2">Phone</label>
                    <input name="phone" className="w-full glass bg-transparent rounded-2xl p-4 text-sm font-bold outline-none" placeholder="+91 XXXXXXXXXX" />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-white/30 uppercase tracking-widest block mb-2">USN / Roll No</label>
                    <input name="usn" className="w-full glass bg-transparent rounded-2xl p-4 text-sm font-bold outline-none" placeholder="University Roll No." />
                  </div>
                  <div className="col-span-2">
                    <button type="submit" disabled={isSubmitting} className="w-full bg-brand text-dark font-black uppercase py-5 rounded-3xl tracking-[0.2em] text-sm disabled:opacity-50 hover:scale-[1.01] transition-transform">
                      {isSubmitting ? 'Adding Student...' : '+ Add Student to Registry'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Manage Students */}
              <div className="mb-10">
                <h3 className="text-lg font-black italic uppercase tracking-tighter mb-4 flex items-center gap-3">
                  <Users className="w-5 h-5 text-white/40" /> Registered Students ({students.length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {students.map(student => (
                    <div key={student.id} className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand font-black text-xs uppercase overflow-hidden">
                          {student.avatar ? <img src={student.avatar} alt="" className="w-full h-full object-cover" /> : student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{student.name}</p>
                          <p className="text-[10px] text-white/30">{student.email} • {student.roomNumber || 'No Room'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteStudent(student.id)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-red-500/40 hover:bg-red-500/10 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  {students.length === 0 && (
                    <p className="text-white/30 text-sm text-center py-8">No students registered yet.</p>
                  )}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="border border-red-500/20 rounded-3xl p-8">
                <h3 className="text-lg font-black italic uppercase tracking-tighter mb-2 text-red-500 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" /> Danger Zone
                </h3>
                <p className="text-white/40 text-xs mb-6 leading-relaxed">Permanently removes ALL student records from the database. This action is irreversible and cannot be undone.</p>
                {confirmWipe ? (
                  <div className="flex gap-4">
                    <button
                      onClick={handleWipeAll}
                      disabled={isSubmitting}
                      className="flex-1 bg-red-500 text-white font-black uppercase py-4 rounded-2xl text-sm tracking-widest hover:bg-red-600 transition-colors disabled:opacity-60"
                    >
                      {isSubmitting ? 'Wiping Database...' : 'CONFIRM — Wipe All Data'}
                    </button>
                    <button
                      onClick={() => setConfirmWipe(false)}
                      className="px-8 glass rounded-2xl text-white/40 font-black uppercase text-xs hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmWipe(true)}
                    className="w-full border border-red-500/30 text-red-500 font-black uppercase py-4 rounded-2xl text-sm tracking-widest hover:bg-red-500/10 transition-colors"
                  >
                    Wipe All Student Data
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showScanner && (
        <ScanModal onClose={() => setShowScanner(false)} onFound={handleScanFound} />
      )}
      {toast && (
        <div className="fixed bottom-8 right-8 bg-black/80 text-white px-4 py-2 rounded-full shadow-lg">
          <div className="font-bold text-sm">{toast}</div>
        </div>
      )}
    </div>
  );
}
