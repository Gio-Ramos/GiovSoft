const tokenKey = "giovsoft-admin-token";
const userKey = "giovsoft-admin-user";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  isMaster?: boolean;
  avatarId?: string;
  profileImage?: string;
  passwordChangeRequired: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export function getAdminToken() {
  return window.localStorage.getItem(tokenKey);
}

export function setAdminSession(token: string, user: AdminUser) {
  window.localStorage.setItem(tokenKey, token);
  window.localStorage.setItem(userKey, JSON.stringify(user));
}

export function readAdminUser() {
  const rawUser = window.localStorage.getItem(userKey);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AdminUser;
  } catch (_error) {
    window.localStorage.removeItem(userKey);
    return null;
  }
}

export function clearAdminSession() {
  window.localStorage.removeItem(tokenKey);
  window.localStorage.removeItem(userKey);
}
