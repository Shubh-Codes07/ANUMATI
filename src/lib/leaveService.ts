import { LeaveRequest } from '../types';

const API_URL = `${import.meta.env.VITE_API_URL}/api`;

export const LeaveService = {
  async applyLeave(request: Omit<LeaveRequest, 'id'>) {
    try {
      const response = await fetch(API_URL + '/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      if (!response.ok) throw new Error("Failed to apply leave");
      return await response.json() as LeaveRequest;
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  async getMyRequests(studentId: string) {
    try {
      const response = await fetch(API_URL + '/leaves?studentId=' + studentId);
      if (!response.ok) throw new Error("Failed to fetch leaves");
      const leaves = await response.json() as LeaveRequest[];
      return leaves.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
    } catch (error) {
      console.error(error);
      return [];
    }
  },

  subscribeToMyRequests(studentId: string, callback: (requests: LeaveRequest[]) => void) {
    // Note: Simulated real-time subscription for migration
    // Polling every 5 seconds as a simple alternative to websockets
    this.getMyRequests(studentId).then(callback);
    const interval = setInterval(() => {
      this.getMyRequests(studentId).then(callback);
    }, 5000);
    return () => clearInterval(interval);
  },

  async getAllPendingRequests() {
    try {
      const response = await fetch(API_URL + '/leaves');
      if (!response.ok) throw new Error("Failed to fetch leaves");
      const leaves = await response.json() as LeaveRequest[];
      return leaves
        .filter(l => l.status === 'pending')
        .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
    } catch (error) {
      console.error(error);
      return [];
    }
  },

  async getAllRequests() {
    try {
      const response = await fetch(API_URL + '/leaves');
      if (!response.ok) throw new Error("Failed to fetch leaves");
      const leaves = await response.json() as LeaveRequest[];
      return leaves.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
    } catch (error) {
      console.error(error);
      return [];
    }
  },

  async getRequestById(requestId: string) {
    try {
      const response = await fetch(API_URL + '/leaves');
      if (!response.ok) throw new Error("Failed to fetch leaves");
      const leaves = await response.json() as LeaveRequest[];
      return leaves.find(l => l.id === requestId) || null;
    } catch (error) {
      console.error(error);
      return null;
    }
  },

  async getRequestByQr(qrCode: string) {
    try {
      const response = await fetch(API_URL + '/leaves');
      if (!response.ok) throw new Error('Failed to fetch leaves');
      const leaves = await response.json() as LeaveRequest[];
      return leaves.find(l => l.qrCode === qrCode) || null;
    } catch (error) {
      console.error(error);
      return null;
    }
  },

  async updateRequestStatus(requestId: string, status: LeaveRequest['status'], approvedBy?: string, qrCode?: string) {
    try {
      const updates: any = { status };
      if (approvedBy) updates.approvedBy = approvedBy;
      if (qrCode) updates.qrCode = qrCode;

      const response = await fetch(API_URL + '/leaves/' + requestId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error("Failed to update status");
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  ,

  async getSecurityLogs() {
    try {
      const response = await fetch(API_URL + '/security-logs');
      if (!response.ok) throw new Error('Failed to fetch security logs');
      const logs = await response.json();
      return logs as any[];
    } catch (error) {
      console.error(error);
      return [];
    }
  }
  ,

  subscribeToSecurityLogs(callback: (log: any) => void) {
    if (typeof window === 'undefined' || !('EventSource' in window)) {
      // Fallback: polling every 3s
      let stopped = false;
      const poll = async () => {
        if (stopped) return;
        try {
          const logs = await this.getSecurityLogs();
          (logs || []).forEach((l: any) => callback(l));
        } catch (e) {}
        setTimeout(poll, 3000);
      };
      poll();
      return () => { stopped = true; };
    }

    const es = new EventSource(API_URL + '/security-logs/stream');
    const handler = (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        callback(parsed);
      } catch (err) {
        console.error('Invalid SSE payload', err);
      }
    };
    // listen to named event 'log'
    es.addEventListener('log', handler);
    // also handle generic messages
    es.onmessage = handler;
    es.onerror = (err) => {
      // keep connection resilient, retry will be handled by browser
      console.error('SSE error', err);
    };

    return () => { es.removeEventListener('log', handler); es.close(); };
  }
};
