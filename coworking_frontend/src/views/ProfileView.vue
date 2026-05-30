<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { bookingService, profileService } from '../services/api'

const router = useRouter()
const authStore = useAuthStore()

const profileLoading = ref(false)
const bookingsLoading = ref(false)
const profileSubmitting = ref(false)
const passwordSubmitting = ref(false)
const settingsSubmitting = ref(false)

const profileMessage = ref('')
const passwordMessage = ref('')
const settingsMessage = ref('')
const bookingsMessage = ref('')

const profileForm = ref({
  full_name: '',
  second_name: '',
  email: ''
})

const passwordForm = ref({
  current_password: '',
  new_password: '',
  repeat_password: ''
})

const notificationSettings = ref({
  bookingCreated: true,
  paymentChanged: true,
  reminders: true,
  receipts: true
})

const bookings = ref([])

const enrichedBookings = computed(() =>
  bookings.value.map((booking) => ({
    ...booking,
    latestPayment: Array.isArray(booking.payments) && booking.payments.length > 0 ? booking.payments[0] : null
  }))
)

const paidBookings = computed(() =>
  enrichedBookings.value.filter((booking) => booking.latestPayment)
)

const paidTotal = computed(() =>
  paidBookings.value.reduce((sum, booking) => {
    const status = booking.latestPayment?.payment_status
    if (status !== 'succeeded') {
      return sum
    }
    return sum + Number(booking.latestPayment?.amount || booking.total_price || 0)
  }, 0)
)

const activeBookingsCount = computed(() =>
  enrichedBookings.value.filter((booking) => ['pending', 'confirmed'].includes(booking.booking_status)).length
)

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback

const formatMoney = (value) =>
  Number(value || 0).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

const formatDate = (value) => {
  if (!value) {
    return 'Не указано'
  }
  return new Date(value).toLocaleDateString('ru-RU')
}

const formatDateTime = (value) => {
  if (!value) {
    return 'Не указано'
  }
  return new Date(value).toLocaleString('ru-RU')
}

const getPaymentStatusLabel = (status) => {
  const map = {
    pending: 'Ожидает оплаты',
    waiting_for_capture: 'Ожидает подтверждения',
    succeeded: 'Оплачено',
    canceled: 'Отменён',
    refunded: 'Возврат',
    failed: 'Ошибка'
  }

  return map[status] || status || 'Не создан'
}

const loadNotificationSettings = () => {
  const savedSettings = localStorage.getItem('notificationSettings')
  if (!savedSettings) {
    return
  }

  notificationSettings.value = {
    ...notificationSettings.value,
    ...JSON.parse(savedSettings)
  }
}

const loadProfile = async () => {
  profileLoading.value = true
  try {
    const response = await profileService.get()
    profileForm.value = {
      full_name: response.data.full_name || '',
      second_name: response.data.second_name || '',
      email: response.data.email || ''
    }
    authStore.updateStoredUser(response.data)
  } catch (error) {
    profileMessage.value = getErrorMessage(error, 'Не удалось загрузить профиль')
  } finally {
    profileLoading.value = false
  }
}

const loadBookings = async () => {
  bookingsLoading.value = true
  try {
    const response = await bookingService.getMyBookings()
    bookings.value = response.data
  } catch (error) {
    bookingsMessage.value = getErrorMessage(error, 'Не удалось загрузить историю бронирований')
  } finally {
    bookingsLoading.value = false
  }
}

const updateProfile = async () => {
  profileMessage.value = ''

  if (!profileForm.value.full_name.trim() || !profileForm.value.second_name.trim() || !profileForm.value.email.trim()) {
    profileMessage.value = 'Заполните ФИО и email'
    return
  }

  profileSubmitting.value = true
  try {
    const response = await profileService.update({
      full_name: profileForm.value.full_name.trim(),
      second_name: profileForm.value.second_name.trim(),
      email: profileForm.value.email.trim()
    })
    authStore.updateStoredUser(response.data)
    profileMessage.value = 'Профиль обновлён'
  } catch (error) {
    profileMessage.value = getErrorMessage(error, 'Не удалось обновить профиль')
  } finally {
    profileSubmitting.value = false
  }
}

const changePassword = async () => {
  passwordMessage.value = ''

  if (!passwordForm.value.current_password || !passwordForm.value.new_password) {
    passwordMessage.value = 'Укажите текущий и новый пароль'
    return
  }

  if (passwordForm.value.new_password !== passwordForm.value.repeat_password) {
    passwordMessage.value = 'Новые пароли не совпадают'
    return
  }

  passwordSubmitting.value = true
  try {
    await profileService.changePassword({
      current_password: passwordForm.value.current_password,
      new_password: passwordForm.value.new_password
    })
    passwordForm.value = {
      current_password: '',
      new_password: '',
      repeat_password: ''
    }
    passwordMessage.value = 'Пароль обновлён'
  } catch (error) {
    passwordMessage.value = getErrorMessage(error, 'Не удалось сменить пароль')
  } finally {
    passwordSubmitting.value = false
  }
}

