// frontend/hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import { authApi, getAuthToken, removeAuthToken } from '../lib/api';
import { useRouter, usePathname } from 'next/navigation';

export interface UserType {
  id: string;
  email: string;
  full_name: string;
}

export function useAuth() {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userData = await authApi.me();
      setUser(userData);
    } catch (err) {
      console.error('Failed to retrieve user session:', err);
      removeAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Public/Private route protection
  useEffect(() => {
    if (loading) return;

    const publicPaths = ['/', '/login', '/signup'];
    const isPublicPath = publicPaths.includes(pathname);

    if (!user && !isPublicPath) {
      router.push('/login');
    } else if (user && (pathname === '/login' || pathname === '/signup')) {
      router.push('/dashboard');
    }
  }, [user, loading, pathname, router]);

  const logout = useCallback(() => {
    removeAuthToken();
    setUser(null);
    router.push('/login');
  }, [router]);

  return {
    user,
    loading,
    logout,
    refreshUser: fetchUser,
  };
}
