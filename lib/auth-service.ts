// lib/auth-service.ts

export interface User {
    id: number;
    square_up_id: string;
    email: string;
    first_name: string;
    last_name: string;
    nickname: string;
    phone_number: string;
    birthday: string;
    role: string;
    created_at: string;
    updated_at: string;
}
  
export interface RegisterRequest {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    nickname: string;
    phone_number: string;
    birthday: string;
}
  
export interface LoginRequest {
    email: string;
    password: string;
}
  
export interface VerifyRequest {
    phone_number: string;
    otp_code: string;
}
  
export interface AuthResponse {
    data: {
      user: User;
      token: string;
      verification_sid?: string;
    };
    status_code: number;
    message: string;
}
  
export interface VerifyResponse {
    data: boolean;
    status_code: number;
    message: string;
}
  
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
  
export const AuthService = {
    async register(data: RegisterRequest): Promise<AuthResponse> {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to register');
      }
  
      return await response.json();
    },
  
    async login(data: LoginRequest): Promise<AuthResponse> {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to login');
      }
  
      return await response.json();
    },
  
    async verify(data: VerifyRequest): Promise<VerifyResponse> {
      const response = await fetch(`${API_URL}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to verify OTP');
      }
  
      return await response.json();
    },
  
    logout(): void {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
  
    getToken(): string | null {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('token');
      }
      return null;
    },
  
    getUser(): User | null {
      if (typeof window !== 'undefined') {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          return JSON.parse(userStr);
        }
      }
      return null;
    },
  
    isAuthenticated(): boolean {
      return !!this.getToken();
    },
};