const saveNotificationSettings = () => {
  settingsSubmitting.value = true
  localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings.value))

  window.setTimeout(() => {
    settingsMessage.value = 'Настройки уведомлений сохранены'
    settingsSubmitting.value = false
  }, 250)
}

const downloadReceipt = (booking) => {
  const payment = booking.latestPayment
  const lines = [
    'Чек по бронированию',
    `Бронирование: #${booking.id}`,
    `Место: ${booking.workspace?.workspace_name || `#${booking.workspace_id}`}`,
    `Период: ${formatDate(booking.start_date)} - ${formatDate(booking.end_date)}`,
    `Сумма: ${formatMoney(payment?.amount || booking.total_price)} руб.`,
    `Статус оплаты: ${getPaymentStatusLabel(payment?.payment_status)}`,
    `ID платежа: ${payment?.external_id || 'Не указан'}`,
    `ID чека: ${payment?.receipt_id || 'Не сформирован'}`,
    `Дата платежа: ${formatDateTime(payment?.created_at)}`
  ]

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `receipt-booking-${booking.id}.txt`
  link.click()
  URL.revokeObjectURL(url)
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

onMounted(async () => {
  loadNotificationSettings()
  await Promise.all([loadProfile(), loadBookings()])
})
</script>

<template>
  <div class="profile-page">
    <nav class="navbar">
      <div class="navbar-left">
        <p class="eyebrow">Coworking Booking</p>
        <h1>Профиль пользователя</h1>
      </div>
      <div class="navbar-right">
        <button class="nav-button" @click="router.push('/user')">К бронированию</button>
        <span class="user-pill">{{ authStore.user?.full_name }} {{ authStore.user?.second_name }}</span>
        <button class="btn-logout" @click="handleLogout">Выход</button>
      </div>
    </nav>

    <main class="container">
      <section class="profile-summary">
        <div>
          <p class="hero-kicker">Личный кабинет</p>
          <h2>{{ authStore.user?.full_name }} {{ authStore.user?.second_name }}</h2>
          <p>{{ authStore.user?.email }}</p>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <span>Всего броней</span>
            <strong>{{ bookings.length }}</strong>
          </div>
          <div class="summary-card">
            <span>Активных</span>
            <strong>{{ activeBookingsCount }}</strong>
          </div>
          <div class="summary-card">
            <span>Оплачено</span>
            <strong>{{ formatMoney(paidTotal) }} ₽</strong>
          </div>
        </div>
      </section>

      <section class="profile-layout">
        <div class="profile-panel">
          <div class="panel-header">
            <div>
              <h3>Данные аккаунта</h3>
              <p>ФИО и email используются в бронированиях, платежах и письмах.</p>
            </div>
          </div>

          <div v-if="profileLoading" class="loading-state compact">Загрузка профиля...</div>

          <form v-else class="form-grid" @submit.prevent="updateProfile">
            <label class="field">
              <span>Имя</span>
              <input v-model="profileForm.full_name" type="text" autocomplete="given-name">
            </label>
            <label class="field">
              <span>Фамилия</span>
              <input v-model="profileForm.second_name" type="text" autocomplete="family-name">
            </label>
            <label class="field wide">
              <span>Email</span>
              <input v-model="profileForm.email" type="email" autocomplete="email">
            </label>

            <p v-if="profileMessage" :class="['message', profileMessage.includes('обновлён') ? 'success' : 'error']">
              {{ profileMessage }}
            </p>

            <button class="btn-primary" :disabled="profileSubmitting" type="submit">
              {{ profileSubmitting ? 'Сохраняем...' : 'Сохранить профиль' }}
            </button>
          </form>
        </div>

        <div class="profile-panel">
          <div class="panel-header">
            <div>
              <h3>Пароль</h3>
              <p>Для безопасности нужно подтвердить текущий пароль.</p>
            </div>
          </div>

          <form class="form-grid" @submit.prevent="changePassword">
            <label class="field wide">
              <span>Текущий пароль</span>
              <input v-model="passwordForm.current_password" type="password" autocomplete="current-password">
            </label>
            <label class="field">
              <span>Новый пароль</span>
              <input v-model="passwordForm.new_password" type="password" autocomplete="new-password">
            </label>
            <label class="field">
              <span>Повторите пароль</span>
              <input v-model="passwordForm.repeat_password" type="password" autocomplete="new-password">
            </label>

            <p v-if="passwordMessage" :class="['message', passwordMessage.includes('обновлён') ? 'success' : 'error']">
              {{ passwordMessage }}
            </p>

            <button class="btn-primary" :disabled="passwordSubmitting" type="submit">
              {{ passwordSubmitting ? 'Обновляем...' : 'Сменить пароль' }}
            </button>
          </form>
        </div>
      </section>

      <section class="profile-panel">
        <div class="panel-header">
          <div>
            <h3>Настройки уведомлений</h3>
            <p>Выберите, какие события должны оставаться включёнными в личном кабинете.</p>
          </div>
        </div>

        <div class="settings-grid">
          <label class="toggle-row">
            <input v-model="notificationSettings.bookingCreated" type="checkbox">
            <span>
              <strong>Создание бронирования</strong>
              <em>Подтверждение после оформления заявки.</em>
            </span>
          </label>
          <label class="toggle-row">
            <input v-model="notificationSettings.paymentChanged" type="checkbox">
            <span>
              <strong>Изменения оплаты</strong>
              <em>Успешная оплата, отмена или возврат.</em>
            </span>
          </label>
          <label class="toggle-row">
            <input v-model="notificationSettings.reminders" type="checkbox">
            <span>
              <strong>Напоминания</strong>
              <em>Сообщения перед началом бронирования.</em>
            </span>
          </label>
          <label class="toggle-row">
            <input v-model="notificationSettings.receipts" type="checkbox">
            <span>
              <strong>Чеки и документы</strong>
              <em>Ссылки на чеки и документы по оплате.</em>
            </span>
          </label>
        </div>

        <p v-if="settingsMessage" class="message success">{{ settingsMessage }}</p>
        <button class="btn-primary settings-button" :disabled="settingsSubmitting" @click="saveNotificationSettings">
          {{ settingsSubmitting ? 'Сохраняем...' : 'Сохранить настройки' }}
        </button>
      </section>

      <section class="profile-panel">
        <div class="panel-header">
          <div>
            <h3>История бронирований, платежи и чеки</h3>
            <p>Все операции по аккаунту собраны в одной ленте.</p>
          </div>
        </div>

        <p v-if="bookingsMessage" class="message error">{{ bookingsMessage }}</p>
        <div v-if="bookingsLoading" class="loading-state">Загрузка истории...</div>
        <div v-else-if="enrichedBookings.length === 0" class="empty-state wide">
          <p>История пока пустая.</p>
        </div>

        <div v-else class="history-list">
          <article v-for="booking in enrichedBookings" :key="booking.id" class="history-card">
            <div class="history-main">
              <div>
                <p class="booking-card-type">Бронирование #{{ booking.id }}</p>
                <h4>{{ booking.workspace?.workspace_name || `Место #${booking.workspace_id}` }}</h4>
                <p>{{ formatDate(booking.start_date) }} - {{ formatDate(booking.end_date) }}</p>
              </div>
              <span :class="['status-chip', booking.booking_status]">{{ booking.booking_status }}</span>
            </div>

            <div class="history-meta">
              <span>Итого: <strong>{{ formatMoney(booking.total_price) }} ₽</strong></span>
              <span>
                Оплата:
                <strong>{{ getPaymentStatusLabel(booking.latestPayment?.payment_status) }}</strong>
              </span>
              <span v-if="booking.latestPayment?.receipt_id">
                Чек: <strong>{{ booking.latestPayment.receipt_id }}</strong>
              </span>
            </div>

            <div v-if="booking.latestPayment" class="receipt-row">
              <button class="btn-secondary-action" @click="downloadReceipt(booking)">
                Скачать чек
              </button>
              <span>ID платежа: {{ booking.latestPayment.external_id || 'не указан' }}</span>
            </div>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(244, 141, 91, 0.16), transparent 30%),
    linear-gradient(180deg, #f2ece2 0%, #e9dfd1 100%);
  color: #2d241c;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  padding: 28px 36px;
  background: linear-gradient(135deg, #0f4c5c 0%, #143847 100%);
  color: #fdf7ef;
  box-shadow: 0 22px 50px rgba(20, 56, 71, 0.18);
}

.eyebrow,
.hero-kicker,
.booking-card-type {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  font-weight: 700;
  opacity: 0.78;
}

.navbar-left h1 {
  margin: 6px 0 0;
  font-size: 2rem;
  line-height: 1.05;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.user-pill,
.nav-button {
  padding: 10px 14px;
  border: 1px solid rgba(253, 247, 239, 0.22);
  border-radius: 999px;
  background: rgba(253, 247, 239, 0.1);
  color: #fdf7ef;
}

.nav-button,
.btn-logout {
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.btn-logout {
  border: 1px solid rgba(253, 247, 239, 0.4);
  background: transparent;
  color: #fdf7ef;
  padding: 10px 16px;
  border-radius: 12px;
}

.nav-button:hover,
.btn-logout:hover {
  background: rgba(253, 247, 239, 0.12);
  transform: translateY(-1px);
}

.container {
  max-width: 1240px;
  margin: 0 auto;
  padding: 28px 20px 40px;
}

.profile-summary,
.profile-panel {
  background: rgba(255, 250, 243, 0.94);
  border: 1px solid rgba(95, 72, 54, 0.08);
  border-radius: 28px;
  box-shadow: 0 20px 48px rgba(95, 72, 54, 0.08);
}

.profile-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(340px, 0.8fr);
  gap: 22px;
  align-items: end;
  padding: 24px 26px;
  margin-bottom: 22px;
}

.profile-summary h2 {
  margin: 6px 0 8px;
  font-size: 1.8rem;
}

.profile-summary p:last-child {
  color: #65584a;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  display: grid;
  gap: 8px;
  padding: 16px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid rgba(95, 72, 54, 0.08);
}

.summary-card span {
  color: #6f6254;
  font-size: 0.88rem;
}

.summary-card strong {
  color: #143847;
  font-size: 1.25rem;
}

.profile-layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin-bottom: 22px;
}

.profile-panel {
  padding: 24px;
  margin-bottom: 22px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.35rem;
}

.panel-header p {
  margin: 6px 0 0;
  color: #6f6254;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.field {
  display: grid;
  gap: 8px;
  color: #4d4035;
  font-weight: 600;
}

.field.wide,
.message,
.form-grid .btn-primary {
  grid-column: 1 / -1;
}

.field input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #d7c8b6;
  border-radius: 14px;
  background: #fff;
  color: #2d241c;
  font: inherit;
}

