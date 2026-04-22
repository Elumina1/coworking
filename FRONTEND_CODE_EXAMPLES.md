# 💻 Примеры кода для основных улучшений

## 1. Расширенный API сервис (`src/services/api.js`)

```javascript
import axios from 'axios'

const API_URL = 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
})

// Интерцептор для добавления токена
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
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

// ===== БРОНИРОВАНИЯ =====
export const bookingService = {
  searchAvailable: (start_date, end_date, work_type_id = null) =>
    api.get('/search/workspaces', { params: { start_date, end_date, work_type_id } }),
  
  getSlots: (workspace_id, date) =>
    api.get(`/get/booking/slots/${workspace_id}`, { params: { date } }),
  
  create: (data) => api.post('/post/booking', data),
  
  getAll: () => api.get('/get/booking'),
  
  update: (id, data) => api.put(`/update/booking/${id}`, data),
  
  cancel: (id) => api.patch(`/cancel/booking/${id}`),
  
  confirm: (id) => api.patch(`/confirm/booking/${id}`),
  
  remind: (id) => api.post(`/remind/booking/${id}`)
}

// ===== РАБОЧИЕ МЕСТА =====
export const workspaceService = {
  getAll: () => api.get('/get/workspace'),
  
  create: (data) => api.post('/post/workspace', data),
  
  update: (id, data) => api.put(`/update/workspace/${id}`, data),
  
  delete: (id) => api.delete(`/delete/workspace/${id}`)
}

// ===== ТИПЫ РАБОТ =====
export const workTypeService = {
  getAll: () => api.get('/get/worktypes'),
  
  create: (data) => api.post('/post/worktypes', data),
  
  update: (id, data) => api.put(`/update/worktypes/${id}`, data),
  
  delete: (id) => api.delete(`/del/worktypes/${id}`)
}

// ===== ЦЕНЫ =====
export const priceService = {
  create: (data) => api.post('/post/price', data),
  
  update: (id, data) => api.put(`/update/price/${id}`, data)
}

// ===== ПЛАТЕЖИ =====
export const paymentService = {
  createCheckout: (bookingId) =>
    api.post(`/checkout/booking/${bookingId}`),
  
  getStatus: (bookingId) =>
    api.get(`/status/booking/${bookingId}`),
  
  refund: (bookingId) =>
    api.post(`/refund/booking/${bookingId}`),
  
  generateInvoice: (bookingId) =>
    api.post(`/invoice/booking/${bookingId}`),
  
  getAll: () => api.get('/get/payment'),
  
  update: (id, data) => api.put(`/update/payment/${id}`, data),
  
  delete: (id) => api.delete(`/delete/payment/${id}`)
}

// ===== ПОЛЬЗОВАТЕЛИ =====
export const userService = {
  getAll: () => api.get('/get/user'),
  
  create: (data) => api.post('/post/user', data),
  
  update: (email, data) => api.put(`/update/user/${email}`, data),
  
  delete: (email) => api.delete(`/delete/user/${email}`)
}

// ===== ОТЧЁТЫ =====
export const reportService = {
  getOccupancy: (start_date, end_date) =>
    api.get('/reports/occupancy', { params: { start_date, end_date } }),
  
  getRevenue: (start_date, end_date) =>
    api.get('/reports/revenue', { params: { start_date, end_date } }),
  
  getPopularWorkTypes: (start_date, end_date) =>
    api.get('/reports/popular-worktypes', { params: { start_date, end_date } }),
  
  getUserBookings: (start_date, end_date) =>
    api.get('/reports/user-bookings', { params: { start_date, end_date } })
}

// ===== УВЕДОМЛЕНИЯ =====
export const notificationService = {
  getAll: () => api.get('/get/notification'),
  
  create: (data) => api.post('/post/notification', data),
  
  update: (id, data) => api.put(`/update/notification/${id}`, data),
  
  delete: (id) => api.delete(`/delete/notification/${id}`)
}

// ===== АУТЕНТИФИКАЦИЯ =====
export const authService = {
  login: (email, password) =>
    api.post('/login', { email, password }),
  
  register: (email, password, full_name, second_name) =>
    api.post('/register', { email, password, full_name, second_name })
}

export default api
```

