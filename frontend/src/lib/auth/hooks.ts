'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { authApi, ApiError } from '@/lib/api/client';
import { AxiosError } from 'axios';

export type UserRole = 'admin' | 'staff' | 'member';

interface UseAuthReturn {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useAuth(role: UserRole): UseAuthReturn {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      let response;
      switch (role) {
        case 'admin':
          response = await authApi.adminLogin(email, password);
          break;
        case 'staff':
          response = await authApi.staffLogin(email, password);
          break;
        case 'member':
          response = await authApi.memberLogin(email, password);
          break;
      }

      const { access_token } = response.data;

      // Store token and role in cookies
      Cookies.set('access_token', access_token, {
        expires: 7,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
      Cookies.set('user_role', role, {
        expires: 7,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });

      // Redirect to dashboard
      router.push(`/${role}/dashboard`);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setError(axiosError.response?.data?.message || 'ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [role, router]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authApi.logout(role);
    } catch {
      // Ignore logout errors
    } finally {
      Cookies.remove('access_token');
      Cookies.remove('user_role');
      router.push(`/${role}/login`);
      setIsLoading(false);
    }
  }, [role, router]);

  return { login, logout, isLoading, error };
}

export function getStoredAuth(): { token: string | undefined; role: UserRole | undefined } {
  return {
    token: Cookies.get('access_token'),
    role: Cookies.get('user_role') as UserRole | undefined,
  };
}

export function isAuthenticated(): boolean {
  return !!Cookies.get('access_token');
}
