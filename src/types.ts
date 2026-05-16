export type UserRole = 'student' | 'warden' | 'guard' | 'parent' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  department?: string;
  roomNumber?: string;
  hostelBlock?: string;
  usn?: string;
  uid?: string;
  parentPhone?: string;
  address?: string;
}

export interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentRoom: string;
  type: 'home' | 'local' | 'vacation';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed';
  appliedAt: string;
  appliedBy?: UserRole; // Track if student or parent applied
  approvedBy?: string;
  qrCode?: string;
}

export interface SecurityLog {
  id: string;
  studentId: string;
  studentName: string;
  type: 'entry' | 'exit';
  timestamp: string;
  gate: string;
  verifiedBy: string;
}
