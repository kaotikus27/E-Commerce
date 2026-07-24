export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role?: 'CUSTOMER' | 'ADMIN';
}

export interface AuthResponse {
  token: string;
  user: User;
}