---

## 2. Pinia Store для бронирований (`src/stores/booking.js`)

```javascript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { bookingService } from '../services/api'

export const useBookingStore = defineStore('booking', () => {
  const bookings = ref([])
  const selectedBooking = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const filters = ref({
    status: null,
    startDate: null,
    endDate: null
  })

  const filteredBookings = computed(() => {
    let result = bookings.value

    if (filters.value.status) {
      result = result.filter(b => b.booking_status === filters.value.status)
    }

    if (filters.value.startDate) {
      result = result.filter(b => new Date(b.start_date) >= new Date(filters.value.startDate))
    }

    if (filters.value.endDate) {
      result = result.filter(b => new Date(b.end_date) <= new Date(filters.value.endDate))
    }

    return result
  })

  const getBookings = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await bookingService.getAll()
      bookings.value = response.data
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  const createBooking = async (workspaceId, startDate, endDate) => {
    loading.value = true
    error.value = null
    try {
      const response = await bookingService.create({
        workspace_id: workspaceId,
        start_date: startDate,
        end_date: endDate
      })
      bookings.value.push(response.data)
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const cancelBooking = async (id) => {
    loading.value = true
    error.value = null
    try {
      await bookingService.cancel(id)
      const index = bookings.value.findIndex(b => b.id === id)
      if (index !== -1) {
        bookings.value[index].booking_status = 'cancelled'
      }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const confirmBooking = async (id) => {
    loading.value = true
    error.value = null
    try {
      await bookingService.confirm(id)
      const index = bookings.value.findIndex(b => b.id === id)
      if (index !== -1) {
        bookings.value[index].booking_status = 'confirmed'
      }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    bookings,
    selectedBooking,
    loading,
    error,
    filters,
    filteredBookings,
    getBookings,
    createBooking,
    cancelBooking,
    confirmBooking
  }
})
```

---

## 3. Компонент для поиска и создания бронирования

