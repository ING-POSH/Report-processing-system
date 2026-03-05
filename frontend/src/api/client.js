import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
})

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally - redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authAPI = {
  signupOrganization: (data) => api.post('/api/auth/signup/organization', data),
  login: (data) => api.post('/api/auth/login', data),
}

export const orgAPI = {
  getOrganization: (id) => api.get(`/api/organizations/${id}`),
  getMembers: (id) => api.get(`/api/organizations/${id}/members`),
  inviteMember: (id, data) => api.post(`/api/organizations/${id}/invite`, data),
}

export const workspaceAPI = {
  list: () => api.get('/api/workspaces'),
  create: (data) => api.post('/api/workspaces', data),
}

export const reportAPI = {
  upload: (formData) => api.post('/api/reports/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  list: (params) => api.get('/api/reports', { params }),
  create: (data) => api.post('/api/reports', data),
  getProgress: (taskId) => api.get(`/api/reports/${taskId}/progress`),
}

export const spaceAPI = {
  list: (org_id) => api.get('/api/spaces', { params: { organization_id: org_id } }),
}

export const projectAPI = {
  list: (params) => api.get('/api/projects', { params }),
  create: (data) => api.post('/api/projects', data),
  get: (id) => api.get(`/api/projects/${id}`),
  update: (id, data) => api.patch(`/api/projects/${id}`, data),
  risks: (id) => api.get(`/api/projects/${id}/risks`),
  createRisk: (id, data) => api.post(`/api/projects/${id}/risks`, data),
  engagements: (id) => api.get(`/api/projects/${id}/engagements`),
  createEngagement: (id, data) => api.post(`/api/projects/${id}/engagements`, data),
}

export const riskAPI = {
  update: (id, data) => api.patch(`/api/risks/${id}`, data),
}

export const transcribeAPI = {
  submit: (formData) => api.post('/api/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  get: (id) => api.get(`/api/transcribe/${id}`),
  list: (params) => api.get('/api/transcribe', { params }),
}

export const partnerDashboardAPI = {
  stats: (org_id) => api.get('/api/dashboard/partner-stats', { params: { organization_id: org_id } }),
}

export const taskAPI = {
  list: (params) => api.get('/api/tasks', { params }),
  create: (data) => api.post('/api/tasks', data),
  update: (id, data) => api.patch(`/api/tasks/${id}`, data),
}

export const activityAPI = {
  list: (params) => api.get('/api/activity', { params }),
  log: (data) => api.post('/api/activity', data),
}

export const dashboardAPI = {
  stats: (org_id) => api.get('/api/dashboard/stats', { params: { organization_id: org_id } }),
}

export default api
