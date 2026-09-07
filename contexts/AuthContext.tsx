import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/constants/config';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  address?: string;
  role?: string;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, phone: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const USER_STORAGE_KEY = 'THOITRANGHD_USER';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved user session on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setUser(parsed);
          // Refresh from API in background if user has ID
          if (parsed?.id) {
            fetch(`${API_URL}/api/auth/profile/${parsed.id}`)
              .then(res => res.json())
              .then(data => {
                if (data && data.success && data.data) {
                  setUser(data.data);
                  AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.data));
                }
              })
              .catch(() => {});
          }
        }
      } catch (err) {
        console.error('Lỗi đọc phiên đăng nhập:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await res.json();
      if (data && data.success && data.data) {
        setUser(data.data);
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.data));
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'Đăng nhập không thành công' };
    } catch (err: any) {
      console.error('Lỗi đăng nhập:', err);
      return { success: false, message: 'Lỗi kết nối tới máy chủ' };
    }
  };

  const register = async (name: string, email: string, phone: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim(), password })
      });
      const data = await res.json();
      if (data && data.success && data.data) {
        setUser(data.data);
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.data));
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'Đăng ký không thành công' };
    } catch (err: any) {
      console.error('Lỗi đăng ký:', err);
      return { success: false, message: 'Lỗi kết nối tới máy chủ' };
    }
  };

  const logout = async () => {
    setUser(null);
    try {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
    } catch (err) {
      console.error('Lỗi đăng xuất:', err);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user?.id) return { success: false, message: 'Chưa đăng nhập' };
    try {
      const res = await fetch(`${API_URL}/api/auth/profile/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (resData && resData.success && resData.data) {
        setUser(resData.data);
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(resData.data));
        return { success: true, message: resData.message };
      }
      return { success: false, message: resData.message || 'Cập nhật thất bại' };
    } catch (err: any) {
      console.error('Lỗi cập nhật profile:', err);
      return { success: false, message: 'Lỗi kết nối tới máy chủ' };
    }
  };

  const isAdmin = !!(
    user &&
    (user.role === 'admin' ||
      user.email?.toLowerCase() === 'admin@thoitranghd.com' ||
      user.email?.toLowerCase().includes('admin'))
  );

  return (
    <AuthContext.Provider value={{ user, isAdmin, isLoading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
