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
      const response = await fetch(API_URL + '/users/' + userId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error(error);
      return null;
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
