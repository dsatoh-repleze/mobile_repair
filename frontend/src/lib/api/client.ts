import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token and store ID
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // 店舗IDをヘッダーに追加
    const storeId = Cookies.get('selected_store_id');
    if (storeId) {
      config.headers['X-Store-Id'] = storeId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const token = Cookies.get('access_token');
      const role = Cookies.get('user_role');

      // トークンが存在していた場合のみリダイレクト（ログイン済み状態でのセッション切れ）
      // ログイン試行時の401エラーはリダイレクトしない
      if (token && typeof window !== 'undefined') {
        Cookies.remove('access_token');
        Cookies.remove('user_role');
        // ロールに応じた適切なログインページにリダイレクト
        const loginPath = role === 'admin' ? '/admin/login'
                        : role === 'staff' ? '/staff/login'
                        : role === 'member' ? '/member/login'
                        : '/';
        window.location.href = loginPath;
      }
    }
    return Promise.reject(error);
  }
);

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

export const authApi = {
  adminLogin: (email: string, password: string) =>
    apiClient.post<LoginResponse>('/admin/login', { email, password }),

  staffLogin: (email: string, password: string) =>
    apiClient.post<LoginResponse>('/staff/login', { email, password }),

  memberLogin: (email: string, password: string) =>
    apiClient.post<LoginResponse>('/member/login', { email, password }),

  memberRegister: (data: { name: string; email: string; password: string; password_confirmation: string; phone?: string }) =>
    apiClient.post<LoginResponse>('/member/register', data),

  logout: (role: 'admin' | 'staff' | 'member') =>
    apiClient.post(`/${role}/logout`),

  getMe: (role: 'admin' | 'staff' | 'member') =>
    apiClient.get(`/${role}/me`),
};
