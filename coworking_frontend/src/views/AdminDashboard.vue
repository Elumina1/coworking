<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { adminService, workTypeService, workspaceService, bookingService, userService, priceService, reportService } from '../services/api'

const router = useRouter()
const authStore = useAuthStore()

const activeTab = ref('bookings')
const loading = ref(false)
const resourceLoading = ref(false)

const bookings = ref([])
const workTypes = ref([])
const workspaces = ref([])
const users = ref([])
const prices = ref([])

const bookingActionLoadingId = ref(null)
const workTypeSubmitting = ref(false)
const workspaceSubmitting = ref(false)
const workTypeActionId = ref(null)
const workspaceActionId = ref(null)
const adminSubmitting = ref(false)
const priceSubmitting = ref(false)
const priceActionId = ref(null)
const reportsLoading = ref(false)

const workTypeMessage = ref('')
const workspaceMessage = ref('')
const actionMessage = ref('')
const adminMessage = ref('')
const priceMessage = ref('')
const reportsMessage = ref('')

const newWorkType = ref({
  type_name: ''
})

const newWorkspace = ref({
  work_type_id: '',
  workspace_name: '',
  is_available: true
})

const editingWorkTypeId = ref(null)
const editingWorkspaceId = ref(null)

const workTypeEditForm = ref({
  type_name: ''
})

const workspaceEditForm = ref({
  work_type_id: '',
  workspace_name: '',
  is_available: true
})

const newPrice = ref({
  work_type_id: '',
  price_day: ''
})

const editingPriceId = ref(null)
const priceEditForm = ref({
  work_type_id: '',
  price_day: ''
})

const newAdmin = ref({
  full_name: '',
  second_name: '',
  email: '',
  password: ''
})

const formatDateForInput = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const today = new Date()
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

const reportFilters = ref({
  start_date: formatDateForInput(monthStart),
  end_date: formatDateForInput(today),
  group_by: 'month'
})

const occupancyReport = ref(null)
const revenueReport = ref(null)
const popularWorkTypesReport = ref([])
const userBookingsReport = ref([])

const adminUsers = computed(() => users.value.filter((user) => user.role_id === 1))
const pricesWithType = computed(() =>
  prices.value.map((price) => ({
    ...price,
    workTypeName:
      workTypes.value.find((item) => item.id === price.work_type_id)?.type_name || 'Неизвестный тип'
  }))
)
const latestPrices = computed(() => {
  const latestByType = new Map()

  pricesWithType.value.forEach((price) => {
    if (!latestByType.has(price.work_type_id)) {
      latestByType.set(price.work_type_id, price)
    }
  })

  return Array.from(latestByType.values())
})

const workspacesWithType = computed(() =>
  workspaces.value.map((workspace) => ({
    ...workspace,
    workTypeName:
      workTypes.value.find((item) => item.id === workspace.work_type_id)?.type_name || 'Неизвестный тип'
  }))
)

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

const resetMessages = () => {
  workTypeMessage.value = ''
  workspaceMessage.value = ''
  actionMessage.value = ''
  adminMessage.value = ''
  priceMessage.value = ''
  reportsMessage.value = ''
}

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback

const loadBookings = async () => {
  loading.value = true
  try {
    const response = await adminService.getAllBookings()
    bookings.value = response.data
  } catch (error) {
    actionMessage.value = getErrorMessage(error, 'Не удалось загрузить бронирования')
  } finally {
    loading.value = false
  }
}

const loadResources = async () => {
  resourceLoading.value = true
  try {
    const [workTypesResponse, workspacesResponse, usersResponse, pricesResponse] = await Promise.all([
      workTypeService.getAll(),
      workspaceService.getAll(),
      userService.getAll()
      ,
      priceService.getAll()
    ])

    workTypes.value = workTypesResponse.data
    workspaces.value = workspacesResponse.data
    users.value = usersResponse.data
    prices.value = pricesResponse.data
  } catch (error) {
    const message = getErrorMessage(error, 'Не удалось загрузить данные панели администратора')
    workTypeMessage.value = message
    workspaceMessage.value = message
    adminMessage.value = message
    priceMessage.value = message
  } finally {
    resourceLoading.value = false
  }
}

const createWorkType = async () => {
  workTypeMessage.value = ''

  const typeName = newWorkType.value.type_name.trim()
  if (!typeName) {
    workTypeMessage.value = 'Введите название нового типа рабочего места'
    return
  }

  workTypeSubmitting.value = true
  try {
    await workTypeService.create({ type_name: typeName })
    newWorkType.value.type_name = ''
    workTypeMessage.value = 'Тип рабочего места успешно добавлен'
    await loadResources()
  } catch (error) {
    workTypeMessage.value = getErrorMessage(error, 'Не удалось создать тип рабочего места')
  } finally {
    workTypeSubmitting.value = false
  }
}

const createWorkspace = async () => {
  workspaceMessage.value = ''

  const workspaceName = newWorkspace.value.workspace_name.trim()
  const workTypeId = Number(newWorkspace.value.work_type_id)

  if (!workTypeId) {
    workspaceMessage.value = 'Выберите тип рабочего места'
    return
  }

  if (!workspaceName) {
    workspaceMessage.value = 'Введите название рабочего места'
    return
  }

  workspaceSubmitting.value = true
  try {
    await workspaceService.create({
      work_type_id: workTypeId,
      workspace_name: workspaceName,
      is_available: Boolean(newWorkspace.value.is_available)
    })

    newWorkspace.value = {
      work_type_id: '',
      workspace_name: '',
      is_available: true
    }

    workspaceMessage.value = 'Рабочее место успешно добавлено'
    await loadResources()
  } catch (error) {
    workspaceMessage.value = getErrorMessage(error, 'Не удалось создать рабочее место')
  } finally {
    workspaceSubmitting.value = false
  }
}