.field input:focus {
  outline: none;
  border-color: #1c7cff;
  box-shadow: 0 0 0 3px rgba(28, 124, 255, 0.14);
}

.btn-primary,
.btn-secondary-action {
  border: none;
  border-radius: 14px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.btn-primary {
  justify-self: start;
  padding: 12px 16px;
  background: linear-gradient(135deg, #ff8a47 0%, #e96a2c 100%);
  color: #fff8f2;
}

.btn-secondary-action {
  padding: 11px 14px;
  background: #e8ddd0;
  color: #43382e;
}

.btn-primary:hover,
.btn-secondary-action:hover {
  transform: translateY(-1px);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.message {
  margin: 0;
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 0.95rem;
}

.message.error {
  background: rgba(198, 83, 74, 0.14);
  color: #8e3129;
}

.message.success {
  background: rgba(15, 143, 88, 0.12);
  color: #0f6a43;
}

.loading-state,
.empty-state {
  min-height: 180px;
  display: grid;
  place-items: center;
  text-align: center;
  color: #7b6f63;
}

.loading-state.compact {
  min-height: 140px;
}

.empty-state.wide {
  min-height: 140px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.toggle-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: start;
  padding: 16px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid rgba(95, 72, 54, 0.08);
}

.toggle-row input {
  width: 20px;
  height: 20px;
  margin-top: 2px;
  accent-color: #0f8f58;
}

.toggle-row span {
  display: grid;
  gap: 4px;
}

.toggle-row em {
  color: #6f6254;
  font-style: normal;
  font-size: 0.92rem;
}

.settings-button {
  margin-top: 2px;
}

.history-list {
  display: grid;
  gap: 14px;
}

.history-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 20px;
  background: #fff;
  border: 1px solid rgba(95, 72, 54, 0.08);
}

.history-main,
.history-meta,
.receipt-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.history-main h4 {
  margin: 4px 0 6px;
  font-size: 1.15rem;
}

.history-main p:last-child,
.receipt-row span {
  color: #6f6254;
}

.history-meta {
  justify-content: flex-start;
  color: #5e5145;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
}

.status-chip.pending {
  background: rgba(255, 183, 77, 0.18);
  color: #9a5e04;
}

.status-chip.confirmed {
  background: rgba(0, 210, 106, 0.14);
  color: #0b7a47;
}

.status-chip.completed {
  background: rgba(28, 124, 255, 0.14);
  color: #174f99;
}

.status-chip.cancelled {
  background: rgba(198, 83, 74, 0.14);
  color: #8e3129;
}

@media (max-width: 980px) {
  .profile-summary,
  .profile-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .navbar {
    flex-direction: column;
    align-items: flex-start;
    padding: 22px 20px;
  }

  .container {
    padding: 20px 14px 32px;
  }

  .summary-grid,
  .settings-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
