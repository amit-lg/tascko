export interface SafeUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface AuthResponse {
  user: SafeUser;
  token: string;
}