const startWorkTypeEdit = (workType) => {
  workTypeMessage.value = ''
  editingWorkTypeId.value = workType.id
  workTypeEditForm.value = {
    type_name: workType.type_name
  }
}

const cancelWorkTypeEdit = () => {
  editingWorkTypeId.value = null
  workTypeEditForm.value = {
    type_name: ''
  }
}

const updateWorkType = async (id) => {
  workTypeMessage.value = ''
  const typeName = workTypeEditForm.value.type_name.trim()

  if (!typeName) {
    workTypeMessage.value = 'Введите название типа рабочего места'
    return
  }

  workTypeActionId.value = id
  try {
    await workTypeService.update(id, { type_name: typeName })
    workTypeMessage.value = `Тип #${id} успешно обновлён`
    cancelWorkTypeEdit()
    await loadResources()
  } catch (error) {
    workTypeMessage.value = getErrorMessage(error, 'Не удалось обновить тип рабочего места')
  } finally {
    workTypeActionId.value = null
  }
}

const deleteWorkType = async (id) => {
  if (!confirm('Удалить тип рабочего места?')) {
    return
  }

  workTypeMessage.value = ''
  workTypeActionId.value = id
  try {
    await workTypeService.delete(id)
    workTypeMessage.value = `Тип #${id} удалён`
    if (editingWorkTypeId.value === id) {
      cancelWorkTypeEdit()
    }
    await loadResources()
  } catch (error) {
    workTypeMessage.value = getErrorMessage(error, 'Не удалось удалить тип рабочего места')
  } finally {
    workTypeActionId.value = null
  }
}

const startWorkspaceEdit = (workspace) => {
  workspaceMessage.value = ''
  editingWorkspaceId.value = workspace.id
  workspaceEditForm.value = {
    work_type_id: String(workspace.work_type_id),
    workspace_name: workspace.workspace_name,
    is_available: Boolean(workspace.is_available)
  }
}

const cancelWorkspaceEdit = () => {
  editingWorkspaceId.value = null
  workspaceEditForm.value = {
    work_type_id: '',
    workspace_name: '',
    is_available: true
  }
}

const updateWorkspace = async (id) => {
  workspaceMessage.value = ''

  const workspaceName = workspaceEditForm.value.workspace_name.trim()
  const workTypeId = Number(workspaceEditForm.value.work_type_id)

  if (!workTypeId) {
    workspaceMessage.value = 'Выберите тип рабочего места'
    return
  }

  if (!workspaceName) {
    workspaceMessage.value = 'Введите название рабочего места'
    return
  }

  workspaceActionId.value = id
  try {
    await workspaceService.update(id, {
      work_type_id: workTypeId,
      workspace_name: workspaceName,
      is_available: Boolean(workspaceEditForm.value.is_available)
    })
    workspaceMessage.value = `Рабочее место #${id} успешно обновлено`
    cancelWorkspaceEdit()
    await loadResources()
  } catch (error) {
    workspaceMessage.value = getErrorMessage(error, 'Не удалось обновить рабочее место')
  } finally {
    workspaceActionId.value = null
  }
}

const deleteWorkspace = async (id) => {
  if (!confirm('Удалить рабочее место?')) {
    return
  }

  workspaceMessage.value = ''
  workspaceActionId.value = id
  try {
    await workspaceService.delete(id)
    workspaceMessage.value = `Рабочее место #${id} удалено`
    if (editingWorkspaceId.value === id) {
      cancelWorkspaceEdit()
    }
    await loadResources()
  } catch (error) {
    workspaceMessage.value = getErrorMessage(error, 'Не удалось удалить рабочее место')
  } finally {
    workspaceActionId.value = null
  }
}

const createAdmin = async () => {
  adminMessage.value = ''

  const payload = {
    full_name: newAdmin.value.full_name.trim(),
    second_name: newAdmin.value.second_name.trim(),
    email: newAdmin.value.email.trim(),
    password: newAdmin.value.password,
    role_id: 1
  }

  if (!payload.full_name || !payload.second_name || !payload.email || !payload.password) {
    adminMessage.value = 'Заполните все поля для нового администратора'
    return
  }

  if (payload.password.length < 6) {
    adminMessage.value = 'Пароль должен содержать минимум 6 символов'
    return
  }

  adminSubmitting.value = true
  try {
    await userService.create(payload)
    newAdmin.value = {
      full_name: '',
      second_name: '',
      email: '',
      password: ''
    }
    adminMessage.value = 'Новый администратор успешно создан'
    await loadResources()
  } catch (error) {
    adminMessage.value = getErrorMessage(error, 'Не удалось создать администратора')
  } finally {
    adminSubmitting.value = false
  }
}

const createPrice = async () => {
  priceMessage.value = ''

  const workTypeId = Number(newPrice.value.work_type_id)
  const priceDay = Number(newPrice.value.price_day)

  if (!workTypeId) {
    priceMessage.value = 'Выберите тип рабочего места'
    return
  }

  if (!Number.isFinite(priceDay) || priceDay <= 0) {
    priceMessage.value = 'Введите корректную цену за день'
    return
  }

  priceSubmitting.value = true
  try {
    await priceService.create({
      work_type_id: workTypeId,
      price_day: priceDay.toFixed(2)
    })
    newPrice.value = {
      work_type_id: '',
      price_day: ''
    }
    priceMessage.value = 'Новая цена успешно установлена'
    await loadResources()
  } catch (error) {
    priceMessage.value = getErrorMessage(error, 'Не удалось установить цену')
  } finally {
    priceSubmitting.value = false
  }
}