```vue
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBookingStore } from '../stores/booking'
import { useAuthStore } from '../stores/auth'
import { bookingService, workspaceService, workTypeService } from '../services/api'

const bookingStore = useBookingStore()
const authStore = useAuthStore()

const startDate = ref('')
const endDate = ref('')
const selectedWorkType = ref(null)
const selectedWorkspace = ref(null)
const availableWorkspaces = ref([])
const workTypes = ref([])
const slots = ref([])
const selectedSlot = ref(null)
const loading = ref(false)
const currentStep = ref(1) // 1: даты, 2: рабочее место, 3: подтверждение

const canSearch = computed(() => startDate.value && endDate.value)

const loadWorkTypes = async () => {
  try {
    const response = await workTypeService.getAll()
    workTypes.value = response.data
  } catch (error) {
    console.error('Error loading work types:', error)
  }
}

const searchAvailable = async () => {
  if (!canSearch.value) return

  loading.value = true
  try {
    const response = await bookingService.searchAvailable(
      startDate.value,
      endDate.value,
      selectedWorkType.value
    )
    availableWorkspaces.value = response.data
    currentStep.value = 2
  } catch (error) {
    console.error('Error searching workspaces:', error)
  } finally {
    loading.value = false
  }
}

const selectWorkspace = async (workspace) => {
  selectedWorkspace.value = workspace
  loading.value = true
  try {
    const response = await bookingService.getSlots(workspace.id, startDate.value)
    slots.value = response.data
    currentStep.value = 3
  } catch (error) {
    console.error('Error loading slots:', error)
  } finally {
    loading.value = false
  }
}

const confirmBooking = async () => {
  if (!selectedWorkspace.value) return

  loading.value = true
  try {
    const booking = await bookingStore.createBooking(
      selectedWorkspace.value.id,
      startDate.value,
      endDate.value
    )
    alert('Бронирование создано! ID: ' + booking.id)
    // Редирект на оплату
    // router.push(`/payment/checkout/${booking.id}`)
  } catch (error) {
    console.error('Error creating booking:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadWorkTypes()
})
</script>

<template>
  <div class="booking-creation">
    <!-- Шаг 1: Выбор дат -->
    <div v-if="currentStep === 1" class="step">
      <h2>Выберите даты бронирования</h2>
      <div class="form-group">
        <label>Начало:</label>
        <input v-model="startDate" type="date">
      </div>
      <div class="form-group">
        <label>Конец:</label>
        <input v-model="endDate" type="date">
      </div>
      <div class="form-group">
        <label>Тип работы (опционально):</label>
        <select v-model="selectedWorkType">
          <option value="">Любой тип</option>
          <option v-for="wt in workTypes" :key="wt.id" :value="wt.id">
            {{ wt.type_name }}
          </option>
        </select>
      </div>
      <button @click="searchAvailable" :disabled="!canSearch || loading">
        {{ loading ? 'Поиск...' : 'Найти рабочие места' }}
      </button>
    </div>

    <!-- Шаг 2: Выбор рабочего места -->
    <div v-if="currentStep === 2" class="step">
      <h2>Выберите рабочее место</h2>
      <div class="workspaces-grid">
        <div 
          v-for="workspace in availableWorkspaces" 
          :key="workspace.id"
          class="workspace-card"
          @click="selectWorkspace(workspace)"
        >
          <h3>{{ workspace.workspace_name }}</h3>
          <p>Тип: {{ workspace.work_type.type_name }}</p>
          <p>Цена: {{ workspace.price }} ₽</p>
        </div>
      </div>
      <button @click="currentStep = 1" class="btn-back">Назад</button>
    </div>

    <!-- Шаг 3: Подтверждение -->
    <div v-if="currentStep === 3" class="step">
      <h2>Подтверждение бронирования</h2>
      <div class="confirmation">
        <p><strong>Рабочее место:</strong> {{ selectedWorkspace?.workspace_name }}</p>
        <p><strong>Начало:</strong> {{ new Date(startDate).toLocaleDateString('ru-RU') }}</p>
        <p><strong>Конец:</strong> {{ new Date(endDate).toLocaleDateString('ru-RU') }}</p>
        <p><strong>Цена:</strong> {{ selectedWorkspace?.price }} ₽</p>
      </div>
      <button @click="confirmBooking" :disabled="loading">
        {{ loading ? 'Создание...' : 'Забронировать' }}
      </button>
      <button @click="currentStep = 2" class="btn-back">Назад</button>
    </div>
  </div>
</template>

<style scoped>
.booking-creation {
  max-width: 800px;
  margin: 40px auto;
}

.step {
  background: white;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #333;
}

input, select {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 16px;
}

button {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  margin-right: 10px;
}

button:hover:not(:disabled) {
  opacity: 0.9;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-back {
  background: #999;
}

.workspaces-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.workspace-card {
  padding: 15px;
  border: 2px solid #eee;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.workspace-card:hover {
  border-color: #667eea;
  box-shadow: 0 2px 10px rgba(102, 126, 234, 0.2);
}

.confirmation {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
}

.confirmation p {
  margin: 10px 0;
  color: #555;
}
</style>
```

---

## 4. Интеграция платежей YooKassa

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { paymentService, bookingService } from '../services/api'

const route = useRoute()
const bookingId = route.params.bookingId
const booking = ref(null)
const loading = ref(false)
const error = ref(null)
const paymentStatus = ref(null)

const loadBooking = async () => {
  try {
    // Получить информацию о бронировании
    const allBookings = await bookingService.getAll()
    booking.value = allBookings.data.find(b => b.id === parseInt(bookingId))
  } catch (err) {
    error.value = err.message
  }
}

