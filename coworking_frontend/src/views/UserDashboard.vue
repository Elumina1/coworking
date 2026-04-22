<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { bookingService } from '../services/api'

const router = useRouter()
const authStore = useAuthStore()

const bookings = ref([])
const loading = ref(false)

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

const loadBookings = async () => {
  loading.value = true
  try {
    const response = await bookingService.getMyBookings()
    bookings.value = response.data
  } catch (error) {
    console.error('Error loading bookings:', error)
  } finally {
    loading.value = false
  }
}

const cancelBooking = async (id) => {
  if (confirm('Вы уверены?')) {
    try {
      await bookingService.cancelBooking(id)
      loadBookings()
    } catch (error) {
      console.error('Error cancelling booking:', error)
    }
  }
}

onMounted(() => {
  loadBookings()
})
</script>

<template>
  <div class="user-dashboard">
    <nav class="navbar">
      <div class="navbar-left">
        <h2>👤 Мои Бронирования</h2>
      </div>
      <div class="navbar-right">
        <span class="user-info">{{ authStore.user?.full_name }}</span>
        <button @click="handleLogout" class="btn-logout">Выход</button>
      </div>
    </nav>

    <div class="container">
      <div v-if="loading" class="loading">Загрузка...</div>

      <div v-else-if="bookings.length === 0" class="empty">
        <p>У вас нет бронирований</p>
      </div>

      <div v-else class="bookings-grid">
        <div v-for="booking in bookings" :key="booking.id" class="booking-card">
          <div class="booking-header">
            <h3>Рабочее место #{{ booking.workspace_id }}</h3>
            <span :class="['status', booking.booking_status]">
              {{ booking.booking_status }}
            </span>
          </div>

          <div class="booking-details">
            <p><strong>Начало:</strong> {{ new Date(booking.start_date).toLocaleString('ru-RU') }}</p>
            <p><strong>Конец:</strong> {{ new Date(booking.end_date).toLocaleString('ru-RU') }}</p>
            <p v-if="booking.price"><strong>Цена:</strong> {{ booking.price }} ₽</p>
          </div>

          <div class="booking-actions">
            <button 
              v-if="booking.booking_status === 'pending'" 
              @click="cancelBooking(booking.id)"
              class="btn-cancel"
            >
              Отменить
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-dashboard {
  min-height: 100vh;
  background: #f5f5f5;
  font-family: Arial, sans-serif;
}

.navbar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.navbar-left h2 {
  margin: 0;
  font-size: 24px;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-info {
  font-size: 14px;
}

.btn-logout {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid white;
  padding: 8px 16px;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.3s;
}

.btn-logout:hover {
  background: rgba(255, 255, 255, 0.3);
}

.container {
  max-width: 1200px;
  margin: 40px auto;
  padding: 0 20px;
}

.loading {
  text-align: center;
  padding: 40px;
  font-size: 18px;
  color: #666;
}

.empty {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 10px;
  color: #999;
  font-size: 18px;
}

.bookings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.booking-card {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.booking-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
}

.booking-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.booking-header h3 {
  margin: 0;
  color: #333;
}

.status {
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}

.status.pending {
  background: #ffeaa7;
  color: #d63031;
}

.status.confirmed {
  background: #55efc4;
  color: #00b894;
}

.status.completed {
  background: #74b9ff;
  color: #0984e3;
}

.status.cancelled {
  background: #fab1a0;
  color: #d63031;
}

.booking-details {
  margin-bottom: 15px;
  color: #555;
  font-size: 14px;
}

.booking-details p {
  margin: 8px 0;
}

.booking-actions {
  display: flex;
  gap: 10px;
}

.btn-cancel {
  flex: 1;
  padding: 10px;
  background: #d63031;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.3s;
}

.btn-cancel:hover {
  background: #e17055;
}
</style>