const startPriceEdit = (price) => {
  priceMessage.value = ''
  editingPriceId.value = price.id
  priceEditForm.value = {
    work_type_id: String(price.work_type_id),
    price_day: String(price.price_day)
  }
}

const cancelPriceEdit = () => {
  editingPriceId.value = null
  priceEditForm.value = {
    work_type_id: '',
    price_day: ''
  }
}

const updatePrice = async (id) => {
  priceMessage.value = ''

  const workTypeId = Number(priceEditForm.value.work_type_id)
  const priceDay = Number(priceEditForm.value.price_day)

  if (!workTypeId) {
    priceMessage.value = 'Выберите тип рабочего места'
    return
  }

  if (!Number.isFinite(priceDay) || priceDay <= 0) {
    priceMessage.value = 'Введите корректную цену за день'
    return
  }

  priceActionId.value = id
  try {
    await priceService.update(id, {
      work_type_id: workTypeId,
      price_day: priceDay.toFixed(2)
    })
    priceMessage.value = `Цена #${id} успешно обновлена`
    cancelPriceEdit()
    await loadResources()
  } catch (error) {
    priceMessage.value = getErrorMessage(error, 'Не удалось обновить цену')
  } finally {
    priceActionId.value = null
  }
}

const loadReports = async () => {
  reportsMessage.value = ''

  const { start_date, end_date, group_by } = reportFilters.value

  if (!start_date || !end_date) {
    reportsMessage.value = 'Укажите период для построения отчётов'
    return
  }

  if (start_date > end_date) {
    reportsMessage.value = 'Дата начала не может быть позже даты окончания'
    return
  }

  reportsLoading.value = true
  try {
    const [occupancyResponse, revenueResponse, popularResponse, usersResponse] = await Promise.all([
      reportService.getOccupancy(start_date, end_date),
      reportService.getRevenue(start_date, end_date, group_by),
      reportService.getPopularWorkTypes(start_date, end_date),
      reportService.getUserBookings(start_date, end_date)
    ])

    occupancyReport.value = occupancyResponse.data
    revenueReport.value = revenueResponse.data
    popularWorkTypesReport.value = popularResponse.data.popularWorkTypes || []
    userBookingsReport.value = usersResponse.data.userBookings || []
  } catch (error) {
    reportsMessage.value = getErrorMessage(error, 'Не удалось загрузить отчёты')
  } finally {
    reportsLoading.value = false
  }
}

const confirmBooking = async (id) => {
  actionMessage.value = ''
  bookingActionLoadingId.value = id
  try {
    await adminService.confirmBooking(id)
    await loadBookings()
    actionMessage.value = `Бронирование #${id} подтверждено`
  } catch (error) {
    actionMessage.value = getErrorMessage(error, 'Не удалось подтвердить бронирование')
  } finally {
    bookingActionLoadingId.value = null
  }
}

const sendReminder = async (id) => {
  actionMessage.value = ''
  bookingActionLoadingId.value = id
  try {
    await adminService.sendReminder(id)
    actionMessage.value = `Напоминание по бронированию #${id} отправлено`
  } catch (error) {
    actionMessage.value = getErrorMessage(error, 'Не удалось отправить напоминание')
  } finally {
    bookingActionLoadingId.value = null
  }
}

const cancelBooking = async (id) => {
  if (!confirm('Отменить бронирование?')) {
    return
  }

  actionMessage.value = ''
  bookingActionLoadingId.value = id
  try {
    await bookingService.cancelBooking(id)
    await loadBookings()
    actionMessage.value = `Бронирование #${id} отменено`
  } catch (error) {
    actionMessage.value = getErrorMessage(error, 'Не удалось отменить бронирование')
  } finally {
    bookingActionLoadingId.value = null
  }
}

onMounted(async () => {
  resetMessages()
  await Promise.all([loadBookings(), loadResources(), loadReports()])
})
</script>

