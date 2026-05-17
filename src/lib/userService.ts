import { User } from '../types';

const API_URL = `${import.meta.env.VITE_API_URL}/api`;

export const UserService = {
  async getAllStudents() {
    try {
      const response = await fetch(API_URL + '/users?role=student');
      if (!response.ok) throw new Error("Failed to fetch students");
      return await response.json() as User[];
    } catch (error) {
      console.error(error);
      return [];
    }
  },

  async getUserById(userId: string) {
    try {
      const response = await fetch(API_URL + '/users?id=' + userId);
      if (!response.ok) throw new Error("Failed to fetch user");
      const users = await response.json() as User[];
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error(error);
      return null;
    }
  },

  async updateUser(userId: string, data: Partial<User>) {
    try {
      const fullUrl = API_URL + '/users/' + userId;
      console.log('📤 API URL:', fullUrl);
      console.log('📤 Sending profile update:', { userId, data });
      
      const response = await fetch(fullUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      console.log(`📡 Response status: ${response.status} ${response.statusText}`);
      console.log(`📡 Content-Type: ${response.headers.get('content-type')}`);
      
      const responseText = await response.text();
      console.log('📡 Response body (first 200 chars):', responseText.substring(0, 200));
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('🔴 Failed to parse JSON response:', parseError);
        throw new Error(`Invalid server response (expected JSON, got ${response.headers.get('content-type')}). Check if backend is running on ${fullUrl}`);
      }
      
      if (response.ok) {
        console.log('✅ Update successful:', result);
        return result;
      } else {
        console.error('❌ Update failed:', response.status, result);
        throw new Error(result.error || `Server error: ${response.status}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error or server unreachable';
      console.error('🔴 Update error:', errorMsg);
      throw new Error(errorMsg);
    }
  },

  async createStudent(data: Partial<User>) {
    try {
      const newStudent = {
        ...data,
        role: 'student',
        id: 'stu_' + Date.now().toString(),
      };
      const response = await fetch(API_URL + '/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudent)
      });
      return response.ok;
    } catch (error) {
      console.error(error);
      return false;
    }
  },

  async deleteUser(userId: string) {
    try {
      const response = await fetch(API_URL + '/users/' + userId, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error(error);
      return false;
    }
  },

  async wipeAllStudents() {
    try {
      const response = await fetch(API_URL + '/admin/wipe-all-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch (error) {
      console.error(error);
      return false;
    }
  }
};
