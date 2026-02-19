import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Token interceptor — hər sorğuya JWT əlavə et
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — 401 olduqda refresh cəhdi
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || '';
    const isAuthRoute = /\/auth\/(login|refresh|logout|me)$/.test(requestUrl);

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthRoute) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// ── Admin API namespace ──────────────────────────────────────
export const adminApi = {
  // İstifadəçilər
  getUsers: (params?: Record<string, unknown>) => api.get('/admin/users', { params }),
  getUser: (id: string) => api.get(`/admin/users/${id}`),
  createUser: (data: Record<string, unknown>) => api.post('/admin/users', data),
  updateUser: (id: string, data: Record<string, unknown>) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  assignRole: (id: string, role_id: string) => api.post(`/admin/users/${id}/assign-role`, { role_id }),
  resetPassword: (id: string, new_password?: string) =>
    api.post(`/admin/users/${id}/reset-password`, new_password ? { new_password } : {}),
  unlockUser: (id: string) => api.post(`/admin/users/${id}/unlock`),

  // Rollar
  getRoles: () => api.get('/admin/roles'),
  getRole: (id: string) => api.get(`/admin/roles/${id}`),
  createRole: (data: Record<string, unknown>) => api.post('/admin/roles', data),
  updateRole: (id: string, data: Record<string, unknown>) => api.put(`/admin/roles/${id}`, data),
  deleteRole: (id: string) => api.delete(`/admin/roles/${id}`),
  getRolePermissions: (id: string) => api.get(`/admin/roles/${id}/permissions`),
  updateRolePermissions: (id: string, permissions: { resource: string; action: string }[]) =>
    api.put(`/admin/roles/${id}/permissions`, { permissions }),

  // LDAP
  getLdapMappings: () => api.get('/admin/ldap/group-mappings'),
  createLdapMapping: (data: Record<string, unknown>) => api.post('/admin/ldap/group-mappings', data),
  deleteLdapMapping: (id: string) => api.delete(`/admin/ldap/group-mappings/${id}`),
  testLdap: () => api.post('/admin/ldap/test'),
};