const initiatePayment = async () => {
  loading.value = true
  error.value = null
  try {
    const response = await paymentService.createCheckout(bookingId)
    // YooKassa вернёт confirmation_url для редиректа
    if (response.data.confirmation?.confirmation_url) {
      window.location.href = response.data.confirmation.confirmation_url
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const checkPaymentStatus = async () => {
  try {
    const response = await paymentService.getStatus(bookingId)
    paymentStatus.value = response.data
  } catch (err) {
    error.value = err.message
  }
}

onMounted(() => {
  loadBooking()
})
</script>

<template>
  <div class="payment-checkout">
    <h2>Оплата бронирования</h2>
    
    <div v-if="booking" class="booking-info">
      <p><strong>Рабочее место:</strong> {{ booking.workspace?.workspace_name }}</p>
      <p><strong>Начало:</strong> {{ new Date(booking.start_date).toLocaleDateString('ru-RU') }}</p>
      <p><strong>Конец:</strong> {{ new Date(booking.end_date).toLocaleDateString('ru-RU') }}</p>
      <p><strong>Сумма:</strong> <strong class="price">{{ booking.price }} ₽</strong></p>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
    
    <div class="actions">
      <button @click="initiatePayment" :disabled="loading">
        {{ loading ? 'Загрузка...' : 'Оплатить' }}
      </button>
      <button @click="checkPaymentStatus" class="btn-check">
        Проверить статус
      </button>
    </div>

    <div v-if="paymentStatus" class="status">
      <p><strong>Статус платежа:</strong> {{ paymentStatus.status }}</p>
      <p v-if="paymentStatus.receipt_id"><strong>ID чека:</strong> {{ paymentStatus.receipt_id }}</p>
    </div>
  </div>
</template>

<style scoped>
.payment-checkout {
  max-width: 600px;
  margin: 40px auto;
  padding: 30px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

h2 {
  text-align: center;
  margin-bottom: 30px;
}

.booking-info {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.booking-info p {
  margin: 10px 0;
}

.price {
  color: #667eea;
  font-size: 20px;
}

.actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

button {
  flex: 1;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  font-size: 16px;
}

button:hover:not(:disabled) {
  opacity: 0.9;
}

button:disabled {
  opacity: 0.5;
}

.btn-check {
  background: #0984e3;
  flex: 0.5;
}

.error {
  background: #fee;
  color: #c33;
  padding: 12px;
  border-radius: 5px;
  margin-bottom: 20px;
}

.status {
  background: #e8f5e9;
  padding: 12px;
  border-radius: 5px;
  color: #2e7d32;
}

.status p {
  margin: 8px 0;
}
</style>
```

---

## 5. Обновлённый Router с новыми маршрутами

```javascript
// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import UserDashboard from '../views/UserDashboard.vue'
import AdminDashboard from '../views/AdminDashboard.vue'
import BookingCreation from '../views/BookingCreation.vue'
import PaymentCheckout from '../views/PaymentCheckout.vue'
import UserProfile from '../views/UserProfile.vue'
import ReportsPage from '../views/ReportsPage.vue'
import WorkspaceManagement from '../views/WorkspaceManagement.vue'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/login', component: LoginView },
  { path: '/register', component: RegisterView },
  
  // Пользователь
  {
    path: '/bookings',
    component: UserDashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/bookings/create',
    component: BookingCreation,
    meta: { requiresAuth: true }
  },
  {
    path: '/payment/checkout/:bookingId',
    component: PaymentCheckout,
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    component: UserProfile,
    meta: { requiresAuth: true }
  },
  
  // Админ
  {
    path: '/admin',
    component: AdminDashboard,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/workspaces',
    component: WorkspaceManagement,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/reports',
    component: ReportsPage,
    meta: { requiresAuth: true, requiresAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (!authStore.user) {
    authStore.loadUserFromStorage()
  }

  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      next('/login')
      return
    }

    if (to.meta.requiresAdmin && !authStore.isAdmin) {
      next('/bookings')
      return
    }
  }

  if ((to.path === '/login' || to.path === '/register') && authStore.isAuthenticated) {
    next(authStore.isAdmin ? '/admin' : '/bookings')
    return
  }

  next()
})

export default router
```

---

Это основа для полной интеграции с Backend! 🚀 Используйте эти примеры как стартовую точку и адаптируйте под вашу специфику.
