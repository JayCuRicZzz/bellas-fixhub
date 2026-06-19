'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, LoginFormData } from '../types';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (data: LoginFormData) => Promise<{ success: boolean; message?: string; passwordResetRequired?: boolean }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: () => {},
  isAuthenticated: false,
});

// Helper to read cookie value
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check localStorage first, then fallback to cookie
    let storedToken = localStorage.getItem('token');
    if (!storedToken) {
      storedToken = getCookie('token');
    }
    
    if (storedToken) {
      setToken(storedToken);
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser(data.user);
            localStorage.setItem('token', storedToken!);
          } else {
            localStorage.removeItem('token');
            setToken(null);
          }
        })
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      // No token in JS-accessible storage — try HttpOnly cookie via /api/auth/me
      fetch('/api/auth/me')
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser(data.user);
            // Don't have token to store, but user is authenticated via cookie
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, []);

  const login = useCallback(async (data: LoginFormData) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        setUser(result.user);
        setToken(result.token);
        localStorage.setItem('token', result.token);
        return { success: true, passwordResetRequired: !!result.password_reset_required };
      }
      return { success: false, message: result.message || 'เข้าสู่ระบบไม่สำเร็จ' };
    } catch (err) {
      return { success: false, message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    document.cookie = 'token=; Path=/; Max-Age=0';
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
