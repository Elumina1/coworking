import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Интерцептор для автоматического добавления токена
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authService = {
  login: (email, password) => api.post('/login', { email, password }),
  register: (email, password, full_name, second_name) => 
    api.post('/register', { email, password, full_name, second_name })
}

export const bookingService = {
  getMyBookings: () => api.get('/get/booking'),
  createBooking: (data) => api.post('/post/booking', data),
  cancelBooking: (id) => api.patch(`/cancel/booking/${id}`),
  searchWorkspaces: (params) => api.get('/search/workspaces', { params }),
  getWorkspaceSlots: (workspaceId, date) =>
    api.get(`/get/booking/slots/${workspaceId}`, { params: { date } }),
  confirm: (id) => api.patch(`/confirm/booking/${id}`),
  remind: (id) => api.post(`/remind/booking/${id}`)
}

export const adminService = {
  getAllBookings: () => api.get('/get/booking'),
  confirmBooking: (id) => api.patch(`/confirm/booking/${id}`),
  sendReminder: (id) => api.post(`/remind/booking/${id}`)
}

export const workTypeService = {
  getAll: () => api.get('/get/worktypes'),
  create: (data) => api.post('/post/worktypes', data),
  update: (id, data) => api.put(`/update/worktypes/${id}`, data),
  delete: (id) => api.delete(`/del/worktypes/${id}`)
}

export const workspaceService = {
  getAll: () => api.get('/get/workspace'),
  create: (data) => api.post('/post/workspace', data),
  update: (id, data) => api.put(`/update/workspace/${id}`, data),
  delete: (id) => api.delete(`/delete/workspace/${id}`)
}

export const priceService = {
  getAll: () => api.get('/get/price'),
  create: (data) => api.post('/post/price', data),
  update: (id, data) => api.put(`/update/price/${id}`, data)
}

export const reportService = {
  getOccupancy: (start_date, end_date) =>
    api.get('/reports/occupancy', { params: { start_date, end_date } }),
  getRevenue: (start_date, end_date, group_by = 'month') =>
    api.get('/reports/revenue', { params: { start_date, end_date, group_by } }),
  getPopularWorkTypes: (start_date, end_date) =>
    api.get('/reports/popular-work-types', { params: { start_date, end_date } }),
  getUserBookings: (start_date, end_date) =>
    api.get('/reports/user-bookings', { params: { start_date, end_date } })
}

export const userService = {
  getAll: () => api.get('/get/user'),
  create: (data) => api.post('/post/user', data),
  update: (email, data) => api.put(`/update/user/${email}`, data),
  delete: (email) => api.delete(`/delete/user/${email}`)
}

export default api