<template>
  <div class="admin-dashboard">
    <nav class="navbar">
      <div class="navbar-left">
        <h2>Администратор</h2>
      </div>
      <div class="navbar-right">
        <span class="admin-badge">АДМИН</span>
        <span class="user-info">{{ authStore.user?.full_name }} {{ authStore.user?.second_name }}</span>
        <button @click="handleLogout" class="btn-logout">Выход</button>
      </div>
    </nav>

    <div class="container">
      <div class="tabs">
        <button
          @click="activeTab = 'bookings'"
          :class="['tab', { active: activeTab === 'bookings' }]"
        >
          Бронирования
        </button>
        <button
          @click="activeTab = 'worktypes'"
          :class="['tab', { active: activeTab === 'worktypes' }]"
        >
          Типы мест
        </button>
        <button
          @click="activeTab = 'workspaces'"
          :class="['tab', { active: activeTab === 'workspaces' }]"
        >
          Рабочие места
        </button>
        <button
          @click="activeTab = 'stats'"
          :class="['tab', { active: activeTab === 'stats' }]"
        >
          Статистика
        </button>
        <button
          @click="activeTab = 'admins'"
          :class="['tab', { active: activeTab === 'admins' }]"
        >
          Администраторы
        </button>
        <button
          @click="activeTab = 'prices'"
          :class="['tab', { active: activeTab === 'prices' }]"
        >
          Цены
        </button>
        <button
          @click="activeTab = 'reports'"
          :class="['tab', { active: activeTab === 'reports' }]"
        >
          Отчёты
        </button>
        <button
          @click="activeTab = 'settings'"
          :class="['tab', { active: activeTab === 'settings' }]"
        >
          Настройки
        </button>
      </div>

      <div v-show="activeTab === 'bookings'" class="tab-content">
        <div class="section-header">
          <div>
            <h3>Все бронирования</h3>
            <p class="section-subtitle">Подтверждение, напоминания и отмена из кабинета администратора.</p>
          </div>
        </div>

        <p v-if="actionMessage" class="message info">{{ actionMessage }}</p>
        <div v-if="loading" class="loading">Загрузка...</div>

        <div v-else-if="bookings.length === 0" class="empty">
          <p>Бронирований пока нет</p>
        </div>

        <div v-else class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Пользователь</th>
                <th>Рабочее место</th>
                <th>Тип</th>
                <th>Начало</th>
                <th>Конец</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="booking in bookings" :key="booking.id">
                <td>#{{ booking.id }}</td>
                <td>{{ booking.user?.full_name }} {{ booking.user?.second_name }}</td>
                <td>{{ booking.workspace?.workspace_name || `#${booking.workspace_id}` }}</td>
                <td>{{ booking.workspace?.work_type?.type_name || 'Не указан' }}</td>
                <td>{{ new Date(booking.start_date).toLocaleDateString('ru-RU') }}</td>
                <td>{{ new Date(booking.end_date).toLocaleDateString('ru-RU') }}</td>
                <td>
                  <span :class="['status', booking.booking_status]">
                    {{ booking.booking_status }}
                  </span>
                </td>
                <td class="actions">
                  <button
                    v-if="booking.booking_status === 'pending'"
                    @click="confirmBooking(booking.id)"
                    class="btn-confirm"
                    :disabled="bookingActionLoadingId === booking.id"
                  >
                    Подтвердить
                  </button>
                  <button
                    @click="sendReminder(booking.id)"
                    class="btn-remind"
                    :disabled="bookingActionLoadingId === booking.id"
                  >
                    Напомнить
                  </button>
                  <button
                    @click="cancelBooking(booking.id)"
                    class="btn-cancel"
                    :disabled="bookingActionLoadingId === booking.id"
                  >
                    Отменить
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-show="activeTab === 'worktypes'" class="tab-content">
        <div class="section-header">
          <div>
            <h3>Типы рабочих мест</h3>
            <p class="section-subtitle">Создание новых типов через готовый backend-эндпоинт.</p>
          </div>
        </div>

        <div class="management-grid">
          <section class="card">
            <h4>Новый тип</h4>
            <form class="form-grid" @submit.prevent="createWorkType">
              <label class="field">
                <span>Название типа</span>
                <input
                  v-model="newWorkType.type_name"
                  type="text"
                  placeholder="Например, переговорная"
                >
              </label>

              <button type="submit" class="btn-primary" :disabled="workTypeSubmitting">
                {{ workTypeSubmitting ? 'Сохраняем...' : 'Добавить тип' }}
              </button>
            </form>

            <p v-if="workTypeMessage" :class="['message', workTypeMessage.includes('успешно') ? 'success' : 'error']">
              {{ workTypeMessage }}
            </p>
          </section>

          <section class="card">
            <h4>Существующие типы</h4>
            <div v-if="resourceLoading" class="loading small">Загрузка...</div>
            <div v-else-if="workTypes.length === 0" class="empty small">
              <p>Типов рабочих мест пока нет</p>
            </div>
            <div v-else class="list-grid">
              <article v-for="workType in workTypes" :key="workType.id" class="list-item">
                <div v-if="editingWorkTypeId === workType.id" class="inline-edit">
                  <label class="field compact-field">
                    <span>Название</span>
                    <input v-model="workTypeEditForm.type_name" type="text">
                  </label>
                  <div class="item-actions">
                    <button
                      class="btn-confirm"
                      :disabled="workTypeActionId === workType.id"
                      @click="updateWorkType(workType.id)"
                    >
                      Сохранить
                    </button>
                    <button
                      class="btn-secondary"
                      :disabled="workTypeActionId === workType.id"
                      @click="cancelWorkTypeEdit"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
                <template v-else>
                  <div class="list-item-content">
                    <strong>{{ workType.type_name }}</strong>
                    <span>ID: {{ workType.id }}</span>
                  </div>
                  <div class="item-actions">
                    <button
                      class="btn-remind"
                      :disabled="workTypeActionId === workType.id"
                      @click="startWorkTypeEdit(workType)"
                    >
                      Редактировать
                    </button>
                    <button
                      class="btn-cancel"
                      :disabled="workTypeActionId === workType.id"
                      @click="deleteWorkType(workType.id)"
                    >
                      Удалить
                    </button>
                  </div>
                </template>
              </article>
            </div>
          </section>
        </div>
      </div>

      <div v-show="activeTab === 'workspaces'" class="tab-content">
        <div class="section-header">
          <div>
            <h3>Рабочие места</h3>
            <p class="section-subtitle">Создание новых мест с выбором типа и статуса доступности.</p>
          </div>
        </div>

        <div class="management-grid">
          <section class="card">
            <h4>Новое рабочее место</h4>
            <form class="form-grid" @submit.prevent="createWorkspace">
              <label class="field">
                <span>Название места</span>
                <input
                  v-model="newWorkspace.workspace_name"
                  type="text"
                  placeholder="Например, Стол A-12"
                >
              </label>

              <label class="field">
                <span>Тип рабочего места</span>
                <select v-model="newWorkspace.work_type_id">
                  <option value="">Выберите тип</option>
                  <option v-for="workType in workTypes" :key="workType.id" :value="workType.id">
                    {{ workType.type_name }}
                  </option>
                </select>
              </label>

              <label class="field checkbox-field">
                <input v-model="newWorkspace.is_available" type="checkbox">
                <span>Место доступно для бронирования</span>
              </label>

              <button
                type="submit"
                class="btn-primary"
                :disabled="workspaceSubmitting || workTypes.length === 0"
              >
                {{ workspaceSubmitting ? 'Сохраняем...' : 'Добавить рабочее место' }}
              </button>
            </form>

            <p v-if="workTypes.length === 0" class="message error">
              Сначала создайте хотя бы один тип рабочего места.
            </p>
            <p v-if="workspaceMessage" :class="['message', workspaceMessage.includes('успешно') ? 'success' : 'error']">
              {{ workspaceMessage }}
            </p>
          </section>

          <section class="card">
            <h4>Список рабочих мест</h4>
            <div v-if="resourceLoading" class="loading small">Загрузка...</div>
            <div v-else-if="workspacesWithType.length === 0" class="empty small">
              <p>Рабочих мест пока нет</p>
            </div>
            <div v-else class="table-wrapper">
              <table class="data-table compact">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Название</th>
                    <th>Тип</th>
                    <th>Доступность</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="workspace in workspacesWithType" :key="workspace.id">
                    <td>#{{ workspace.id }}</td>
                    <template v-if="editingWorkspaceId === workspace.id">
                      <td>
                        <input
                          v-model="workspaceEditForm.workspace_name"
                          class="table-input"
                          type="text"
                        >
                      </td>
                      <td>
                        <select v-model="workspaceEditForm.work_type_id" class="table-input">
                          <option value="">Выберите тип</option>
                          <option v-for="workType in workTypes" :key="workType.id" :value="String(workType.id)">
                            {{ workType.type_name }}
                          </option>
                        </select>
                      </td>
                      <td>
                        <label class="switcher">
                          <input v-model="workspaceEditForm.is_available" type="checkbox">
                          <span>{{ workspaceEditForm.is_available ? 'Доступно' : 'Недоступно' }}</span>
                        </label>
                      </td>
                      <td class="actions">
                        <button
                          class="btn-confirm"
                          :disabled="workspaceActionId === workspace.id"
                          @click="updateWorkspace(workspace.id)"
                        >
                          Сохранить
                        </button>
                        <button
                          class="btn-secondary"
                          :disabled="workspaceActionId === workspace.id"
                          @click="cancelWorkspaceEdit"
                        >
                          Отмена
                        </button>
                      </td>
                    </template>
                    <template v-else>
                      <td>{{ workspace.workspace_name }}</td>
                      <td>{{ workspace.workTypeName }}</td>
                      <td>
                        <span :class="['availability', workspace.is_available ? 'available' : 'unavailable']">
                          {{ workspace.is_available ? 'Доступно' : 'Недоступно' }}
                        </span>
                      </td>
                      <td class="actions">
                        <button
                          class="btn-remind"
                          :disabled="workspaceActionId === workspace.id"
                          @click="startWorkspaceEdit(workspace)"
                        >
                          Редактировать
                        </button>
                        <button
                          class="btn-cancel"
                          :disabled="workspaceActionId === workspace.id"
                          @click="deleteWorkspace(workspace.id)"
                        >
                          Удалить
                        </button>
                      </td>
                    </template>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <div v-show="activeTab === 'stats'" class="tab-content">
        <div class="section-header">
          <div>
            <h3>Краткая статистика</h3>
            <p class="section-subtitle">Быстрый обзор системы на основе уже загруженных данных.</p>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">{{ bookings.length }}</div>
            <div class="stat-label">Всего бронирований</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ workTypes.length }}</div>
            <div class="stat-label">Типов рабочих мест</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ workspaces.length }}</div>
            <div class="stat-label">Рабочих мест</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ workspaces.filter(item => item.is_available).length }}</div>
            <div class="stat-label">Доступных мест</div>
          </div>
        </div>
      </div>

      <div v-show="activeTab === 'admins'" class="tab-content">
        <div class="section-header">
          <div>
            <h3>Администраторы</h3>
            <p class="section-subtitle">Создание новых администраторских аккаунтов через backend `post/user` с ролью `role_id = 1`.</p>
          </div>
        </div>

        <div class="management-grid">
          <section class="card">
            <h4>Новый администратор</h4>
            <form class="form-grid" @submit.prevent="createAdmin">
              <label class="field">
                <span>Имя</span>
                <input
                  v-model="newAdmin.full_name"
                  type="text"
                  placeholder="Иван"
                >
              </label>

              <label class="field">
                <span>Фамилия</span>
                <input
                  v-model="newAdmin.second_name"
                  type="text"
                  placeholder="Иванов"
                >
              </label>

              <label class="field">
                <span>Email</span>
                <input
                  v-model="newAdmin.email"
                  type="email"
                  placeholder="admin@example.com"
                >
              </label>

              <label class="field">
                <span>Пароль</span>
                <input
                  v-model="newAdmin.password"
                  type="password"
                  placeholder="Минимум 6 символов"
                >
              </label>

              <button type="submit" class="btn-primary" :disabled="adminSubmitting">
                {{ adminSubmitting ? 'Создаём...' : 'Создать администратора' }}
              </button>
            </form>

            <p v-if="adminMessage" :class="['message', adminMessage.includes('успешно') ? 'success' : 'error']">
              {{ adminMessage }}
            </p>
          </section>

          <section class="card">
            <h4>Текущие администраторы</h4>
            <div v-if="resourceLoading" class="loading small">Загрузка...</div>
            <div v-else-if="adminUsers.length === 0" class="empty small">
              <p>Администраторы не найдены</p>
            </div>
            <div v-else class="list-grid">
              <article v-for="admin in adminUsers" :key="admin.id" class="list-item">
                <div class="list-item-content">
                  <strong>{{ admin.full_name }} {{ admin.second_name }}</strong>
                  <span>{{ admin.email }}</span>
                </div>
                <span>ID: {{ admin.id }}</span>
              </article>
            </div>
          </section>
        </div>
      </div>

      <div v-show="activeTab === 'prices'" class="tab-content">
        <div class="section-header">
          <div>
            <h3>Цены</h3>
            <p class="section-subtitle">Установка цены за день для типа рабочего места. При бронировании backend берёт последнюю актуальную цену по типу.</p>
          </div>
        </div>

        <div class="management-grid">
          <section class="card">
            <h4>Новая цена</h4>
            <form class="form-grid" @submit.prevent="createPrice">
              <label class="field">
                <span>Тип рабочего места</span>
                <select v-model="newPrice.work_type_id">
                  <option value="">Выберите тип</option>
                  <option v-for="workType in workTypes" :key="workType.id" :value="workType.id">
                    {{ workType.type_name }}
                  </option>
                </select>
              </label>

              <label class="field">
                <span>Цена за день</span>
                <input
                  v-model="newPrice.price_day"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Например, 1500"
                >
              </label>

              <button type="submit" class="btn-primary" :disabled="priceSubmitting || workTypes.length === 0">
                {{ priceSubmitting ? 'Сохраняем...' : 'Установить цену' }}
              </button>
            </form>

            <p v-if="workTypes.length === 0" class="message error">
              Сначала создайте хотя бы один тип рабочего места.
            </p>
            <p v-if="priceMessage" :class="['message', priceMessage.includes('успешно') ? 'success' : 'error']">
              {{ priceMessage }}
            </p>
          </section>

          <section class="card">
            <h4>Актуальные цены</h4>
            <div v-if="resourceLoading" class="loading small">Загрузка...</div>
            <div v-else-if="latestPrices.length === 0" class="empty small">
              <p>Цены пока не установлены</p>
            </div>
            <div v-else class="list-grid">
              <article v-for="price in latestPrices" :key="price.id" class="list-item">
                <div class="list-item-content">
                  <strong>{{ price.workTypeName }}</strong>
                  <span>{{ Number(price.price_day).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₽ / день</span>
                </div>
                <span>{{ new Date(price.effective_from).toLocaleString('ru-RU') }}</span>
              </article>
            </div>
          </section>
        </div>

        <section class="card history-card">
          <h4>История цен</h4>
          <div v-if="resourceLoading" class="loading small">Загрузка...</div>
          <div v-else-if="pricesWithType.length === 0" class="empty small">
            <p>История цен пока пуста</p>
          </div>
          <div v-else class="table-wrapper">
            <table class="data-table compact">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Тип</th>
                  <th>Цена</th>
                  <th>Действует с</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="price in pricesWithType" :key="price.id">
                  <td>#{{ price.id }}</td>
                  <template v-if="editingPriceId === price.id">
                    <td>
                      <select v-model="priceEditForm.work_type_id" class="table-input">
                        <option value="">Выберите тип</option>
                        <option v-for="workType in workTypes" :key="workType.id" :value="String(workType.id)">
                          {{ workType.type_name }}
                        </option>
                      </select>
                    </td>
                    <td>
                      <input
                        v-model="priceEditForm.price_day"
                        class="table-input"
                        type="number"
                        min="0"
                        step="0.01"
                      >
                    </td>
                    <td>{{ new Date(price.effective_from).toLocaleString('ru-RU') }}</td>
                    <td class="actions">
                      <button
                        class="btn-confirm"
                        :disabled="priceActionId === price.id"
                        @click="updatePrice(price.id)"
                      >
                        Сохранить
                      </button>
                      <button
                        class="btn-secondary"
                        :disabled="priceActionId === price.id"
                        @click="cancelPriceEdit"
                      >
                        Отмена
                      </button>
                    </td>
                  </template>
                  <template v-else>
                    <td>{{ price.workTypeName }}</td>
                    <td>{{ Number(price.price_day).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₽</td>
                    <td>{{ new Date(price.effective_from).toLocaleString('ru-RU') }}</td>
                    <td class="actions">
                      <button
                        class="btn-remind"
                        :disabled="priceActionId === price.id"
                        @click="startPriceEdit(price)"
                      >
                        Редактировать
                      </button>
                    </td>
                  </template>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div v-show="activeTab === 'reports'" class="tab-content">
        <div class="section-header">
          <div>
            <h3>Полные отчёты</h3>
            <p class="section-subtitle">Доходы, загруженность, популярные типы рабочих мест и статистика по пользователям.</p>
          </div>
        </div>

        <section class="card report-filters">
          <div class="filters-grid">
            <label class="field">
              <span>Дата начала</span>
              <input v-model="reportFilters.start_date" type="date">
            </label>

            <label class="field">
              <span>Дата окончания</span>
              <input v-model="reportFilters.end_date" type="date">
            </label>

            <label class="field">
              <span>Группировка доходов</span>
              <select v-model="reportFilters.group_by">
                <option value="month">По месяцам</option>
                <option value="day">По дням</option>
              </select>
            </label>

            <button class="btn-primary report-button" :disabled="reportsLoading" @click="loadReports">
              {{ reportsLoading ? 'Загружаем...' : 'Построить отчёты' }}
            </button>
          </div>

          <p v-if="reportsMessage" class="message error">{{ reportsMessage }}</p>
        </section>

        <div class="stats-grid reports-stats">
          <div class="stat-card">
            <div class="stat-number">{{ occupancyReport?.occupancyPercentage ?? 0 }}%</div>
            <div class="stat-label">Загруженность</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ occupancyReport?.occupiedWorkspaces ?? 0 }}/{{ occupancyReport?.totalWorkspaces ?? 0 }}</div>
            <div class="stat-label">Занятых мест</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ Number(revenueReport?.totalRevenue || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 }) }} ₽</div>
            <div class="stat-label">Общий доход</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ popularWorkTypesReport.length }}</div>
            <div class="stat-label">Популярных типов в отчёте</div>
          </div>
        </div>

        <div class="reports-grid">
          <section class="card">
            <h4>Доходы</h4>
            <div v-if="reportsLoading" class="loading small">Загрузка...</div>
            <div v-else-if="!revenueReport || !revenueReport.revenueByPeriod?.length" class="empty small">
              <p>Нет данных по доходам за выбранный период</p>
            </div>
            <div v-else class="table-wrapper">
              <table class="data-table compact">
                <thead>
                  <tr>
                    <th>Период</th>
                    <th>Доход</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in revenueReport.revenueByPeriod" :key="item.dataValues?.period || item.period">
                    <td>{{ item.dataValues?.period || item.period }}</td>
                    <td>{{ Number(item.dataValues?.total_revenue || item.total_revenue || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₽</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="card">
            <h4>Популярные типы</h4>
            <div v-if="reportsLoading" class="loading small">Загрузка...</div>
            <div v-else-if="popularWorkTypesReport.length === 0" class="empty small">
              <p>Нет данных по популярным типам</p>
            </div>
            <div v-else class="table-wrapper">
              <table class="data-table compact">
                <thead>
                  <tr>
                    <th>Тип</th>
                    <th>Бронирований</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in popularWorkTypesReport" :key="item.work_type_id">
                    <td>{{ item.type_name }}</td>
                    <td>{{ item.booking_count }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div class="reports-grid">
          <section class="card">
            <h4>Загруженность</h4>
            <div v-if="reportsLoading" class="loading small">Загрузка...</div>
            <div v-else-if="!occupancyReport" class="empty small">
              <p>Нет данных по загруженности</p>
            </div>
            <div v-else class="report-details">
              <p><strong>Период:</strong> {{ occupancyReport.period?.start_date }} - {{ occupancyReport.period?.end_date }}</p>
              <p><strong>Всего мест:</strong> {{ occupancyReport.totalWorkspaces }}</p>
              <p><strong>Занятых мест:</strong> {{ occupancyReport.occupiedWorkspaces }}</p>
              <p><strong>Процент загруженности:</strong> {{ occupancyReport.occupancyPercentage }}%</p>
            </div>
          </section>

          <section class="card">
            <h4>Отчёт по пользователям</h4>
            <div v-if="reportsLoading" class="loading small">Загрузка...</div>
            <div v-else-if="userBookingsReport.length === 0" class="empty small">
              <p>Нет данных по пользователям</p>
            </div>
            <div v-else class="table-wrapper">
              <table class="data-table compact">
                <thead>
                  <tr>
                    <th>Пользователь</th>
                    <th>Email</th>
                    <th>Бронирований</th>
                    <th>Потратил</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in userBookingsReport" :key="item.user_id">
                    <td>{{ item.user?.full_name }} {{ item.user?.second_name }}</td>
                    <td>{{ item.user?.email }}</td>
                    <td>{{ item.booking_count }}</td>
                    <td>{{ Number(item.total_spent || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₽</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <div v-show="activeTab === 'settings'" class="tab-content">
        <div class="section-header">
          <div>
            <h3>Система</h3>
            <p class="section-subtitle">Проверка подключений и текущих параметров панели администратора.</p>
          </div>
        </div>

        <div class="settings-card">
          <p><strong>Frontend:</strong> Vite + Vue 3</p>
          <p><strong>Backend:</strong> http://localhost:3000</p>
          <p><strong>API prefix:</strong> /api</p>
          <p><strong>Администратор:</strong> {{ authStore.user?.email || 'Не определён' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-dashboard {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(230, 126, 34, 0.18), transparent 28%),
    linear-gradient(180deg, #f7f1e8 0%, #efe5d6 100%);
  color: #2d241c;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

.navbar {
  background: linear-gradient(135deg, #2f5d50 0%, #1f3e35 100%);
  color: #fff7ed;
  padding: 20px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  box-shadow: 0 18px 40px rgba(31, 62, 53, 0.18);
}

.navbar-left h2 {
  margin: 0;
  font-size: 1.7rem;
  letter-spacing: 0.02em;
}

.navbar-right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.admin-badge {
  background: rgba(255, 247, 237, 0.18);
  border: 1px solid rgba(255, 247, 237, 0.28);
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.user-info {
  font-size: 0.95rem;
}

.btn-logout {
  background: transparent;
  color: #fff7ed;
  border: 1px solid rgba(255, 247, 237, 0.4);
  padding: 10px 16px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.btn-logout:hover {
  background: rgba(255, 247, 237, 0.12);
  transform: translateY(-1px);
}

.container {
  max-width: 1360px;
  margin: 0 auto;
  padding: 32px 20px 48px;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 24px;
}

.tab {
  padding: 12px 18px;
  border: 1px solid rgba(47, 93, 80, 0.12);
  border-radius: 999px;
  background: rgba(255, 252, 247, 0.9);
  color: #5e554d;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.tab:hover,
.tab.active {
  background: #2f5d50;
  color: #fff7ed;
  border-color: #2f5d50;
}

.tab-content {
  background: rgba(255, 252, 247, 0.92);
  border: 1px solid rgba(84, 62, 44, 0.08);
  border-radius: 24px;
  padding: 28px;
  box-shadow: 0 18px 50px rgba(84, 62, 44, 0.08);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
}

.section-header h3,
.card h4 {
  margin: 0;
}

.section-subtitle {
  margin: 6px 0 0;
  color: #74685c;
}

.management-grid {
  display: grid;
  grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
  gap: 20px;
}

.card {
  background: #fffaf2;
  border: 1px solid rgba(84, 62, 44, 0.08);
  border-radius: 20px;
  padding: 22px;
}

.history-card {
  margin-top: 20px;
}

.report-filters {
  margin-bottom: 20px;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  align-items: end;
}

.report-button {
  align-self: end;
}

.reports-stats {
  margin-bottom: 20px;
}

.reports-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.report-details {
  display: grid;
  gap: 10px;
  color: #5d5146;
}

.report-details p {
  margin: 0;
}

.form-grid {
  display: grid;
  gap: 16px;
}

.field {
  display: grid;
  gap: 8px;
  color: #4b4036;
  font-weight: 600;
}

.field input,
.field select {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #d8cab7;
  border-radius: 12px;
  background: #fff;
  color: #2d241c;
  font: inherit;
}

.field input:focus,
.field select:focus {
  outline: none;
  border-color: #2f5d50;
  box-shadow: 0 0 0 3px rgba(47, 93, 80, 0.12);
}

.checkbox-field {
  grid-template-columns: 20px 1fr;
  align-items: center;
}

.checkbox-field input {
  width: 18px;
  height: 18px;
  margin: 0;
}

.btn-primary,
.btn-secondary,
.btn-confirm,
.btn-remind,
.btn-cancel {
  border: none;
  border-radius: 12px;
  padding: 12px 16px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #c96b2c 0%, #e08e45 100%);
  color: #fffaf2;
}

.btn-secondary {
  background: #e6dccd;
  color: #4e4338;
}

.btn-confirm {
  background: #2f8f68;
  color: #fff;
}

.btn-remind {
  background: #3178c6;
  color: #fff;
}

.btn-cancel {
  background: #bb4f3d;
  color: #fff;
}

.btn-primary:hover,
.btn-confirm:hover,
.btn-remind:hover,
.btn-cancel:hover {
  transform: translateY(-1px);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.message {
  margin: 16px 0 0;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 0.95rem;
}

.message.success {
  background: rgba(47, 143, 104, 0.12);
  color: #25694d;
}

.message.error {
  background: rgba(187, 79, 61, 0.12);
  color: #8c372a;
}

.message.info {
  margin-bottom: 16px;
  background: rgba(49, 120, 198, 0.12);
  color: #215284;
}

.loading,
.empty {
  padding: 24px;
  text-align: center;
  color: #74685c;
}

.loading.small,
.empty.small {
  padding: 16px 0;
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 14px 12px;
  text-align: left;
  border-bottom: 1px solid rgba(84, 62, 44, 0.1);
}

.data-table th {
  color: #5d5146;
  font-size: 0.84rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.data-table tbody tr:hover {
  background: rgba(233, 220, 203, 0.28);
}

.compact th,
.compact td {
  padding: 12px 10px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.status,
.availability {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
}

.status.pending {
  background: rgba(231, 161, 67, 0.16);
  color: #9b5b10;
}

.status.confirmed {
  background: rgba(47, 143, 104, 0.14);
  color: #25694d;
}

.status.completed {
  background: rgba(49, 120, 198, 0.14);
  color: #215284;
}

.status.cancelled {
  background: rgba(187, 79, 61, 0.14);
  color: #8c372a;
}

.availability.available {
  background: rgba(47, 143, 104, 0.12);
  color: #25694d;
}

.availability.unavailable {
  background: rgba(187, 79, 61, 0.12);
  color: #8c372a;
}

.list-grid {
  display: grid;
  gap: 12px;
}

.list-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid rgba(84, 62, 44, 0.08);
  color: #5d5146;
}

.list-item-content {
  display: grid;
  gap: 4px;
}

.inline-edit {
  display: grid;
  gap: 12px;
  width: 100%;
}

.compact-field {
  gap: 6px;
}

.compact-field span {
  font-size: 0.85rem;
}

.item-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.table-input {
  width: 100%;
  min-width: 150px;
  padding: 10px 12px;
  border: 1px solid #d8cab7;
  border-radius: 10px;
  background: #fff;
  color: #2d241c;
  font: inherit;
}

.table-input:focus {
  outline: none;
  border-color: #2f5d50;
  box-shadow: 0 0 0 3px rgba(47, 93, 80, 0.12);
}

.switcher {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.switcher input {
  width: 16px;
  height: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.stat-card {
  background: linear-gradient(135deg, #2f5d50 0%, #466d61 100%);
  color: #fff7ed;
  border-radius: 20px;
  padding: 24px;
}

.stat-number {
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 8px;
}

.stat-label {
  color: rgba(255, 247, 237, 0.88);
}

.settings-card {
  background: #fffaf2;
  border: 1px solid rgba(84, 62, 44, 0.08);
  border-radius: 18px;
  padding: 20px;
}

.settings-card p {
  margin: 0 0 10px;
}

.settings-card p:last-child {
  margin-bottom: 0;
}

@media (max-width: 960px) {
  .navbar,
  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .management-grid {
    grid-template-columns: 1fr;
  }

  .reports-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .navbar {
    padding: 20px;
  }

  .container {
    padding: 20px 14px 32px;
  }

  .tab-content {
    padding: 20px;
  }

  .actions {
    min-width: 180px;
  }
}
</style>
